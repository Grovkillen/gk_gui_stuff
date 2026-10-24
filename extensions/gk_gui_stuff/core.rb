# frozen_string_literal: true

module GkGuiStuff
  # The modules and who may switch them off. Three levels: the instance: every module on or off, and Core-like, which
  # switches everything off at once the administrator's grant: whether users may choose for themselves, per module and
  # for Core-like the user: Core-like for me, and each module the grant covers A module marked safety (the instance
  # banner, when it is built) is never the user's to switch off; the administrator still can. A module that is off
  # loads nothing: no script, no stylesheet, the page is core's.
  # kernel: the module needs the shared client kernel (gk_gui_stuff_core.js: one content observer, the notice, local
  # memory). texts: locale keys the script needs. anonymous: also loaded for someone not logged in (then only the
  # instance's switch counts, there is no user to choose). options: a lambda giving the module's values to the script.
  # A module is off in a new installation unless declared on (default: true); always: true is forced on and cannot be
  # switched off (actions_menu, the only way other plugins put their buttons on an issue)
  # needs: a lambda that says whether what the module shows exists in the instance (user_status needs a source,
  # which readup registers). A module whose need is not met is not there at all: not on the page, not in the
  # settings, not under My account; what was chosen for it stays stored and counts again when the need is met.
  Mod = Struct.new(:key, :label_key, :text_key, :safety, :default, :script, :stylesheet, :kernel, :texts, :anonymous, :options, :group, :elements,
                   :always, :needs, :recommended, keyword_init: true)

  module Registry
    module_function

    def all = (@all ||= {})

    def register(key, label_key: nil, text_key: nil, safety: false, default: false, script: nil, stylesheet: nil, kernel: false, texts: [],
                 anonymous: false, options: nil, group: nil, elements: false, always: false, needs: nil, recommended: nil)
      all[key.to_s] = Mod.new(key: key.to_s, label_key: label_key || :"label_gk_gui_stuff_mod_#{key}", text_key: text_key || :"text_gk_gui_stuff_mod_#{key}",
                              safety: safety, default: default, script: script, stylesheet: stylesheet, kernel: kernel, texts: texts,
                              anonymous: anonymous, options: options, group: group, elements: elements, always: always, needs: needs, recommended: recommended)
    end

    def find(key) = all[key.to_s]

    def present?(mod)
      mod.needs.nil? || mod.needs.call ? true : false
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] module #{mod.key} left out: #{e.class} #{e.message}")
      false
    end

    # The modules that are there in this instance (the ones to list, switch and load)
    def present = all.select { |_k, m| present?(m) }
  end

  module Switches
    module_function

    def settings
      s = Setting.plugin_gk_gui_stuff
      s.is_a?(Hash) ? s : {}
    end

    def flag(value, default)
      value.nil? || value.to_s == '' ? default : value.to_s == '1'
    end

    def mod_settings(key) = (settings['modules'].is_a?(Hash) ? settings['modules'][key.to_s] : nil) || {}

    def instance_core_like? = flag(settings['core_like'], false)
    def user_core_like_allowed? = flag(settings['user_core_like'], true)
    # The administrator's choice per module: off, optional (on, and each person may switch it off) or forced (on
    # for everyone). Stored as mode; enabled and user_choice from before are still read when there is no mode.
    MODES = %w[off optional forced].freeze

    def mode(mod)
      return 'forced' if mod.always

      m = mod_settings(mod.key)['mode'].to_s
      return (mod.safety && m == 'optional' ? 'forced' : m) if MODES.include?(m)
      return 'off' unless flag(mod_settings(mod.key)['enabled'], mod.default)

      !mod.safety && flag(mod_settings(mod.key)['user_choice'], true) ? 'optional' : 'forced'
    end

    def enabled?(mod) = mode(mod) != 'off'

    # GK's recommendation (the button on the settings page): what the module declares, else on with each person free to
    # switch it off (an instance module: forced)
    def recommended(mod) = mod.always ? 'forced' : (mod.recommended || (mod.safety ? 'forced' : 'optional'))

    # The modules a person may choose about; with none, there is no page of one's own to show
    def optional = Registry.present.values.select { |m| user_choice?(m) }
    # Also when there are buttons the person may move out or into the menu
    def user_page? = (!instance_core_like? && optional.any?) || (defined?(Personal) && Personal.all.values.any?(&:counter)) ||
                     (defined?(Menu) && Menu.all.any? && Menu.on_for?)
    def user_choice?(mod) = mode(mod) == 'optional'

    # What the user has chosen, only as far as the administrator allows it right now
    def user_core_like?(user)
      user_core_like_allowed? && GkGuiStuffUserSetting.for(user).data['core_like'].to_s == '1'
    end

    def user_off?(mod, user)
      return false unless user_choice?(mod)

      (GkGuiStuffUserSetting.for(user).data['modules'] || {})[mod.key].to_s == '0'
    end

    def on_for?(mod, user = User.current)
      return false if instance_core_like? || !enabled?(mod) || !Registry.present?(mod)
      return true if mod.safety

      !(user_core_like?(user) || user_off?(mod, user))
    end

    def active(user = User.current)
      return Registry.present.values.select { |m| m.anonymous && !instance_core_like? && enabled?(m) } unless user.logged?

      Registry.present.values.select { |m| on_for?(m, user) }
    end

    def int(key, default, min = 1)
      raw = settings[key.to_s].to_s
      return default unless raw.match?(/\A\d+\z/)

      v = raw.to_i
      v >= min ? v : default
    end
  end

  # link_preview: one neutral card for every linkable object. A type is registered with the path its links
  # have and a renderer that builds the card for the current user, or nil when the user may not see the
  # object. Types without a registration get no card (nothing is scraped).
  module Preview
    Type = Struct.new(:key, :pattern, :renderer, :plugin, keyword_init: true)

    module_function

    def all = (@all ||= {})

    # pattern: a JavaScript regular expression source for the path (without the url root), first group the id
    def register(key, pattern:, plugin:, &renderer)
      all[key.to_s] = Type.new(key: key.to_s, pattern: pattern, renderer: renderer, plugin: plugin.to_s)
    end

    def find(key) = all[key.to_s]

    def card(key, id, view)
      t = find(key)
      t && t.renderer.call(id, User.current, view)
    end

    def excerpt(text, max = 220)
      s = text.to_s.gsub(/\s+/, ' ').strip
      s.length > max ? "#{s.first(max).rstrip}..." : s
    end

    # A time as the user reads it: the user's zone, else the server's (as core's format_time)
    def time(t, user)
      local = user.time_zone ? t.in_time_zone(user.time_zone) : t.localtime
      ::I18n.l(local, format: :short)
    end

    def names(list, max = 8)
      shown = list.first(max).map(&:to_s)
      rest = list.size - shown.size
      rest.positive? ? "#{shown.join(', ')} #{::I18n.t(:text_gk_gui_stuff_and_more, count: rest)}" : shown.join(', ')
    end

    # Core's own types, registered by gui_stuff itself
    def register_core!
      register('issue', pattern: '^/issues/(\\d+)$', plugin: :gk_gui_stuff) do |id, user, _view|
        i = ::Issue.visible(user).find_by(id: id)
        i && {
          title: "#{i.tracker.name} ##{i.id}: #{i.subject}", subtitle: i.project.name,
          badges: [i.status.name, i.priority&.name].compact,
          text: excerpt(i.description),
          fields: [[::I18n.t(:field_assigned_to), i.assigned_to&.name || '-'], [::I18n.t(:field_author), i.author&.name.to_s],
                   [::I18n.t(:field_updated_on), time(i.updated_on, user)]]
        }
      end
      register('user', pattern: '^/users/(\\d+)$', plugin: :gk_gui_stuff) do |id, user, _view|
        u = ::User.visible(user).find_by(id: id)
        # the login and the marks Administratör and Låst are for administrators only; anyone else sees the name
        staff = user.admin?
        u && {
          title: u.name, subtitle: (staff ? u.login : ''),
          badges: (staff ? [u.admin? ? ::I18n.t(:field_admin) : nil, u.locked? ? ::I18n.t(:status_locked) : nil].compact : []),
          text: '',
          fields: [[::I18n.t(:label_group_plural), names(u.groups.givable.visible(user).map(&:name)).presence || '-']]
        }
      end
      # a group (core links it to its page, as in the Members box): who is in it, only the people the reader may see
      register('group', pattern: '^/groups/(\\d+)$', plugin: :gk_gui_stuff) do |id, user, _view|
        g = ::Group.givable.visible(user).find_by(id: id)
        g && {
          title: g.name, subtitle: '', badges: [], text: '',
          fields: [[::I18n.t(:label_user_plural), names(g.users.active.visible(user).sorted.map(&:name)).presence || '-']]
        }
      end
    end
  end

  # The user's own choice is an event on the person. Written only when records and the user target are there.
  module Choices
    KIND = 'gui_choice_changed'

    module_function

    def record(user, changes)
      return if changes.empty? || !defined?(::GkRecords) || !::GkRecords::Targets.find('user') || !::GkRecords::Kinds.find(:event, KIND)

      ::GkRecords::Events.write(user, KIND, details: changes, user: User.current.logged? ? User.current : nil)
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] choice not recorded for user #{user.id}: #{e.message}")
    end
  end

  def self.register_records!
    Features.register_records!
    ::GkRecords::Kinds.register_event(Choices::KIND, plugin: :gk_gui_stuff, label_key: 'label_gk_gui_stuff_event_choice_changed', target: 'user')
  end

  # The modules that are only a rule on core's markup (CSS in the head when the module is on); a lambda gives a rule
  # that takes a value from the settings
  CORE_RULES = {
    # short_descriptions: a project's description in a list (Administration > Projects, the project list) is cut
    # after the set number of lines with "...", the whole text as the cell's tooltip (gk_gui_stuff_short_descriptions.js)
    'short_descriptions' => lambda {
      n = Switches.int('description_lines', 1, 1)
      "table.list td.short_description > .wiki { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: #{n}; line-clamp: #{n}; overflow: hidden; } " \
        'table.list td.short_description > .wiki > * { margin-block: 0; }'
    }
  }.freeze unless const_defined?(:CORE_RULES, false)

  class Hooks < Redmine::Hook::ViewListener
    # Only what is on for this user is loaded; with nothing on, the head is core's
    def view_layouts_base_html_head(context = {})
      always = instance_head(context[:controller])
      # core's password confirmation (sudo mode) is rendered in place of the page asked for: it is not that page,
      # so nothing of ours is loaded on it but the instance band
      return always if context[:controller]&.instance_variable_get(:@sudo_form)

      mods = Switches.active
      return always if mods.empty?

      cfg = { urlRoot: Redmine::Utils.relative_url_root.to_s, modules: mods.map(&:key), logged: User.current.logged? }
      # the kernel's own word (copy without a word of its own) travels with every module that loads the kernel
      texts = mods.flat_map { |m| Array(m.texts) } + (mods.any?(&:kernel) ? [:gk_gui_stuff_copied] : [])
      cfg[:t] = texts.uniq.to_h { |k| [k.to_s.sub('gk_gui_stuff_', ''), ::I18n.t(k)] }
      cfg[:opt] = mods.select(&:options).to_h { |m| [m.key, m.options.call] }
      # fold's limits travel under the primitive's name with whichever fold module is on
      cfg[:opt]['fold'] = { height: Switches.int('fold_height_px', 320, 80), attachments: Switches.int('fold_attachments', 6, 2), newest: Switches.flag(Switches.settings['attachments_newest'], false) } if mods.any? { |m| m.group == :fold }
      if mods.any? { |m| m.key == 'link_preview' }
        cfg[:preview] = { delay: Switches.int('preview_delay_ms', 500, 0),
                          types: Preview.all.values.map { |t| { key: t.key, pattern: t.pattern } },
                          loading: ::I18n.t(:label_loading), open: ::I18n.t(:button_gk_gui_stuff_open) }
      end
      if mods.any? { |m| m.key == 'report_clarity' }
        cfg[:report] = %i[group_status group_sum group_total closed_status total_note chart_by_row chart_by_status].to_h { |k| [k, ::I18n.t(:"label_gk_gui_stuff_rep_#{k}")] }
      end
      if mods.any?(&:elements)
        page = Page.of(context[:controller])
        cfg[:page] = page
        # the project tabs as Redmine, with icon and text, or with the icon only (Menu.icons, the area tabs)
        tabs = Menu.icons('tabs')
        cfg[:tabs_icons] = tabs unless tabs == 'core'
        # the sidebar's place and the header's height where they differ from core's (Menu.layout)
        cfg[:layout] = Menu.layout_classes
        if mods.any? { |m| m.key == 'actions_menu' }
          area = Menu.area_for(page)
          cfg[:menu] = Menu.rows_for(page)
          cfg[:core_icons] = Menu.core_icon_selectors(User.current, area)
          cfg[:core_fill] = Menu.core_fill(context[:controller]&.view_context, User.current, area)
          # the area's buttons to the right as icons only, but core's buttons with a choice of their own that keeps the text
          if Menu.icons(area) == 'icon'
            cfg[:all_icons] = true
            cfg[:core_text] = Menu.core_text_selectors(User.current, area)
          end
        end
        cfg[:view] = ViewStates.for(User.current)
        # branch_jump: the current project's branch comes with the page (one grouped count), so the click on the
        # sign needs no request at all; other levels of a deep breadcrumb are fetched when asked for
        project = context[:controller]&.instance_variable_get(:@project)
        if project&.persisted? && mods.any? { |m| m.key == 'branch_jump' }
          tab = { 'issues' => 'issues', 'wiki' => 'wiki', 'activities' => 'activity', 'versions' => 'roadmap' }[context[:controller].controller_name].to_s
          cfg[:branch] = { project.identifier => Branch.of(project, User.current, tab) }
        end
        cfg[:opt]['elements'] = { notice_ms: Switches.int('notice_seconds', 6, 4) * 1000, wave_opacity: Switches.int('wave_opacity_pct', 60, 0).clamp(0, 100) / 100.0,
                                  corner_max: Switches.int('corner_max_entries', 20, 1),
                                  notice_countdown: Switches.flag(Switches.settings['notice_countdown'], true) }
        cfg[:opt]['beat'] = { seconds: Switches.settings['beat_seconds'].to_s == '' ? 30 : Switches.settings['beat_seconds'].to_i }
      end
      sheets = mods.filter_map(&:stylesheet)
      sheets << 'gk_gui_stuff_elements' if mods.any?(&:elements)
      tags = sheets.uniq.map { |s| stylesheet_link_tag(s, plugin: 'gk_gui_stuff') }
      tags << content_tag('script', json_escape(cfg.to_json).html_safe, type: 'application/json', id: 'gk-gui-stuff-stuff-config')
      scripts = mods.filter_map(&:script).uniq
      scripts.unshift('gk_gui_stuff_elements') if mods.any?(&:elements)
      scripts.unshift('gk_gui_stuff_core') if mods.any?(&:kernel)
      tags.concat(scripts.map { |s| javascript_include_tag(s, plugin: 'gk_gui_stuff') })
      tags << content_tag('style', CustomMark.css.html_safe, id: 'gk-gui-stuff-custom-mark') if mods.any? { |m| m.key == 'custom_mark' }
      # Modules that are only a rule on core's markup: the rule in the head, with its own id, when the module is on
      mods.each do |m|
        css = CORE_RULES[m.key]
        css = css.call if css.respond_to?(:call)
        tags << content_tag('style', css.html_safe, id: "gk-gui-stuff-#{m.key.tr('_', '-')}") if css
      end
      safe_join([always] + tags, "\n")
    end

    # What never depends on a switch: the instance band's stylesheet and title (where one is must always show),
    # and declutter's rule (unless Core-like is on for everyone)
    def instance_head(ctrl = nil)
      out = []
      if Instance.word
        out << stylesheet_link_tag('gk_gui_stuff_elements', plugin: 'gk_gui_stuff')
        out << javascript_tag("document.title = #{"[#{Instance.word}] ".to_json} + document.title;")
      end
      on = Switches.active
      # wave: its stylesheet early, for the wave the body's first script draws (wave_carry below)
      if on.any? { |m| m.key == 'wave' }
        pct = Switches.int('wave_opacity_pct', 60, 0).clamp(0, 100) / 100.0
        out << stylesheet_link_tag('gk_gui_stuff_elements', plugin: 'gk_gui_stuff')
      end
      # A box (core's.warning and.nodata, centred) aligned to the start or the end by the one writing the view; logical,
      # so it follows the language's direction
      out << content_tag('style', ('.gk-gui-stuff-align-start, .warning.gk-gui-stuff-align-start, .nodata.gk-gui-stuff-align-start { text-align: start; } ' \
                                   '.gk-gui-stuff-align-end, .warning.gk-gui-stuff-align-end, .nodata.gk-gui-stuff-align-end { text-align: end; }').html_safe, id: 'gk-gui-stuff-align')
      # The account menu's dropdown keeps core's link colours on its light surface: a rule for the top menu's links
      # (a theme's light text on a dark bar) must not reach the items, so this one outranks such a rule by its two ids
      out << content_tag('style', ('#top-menu #account .dropdown-content a, #top-menu #account .dropdown-content a:visited { color: var(--oc-blue-9); } ' \
                                   '#top-menu #account .dropdown-content a:hover { color: var(--oc-blue-9); background-color: var(--oc-gray-1); text-decoration: none; }').html_safe,
                         id: 'gk-gui-stuff-account-menu')
      # GK lists: on GK's own pages (a controller named gk_*) the columns of projects and people at the start and every
      # heading set as its cells, whatever modules are on; core's pages are left as they are
      if ctrl.respond_to?(:controller_name) && ctrl.controller_name.to_s.start_with?('gk_')
        out << stylesheet_link_tag('gk_gui_stuff_gk_lists', plugin: 'gk_gui_stuff')
        out << javascript_include_tag('gk_gui_stuff_gk_lists', plugin: 'gk_gui_stuff')
      end
      dm = Registry.find('declutter')
      css = dm && Switches.active.include?(dm) ? Declutter.css : ''
      out << content_tag('style', css.html_safe, id: 'gk-gui-stuff-declutter') if css.present?
      safe_join(out, "\n")
    end

    # instance_banner: the band on every page, also the login page. Not closable, not a module.
    def view_layouts_base_body_top(context = {})
      word = Instance.word
      return wave_carry(context) unless word

      name = Instance.data['instance'].presence || Instance.data['name']
      tag = Instance.copy_tag
      label = if name.present? && tag
                content_tag('button', name, type: 'button', class: 'gk-gui-stuff-instance-copy', title: ::I18n.t(:text_gk_gui_stuff_instance_copy),
                                            data: { tag: tag, done: ::I18n.t(:text_gk_gui_stuff_instance_copied) })
              elsif name.present?
                content_tag('small', name)
              end
      band = content_tag('div', safe_join([word, label].compact), class: "gk-gui-stuff-instance gk-gui-stuff-instance-#{Instance.css_key}", role: 'note')
      return band + wave_carry(context) unless tag

      script = javascript_tag("(function(){var b=document.querySelector('.gk-gui-stuff-instance-copy');if(!b)return;var n=b.textContent;b.addEventListener('click',function(){" \
                              "var t=b.dataset.tag,ok=function(){b.textContent=b.dataset.done;setTimeout(function(){b.textContent=n;},1400);};" \
                              "if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(ok,function(){});}else{var a=document.createElement('textarea');a.value=t;" \
                              "a.style.position='fixed';a.style.top='-1000px';document.body.appendChild(a);a.select();try{if(document.execCommand('copy'))ok();}catch(e){}a.remove();}});})();")
      band + script + wave_carry(context)
    end

    # The wave carried over from the page before (SPARAR, KÖRS): drawn by the body's first script, before the first
    # paint, as the real wave element in the state the page that sent the form left it.
    # The outcome comes with this page from the server (the flash: notice or error), so the
    # same script glides from waiting to the outcome at once, colour and word in one movement, with nothing between.
    # Fresh is counted from when the page was left, not from the click (a run of minutes is still the same wave). A wave
    # the person closed is not drawn; its outcome goes to the notice (the kernel). The kernel adopts the same element.
    def wave_carry(context = {})
      m = Registry.find('wave')
      return ''.html_safe unless m && User.current.logged? && Switches.on_for?(m)
    
      pct = Switches.int('wave_opacity_pct', 60, 0).clamp(0, 100) / 100.0
      delay = Switches.int('wave_start_delay_ms', 0, 0)
      fl = context[:controller]&.flash
      outcome = if fl && fl[:error].present? then { kind: 'error', text: ActionController::Base.helpers.strip_tags(fl[:error].to_s).squish.first(160) }
                elsif fl && fl[:notice].present? then { kind: 'done', text: ActionController::Base.helpers.strip_tags(fl[:notice].to_s).squish.first(160) }
                end
      javascript_tag(<<~JS.gsub(/\n\s*/, ''))
        (function(){try{
        var w=JSON.parse(sessionStorage.getItem('gkguistuff.wave')||'null'),out=#{json_escape(outcome.to_json)},now=Date.now();
        sessionStorage.removeItem('gkguistuff.wave');window.gkGuiStuffWaveHanded=w||false;window.gkGuiStuffWaveOutcome=out||false;
        if(!w||now-(w.left||w.at)>30000||now-w.at<#{delay}||w.dismissed)return;
        var d=document,e=function(c,p){var n=d.createElement('div');n.className=c;p.appendChild(n);return n;},v=d.createElement('div');
        v.id='gk-gui-stuff-wave';v.className='gk-gui-stuff-wave gk-gui-stuff-wave-'+(w.level==='running'?'running':'done')+' gk-gui-stuff-wave-waiting gk-gui-stuff-wave-on gk-gui-stuff-wave-born';
        e('gk-gui-stuff-wave-backdrop',v).style.opacity='#{pct}';e('gk-gui-stuff-wave-motion',v);var t=e('gk-gui-stuff-wave-text',v);
        var wd=e('gk-gui-stuff-wave-word',t),ln=e('gk-gui-stuff-wave-line',t);wd.textContent=String(w.word).toUpperCase();ln.textContent=String(w.text||'');d.body.appendChild(v);
        if(!out){setTimeout(function(){if(v.classList.contains('gk-gui-stuff-wave-born'))v.classList.remove('gk-gui-stuff-wave-on');},8000);return;}
        var word=String(out.kind==='error'?(w.failed||'Fel'):(w.done||'')).toUpperCase();
        requestAnimationFrame(function(){requestAnimationFrame(function(){
        v.dataset.carried='1';v.className='gk-gui-stuff-wave gk-gui-stuff-wave-'+(out.kind==='error'?'error':'done')+' gk-gui-stuff-wave-on';
        if(word&&word!==wd.textContent){var o=wd.cloneNode(true);o.className='gk-gui-stuff-wave-word gk-gui-stuff-wave-word-out';t.insertBefore(o,wd);wd.textContent=word;wd.classList.add('gk-gui-stuff-wave-word-in');setTimeout(function(){o.remove();},450);}
        ln.textContent=out.text||'';v.dataset.outcome=out.kind;});});
        }catch(x){}})();
      JS
    end
    
    # footer_text: the instance's own line at the bottom of every page, one line through core's text formatting (bold,
    # links with a text of their own, icons; an address becomes a link as in any text). <version> is Redmine's version
    # as core_stuff gives it (GkCoreStuff::FooterVersion), and nothing without core_stuff.
    # Also the page's data and the pulse (page_data.rb), for one logged in, whatever is switched on
    def view_layouts_base_body_bottom(context = {})
      out = [page_package(context)]
      m = Registry.find('footer_text')
      text = Switches.settings['footer_text'].to_s.strip.lines.first.to_s.strip
      if m && text.present? && Switches.active.include?(m)
        version = defined?(::GkCoreStuff::FooterVersion) ? ::GkCoreStuff::FooterVersion.version.to_s : ''
        text = text.gsub('<version>', version).squeeze(' ').strip
        html = context[:hook_caller].textilizable(text).to_s.strip.sub(%r{\A<p>(.*)</p>\z}m, '\1')
        out << content_tag('div', html.html_safe, class: 'gk-gui-stuff-footer-text')
      end
      safe_join(out.compact, "\n")
    end

    # window.gkGuiStuffPage: the page's data from every plugin that gives some, and the pulse's address; then the pulse
    def page_package(context)
      return nil unless User.current.logged?
      return nil if PageData.providers.empty? && !Pulse.any?

      view = context[:hook_caller]
      data = PageData.build(view, context[:controller])
      pkg = { data: data }
      pkg[:pulse] = { url: "#{Redmine::Utils.relative_url_root}/gk_gui_stuff/pulse", seconds: Pulse.seconds } if Pulse.any?
      tags = [javascript_tag("window.gkGuiStuffPage = #{json_escape(pkg.to_json)};".html_safe)]
      tags << javascript_include_tag('gk_gui_stuff_pulse', plugin: 'gk_gui_stuff') if Pulse.any?
      safe_join(tags, "\n")
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] page package failed: #{e.class}: #{e.message}")
      nil
    end

    # help_link: the top menu's Hjälp leads where the instance says (Help.target); core's link stays in the HTML
    # and is pointed elsewhere, so that with the module off the page is core's
    def view_layouts_base_content(context = {})
      m = Registry.find('help_link')
      return '' unless m && Switches.active.include?(m)

      t = Help.target(Page.of(context[:controller]))
      return '' unless t

      javascript_tag("(function(){document.querySelectorAll('#top-menu a.help, .js-flyout-menu a.help').forEach(function(a){a.href=#{t[:href].to_json};" \
                     "#{t[:new_tab] ? '' : "a.removeAttribute('target');"}});})();")
    end

    # Mitt konto: the link to the person's own choices
    def view_my_account_contextual(_context = {})
      return '' unless Switches.user_page? # Gone when there is nothing to choose

      link_to(sprite_icon('settings', ::I18n.t(:label_gk_gui_stuff_my)), Rails.application.routes.url_helpers.gk_gui_stuff_my_path, class: 'icon icon-settings')
    end
  end
end

module GkGuiStuff
  # members_by_group: the members box with only what was added directly. A role a person has through a group
  # (member_roles.inherited_from) is the group's line, not the person's; a person added directly as well keeps
  # the direct role.
  module Members
    module_function

    def direct_by_role(project)
      project.memberships.active.includes(:principal, member_roles: :role).each_with_object({}) do |m, h|
        m.member_roles.each do |mr|
          next if mr.inherited_from.present? || mr.role.nil?

          (h[mr.role] ||= []) << m.principal unless h[mr.role]&.include?(m.principal)
        end
      end
    end
  end
end
