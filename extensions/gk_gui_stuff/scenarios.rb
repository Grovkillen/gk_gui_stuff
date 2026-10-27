# frozen_string_literal: true

module GkGuiStuff
  # gui_stuff in scenarios: what the server decides for a module (the browser parts are tried by hand).
  #   gui_due_soon: <issue key>, days: N, equals: true|false   the issue counts as due soon with the limit N
  #   gui_overdue_class: <issue key>, equals: true|false        core's class overdue on the issue (what overdue_mark draws)
  #   gui_menu_row: <row key>, page: issue|issue_list, issue: <key>, project: <key>, as: <user>, placement: out|icon|menu,
  #                 equals: true|false   the row is among the page's rows for that person, standing where said
  #   gui_admin_group: <row name in core's administration menu>, equals: <group key or free tag>   the group the row stands in
  def self.register_scenarios!
    return unless defined?(::GkScenarios::Expect)

    # A new installation has only some modules on, so the scenario says which it uses: gui_stuff: { modules: {
    # user_status: optional, collapse_all: optional }, features: { tags.marks: true } } modules get their mode in
    # gui_stuff's settings; features are switched in gk_records' register with set! (each an event), as on the page
    ::GkScenarios::Steps.register('gui_stuff', plugin: :gk_gui_stuff, order: 20) do |ctx|
      feats = GkGuiStuff.features
      feats&.forget! # emptying the instance cleared the table behind the process's memory
      data = ctx.scenario.data['gui_stuff'] || {}
      mods = (data['modules'] || {}).to_h { |k, v| [k.to_s, v.to_s] }
      if mods.any?
        s = Switches.settings.deep_dup
        s['modules'] = s['modules'].is_a?(Hash) ? s['modules'] : {}
        changed = mods.select { |k, v| Switches::MODES.include?(v) && s['modules'].dig(k, 'mode') != v }
        changed.each { |k, v| s['modules'][k] = (s['modules'][k] || {}).merge('mode' => v) }
        ::Setting.plugin_gk_gui_stuff = s if changed.any?
        ctx.note(:gui_modules, 'modules', nil, changed.any?)
      end
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
  end
end
