# frozen_string_literal: true

module GkGuiStuff
  # The modules: what each loads. Whether a module is on, and for whom, is its appearance setting in records' register
  # (Appearance, appearance.rb): off, optional (on, and each person may switch it off) or forced, and for a setting
  # that applies to all or none only off and forced. Every module is off in a new installation, and without records
  # every module is off. A module that is off loads nothing: no script, no stylesheet, the page is core's.
  # kernel: the module needs the shared client kernel (gk_gui_stuff_core.js: one content observer, the notice, local
  # memory). texts: locale keys the script needs. anonymous: also loaded for someone not logged in (then only the
  # instance's level counts, there is no user to choose). options: a lambda giving the module's values to the script.
  # always: true is forced on and cannot be switched off (actions_menu, the only way other plugins put their buttons on
  # an issue); it has no appearance setting.
  # needs: a lambda that says whether what the module shows exists in the instance (user_status needs a source,
  # which readup registers). A module whose need is not met loads nothing; what was chosen for it stays stored and
  # counts again when the need is met.
  Mod = Struct.new(:key, :label_key, :text_key, :script, :stylesheet, :kernel, :texts, :anonymous, :options, :group, :elements,
                   :always, :needs, keyword_init: true)

  module Registry
    module_function

    def all = (@all ||= {})

    def register(key, label_key: nil, text_key: nil, script: nil, stylesheet: nil, kernel: false, texts: [],
                 anonymous: false, options: nil, group: nil, elements: false, always: false, needs: nil)
      all[key.to_s] = Mod.new(key: key.to_s, label_key: label_key || :"label_gk_gui_stuff_mod_#{key}", text_key: text_key || :"text_gk_gui_stuff_mod_#{key}",
                              script: script, stylesheet: stylesheet, kernel: kernel, texts: texts,
                              anonymous: anonymous, options: options, group: group, elements: elements, always: always, needs: needs)
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

    # The plugin's own settings: the top menu's words, the counters' cache time, the Meaning modes of GK's page types
    # and the grant of Like Redmine for me; the modules' levels and values are in records' register
    def settings
      s = Setting.plugin_gk_gui_stuff
      s.is_a?(Hash) ? s : {}
    end

    def flag(value, default)
      value.nil? || value.to_s == '' ? default : value.to_s == '1'
    end

    MODES = %w[off optional forced].freeze

    # The module's level: its appearance setting's, forced for a module always on, off without records
    def mode(mod) = mod.always ? 'forced' : Appearance.mode(mod.key)

    def enabled?(mod) = mode(mod) != 'off'

    # The modules a person may choose about
    def optional = Registry.present.values.select { |m| user_choice?(m) }
    # A page of one's own when an appearance setting the page shows is optional (a core page type's view is chosen on
    # the page itself), or while the person has Like Redmine for me on, so that the switch back stays reachable
    def user_page?(user = ::User.current)
      r = GkGuiStuff.appearance_settings
      return false unless r

      r.optional.any? { |x| !x.key.start_with?(Meaning.row_key('')) } || r.redmine_for?(user)
    end
    def user_choice?(mod) = mode(mod) == 'optional'

    # Whether the administrator lets each person choose Like Redmine for me
    def user_core_like_allowed? = flag(settings['user_core_like'], true)

    # What the person has chosen, only as far as the administrator allows it right now
    def user_core_like?(user) = (r = GkGuiStuff.appearance_settings) ? r.redmine_for?(user) : false

    def user_off?(mod, user) = user_choice?(mod) && Registry.present?(mod) && !on_for?(mod, user)

    # On for the person: a module always on for everyone logged in (and anonymous ones for anyone), the others by their
    # appearance setting; never when its need is not met
    def on_for?(mod, user = User.current)
      return false unless Registry.present?(mod)
      return user&.logged? || mod.anonymous if mod.always

      Appearance.on_for?(mod.key, user)
    end

    def active(user = User.current) = Registry.present.values.select { |m| on_for?(m, user) }

    # A value of one of gui_stuff's appearance settings or shared values (the setting's name without gui_stuff.), the
    # fallback without records
    def value(row, name, fallback = nil)
      r = GkGuiStuff.appearance_settings
      v = r ? r.value(Appearance.key(row), name) : nil
      v.nil? ? fallback : v
    end

    # A number among the plugin's own settings
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

  # The register of every plugin's declared functions is gk_records' (Administration > Funktioner shows it); nil
  # without it, or with a records that has no register: then no function is listed and every one is off
  def self.features = defined?(::GkRecords::Features) && ::GkRecords::Features.respond_to?(:register) ? ::GkRecords::Features : nil

  # The register of every plugin's appearance settings is gk_records' too; nil without it, and then every module and
  # every other appearance setting is off
  def self.appearance_settings = defined?(::GkRecords::AppearanceSettings) ? ::GkRecords::AppearanceSettings : nil

  # The style guide's function: off in a new installation in records' register, and off without records
  def self.styleguide? = (f = features) ? f.on?('gui_stuff.styleguide') : false

  # The person's own choice, and the administrator's change of view on a page type (Meaning, on the plugin's setting)
  def self.register_records!
    ::GkRecords::Kinds.register_event(Choices::KIND, plugin: :gk_gui_stuff, label_key: 'label_gk_gui_stuff_event_choice_changed', target: 'user')
    ::GkRecords::Kinds.register_event(Meaning::KIND, plugin: :gk_gui_stuff, label_key: 'label_gk_gui_stuff_event_meaning_changed', target: 'setting')
  end

  # A module's rule on core's markup (CSS in the head when the module is on), for the modules that are only that rule and
  # for footer_text's line; a lambda gives a rule that takes a value from the settings
  CORE_RULES = {
    # short_descriptions: a project's description in a list (Administration > Projects, the project list) is cut
    # after the set number of lines with "...", the whole text as the cell's tooltip (gk_gui_stuff_short_descriptions.js).
    # What core's formatter writes directly in the description (a paragraph, a list) adds no space of its own to the
    # lines; what stands deeper keeps its spacing.
    # An exception with a reason: ".wiki > *" styles the formatter's own output in core's class of formatted text, the
    # parts it writes directly in that box, and finds nothing in core's page by its nesting.
    'short_descriptions' => lambda {
      n = Switches.value('short_descriptions', 'description_lines', 1)
      "table.list td.short_description .wiki { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: #{n}; line-clamp: #{n}; overflow: hidden; } " \
        'table.list td.short_description .wiki > * { margin-block: 0; }'
    },
    # footer_text: what the formatter writes directly in the line's own box (a paragraph) adds no space of its own; the
    # box is this plugin's own element and its parts are the formatter's output
    'footer_text' => '.gk-gui-stuff-footer-text > * { margin-block: 0; }'
  }.freeze unless const_defined?(:CORE_RULES, false)

  class Hooks < Redmine::Hook::ViewListener
    # Only what is on for this user is loaded; with nothing on, the head is core's
    def view_layouts_base_html_head(context = {})
      always = instance_head(context[:controller], context[:hook_caller])
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
      # icons the running series' core sprite lacks, as compat names them (maximize before 7.0): the address of the
      # sprite that carries each, for GkGui.icon ({ name => address })
      sprites = Primitives.sprite_icons
      view = sprites.any? ? context[:controller]&.view_context : nil
      if view
        cfg[:sprites] = sprites.to_h { |n, p| [n, view.sprite_icon(n, plugin: p).to_s[/href="([^"#]*)#/, 1]] }.compact
      end
      # fold's limits travel under the primitive's name with whichever fold module is on
      if mods.any? { |m| m.group == :fold }
        cfg[:opt]['fold'] = { height: Switches.value('fold_height', 'fold_height_px', 320), attachments: Switches.value('attachments_collapse', 'fold_attachments', 6),
                              newest: Switches.value('attachments_collapse', 'attachments_newest', false) }
      end
      inner, outer = %w[link_preview link_preview_external].map { |k| mods.any? { |m| m.key == k } }
      if inner || outer
        cfg[:preview] = { delay: Switches.value('link_preview', 'preview_delay_ms', 500),
                          types: inner ? Preview.all.values.map { |t| { key: t.key, pattern: t.pattern } } : [],
                          loading: ::I18n.t(:label_loading), open: ::I18n.t(:button_gk_gui_stuff_open) }
      end
      # the external preview: its address, head and the person's choice of a new tab; the domain list never comes along
      if outer
        view ||= context[:controller]&.view_context
        r = GkGuiStuff.appearance_settings
        cfg[:preview_external] = { url: "#{Redmine::Utils.relative_url_root}/gk_gui_stuff/external_preview", head: ::I18n.t(:label_gk_gui_stuff_lpe_card_head),
                                   retry_ms: 3000, new_tab: r ? r.on_for?('gui_stuff.external_new_tab', User.current) : false,
                                   new_tab_hidden: ::I18n.t(:text_gk_gui_stuff_new_tab_hidden), new_tab_foot: ::I18n.t(:text_gk_gui_stuff_new_tab_foot),
                                   no_picture: { icon: ::I18n.t(:text_gk_gui_stuff_lpe_no_picture_icon), none: ::I18n.t(:text_gk_gui_stuff_lpe_no_picture_none) },
                                   icon: view.respond_to?(:gk_gui_stuff_icon) ? view.gk_gui_stuff_icon('world', 'link', size: 14).to_s : '' }
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
          # the menu rows declutter hides, so that a three-dot menu left without a row is counted as empty
          hidden_rows = Declutter.menu_rows
          cfg[:hidden_rows] = hidden_rows if hidden_rows
        end
        cfg[:view] = ViewStates.for(User.current)
        # branch_jump: the current project's branch comes with the page (one grouped count), so the click on the
        # sign needs no request at all; other levels of a deep breadcrumb are fetched when asked for
        project = context[:controller]&.instance_variable_get(:@project)
        if project&.persisted? && mods.any? { |m| m.key == 'branch_jump' }
          tab = { 'issues' => 'issues', 'wiki' => 'wiki', 'activities' => 'activity', 'versions' => 'roadmap' }[context[:controller].controller_name].to_s
          cfg[:branch] = { project.identifier => Branch.of(project, User.current, tab) }
        end
        cfg[:opt]['elements'] = { notice_ms: Switches.value('notices', 'notice_seconds', 6) * 1000,
                                  notice_max: Switches.value('notices', 'notice_max', 3),
                                  wave_opacity: Switches.value('wave', 'wave_opacity_pct', 60).clamp(0, 100) / 100.0,
                                  corner_max: Switches.value('corner', 'corner_max_entries', 20),
                                  notice_countdown: Switches.value('notices', 'notice_countdown', true) }
        cfg[:opt]['beat'] = { seconds: Switches.value('beat', 'beat_seconds', 30) }
      end
      sheets = mods.filter_map(&:stylesheet)
      sheets << 'gk_gui_stuff_elements' if mods.any?(&:elements)
      tags = sheets.uniq.map { |s| stylesheet_link_tag(s, plugin: 'gk_gui_stuff') }
      tags << content_tag('script', json_escape(cfg.to_json).html_safe, type: 'application/json', id: 'gk-gui-stuff-stuff-config')
      scripts = mods.filter_map(&:script).uniq
      scripts.unshift('gk_gui_stuff_elements') if mods.any?(&:elements)
      scripts.unshift('gk_gui_stuff_core') if mods.any?(&:kernel)
      tags.concat(scripts.map { |s| javascript_include_tag(s, plugin: 'gk_gui_stuff') })
      mark_css = mods.any? { |m| m.key == 'custom_mark' } ? CustomMark.css : ''
      tags << content_tag('style', mark_css.html_safe, id: 'gk-gui-stuff-custom-mark') if mark_css.present?
      # A module's rule on core's markup: the rule in the head, with its own id, when the module is on
      mods.each do |m|
        css = CORE_RULES[m.key]
        css = css.call if css.respond_to?(:call)
        tags << content_tag('style', css.html_safe, id: "gk-gui-stuff-#{m.key.tr('_', '-')}") if css
      end
      safe_join([always] + tags, "\n")
    end

    # A page of GK's own: a controller named gk_* (Utseende, Funktioner, the style guide, every plugin's own pages),
    # or a GK plugin's Configure page
    def gk_page?(ctrl)
      return false unless ctrl.respond_to?(:controller_name)
      return true if ctrl.controller_name.to_s.start_with?('gk_')

      ctrl.controller_name == 'settings' && ctrl.action_name == 'plugin' && ctrl.params[:id].to_s.start_with?('gk_')
    end

    # What is there whatever the person has chosen: the instance band's stylesheet and title (when the administrator
    # has switched the band on), declutter's rule, and the two rules of their own appearance settings (the boxes'
    # alignment and the account menu's colours)
    def instance_head(ctrl = nil, view = nil)
      out = []
      # The primitives (primitives.rb) on every page, like the box of choices: their stylesheet, their words and their
      # scripts (the small ones a script draws, the pill, the icon button, the count and the group, in their own file;
      # the layer and edit in place in theirs), before the kernel, which keeps what the scripts put on GkGui; after them the line (line.rb), the chooser (always
      # there, and it gives a field that asks for it the chooser whether select_search is on or not), the sentence (sentence.rb)
      # and the page's own (the table of contents and the Meaning switch)
      out << stylesheet_link_tag('gk_gui_stuff_primitives', plugin: 'gk_gui_stuff')
      out << stylesheet_link_tag('gk_gui_stuff_line', plugin: 'gk_gui_stuff')
      out << stylesheet_link_tag('gk_gui_stuff_select', plugin: 'gk_gui_stuff')
      # the flag (flag.rb), which a script may also lay on any page (the marker of a change)
      out << stylesheet_link_tag('gk_gui_stuff_flag', plugin: 'gk_gui_stuff')
      # the pennant swapped for icons (flag_icons.rb), off from the start; its address is checked there, so as it is
      icons = FlagIcons.head_css
      out << content_tag('style', icons.html_safe, id: 'gk-gui-stuff-flag-icons') if icons.present?
      # the marker (marker.rb), which must work on any page: after a save and in the preview mode
      out << stylesheet_link_tag('gk_gui_stuff_marker', plugin: 'gk_gui_stuff')
      # Visa var, which points out what came up outside the window; it draws nothing until something calls it
      out << stylesheet_link_tag('gk_gui_stuff_show_where', plugin: 'gk_gui_stuff')
      words = { saving: :text_gk_gui_stuff_saving, saved: :text_gk_gui_stuff_saved, failed: :text_gk_gui_stuff_not_saved, close: :gk_gui_stuff_close,
                changes_one: :text_gk_gui_stuff_form_changes_one, changes_other: :text_gk_gui_stuff_form_changes_other, form_saved: :text_gk_gui_stuff_form_saved,
                order_moved_save: :text_gk_gui_stuff_order_moved_save, order_moved_apply: :text_gk_gui_stuff_order_moved_apply,
                ss_search: :gk_gui_stuff_ss_search, ss_placeholder: :gk_gui_stuff_ss_placeholder, ss_remove: :gk_gui_stuff_ss_remove,
                ss_create: :gk_gui_stuff_ss_create, ss_no_tag: :gk_gui_stuff_ss_no_tag, ss_new: :gk_gui_stuff_ss_new,
                ss_placeholder_create: :gk_gui_stuff_ss_placeholder_create, ss_used: :gk_gui_stuff_ss_used, no_hits: :gk_gui_stuff_no_hits,
                sentence_done: :gk_gui_stuff_sentence_done, sentence_remove: :gk_gui_stuff_sentence_remove, sentence_keys: :gk_gui_stuff_sentence_keys,
                sentence_field: :gk_gui_stuff_sentence_field, sentence_edit: :gk_gui_stuff_sentence_edit,
                sentence_incomplete: :gk_gui_stuff_sentence_incomplete, sentence_add: :gk_gui_stuff_sentence_add, cancel: :button_cancel,
                pill_type: :text_gk_gui_stuff_pill_type, flag_new: :label_gk_gui_stuff_flag_new, flag_changed: :label_gk_gui_stuff_flag_changed,
                flag_gone: :label_gk_gui_stuff_flag_gone,
                where_back: :button_back, where_next: :label_gk_gui_stuff_where_next, where_default: :label_gk_gui_stuff_where_default,
                where_go_up: :text_gk_gui_stuff_where_go_up, where_go_down: :text_gk_gui_stuff_where_go_down, where_go_here: :text_gk_gui_stuff_where_go_here,
                where_banner: :label_gk_gui_stuff_where_banner, where_ribbon: :label_gk_gui_stuff_where_ribbon, where_show: :label_gk_gui_stuff_where_show,
                where_corner_one: :text_gk_gui_stuff_where_corner_one, where_corner_other: :text_gk_gui_stuff_where_corner_other }
      words.merge!(Marker::WORDS)
      out << content_tag('script', json_escape(words.transform_values { |k| ::I18n.t(k) }.to_json).html_safe, type: 'application/json', id: 'gk-gui-stuff-primitives-texts')
      # The shadow where a surface scrolls (gk_gui_stuff_shade.js): always on GK's own pages, which the page says in
      # its head; on core's pages only with the module scroll_shade
      out << stylesheet_link_tag('gk_gui_stuff_shade', plugin: 'gk_gui_stuff')
      out << tag.meta(name: 'gk-gui-stuff-page', content: 'gk') if gk_page?(ctrl)
      %w[gk_gui_stuff_primitives gk_gui_stuff_parts gk_gui_stuff_layer gk_gui_stuff_inline gk_gui_stuff_line gk_gui_stuff_select gk_gui_stuff_select_pass gk_gui_stuff_sentence gk_gui_stuff_page
         gk_gui_stuff_shade gk_gui_stuff_flag gk_gui_stuff_marker gk_gui_stuff_show_where].each do |s|
        out << javascript_include_tag(s, plugin: 'gk_gui_stuff')
      end
      # what this page marks after a save on Utseende or Funktioner, for the administrator who saved (Marker.for_page)
      marks = Marker.for_page(ctrl)
      if marks.any?
        out << content_tag('script', json_escape({ mode: 'saved', items: marks }.to_json).html_safe, type: 'application/json', id: 'gk-gui-stuff-marks')
      end
      band = Instance.band_word
      parts = view && TopBand.any?(view)
      out << stylesheet_link_tag('gk_gui_stuff_elements', plugin: 'gk_gui_stuff') if band || parts
      out << javascript_tag("document.title = #{"[#{band}] ".to_json} + document.title;") if band
      # the parts' script (their lengths and +N by the room, from the first paint) and what their panels draw with; the
      # band comes after the head, so its panels cannot add their own files
      if parts
        TopBand::HEAD_STYLESHEETS.each { |s| out << stylesheet_link_tag(s, plugin: 'gk_gui_stuff') }
        TopBand::HEAD_SCRIPTS.each { |s| out << javascript_include_tag(s, plugin: 'gk_gui_stuff') }
      end
      on = Switches.active
      # wave: its stylesheet early, for the wave the body's first script draws (wave_carry below)
      out << stylesheet_link_tag('gk_gui_stuff_elements', plugin: 'gk_gui_stuff') if on.any? { |m| m.key == 'wave' }
      # A box (core's.warning and.nodata, centred) aligned to the start or the end by the one writing the view; logical,
      # so it follows the language's direction. Its appearance setting, off in a new installation
      if Appearance.on_for?('align')
        out << content_tag('style', ('.gk-gui-stuff-align-start, .warning.gk-gui-stuff-align-start, .nodata.gk-gui-stuff-align-start { text-align: start; } ' \
                                     '.gk-gui-stuff-align-end, .warning.gk-gui-stuff-align-end, .nodata.gk-gui-stuff-align-end { text-align: end; }').html_safe, id: 'gk-gui-stuff-align')
      end
      # The account menu's dropdown keeps core's link colours on its light surface: a rule for the top menu's links
      # (a theme's light text on a dark bar) must not reach the items, so this one outranks such a rule by its two ids.
      # The items are found by GK Core Stuff's mark on a menu's links (data-menu, menu_marks), never by where they sit.
      # Its appearance setting, off in a new installation, and there only with that mark
      if Appearance.on_for?('account_menu')
        item = '#top-menu #account .dropdown-content a[data-menu="account_menu"]'
        out << content_tag('style', ("#{item}, #{item}:visited { color: var(--oc-blue-9); } " \
                                     "#{item}:hover { color: var(--oc-blue-9); background-color: var(--oc-gray-1); text-decoration: none; }").html_safe,
                           id: 'gk-gui-stuff-account-menu')
      end
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

    # instance_band: the band on every page, also the login page, when the module is on (off from the start).
    # Not closable. With parts of other plugins (TopBand) one band as a row of parts: the instance's role first, in
    # its role and colour, with its name and the copy button on a computer's width and only the word on a phone; then
    # each part with its panel (gk_gui_stuff_top_band). The parts are drawn also when the module is off and in production.
    def view_layouts_base_body_top(context = {})
      word = Instance.band_word
      view = context[:hook_caller]
      parts = view ? TopBand.parts(view) : []
      return wave_carry(context) unless word || parts.any?
      return instance_band(word) + wave_carry(context) if parts.empty?

      inst = word ? instance_band(word, part: true) : nil
      view.gk_gui_stuff_top_band(parts, instance: inst) + wave_carry(context)
    end

    # The instance's band alone, or (part:) its segment of the top band
    def instance_band(word, part: false)
      name = Instance.data['instance'].presence || Instance.data['name']
      tag = Instance.copy_tag
      label = if name.present? && tag
                content_tag('button', name, type: 'button', class: 'gk-gui-stuff-instance-copy', title: ::I18n.t(:text_gk_gui_stuff_instance_copy),
                                            data: { tag: tag, done: ::I18n.t(:text_gk_gui_stuff_instance_copied) })
              elsif name.present?
                content_tag('small', name)
              end
      css = "gk-gui-stuff-instance gk-gui-stuff-instance-#{Instance.css_key}"
      mark = Effect.attributes('instance_band')
      band = if part
               content_tag('span', safe_join([word, label].compact), class: "#{css} gk-gui-stuff-band-part gk-gui-stuff-band-instance", role: 'note', **mark)
             else
               content_tag('div', safe_join([word, label].compact), class: css, role: 'note', **mark)
             end
      return band unless tag

      script = javascript_tag("(function(){var b=document.querySelector('.gk-gui-stuff-instance-copy');if(!b)return;var n=b.textContent;b.addEventListener('click',function(){" \
                              "var own=function(f){return window.GkGui&&GkGui.ownCopy?GkGui.ownCopy(f):f();},t=b.dataset.tag,ok=function(){b.textContent=b.dataset.done;setTimeout(function(){b.textContent=n;},1400);};" \
                              "if(navigator.clipboard&&window.isSecureContext){own(function(){navigator.clipboard.writeText(t).then(ok,function(){});});}else{var a=document.createElement('textarea');a.value=t;" \
                              "a.style.position='fixed';a.style.top='-1000px';document.body.appendChild(a);a.select();try{if(own(function(){return document.execCommand('copy');}))ok();}catch(e){}a.remove();}});})();")
      band + script
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
    
      pct = Switches.value('wave', 'wave_opacity_pct', 60).clamp(0, 100) / 100.0
      delay = Switches.value('wave', 'wave_start_delay_ms', 50)
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
        v.id='gk-gui-stuff-wave';v.setAttribute('#{Effect::ATTRIBUTE}','wave');v.className='gk-gui-stuff-wave gk-gui-stuff-wave-'+(w.level==='running'?'running':'done')+' gk-gui-stuff-wave-waiting gk-gui-stuff-wave-on gk-gui-stuff-wave-born';
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
      out = [page_package(context), meaning_tags(context)]
      m = Registry.find('footer_text')
      text = Switches.value('footer_text', 'footer_text', '').to_s.strip.lines.first.to_s.strip
      if m && text.present? && Switches.active.include?(m)
        version = defined?(::GkCoreStuff::FooterVersion) ? ::GkCoreStuff::FooterVersion.version.to_s : ''
        text = text.gsub('<version>', version).squeeze(' ').strip
        # the formatter's HTML as it comes; its paragraph gets no space of its own from the line's rule (CORE_RULES)
        out << content_tag('div', context[:hook_caller].textilizable(text), class: 'gk-gui-stuff-footer-text', **Effect.attributes('footer_text'))
      end
      safe_join(out.compact, "\n")
    end

    # window.gkGuiStuffPage: the page's data from every plugin that gives some, and the pulse's address; then the pulse.
    # One not logged in gets the data of the blocks registered for anonymous readers (what the page shows them: the
    # page's name, an issue's parent, the calendar's subjects, each only when its module is on for them) and no pulse
    def page_package(context)
      logged = User.current.logged?
      pulse = logged && Pulse.any?
      return nil if PageData.providers_for(logged).empty? && !pulse

      view = context[:hook_caller]
      data = PageData.build(view, context[:controller], logged: logged)
      return nil if data.empty? && !pulse

      pkg = { data: data }
      pkg[:pulse] = { url: "#{Redmine::Utils.relative_url_root}/gk_gui_stuff/pulse", seconds: Pulse.seconds } if pulse
      # json_escape: a subject or a title with </script> or a line separator in it stays inside the script
      tags = [javascript_tag("window.gkGuiStuffPage = #{json_escape(pkg.to_json)};".html_safe)]
      tags << javascript_include_tag('gk_gui_stuff_pulse', plugin: 'gk_gui_stuff') if pulse
      safe_join(tags, "\n")
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] page package failed: #{e.class}: #{e.message}")
      nil
    end

    # Meningsvy och Klassisk vy on a page of a registered type: which view it shows, for the views a script
    # builds (GkGui.meaning.view), also when the mode is forced; and, where the person may choose and the page's own
    # view did not draw it, the segment in a template that GkGui.meaning puts first among the page's actions
    def meaning_tags(context)
      t = Meaning.current(context[:controller])
      return nil unless t

      view = context[:hook_caller]
      choosable = Meaning.choosable?(t.key)
      data = { key: t.key, view: Meaning.view_for(t.key), choosable: choosable }
      tags = [content_tag('script', json_escape(data.to_json).html_safe, type: 'application/json', id: 'gk-gui-stuff-meaning')]
      if choosable && view && !view.instance_variable_get(:@gk_gui_stuff_meaning_drawn)
        tags << content_tag('template', view.gk_gui_stuff_meaning_switch(t.key), id: 'gk-gui-stuff-meaning-tpl')
      end
      safe_join(tags, "\n")
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] Meaning switch left out: #{e.class}: #{e.message}")
      nil
    end

    # Mitt konto: only the row "Återställ mina val", and only when the person has chosen a view somewhere; core's
    # form around it is left alone, since Rails' data-method builds a form of its own
    def view_my_account_preferences(context = {})
      return '' unless Meaning.chosen_any?(context[:user] || User.current)

      content_tag(:p, safe_join([content_tag(:label, ::I18n.t(:label_gk_gui_stuff_meaning_admin)),
                                 link_to(sprite_icon('reload', ::I18n.t(:button_gk_gui_stuff_meaning_reset)),
                                         Rails.application.routes.url_helpers.gk_gui_stuff_meaning_reset_path, method: :post, class: 'icon icon-reload')]))
    end

    # help_link: the top menu's Hjälp leads where the instance says (Help.target); core's link stays in the HTML
    # and is pointed elsewhere, so that with the module off the page is core's
    def view_layouts_base_content(context = {})
      m = Registry.find('help_link')
      return '' unless m && Switches.active.include?(m)

      t = Help.target(Page.of(context[:controller]))
      return '' unless t

      javascript_tag("(function(){document.querySelectorAll('#top-menu a.help, .js-flyout-menu a.help').forEach(function(a){a.href=#{t[:href].to_json};" \
                     "#{t[:new_tab] ? '' : "a.removeAttribute('target');"}if(window.GkGui&&GkGui.effect)GkGui.effect(a,'help_link');});})();")
    end

    # Mitt konto: the link to the person's own choices
    def view_my_account_contextual(_context = {})
      return '' unless Switches.user_page?(::User.current) # Gone when there is nothing to choose

      link_to(sprite_icon('settings', ::I18n.t(:label_gk_gui_stuff_my)), Rails.application.routes.url_helpers.gk_gui_stuff_my_path, class: 'icon icon-settings')
    end

    # collapse_all without actions_menu: "Fäll ihop allt" among the issue's own links, drawn through the issue page's
    # contextual hook (GK Core Stuff's action_menus, step 04), never put into the button row by searching the page.
    # The script (gk_gui_stuff_sections.js) gives it its click and its word; with actions_menu on for the person the
    # row there does it instead. Without GK Core Stuff the hook is not called and the link is not there.
    def view_issues_show_contextual(context = {})
      safe_join([meaning_contextual(context), collapse_all_link])
    end

    def collapse_all_link
      m = Registry.find('collapse_all')
      return ''.html_safe unless m && Switches.active.include?(m)
      return ''.html_safe if GkGuiStuff::Menu.on_for?(::User.current)

      content_tag(:a, ::I18n.t(:gk_gui_stuff_sec_close_all), href: '#', role: 'button', class: 'gk-gui-stuff-sec-all icon', **Effect.attributes('collapse_all'))
    end

    # Meningsvy och Klassisk vy: the switch drawn among the page's own actions through the page's contextual hook (GK
    # Core Stuff's action_menus, step 04, sixteen pages), where the person may choose and the page's own view did not
    # draw it already. Drawn once: the view notes it (gk_gui_stuff_meaning_switch), so a page that calls the hook twice
    # (the issue page's actions above and below) and the template at the bottom of the page (meaning_tags) leave it.
    # A page without such a hook, or without GK Core Stuff, gets the template, which the page's script puts in a row of
    # actions of its own (gk_gui_stuff_page.js).
    CONTEXTUAL_HOOKS = %i[view_boards_show_contextual view_documents_index_contextual view_documents_show_contextual
                          view_groups_show_contextual view_issues_index_contextual view_messages_show_contextual
                          view_news_index_contextual view_news_show_contextual view_projects_index_contextual
                          view_projects_show_contextual view_timelog_index_contextual view_users_index_contextual
                          view_users_show_contextual view_versions_index_contextual view_wiki_show_contextual].freeze

    CONTEXTUAL_HOOKS.each do |hook|
      define_method(hook) { |context = {}| meaning_contextual(context) }
    end

    def meaning_contextual(context = {})
      view = context[:hook_caller]
      return ''.html_safe unless view.respond_to?(:gk_gui_stuff_meaning_switch)
      return ''.html_safe if view.instance_variable_get(:@gk_gui_stuff_meaning_drawn)

      t = Meaning.current(context[:controller])
      t && Meaning.choosable?(t.key) ? view.gk_gui_stuff_meaning_switch(t.key) : ''.html_safe
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] Meaning switch left out of the page's actions: #{e.class}: #{e.message}")
      ''.html_safe
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
