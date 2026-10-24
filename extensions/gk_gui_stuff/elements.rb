# frozen_string_literal: true

module GkGuiStuff
  # The instance's role (environment manifest 6.2b), read once from INSTANCE.yml, never from the database.
  # No role, or production: no band.
  module Instance
    SHOWN = %w[sandbox dev development test drill].freeze

    module_function

    def file
      ENV['GK_INSTANCE_FILE'].presence || Rails.root.join('..', 'INSTANCE.yml').to_s
    end

    def data
      @data ||= begin
        text = File.exist?(file) ? File.read(file, encoding: 'UTF-8') : ''
        %w[role authority instance name buildtag account_password].to_h { |k| [k, text[/^#{k}:\s*"?([^"\n]*)"?\s*$/, 1].to_s.strip] }
      rescue StandardError
        {}
      end
    end

    def role = data['role'].to_s
    def drill? = data['authority'].to_s == 'drill'

    # The word in the band: ÖVNING for a drill, else the role; nil when nothing is to be shown
    def word
      return ::I18n.t(:label_gk_gui_stuff_instance_drill) if drill?

      SHOWN.include?(role) ? role : nil
    end

    def css_key = drill? ? 'drill' : role

    # Anywhere else: nil, and the band offers nothing to copy.
    def copy_tag
      return nil unless role == 'sandbox' && data['authority'].to_s == 'none' && data['account_password'].to_s == 'buildtag'

      data['buildtag'].presence
    end
  end

  # actions_menu: rows registered as data, drawn by gui_stuff in core's three-dot menu, in four sections in a
  # fixed order (do, state, show, system). A row whose condition is not met is not shown at all.
  # The page's buttons and core's three-dot menu (actions_menu). Every registered row stands either out, among the
  # page's own links (Ändra, Bevaka), or in the menu; the plugin gives the default and the administrator chooses
  # per row for the whole instance.
  module Menu
    SECTIONS = %w[do state show system].freeze
    KINDS = %w[link action post].freeze
    # out: among the page's own links with icon and text; icon: out with the icon only, the text as tooltip and for
    # screen readers; menu: in the three-dot menu
    PLACEMENTS = %w[out icon menu].freeze
    OUT = %w[out icon].freeze
    Row = Struct.new(:key, :section, :contexts, :label, :kind, :order, :condition, :href, :action, :plugin, :placement, :confirm,
                     :icon, :name, :title, :active, keyword_init: true)

    module_function

    def all = (@all ||= {})

    # kind: link (href: a lambda giving the address), action (a name the client knows, GkGui.actions) or post (href
    # posted with the page's token, after confirm when given). label and confirm: an I18n key or a lambda(page) giving
    # the text. condition: lambda(page). placement: the plugin's default, out, icon or menu. icon: a sprite name, required:
    # drawn both out and in the menu, from icons when installed, else from core's sprite.
    # name: an I18n key for the administrator's list, when the label is a lambda.
    # Title, the tooltip (an I18n key or a lambda(page)), every row has one; active, a lambda(page) saying the row shows
    # a state that is on (drawn marked, as "I mitt fokus"); icon may be a lambda(page) as well. Each person may move
    # each row out or into the menu.
    def register(key, section:, context:, label:, plugin:, kind: :link, order: 100, condition: nil, href: nil, action: nil,
                 placement: :menu, confirm: nil, icon: nil, name: nil, title: nil, active: nil)
      raise ArgumentError, "unknown section #{section}" unless SECTIONS.include?(section.to_s)
      raise ArgumentError, "unknown kind #{kind}" unless KINDS.include?(kind.to_s)
      raise ArgumentError, "unknown placement #{placement}" unless PLACEMENTS.include?(placement.to_s)
      raise ArgumentError, "row #{key} has no icon" if !icon.respond_to?(:call) && icon.to_s.strip.empty?

      all[key.to_s] = Row.new(key: key.to_s, section: section.to_s, contexts: Array(context).map(&:to_s), label: label, kind: kind.to_s,
                              order: order, condition: condition, href: href, action: action&.to_s, plugin: plugin.to_s,
                              placement: placement.to_s, confirm: confirm, icon: icon.respond_to?(:call) ? icon : icon&.to_s, name: name,
                              title: title, active: active)
    end

    def text(value, page) = value.respond_to?(:call) ? value.call(page).to_s : ::I18n.t(value)

    # Whether the person gets the rows drawn (actions_menu on for them). A plugin with a row of its own draws its old
    # link only when this is false, so that the page never has both.
    def on_for?(user = ::User.current)
      m = Registry.find('actions_menu')
      !m.nil? && Switches.on_for?(m, user)
    end

    # Icons, by area: the project tabs, the buttons to the right on the issue page and those on other pages, each as
    # Redmine draws it (core), with icon and text (both) or with the icon only (icon).
    # The administrator's choice per area is the default; each person may choose their own.
    ICON_MODES = %w[core both icon].freeze
    ICON_AREAS = %w[tabs issue other].freeze

    def user_icons(user, area)
      return nil unless user&.logged?

      v = GkGuiStuffUserSetting.for(user).data["icons_#{area}"].to_s
      ICON_MODES.include?(v) ? v : nil
    rescue StandardError
      nil
    end

    def admin_icons(area)
      v = Switches.settings["icons_#{area}"].to_s
      ICON_MODES.include?(v) ? v : nil
    end

    def icons(area, user = ::User.current) = user_icons(user, area) || admin_icons(area) || 'core'

    # The area of a page's buttons to the right
    def area_for(page) = page && page[:kind].to_s == 'issue' ? 'issue' : 'other'

    # A button's area by where it is shown first (for the tables that show what follows)
    def area_of(contexts) = Array(contexts).first.to_s == 'issue' ? 'issue' : 'other'
    # Where the sidebar stands and how tall the header is: the person's own choice, the administrator's, core's own (the
    # first) the sidebar after or before the content, whichever way the language reads
    LAYOUT = { 'sidebar' => %w[after before hidden], 'header' => %w[tall compact] }.freeze

    def user_layout(user, key)
      return nil unless user&.logged?

      v = GkGuiStuffUserSetting.for(user).data["layout_#{key}"].to_s
      LAYOUT[key].include?(v) ? v : nil
    rescue StandardError
      nil
    end

    def admin_layout(key)
      v = Switches.settings["layout_#{key}"].to_s
      LAYOUT[key].include?(v) ? v : nil
    end

    def layout(key, user = ::User.current) = user_layout(user, key) || admin_layout(key) || LAYOUT[key].first

    # The classes on <html> for what differs from core's own layout
    def layout_classes(user = ::User.current)
      LAYOUT.keys.filter_map { |k| v = layout(k, user); "gk-gui-stuff-#{k}-#{v}" unless v == LAYOUT[k].first }
    end

    def admin_choice(key)
      h = Switches.settings['placements']
      h.is_a?(Hash) ? h[key].to_s : ''
    end

    # Which choice wins: the person's for the button, the person's for the page's area, the administrator's for the button,
    # the administrator's for the area, the plugin's default. An area's choice only says icon or not for a button that stands
    # out (icon only is icon, as Redmine and icon and text are out, a row having its icon anyway); a button in the three-dot
    # menu stays there.
    def placement(row, user: nil, area: 'other')
      own = user_placement(row, user)
      return own if own

      v = admin_choice(row.key)
      base = PLACEMENTS.include?(v) ? v : row.placement
      return base unless OUT.include?(base)

      area_out = ->(mode) { mode && (mode == 'icon' ? 'icon' : 'out') }
      area_out.call(user_icons(user, area)) || (PLACEMENTS.include?(v) ? base : nil) || area_out.call(admin_icons(area)) || base
    end
    # The person's own placement of a row, or nil when the person follows the default
    def user_placement(row, user)
      return nil unless user&.logged?

      h = GkGuiStuffUserSetting.for(user).data['placements']
      v = h.is_a?(Hash) ? h[row.key].to_s : ''
      PLACEMENTS.include?(v) ? v : nil
    rescue StandardError
      nil
    end

    # Core's own buttons among a page's links, chosen by the administrator and by each person: as core draws them, with
    # icon and text, or with the icon only (the area's modes, ICON_MODES). Core draws them, so they never move into the
    # three-dot menu. The choices are kept with the rows' (placements), under the key.
    # compat: the link's name in compat's missing_icons, where an older series draws it without the icon the newest has
    CoreButton = Struct.new(:key, :selector, :label, :icon, :contexts, :compat, keyword_init: true)
    CORE_PLACEMENTS = ICON_MODES
    # selector: where the button stands, in full (the page's own links, the description's head, the subtasks and the
    # relations); label: an I18n key, or several joined with ": " where core's word alone says too little (Lägg till)
    CORE_BUTTONS = [
      CoreButton.new(key: 'core_edit', selector: '#content .contextual > a.icon-edit', label: :button_edit, icon: 'edit', contexts: %w[issue wiki_page other]),
      CoreButton.new(key: 'core_log_time', selector: '#content .contextual > a.icon-time-add', label: :button_log_time, icon: 'time-add',
                     contexts: %w[issue issue_list project]),
      CoreButton.new(key: 'core_watch', selector: '#content .contextual > a.icon-fav, #content .contextual > a.icon-fav-off', label: :button_watch,
                     icon: 'fav', contexts: %w[issue wiki_page project]),
      CoreButton.new(key: 'core_copy', selector: '#content .contextual > a.icon-copy', label: :button_copy, icon: 'copy', contexts: %w[issue]),
      CoreButton.new(key: 'core_new_issue', selector: '#content .contextual > a.new-issue', label: :label_issue_new, icon: 'add',
                     contexts: %w[issue_list project]),
      CoreButton.new(key: 'core_quote', selector: '.description .contextual a.icon-quote', label: :button_quote, icon: 'comment', contexts: %w[issue]),
      # Lägg till as the newest core draws it, with its icon; where an older series draws it as text, compat says so and
      # draws the icon, which is put in only when the person shows the button as an icon
      CoreButton.new(key: 'core_add_subtask', selector: '#issue_tree .contextual > a.icon-add', label: %i[label_subtask_plural button_add], icon: 'add',
                     contexts: %w[issue], compat: 'issue_add_subtask'),
      CoreButton.new(key: 'core_add_relation', selector: '#relations .contextual > a.icon-link-add', label: %i[label_related_issues button_add],
                     icon: 'link-add', contexts: %w[issue], compat: 'issue_add_relation')
    ].freeze

    # The icons compat draws for core links an older series shows without one, for the buttons this person sees with an icon
    # (icon and text, or the icon only): [{ sel:, svg: }]. Nothing where the series has them all, or without compat; as
    # Redmine nothing is put in.
    def core_fill(view, user = ::User.current, area = 'other')
      return [] unless defined?(::GkCompat) && ::GkCompat.shims.include?(:missing_icons)

      want = CORE_BUTTONS.filter_map { |b| (m = core_placement(b, user: user, area: area)) && b.compat && %w[both icon].include?(m) ? [b.compat, m] : nil }.to_h
      return [] if want.empty?

      ::GkCompat.call(:missing_icons, view).select { |r| want.key?(r['key']) }.map { |r| { sel: r['selector'], svg: r['svg'], only: want[r['key']] == 'icon' } }
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] icons from compat left out: #{e.class} #{e.message}")
      []
    end
    def core_label(button) = Array(button.label).map { |k| ::I18n.t(k) }.join(': ')

    # The same order as placement: the person's for the button, the person's for the area, the administrator's for the button,
    # the administrator's for the area, as Redmine
    def core_placement(button, user: nil, area: 'other')
      if user&.logged?
        own = GkGuiStuffUserSetting.for(user).data['placements']
        v = own.is_a?(Hash) ? own[button.key].to_s : ''
        return v if CORE_PLACEMENTS.include?(v)
      end
      v = admin_choice(button.key)
      user_icons(user, area) || (CORE_PLACEMENTS.include?(v) ? v : nil) || admin_icons(area) || 'core'
    rescue StandardError
      'core'
    end

    # The selectors of core's buttons this person sees with the icon only, for the page's script
    def core_icon_selectors(user = ::User.current, area = 'other') = CORE_BUTTONS.select { |b| core_placement(b, user: user, area: area) == 'icon' }.map(&:selector)

    # When the area is icons only: core's known buttons that keep their text (a choice of their own), left as they are
    def core_text_selectors(user = ::User.current, area = 'other') = CORE_BUTTONS.reject { |b| core_placement(b, user: user, area: area) == 'icon' }.map(&:selector)
    # The rows for a page, as data; in the menu at most three per plugin and section
    def rows_for(page)
      return [] unless page

      rows = all.values.select { |r| r.contexts.include?(page[:kind].to_s) && (r.condition.nil? || r.condition.call(page)) }
      user = ::User.current
      area = area_for(page)
      out, menu = rows.partition { |r| OUT.include?(placement(r, user: user, area: area)) }
      menu = menu.group_by { |r| [r.plugin, r.section] }.flat_map { |_, list| list.sort_by(&:order).first(3) }
      (out + menu).sort_by { |r| [SECTIONS.index(r.section), r.order] }.map do |r|
        { key: r.key, section: r.section, label: text(r.label, page), kind: r.kind, href: r.href&.call(page), action: r.action,
          placement: placement(r, user: user, area: area), confirm: r.confirm && text(r.confirm, page),
          icon: r.icon.respond_to?(:call) ? r.icon.call(page).to_s : r.icon,
          title: r.title && text(r.title, page), active: r.active ? (r.active.call(page) ? true : false) : false }
      end
    end
  end

  # view_state: a choice of view remembered per user on the server (it follows between computers); pref: true keeps it
  # in core's preferences as gk_gui_stuff_<key> instead of the plugin's own row (the calendar's view, as the proposal to
  # core does it), and the first migration's down takes it away
  module ViewStates
    State = Struct.new(:key, :values, :default, :label, :pref, keyword_init: true)

    module_function

    def all = (@all ||= {})

    def register(key, values:, default:, label:, pref: false)
      all[key.to_s] = State.new(key: key.to_s, values: values.map(&:to_s), default: default.to_s, label: label, pref: pref)
    end

    def for(user)
      saved = GkGuiStuffUserSetting.for(user).data['view'] || {}
      all.values.to_h do |s|
        v = s.pref ? (user.logged? ? user.pref[:"gk_gui_stuff_#{s.key}"].to_s : '') : saved[s.key].to_s
        [s.key, s.values.include?(v) ? v : s.default]
      end
    end

    def set(user, key, value)
      s = all[key.to_s]
      return false unless s && s.values.include?(value.to_s) && user.logged?

      if s.pref
        user.pref[:"gk_gui_stuff_#{s.key}"] = value.to_s
        return user.pref.save
      end

      row = GkGuiStuffUserSetting.for(user)
      d = row.data
      d['view'] = (d['view'] || {}).merge(s.key => value.to_s)
      row.data = d
      row.save
    end
  end

  # declutter, first edition: named targets (never raw selectors), hidden for everyone in the client. Hiding is
  # never permission: what must not be done is a role or a rule.
  module Declutter
    TARGETS = {
      'top_help' => '#top-menu a.help',
      'footer_powered' => '#footer',
      'issue_log_time' => '#content > .contextual a.icon-time-add, #content > .contextual a[href$="/time_entries/new"]',
      'issue_copy' => '#content > .contextual a.icon-copy',
      'sidebar_watchers' => '#sidebar #watchers',
      'form_estimated_hours' => 'p:has(> #issue_estimated_hours)',
      'form_done_ratio' => 'p:has(> #issue_done_ratio)'
    }.freeze

    module_function

    def hidden
      h = Switches.settings['declutter']
      h.is_a?(Hash) ? TARGETS.keys.select { |k| h[k].to_s == '1' } : []
    end

    def css
      sel = hidden.map { |k| TARGETS[k] }
      sel.empty? ? '' : "#{sel.join(', ')} { display: none !important; }"
    end
  end

  # What the page is about, for the menu, the heartbeat and the history jump
  module Page
    module_function

    def of(controller)
      return nil unless controller

      name = "#{controller.controller_name}##{controller.action_name}"
      project = controller.instance_variable_get(:@project)
      base = { project: project&.identifier, path: controller.request&.fullpath }
      case name
      when 'issues#show'
        issue = controller.instance_variable_get(:@issue)
        issue&.persisted? ? base.merge(kind: 'issue', id: issue.id, at: Time.current.utc.iso8601(3)) : nil
      when 'issues#index' then base.merge(kind: 'issue_list')
      when 'projects#show' then base.merge(kind: 'project')
      when 'wiki#show' then base.merge(kind: 'wiki_page')
      when 'versions#show' then base.merge(kind: 'version')
      else base.merge(kind: 'other')
      end
    end
  end

  # branch_jump: the branch of the project tree a project stands in (parent, siblings, the project's children),
  # only what the user may see
  module Branch
    module_function

    def of(project, user, tab)
      visible = ::Project.visible(user)
      siblings = (project.parent ? project.parent.children : ::Project.roots).merge(visible).to_a
      siblings = siblings.sort_by { |p| [p.active? ? 0 : 1, p.name.downcase] }
      kids = project.children.merge(visible).sort_by { |c| [c.active? ? 0 : 1, c.name.downcase] }
      parent = project.parent && visible.exists?(id: project.parent_id) ? project.parent : nil
      # one question for the whole branch, not one per project
      open = ::Issue.visible(user).open.where(project_id: (siblings + kids + [parent]).compact.map(&:id)).group(:project_id).count
      row = lambda do |p, extra = {}|
        { name: p.name, href: href(p, tab), closed: !p.active?, open: open[p.id].to_i }.merge(extra)
      end
      {
        parent: parent && row.call(parent, count: siblings.size),
        rows: siblings.map { |p| row.call(p, current: p.id == project.id, children: p.id == project.id ? kids.map { |c| row.call(c) } : []) }
      }
    end

    # The jump keeps the tab one stands in when the target project has the module, else the overview
    def href(project, tab)
      root = Redmine::Utils.relative_url_root.to_s
      mod = { 'issues' => 'issue_tracking', 'wiki' => 'wiki', 'activity' => nil, 'roadmap' => 'issue_tracking' }
      keep = mod.key?(tab) && (mod[tab].nil? || project.module_enabled?(mod[tab]))
      "#{root}/projects/#{project.identifier}#{keep ? "/#{tab}" : ''}"
    end
  end
end

module GkGuiStuff
  # help_link: where "Hjälp" leads. One place decides, for the top menu today and for help about a particular
  # thing later: every caller asks Help.target(page), and the page (what one stands on) is already an argument,
  # so a map from page or element to help page can be added here without touching callers.
  module Help
    module_function

    # { href:, new_tab: } or nil for core's own address
    def target(_page = nil)
      s = Switches.settings
      case s['help_kind'].to_s
      when 'url'
        url = s['help_url'].to_s.strip
        url.match?(%r{\A(https?://|/)}) ? { href: url, new_tab: url.start_with?('http') } : nil
      when 'wiki'
        project = ::Project.find_by(identifier: s['help_wiki_project'].to_s.strip)
        return nil unless project

        page = s['help_wiki_page'].to_s.strip
        root = Redmine::Utils.relative_url_root.to_s
        { href: "#{root}/projects/#{project.identifier}/wiki#{page.empty? ? '' : "/#{ERB::Util.url_encode(::Wiki.titleize(page))}"}", new_tab: false }
      end
    end
  end
end

module GkGuiStuff
  # custom_mark: a small visual detail on what is not core's own: the custom fields in the row menu of lists.
  # The instance chooses the mark; the rule is given as a stylesheet in the head (no script).
  module CustomMark
    STYLES = %w[diamond stripe italic].freeze
    SEL = '#context-menu li.folder[class*="cf_"] > a.submenu'

    module_function

    def style
      s = Switches.settings['custom_mark_style'].to_s
      STYLES.include?(s) ? s : 'diamond'
    end

    def css
      case style
      when 'stripe' then "#context-menu li.folder[class*=\"cf_\"] { box-shadow: inset 3px 0 0 var(--oc-violet-6); }"
      when 'italic' then "#{SEL} { font-style: italic; }"
      else
        # the mark is an icon from icons when it is installed (drawn as a mask in the mark's colour), else the character
        if defined?(::GkIcons) && ::GkIcons.exists?('own-field')
          "#{SEL}::after { content: \"\"; display: inline-block; inline-size: .8em; block-size: .8em; margin-inline-start: 6px; background-color: var(--oc-violet-6); " \
            "-webkit-mask: url(#{::GkIcons.url('own-field')}) center / contain no-repeat; mask: url(#{::GkIcons.url('own-field')}) center / contain no-repeat; }"
        else
          "#{SEL}::after { content: \"◇\"; margin-inline-start: 6px; font-size: .75em; color: var(--oc-violet-6); vertical-align: .1em; }"
        end
      end
    end
  end
end
