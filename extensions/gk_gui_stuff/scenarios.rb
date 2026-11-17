# frozen_string_literal: true

module GkGuiStuff
  # gui_stuff in scenarios: what the server decides for a module (the browser parts are tried by hand).
  #   gui_due_soon: <issue key>, days: N, equals: true|false   the issue counts as due soon with the limit N
  #   gui_overdue_class: <issue key>, equals: true|false        core's class overdue on the issue (what overdue_mark draws)
  #   gui_menu_row: <row key>, page: issue|issue_list, issue: <key>, project: <key>, as: <user>, placement: out|icon|menu,
  #                 equals: true|false   the row is among the page's rows for that person, standing where said
  #   gui_admin_group: <row name in core's administration menu>, equals: <group key or free tag>   the group the row stands in
  #   appearance_mode: <setting key>, equals: off|optional|forced   the level in records' register of appearance settings
  #   appearance_on_for: <setting key>, as: <user>, equals: true|false   the setting is on for that person
  #   appearance_event: <setting key>, reason: <text>, equals: true|false   the newest change is an event with the reason
  #   gui_ext_link: <issue key>, href: <url>, as: <user>, has: { rel:, class:, no_class:, title_has:, title_once:,
  #                 target:, preview: }   the issue's description rendered with textilizable as that person; the link
  #                 with that href carries what has names (preview: true|false is the mark data-gk-gui-ext-preview,
  #                 target: none means no target, title_once: <d> the domain exactly once in the tooltip, as for a link
  #                 inside core's collapse macro, which the macro and the outer text both format).
  #                 An href "own:<path>" is a link to the instance's own address, added to the text for the check.
  #   gui_ext_request: <url>, as: <user>, equals: ready|queued|none|not_found   what the card endpoint answers;
  #                 full_queue: true with the queue full, when_off: true with the preview off (and no row may be left);
  #                 twice: true asks two times as a person who has not asked before, equals: "queued,ready", and
  #                 after: <user> lets another person ask twice first
  #   gui_ext_previews: count, domain: <d or any>, state: <state or any>, after_clear: true, equals: N   the kept cards;
  #                 after_clear empties them in a transaction that is rolled back, so nothing of it is kept
  #   gui_ext_rel: field|pattern|homepage|footer|help_menu|help_page, as: <user>, has: { rel:, no_rel: true }
  #                 a link to another website drawn outside formatted text, rendered as that person:
  #                 field: issue: <key>, custom_field: <custom field key> on the issue page and in the issue list (not
  #                 field:, which the engine's own check of a field value takes); with
  #                 value: <address> (own:<path> for the instance's own address) an unsaved value on the page only;
  #                 pattern: pattern: <link pattern>, value: <v> an unsaved text field with that link pattern;
  #                 homepage: href: <address> as core draws the project's homepage; footer: core's Redmine link;
  #                 help_menu: the help item of the top menu; help_page: the wiki syntax help (its answer carries
  #                 Referrer-Policy: no-referrer, and the drawn page is core's as it was). appearance_off: [<key>] renders
  #                 with those appearance settings off, in a transaction that is rolled back.
  #   gui_gk_folders: true   the plugins' default folders stand under <attachments>/gk (GkFolders)
  #   turned_on: { appearance: { <key>: <level> }, values: { <key>: { <name>: <value> } }, features: { <key>: true } } on
  #                 any expectation: it runs with those settings and functions as said, in a transaction that is rolled
  #                 back, so a scenario that leaves everything off as a new installation can still check what they do.
  def self.register_scenarios!
    # nothing is registered with the gate closed (gate.rb); GK Scenarios calls this once every plugin is in
    return unless defined?(::GkScenarios::Expect) && GkGuiStuff.open?

    if ::GkScenarios::Expect.respond_to?(:wrap)
      ::GkScenarios::Expect.wrap('turned_on') { |_ctx, on, run| GkGuiStuff.scenario_with_turned_on(on) { run.call } }
    end

    # A new installation has every appearance setting and function off, so the scenario says which it uses:
    #   gui_stuff: { modules: { user_status: optional, collapse_all: optional },
    #                appearance: { tags.sidebar: forced, core_stuff.list_align: forced },
    #                features: { tags.marks: true } }
    # modules are gui_stuff's own settings by the module's name, appearance any plugin's setting by its whole key; both
    # get their level in gk_records' register with one save and the reason scenario (an event per changed setting);
    # features are switched in the register of functions with set! (each an event), as on the page. A key that is not a
    # declared setting or function stops the scenario.
    # values: { <setting key>: { <name>: <value> } } are saved in the same save as the levels; after it the preview of
    # external links empties what the new levels and lists leave out, as after a save on the page. link_previews:
    # { seed: [{ key:, url:, state: ready|queued|failed }], clear: true } writes kept cards directly (a ready card's
    # title from the texts, link_previews.<key>.title) and empties them all after the save; the order is seed, values,
    # clear.
    ::GkScenarios::Steps.register('gui_stuff', plugin: :gk_gui_stuff, order: 20) do |ctx|
      feats = GkGuiStuff.features
      feats&.forget! # emptying the instance cleared the table behind the process's memory
      looks = GkGuiStuff.appearance_settings
      looks&.forget!
      data = ctx.scenario.data['gui_stuff'] || {}
      previews = data['link_previews'] || {}
      GkGuiStuff.scenario_seed_previews!(ctx, Array(previews['seed'])) if previews['seed']
      # YAML reads a bare off as false
      level = ->(v) { v == false ? 'off' : v.to_s }
      levels = (data['modules'] || {}).to_h { |k, v| [Appearance.key(k), level.call(v)] }
      levels.merge!((data['appearance'] || {}).to_h { |k, v| [k.to_s, level.call(v)] })
      values = (data['values'] || {}).to_h { |k, v| [k.to_s, (v || {}).to_h { |n, x| [n.to_s, x] }] }
      if levels.any? || values.any?
        raise ::GkScenarios::Error, "appearance: #{(levels.keys + values.keys).first}: the register of GK Records is not there" unless looks

        levels.each do |k, v|
          row = looks.find(k)
          raise ::GkScenarios::Error, "appearance: #{k} is not a declared appearance setting" unless row && !row.shared?
          raise ::GkScenarios::Error, "appearance: #{k} has no level #{v}" unless row.modes.include?(v)
        end
        values.each do |k, h|
          row = looks.find(k)
          raise ::GkScenarios::Error, "values: #{k} is not a declared appearance setting" unless row
          h.each_key { |n| raise ::GkScenarios::Error, "values: #{k} has no value #{n}" unless row.values.key?(n) }
        end
        ext = Appearance.key(External::ROW)
        before_mode = looks.find(ext) ? looks.mode(ext) : 'off'
        before_domains = looks.find(ext) ? Array(looks.value(ext, 'domains')) : []
        changed = looks.save!(modes: levels, values: values, reason: 'scenario')
        # also when nothing changed (created again on top): the seeds of a domain not in the list go all the same
        if levels.key?(ext) || values.key?(ext)
          External.settings_saved!(before_mode: before_mode, before_domains: before_domains, reason: 'scenario', user: ::User.current)
        end
        ctx.note(:gui_modules, 'appearance', nil, changed.any?)
      end
      External::Cleanup.clear!(cause: 'button', reason: 'scenario') if previews['clear'] == true
      (data['features'] || {}).each do |k, v|
        on = v == true || v.to_s == 'on'
        raise ::GkScenarios::Error, "features: #{k}: the register of GK Records is not there" unless feats
        raise ::GkScenarios::Error, "features: #{k} is not a declared function" unless feats.find(k)

        changed = feats.on?(k) != on
        feats.set!(k, on, reason: 'scenario') if changed
        ctx.note(:feature, k, nil, changed)
      end
    end

    # gui_page_package: the page's data and the pulse for the scenario's user in as, with the scenario's users in users
    # drawn on the page; keys: the page data that must be there. The pulse answers only what is registered.
    ::GkScenarios::Expect.register('gui_page_package') do |ctx, e|
      viewer = ::User.find_by(login: ::GkScenarios::Expect.login(ctx, e['as'].to_s))
      ids = Array(e['users']).filter_map { |k| ::User.find_by(login: ::GkScenarios::Expect.login(ctx, k.to_s))&.id }
      next({ 'ok' => false, 'want' => 'as, users', 'got' => '-' }) unless viewer && ids.any?

      view = Object.new
      view.instance_variable_set(:@gk_gui_stuff_users, ids)
      data = pulse = nil
      ctx.as(viewer) do
        data = GkGuiStuff::PageData.build(view, nil)
        pulse = GkGuiStuff::Pulse.answer(viewer, { 'not_registered' => {}, 'user_status' => { 'ids' => ids } })
      end
      want = Array(e['keys']).map(&:to_s)
      checks = want.map { |k| ["page data #{k}", data.key?(k)] }
      checks << ['pulse leaves out what is not registered', !pulse.key?('not_registered')]
      checks << ['pulse refreshes the dots', !want.include?('user_status') || pulse.key?('user_status')]
      failed = checks.reject { |_k, ok| ok }.map(&:first)
      { 'ok' => failed.empty?, 'want' => checks.map(&:first).join(', '), 'got' => failed.empty? ? 'ok' : "not: #{failed.join(', ')} (data: #{data.keys.join(', ')})" }
    end

    # gui_page_status: <path>, equals: <status>   what the instance answers for the path to someone not signed in, asked
    # in this process, for a page that answers 404 or 403 where a browser check would fail on its console. as: <user> asks
    # as that person through the API, so the path ends in .json; %{last_setting} in the path is the newest appearance
    # setting's id, for the row's History. The person, the language and the API setting of the run are put back afterwards.
    ::GkScenarios::Expect.register('gui_page_status') do |ctx, e|
      user = e['as'] ? ::User.find_by(login: ::GkScenarios::Expect.login(ctx, e['as'].to_s)) : nil
      next({ 'ok' => false, 'want' => 'as', 'got' => 'no person' }) if e['as'] && !user
    
      got = GkGuiStuff.scenario_page_status(e['gui_page_status'].to_s, user)
      { 'ok' => got.to_s == e['equals'].to_s, 'want' => e['equals'].to_s, 'got' => got.to_s }
    end
    
    ::GkScenarios::Expect.register('gui_gk_folders') do |_ctx, _e|
      wrong = GkGuiStuff.scenario_gk_folders
      { 'ok' => wrong.empty?, 'want' => '<attachments>/gk/<plugin>/<folder>', 'got' => wrong.empty? ? 'ok' : wrong.join(', ') }
    end
    
    ::GkScenarios::Expect.register('gui_due_soon') do |ctx, e|
      iss = ::GkScenarios::Expect.issue_for(ctx, e['gui_due_soon'].to_s)
      want = e.key?('equals') ? e['equals'] == true : true
      got = iss ? Overdue.due_soon?(iss, ::User.current, e['days'].to_i) : nil
      { 'ok' => got == want, 'want' => want.to_s, 'got' => iss ? "#{got} (due #{iss.due_date}, closed #{iss.closed?})" : 'no issue' }
    end

    ::GkScenarios::Expect.register('gui_overdue_class') do |ctx, e|
      iss = ::GkScenarios::Expect.issue_for(ctx, e['gui_overdue_class'].to_s)
      want = e.key?('equals') ? e['equals'] == true : true
      got = iss ? iss.css_classes(::User.current).split.include?('overdue') : nil
      { 'ok' => got == want, 'want' => want.to_s, 'got' => iss ? "#{got} (due #{iss.due_date})" : 'no issue' }
    end

    ::GkScenarios::Expect.register('gui_admin_group') do |_ctx, e|
      name = e['gui_admin_group'].to_s
      known = AdminGroups.items.any? { |i| i.name.to_s == name }
      got = known ? AdminGroups.group(name) : nil
      { 'ok' => known && got == e['equals'].to_s, 'want' => e['equals'].to_s, 'got' => known ? got : 'no such row' }
    end

    # appearance_mode: <key>, equals: off|optional|forced   the setting's level in records' register
    ::GkScenarios::Expect.register('appearance_mode') do |_ctx, e|
      looks = GkGuiStuff.appearance_settings
      key = e['appearance_mode'].to_s
      known = looks&.find(key)
      got = known ? looks.mode(key) : nil
      want = e['equals'] == false ? 'off' : e['equals'].to_s
      { 'ok' => !got.nil? && got == want, 'want' => want, 'got' => known ? got : 'no such setting' }
    end

    # appearance_on_for: <key>, as: <user>, equals: true|false   the setting is on for that person (the level, the
    # person's own choice and Like Redmine for me)
    ::GkScenarios::Expect.register('appearance_on_for') do |ctx, e|
      looks = GkGuiStuff.appearance_settings
      key = e['appearance_on_for'].to_s
      user = ::User.find_by(login: ::GkScenarios::Expect.login(ctx, e['as'].to_s))
      want = e.key?('equals') ? e['equals'] == true : true
      got = looks&.find(key) && user ? looks.on_for?(key, user) : nil
      { 'ok' => got == want, 'want' => want.to_s, 'got' => got.nil? ? 'no such setting or person' : got.to_s }
    end

    # appearance_event: <key>, reason: <text>, equals: true|false   the setting's newest change is an event in records
    # with that reason (the scenario's own, scenario, when none is given)
    ::GkScenarios::Expect.register('appearance_event') do |_ctx, e|
      looks = GkGuiStuff.appearance_settings
      key = e['appearance_event'].to_s
      reason = (e['reason'] || 'scenario').to_s
      want = e.key?('equals') ? e['equals'] == true : true
      last = looks&.find(key) ? looks.last_changes([key])[key] : nil
      got = !last.nil? && last[:event]&.kind == GkRecords::AppearanceSettings::KIND && last[:reason] == reason
      { 'ok' => !looks&.find(key).nil? && got == want, 'want' => want ? "an event with the reason #{reason}" : 'none with that reason',
        'got' => looks&.find(key) ? (last ? "reason #{last[:reason].inspect}" : 'no event') : 'no such setting' }
    end

    ::GkScenarios::Expect.register('gui_menu_row') do |ctx, e|
      user = ::User.find_by(login: ::GkScenarios::Expect.login(ctx, e['as'].to_s))
      page = { kind: e['page'].to_s, path: '/' }
      if e['issue']
        iss = ::GkScenarios::Expect.issue_for(ctx, e['issue'].to_s)
        page.merge!(id: iss&.id, project: iss&.project&.identifier)
      elsif e['project']
        page[:project] = ::Project.find_by(id: ::GkScenarios::Expect.project_id(ctx, e['project'].to_s))&.identifier
      end
      rows = []
      if user
        prev = ::User.current
        begin
          ::User.current = user
          rows = Menu.rows_for(page)
        ensure
          ::User.current = prev
        end
      end
      row = rows.detect { |r| r[:key] == e['gui_menu_row'].to_s }
      want = e.key?('equals') ? e['equals'] == true : true
      ok = want ? (!row.nil? && (e['placement'].nil? || row[:placement] == e['placement'].to_s)) : row.nil?
      { 'ok' => ok, 'want' => want ? "present#{e['placement'] ? " (#{e['placement']})" : ''}" : 'absent',
        'got' => row ? "present (#{row[:placement]}, #{row[:label]})" : "absent (#{rows.map { |r| r[:key] }.join(', ')})" }
    end

    register_external_scenarios!
  end

  # Kept cards written directly for a scenario: found again by the address, fetched now; nothing is fetched
  def self.scenario_seed_previews!(ctx, seeds)
    model = ::GkGuiStuffLinkPreview
    now = Time.current
    seeds.each do |s|
      url = External::Queue.normalize(s['url'].to_s) or raise ::GkScenarios::Error, "link_previews: #{s['url']} is not an address"
      state = (s['state'] || 'ready').to_s
      raise ::GkScenarios::Error, "link_previews: no state #{state}" unless model::STATES.include?(state)

      row = model.find_or_initialize_by(url_digest: model.digest(url))
      created = row.new_record?
      title = state == 'ready' && s['key'] ? ctx.scenario.t(:link_previews, s['key'], :title) : nil
      text = state == 'ready' && s['key'] ? ctx.scenario.t?(:link_previews, s['key'], :text) : nil
      row.assign_attributes(url: url, domain: URI.parse(url).host, state: state, title: title, description: text&.to_s,
                            error: state == 'failed' ? 'network' : nil, queued_at: now, seen_at: now,
                            attempted_at: state == 'queued' ? nil : now, fetched_at: state == 'ready' ? now : nil)
      row.save!
      ctx.note(:gui_link_preview, s['key'] || url, row, created)
    end
  end

  # The expectations of the preview of external links and of the links to other websites
  def self.register_external_scenarios!
    ::GkScenarios::Expect.register('gui_ext_link') do |ctx, e|
      iss = ::GkScenarios::Expect.issue_for(ctx, e['gui_ext_link'].to_s)
      user = ::User.find_by(login: ::GkScenarios::Expect.login(ctx, e['as'].to_s))
      next({ 'ok' => false, 'want' => 'issue, as', 'got' => '-' }) unless iss && user

      host = GkGuiStuff.scenario_host
      href = e['href'].to_s
      text = iss.description.to_s
      if href.start_with?('own:')
        href = GkGuiStuff.scenario_own(href)
        # written as a link: CommonMark turns a bare address into a link only when its host holds a dot (localhost)
        text = "#{text}\n\n#{::Setting.text_formatting.to_s == 'textile' ? %("#{href}":#{href}) : "<#{href}>"}\n"
      end
      html = nil
      ctx.as(user) do
        html = ::ApplicationController.renderer.new('HTTP_HOST' => host.empty? ? 'localhost' : host)
                                      .render(inline: '<%= textilizable(t) %>', locals: { t: text })
      end
      a = GkGuiStuff.scenario_link(html, href)
      next({ 'ok' => false, 'want' => "a link to #{href}", 'got' => 'no such link' }) unless a

      checks = GkGuiStuff.scenario_link_checks(a, e['has'] || {})
      failed = checks.reject { |_k, ok| ok }.map(&:first)
      { 'ok' => failed.empty?, 'want' => checks.map(&:first).join(', '),
        'got' => failed.empty? ? 'ok' : "not: #{failed.join(', ')} (#{a.compact.inspect[0, 300]})" }
    end

    ::GkScenarios::Expect.register('gui_ext_request') do |ctx, e|
      user = ::User.find_by(login: ::GkScenarios::Expect.login(ctx, e['as'].to_s))
      res = nil
      if user && e['full_queue'] == true
        # the queue filled to its most in a transaction that is rolled back, so the fetch job never sees the rows
        ::ActiveRecord::Base.transaction do
          ctx.as(user) do
            GkGuiStuff.scenario_fill_queue!(e['gui_ext_request'].to_s)
            res = External::Queue.request(e['gui_ext_request'].to_s, user)
          end
          raise ::ActiveRecord::Rollback
        end
      elsif user && e['when_off'] == true
        res = GkGuiStuff.scenario_request_when_off(ctx, user, e['gui_ext_request'].to_s)
      elsif user && e['twice'] == true
        res = GkGuiStuff.scenario_request_twice(ctx, user, e['gui_ext_request'].to_s, e['after'])
      elsif user
        ctx.as(user) { res = External::Queue.request(e['gui_ext_request'].to_s, user) }
      end
      got = if res.nil? then 'no person'
            elsif res.is_a?(String) then res
            elsif res == :kept_a_row then 'a row was kept'
            elsif res.state == :none && res.why == :off then 'not_found'
            else res.state.to_s
            end
      why = res.respond_to?(:why) ? res.why : nil
      { 'ok' => got == e['equals'].to_s, 'want' => e['equals'].to_s, 'got' => why ? "#{got} (#{why})" : got }
    end

    ::GkScenarios::Expect.register('gui_ext_previews') do |_ctx, e|
      count = lambda do
        scope = ::GkGuiStuffLinkPreview.all
        scope = scope.where(domain: e['domain'].to_s) if e['domain'] && e['domain'].to_s != 'any'
        scope = scope.where(state: e['state'].to_s) if e['state'] && e['state'].to_s != 'any'
        scope.count
      end
      got = nil
      if e['after_clear'] == true
        ::ActiveRecord::Base.transaction do
          # the pictures stay: removed files would not come back with the rows
          External::Cleanup.clear!(cause: 'button', reason: 'scenario', files: false)
          got = count.call
          raise ::ActiveRecord::Rollback
        end
      else
        got = count.call
      end
      { 'ok' => got == e['equals'].to_i, 'want' => e['equals'].to_s, 'got' => got.to_s }
    end

    ::GkScenarios::Expect.register('gui_ext_rel') do |ctx, e|
      user = ::User.find_by(login: ::GkScenarios::Expect.login(ctx, e['as'].to_s))
      next({ 'ok' => false, 'want' => 'as', 'got' => 'no person' }) unless user

      place = e['gui_ext_rel'].to_s
      out = GkGuiStuff.scenario_with_looks_off(e['appearance_off']) do
        place == 'help_page' ? GkGuiStuff.scenario_help_rel(ctx, user) : GkGuiStuff.scenario_rel_links(ctx, user, place, e)
      end
      next out if out.key?('ok')

      href = out.delete('href')
      checks = []
      out.each do |where, html|
        a = GkGuiStuff.scenario_link(html, href)
        checks << ["#{where}: a link to #{href}", !a.nil?]
        GkGuiStuff.scenario_link_checks(a, e['has'] || {}).each { |k, ok| checks << ["#{where}: #{k}", ok] } if a
      end
      failed = checks.reject { |_k, ok| ok }.map(&:first)
      { 'ok' => checks.any? && failed.empty?, 'want' => checks.map(&:first).join(', '),
        'got' => failed.empty? ? 'ok' : "not: #{failed.join(', ')} (#{out.values.join(' | ')[0, 300]})" }
    end
  end

  # The instance's host as the scenarios render with it, and an address own:<path> on it
  # The status the instance answers for a path, to someone not signed in or, through the API with that person's key, to
  # user. A key this made for the check goes with it, and the API is on only for the check.
  def self.scenario_page_status(path, user = nil)
    who = ::User.current
    locale = ::I18n.locale
    api_was = ::Setting.rest_api_enabled?
    keyed = user && !::Token.where(user_id: user.id, action: 'api').exists?
    path = path.gsub('%{last_setting}') { ::GkRecordsAppearanceSetting.maximum(:id).to_s }
    env = { 'HTTP_HOST' => scenario_host.presence || 'localhost' }
    if user
      ::Setting.rest_api_enabled = '1' unless api_was
      env['HTTP_X_REDMINE_API_KEY'] = user.api_key
    end
    ::Rails.application.call(::Rack::MockRequest.env_for(path, env)).first
  ensure
    ::Setting.rest_api_enabled = '0' if user && !api_was
    ::Token.where(user_id: user.id, action: 'api').delete_all if keyed
    ::User.current = who
    ::I18n.locale = locale
  end

  # gui_gk_folders: true   where the plugins present keep their folders by default: <attachments>/gk/<plugin>/<folder>;
  # a plugin that is not in the instance is left out, and a folder set in a setting is that setting's own
  def self.scenario_gk_folders
    files = ::Attachment.storage_path
    want = { 'gui_stuff' => [External::Storage.default_dir, %w[gui_stuff link_previews]] }
    # an older GK Ops (before its folder under gk/) has no default folder of its own and is left out
    want['ops'] = [::GkOps::Backup.default_dir, %w[ops backups]] if defined?(::GkOps::Backup) && ::GkOps::Backup.respond_to?(:default_dir)
    want['icons'] = [::GkIcons::Packs.instance_root, %w[icon_packs]] if defined?(::GkIcons::Packs)
    want.reject { |_k, (got, parts)| File.expand_path(got) == File.expand_path(File.join(files, 'gk', *parts)) }
        .map { |k, (got, _parts)| "#{k}: #{got}" }
  end

  def self.scenario_host
    ::Setting.host_name.to_s.sub(%r{\A[a-z]+://}i, '').split('/').first.to_s
  end

  def self.scenario_own(href)
    href.to_s.start_with?('own:') ? "#{::Setting.protocol}://#{scenario_host}#{href.to_s.delete_prefix('own:')}" : href.to_s
  end

  # An inline template rendered by core's controller as the person, with the instance's host
  def self.scenario_render(ctx, user, controller, template, locals)
    host = scenario_host
    html = nil
    ctx.as(user) do
      html = controller.renderer.new('HTTP_HOST' => host.empty? ? 'localhost' : host).render(inline: template, locals: locals)
    end
    html.to_s
  end

  # The drawn places of gui_ext_rel: { 'href' => the address, <where> => html, ... }, or a finished answer
  def self.scenario_rel_links(ctx, user, place, e)
    bad = ->(want) { { 'ok' => false, 'want' => want, 'got' => '-' } }
    case place
    when 'field'
      iss = ::GkScenarios::Expect.issue_for(ctx, e['issue'].to_s)
      cf = ::IssueCustomField.find_by(name: ctx.scenario.t(:custom_fields, e['custom_field'].to_s))
      return bad.call('issue, field') unless iss && cf

      href = scenario_own(e['href'])
      if e.key?('value')
        v = ::CustomFieldValue.new(custom_field: cf, customized: iss, value: scenario_own(e['value']))
        return { 'href' => href, 'page' => scenario_render(ctx, user, ::IssuesController, '<%= show_value(v) %>', v: v) }
      end
      v = iss.custom_field_values.detect { |x| x.custom_field.id == cf.id }
      return bad.call("a value of #{e['custom_field']} on #{e['issue']}") unless v

      col = ::QueryCustomFieldColumn.new(cf)
      { 'href' => href, 'page' => scenario_render(ctx, user, ::IssuesController, '<%= show_value(v) %>', v: v),
        'list' => scenario_render(ctx, user, ::IssuesController, '<%= column_content(c, i) %>', c: col, i: iss) }
    when 'pattern'
      iss = ::GkScenarios::Expect.issue_for(ctx, e['issue'].to_s)
      return bad.call('issue') unless iss

      cf = ::IssueCustomField.new(name: 'gk-scenario-pattern', field_format: 'string')
      cf.url_pattern = e['pattern'].to_s
      v = ::CustomFieldValue.new(custom_field: cf, customized: iss, value: e['value'].to_s)
      { 'href' => e['href'].to_s, 'page' => scenario_render(ctx, user, ::IssuesController, '<%= show_value(v) %>', v: v) }
    when 'homepage'
      # projects/show draws the homepage so in every series
      { 'href' => e['href'].to_s,
        'page' => scenario_render(ctx, user, ::ApplicationController, '<%= link_to_if uri_with_safe_scheme?(u), u, u %>', u: e['href'].to_s) }
    when 'footer'
      # layouts/base draws it so in every series
      url = ::Redmine::Info.url
      { 'href' => url, 'page' => scenario_render(ctx, user, ::ApplicationController,
                                                 "<%= link_to n, u, target: '_blank', rel: 'noopener' %>", n: ::Redmine::Info.app_name, u: url) }
    when 'help_menu'
      item = ::Redmine::MenuManager.items(:top_menu).detect { |i| i.name == :help }
      return bad.call('the help item of the top menu') unless item

      { 'href' => item.url.to_s, 'page' => scenario_render(ctx, user, ::ApplicationController, '<%= link_to "?", u, o %>',
                                                           u: item.url.to_s, o: item.html_options) }
    else bad.call('field, pattern, homepage, footer, help_menu or help_page')
    end
  end

  # The wiki syntax help: HelpController's before action sets Referrer-Policy: no-referrer on the answer (asked of the
  # action's own method on a fresh answer, nothing drawn or saved), and the old after action that rewrote the page is
  # gone. ctx and user are as for the other places; the header is the same for everyone.
  def self.scenario_help_rel(_ctx, _user)
    filters = ::HelpController._process_action_callbacks.map { |c| [c.kind, c.filter] }
    hooked = filters.include?([:before, :gk_gui_stuff_referrer_policy])
    rewrites = filters.include?([:after, :gk_gui_stuff_external_rel])
    c = ::HelpController.new
    c.set_response!(::ActionDispatch::Response.new)
    c.send(:gk_gui_stuff_referrer_policy)
    policy = c.response.headers['Referrer-Policy']
    ok = hooked && !rewrites && policy == ExternalRel::REFERRER_POLICY
    { 'ok' => ok, 'want' => "before action, Referrer-Policy #{ExternalRel::REFERRER_POLICY}, no rewrite of the page",
      'got' => ok ? 'ok' : "hooked #{hooked}, rewrite #{rewrites}, policy #{policy.inspect}" }
  end

  # Appearance settings saved as off around the block in a transaction that is rolled back
  def self.scenario_with_looks_off(keys)
    keys = Array(keys).map(&:to_s)
    return yield if keys.empty?

    looks = GkGuiStuff.appearance_settings
    unknown = looks ? keys.reject { |k| looks.find(k) } : keys
    return { 'ok' => false, 'want' => 'appearance settings', 'got' => "unknown: #{unknown.join(', ')}" } if unknown.any?

    out = nil
    ::ActiveRecord::Base.transaction do
      looks.save!(modes: keys.to_h { |k| [k, 'off'] }, values: {}, reason: 'scenario', reason_key: 'gui_stuff.appearance')
      out = yield
      raise ::ActiveRecord::Rollback
    end
    out
  ensure
    looks&.forget!
  end

  # Appearance settings and functions as an expectation's turned_on says, around the block, in a transaction that is
  # rolled back. Not joinable, so that a transaction the block rolls back itself is a savepoint and stays that. When the
  # preview of external links is among them, what a save on the page empties is emptied too.
  def self.scenario_with_turned_on(on)
    on = on.to_h
    looks = appearance_settings
    feats = features
    modes = (on['appearance'] || {}).to_h { |k, v| [k.to_s, v == false ? 'off' : v.to_s] }
    values = (on['values'] || {}).to_h { |k, h| [k.to_s, h.to_h { |n, x| [n.to_s, x] }] }
    flags = (on['features'] || {}).to_h { |k, v| [k.to_s, v == true || v.to_s == 'on'] }
    unknown = (modes.keys + values.keys).reject { |k| looks&.find(k) } + flags.keys.reject { |k| feats&.find(k) }
    return { 'ok' => false, 'want' => 'declared settings and functions', 'got' => "unknown: #{unknown.join(', ')}" } if unknown.any?

    out = nil
    # decide from the table, not from memory: an earlier check that was rolled back may have left its values there
    looks&.forget!
    feats&.forget!
    ::ActiveRecord::Base.transaction(requires_new: true, joinable: false) do
      if modes.any? || values.any?
        ext = Appearance.key(External::ROW)
        before_mode = looks.mode(ext)
        before_domains = Array(looks.value(ext, 'domains'))
        looks.save!(modes: modes, values: values, reason: 'scenario', reason_key: 'gui_stuff.appearance')
        if modes.key?(ext) || values.key?(ext)
          External.settings_saved!(before_mode: before_mode, before_domains: before_domains, reason: 'scenario', user: ::User.current)
        end
      end
      flags.each { |k, v| feats.set!(k, v, reason: 'scenario') if feats.on?(k) != v }
      out = yield
      raise ::ActiveRecord::Rollback
    end
    out
  ensure
    looks&.forget!
    feats&.forget!
  end

  # The card endpoint's answer while the preview is off: the level saved as off in a transaction that is rolled back
  # (no emptying runs, so the kept cards stay), the address asked for, and the number of rows compared, so that off
  # means nothing queued. The Result, or :kept_a_row when the request left a row behind.
  def self.scenario_request_when_off(ctx, user, url)
    looks = GkGuiStuff.appearance_settings
    return nil unless looks

    res = nil
    ::ActiveRecord::Base.transaction do
      looks.save!(modes: { Appearance.key(External::ROW) => 'off' }, values: {}, reason: 'scenario',
                  reason_key: 'gui_stuff.appearance')
      before = ::GkGuiStuffLinkPreview.count
      ctx.as(user) { res = External::Queue.request(url, user) }
      res = :kept_a_row if ::GkGuiStuffLinkPreview.count != before
      raise ::ActiveRecord::Rollback
    end
    res
  ensure
    looks&.forget!
  end

  # A person's first and second ask of an address, in a transaction that is rolled back and with the person's record
  # of asked addresses emptied first, so that the check answers the same each time it runs; after: another person
  # asks twice first, which must not give this person the card at the first ask. -> "first,second", such as
  # "queued,ready"
  def self.scenario_request_twice(ctx, user, url, after)
    other = after ? ::User.find_by(login: ::GkScenarios::Expect.login(ctx, after.to_s)) : nil
    return nil if after && other.nil?

    ask = lambda do |u|
      r = nil
      ctx.as(u) { r = External::Queue.request(url, u) }
      r.state.to_s
    end
    out = nil
    ::ActiveRecord::Base.transaction do
      # the person's count of new addresses this hour is in the cache and no transaction takes it back: a second run within
      # the hour would otherwise be refused
      [other, user].compact.each { |u| External::Asks.forget!(u); ::Rails.cache.delete(External::Policy.person_hour_key(u.id, ::Time.current)) }
      2.times { ask.call(other) } if other
      out = Array.new(2) { ask.call(user) }.join(',')
      raise ::ActiveRecord::Rollback
    end
    out
  end

  # Queued rows on the address's domain until the queue holds its most (queue_max)
  def self.scenario_fill_queue!(url)
    model = ::GkGuiStuffLinkPreview
    norm = External::Queue.normalize(url) or return
    host = URI.parse(norm).host
    now = Time.current
    (External.setting('queue_max').to_i - model.queued.count).times do |i|
      u = "https://#{host}/gk-scenario-queue/#{i + 1}"
      model.create!(url: u, url_digest: model.digest(u), domain: host, state: 'queued', queued_at: now, seen_at: now)
    end
  end

  # What gui_ext_link and gui_ext_rel compare on one link (no_rel: true, neither noopener nor noreferrer)
  # The attributes of the drawn link to href, as GK Core Stuff's pass over formatted text hands each link with its
  # address (the same pass that hands this plugin its links), or nil when there is no such link or no pass; the pass
  # is given only the reader, so nothing is changed
  LINK_ATTRIBUTES = %w[href class rel title target data-gk-gui-ext-preview].freeze
  def self.scenario_link(html, href)
    pass = defined?(::GkCoreStuff::FormattingProcessors) ? ::GkCoreStuff::FormattingProcessors : nil
    return nil unless pass

    found = nil
    reader = lambda do |link, _context|
      found ||= LINK_ATTRIBUTES.to_h { |k| [k, link[k]] } if link.url == href
    end
    pass.process(html.to_s, nil, link: [reader], text: [])
    found
  end

  # has: what the link (its attributes by name) is to have
  def self.scenario_link_checks(a, has)
    classes = a['class'].to_s.split
    rel = a['rel'].to_s.split
    checks = []
    Array(has['rel']).join(' ').split.each { |r| checks << ["rel #{r}", rel.include?(r)] }
    checks << ['no rel noopener noreferrer', !rel.include?('noopener') && !rel.include?('noreferrer')] if has['no_rel'] == true
    Array(has['class']).join(' ').split.each { |c| checks << ["class #{c}", classes.include?(c)] }
    Array(has['no_class']).join(' ').split.each { |c| checks << ["no class #{c}", !classes.include?(c)] }
    checks << ["title has #{has['title_has']}", a['title'].to_s.include?(has['title_has'].to_s)] if has['title_has']
    if has['title_once']
      d = has['title_once'].to_s
      checks << ["title has #{d} once", !d.empty? && a['title'].to_s.scan(d).size == 1]
    end
    if has.key?('target')
      want = has['target'].to_s
      checks << ["target #{want}", want == 'none' ? a['target'].nil? : a['target'] == want]
    end
    marked = External.signed?(a['href'], a['data-gk-gui-ext-preview'])
    checks << ["preview #{has['preview']}", marked == (has['preview'] == true)] if has.key?('preview')
    checks
  end
end
