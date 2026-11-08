# frozen_string_literal: true

module GkGuiStuff
  # Meaning och Classic: per page type the instance says Meningsvy, Klassisk vy
  # or Valbart (each person chooses, with a default); the person chooses on the page only, and Mitt konto has only
  # "Återställ mina val". Like Redmine for me gives the Classic view everywhere.
  # The page's owner registers its types, never gui_stuff; gui_stuff has none of its own:
  #   GkGuiStuff::Meaning.register('queries.issue_list', plugin: :gk_queries, label: :label_gk_queries_issue_list,
  #                                match: ->(c) { c.controller_name == 'issues' && c.action_name == 'index' },
  #                                core: true, group: :lists)
  # A type of GK's own pages: the instance's choice is stored in the plugin's settings under 'meaning': '*' is the choice
  # for all of GK's pages, which every such type follows unless it has its own row ("Alla sidor"); without
  # anything stored the registration's default_mode holds. A type of core's pages (core: true) is an appearance setting
  # in records' register instead, in the group the registration names: off is the Classic view (a new installation),
  # optional lets each person choose with its value default_view, forced is the Meaning view; without records it is the
  # Classic view. The person's choice is data['meaning'][key] in GkGuiStuffUserSetting, and every change of it is an
  # event on the person (Choices.record).
  module Meaning
    MODES = %w[meaning classic choice].freeze
    VIEWS = %w[meaning classic].freeze
    ALL = '*'
    # The level of a core page type's appearance setting as the Meaning mode
    CORE_MODES = { 'off' => 'classic', 'optional' => 'choice', 'forced' => 'meaning' }.freeze
    Type = Struct.new(:key, :plugin, :label_key, :match, :order, :default_mode, :default_view, :core, :group, keyword_init: true) do
      def label = ::I18n.t(label_key, default: key)
    end

    module_function

    def all = (@all ||= {})

    # Registered again after a reload; core: true for a type of core's pages, with group: its group on the page Appearance
    def register(key, plugin:, label:, match:, order: 50, default_mode: 'meaning', default_view: 'meaning', core: false, group: :lists)
      raise ArgumentError, "unknown Meaning mode #{default_mode}" unless MODES.include?(default_mode.to_s)
      raise ArgumentError, "unknown Meaning view #{default_view}" unless VIEWS.include?(default_view.to_s)

      all[key.to_s] = Type.new(key: key.to_s, plugin: plugin.to_s, label_key: label, match: match, order: order,
                               default_mode: core ? 'classic' : default_mode.to_s, default_view: default_view.to_s,
                               core: core ? true : false, group: group.to_s)
    end

    def find(key) = all[key.to_s]
    def any? = all.any?
    def types = all.values.sort_by { |t| [t.order, t.key] }
    # The types of GK's own pages, the ones the administration page Meaning sets
    def own_types = types.reject(&:core)
    def own_any? = own_types.any?

    # The key of a core page type's appearance setting
    def row_key(key) = "gui_stuff.meaning.#{key}"
    def core?(key) = find(key)&.core ? true : false

    def view_choices = VIEWS.map { |v| [::I18n.t(v == 'meaning' ? :label_gk_gui_stuff_meaning_view : :label_gk_gui_stuff_classic_view), v] }

    # The first type whose match holds for the page; a match that fails is written to the log and counts as none
    def current(controller)
      return nil unless controller

      types.find do |t|
        t.match.call(controller)
      rescue StandardError => e
        Rails.logger.warn("[gk_gui_stuff] Meaning type #{t.key} not matched: #{e.class} #{e.message}")
        false
      end
    end

    def stored
      s = Switches.settings['meaning']
      s.is_a?(Hash) ? s : {}
    end

    def row(key) = (stored[key.to_s].is_a?(Hash) ? stored[key.to_s] : {})

    # The type's mode: a core page type's appearance setting; else its own row, the row for all pages, the registration's
    def mode(key)
      if core?(key)
        r = GkGuiStuff.appearance_settings
        return r ? CORE_MODES[r.mode(row_key(key))] : 'classic'
      end

      m = [row(key)['mode'], row(ALL)['mode']].map(&:to_s).find { |v| MODES.include?(v) }
      m || find(key)&.default_mode || 'meaning'
    end

    # The view of one who has not chosen, when the mode is Valbart
    def default_view(key)
      if core?(key)
        r = GkGuiStuff.appearance_settings
        v = r&.value(row_key(key), 'default_view').to_s
        return VIEWS.include?(v) ? v : find(key).default_view
      end

      v = [row(key)['default'], row(ALL)['default']].map(&:to_s).find { |d| VIEWS.include?(d) }
      v || find(key)&.default_view || 'meaning'
    end

    def own(user) = user&.logged? ? (GkGuiStuffUserSetting.for(user).data['meaning'] || {}) : {}

    def view_for(key, user = User.current)
      return 'classic' if Switches.user_core_like?(user)

      m = mode(key)
      return m if VIEWS.include?(m)

      chosen = own(user)[key.to_s].to_s
      VIEWS.include?(chosen) ? chosen : default_view(key)
    end

    def choosable?(key, user = User.current)
      mode(key) == 'choice' && user&.logged? && !Switches.user_core_like?(user) ? true : false
    end

    def chosen_any?(user) = own(user).any?

    # The administrator's choice for one type (mode, default or both); the key '*' is set_all!. reason: the reason
    # given at the place gui_stuff.meaning; the change is an event in records with it (record)
    def set!(key, mode: nil, default: nil, reason: nil)
      raise ArgumentError, "Meaning type #{key} is core's: it is set on the page Appearance" if core?(key)

      before = { 'mode' => Meaning.mode(key), 'default' => Meaning.default_view(key) }
      if key.to_s == ALL
        set_all!(mode, default: default)
      else
        write(key.to_s => row(key).merge({ 'mode' => mode, 'default' => default }.compact))
      end
      record(key, before, { 'mode' => mode, 'default' => default }.compact, reason)
    end

    # The event of a change of view (a records event on the plugin's setting, with the reason), written only when
    # records, its setting target and the kind are there: page, and mode and default as [before, after] where changed
    KIND = 'gui_meaning_changed'

    def record(key, before, after, reason)
      return unless defined?(::GkRecords) && ::GkRecords::Targets.find('setting') && ::GkRecords::Kinds.find(:event, KIND)

      changes = after.select { |k, v| before[k].to_s != v.to_s }.to_h { |k, v| [k, [before[k], v]] }
      return if changes.empty?

      setting = ::Setting.find_by(name: 'plugin_gk_gui_stuff')
      return unless setting

      ::GkRecords::Events.write(setting, KIND, details: { 'page' => key.to_s }.merge(changes), reason: reason.presence,
                                               user: User.current.logged? ? User.current : nil, reason_key: 'gui_stuff.meaning')
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] change of view not recorded for #{key}: #{e.message}")
    end

    # The latest change of each page type ('*' for all pages), as records' events: { key => event }; empty without records
    def latest(limit: 300)
      return {} unless defined?(::GkRecordsEvent) && ::GkRecords::Kinds.find(:event, KIND)

      ::GkRecordsEvent.where(target_type: 'setting', kind: KIND).includes(:user, :reason_note).order(created_at: :desc, id: :desc).limit(limit)
                      .each_with_object({}) { |e, h| h[e.details_hash['page'].to_s] ||= e }
    rescue StandardError
      {}
    end

    # The same mode on all pages: the row for all pages, and no type keeps a row of its own
    def set_all!(mode, default: nil)
      all_row = row(ALL).merge({ 'mode' => mode, 'default' => default }.compact)
      s = Switches.settings.dup
      s['meaning'] = { ALL => all_row }
      Setting.plugin_gk_gui_stuff = s
    end

    def write(rows)
      s = Switches.settings.dup
      s['meaning'] = stored.merge(rows)
      Setting.plugin_gk_gui_stuff = s
    end

    # The person's choice on the page; an event on the person
    def choose!(user, key, view)
      setting = GkGuiStuffUserSetting.for(user)
      data = setting.data
      before = (data['meaning'] || {})[key.to_s]
      data['meaning'] = (data['meaning'] || {}).merge(key.to_s => view.to_s)
      setting.data = data
      setting.save!
      Choices.record(user, { "meaning.#{key}" => [before, view.to_s] }) if before != view.to_s
    end

    # Mitt konto, "Återställ mina val": every choice of view gone; an event on the person
    def reset!(user)
      setting = GkGuiStuffUserSetting.for(user)
      data = setting.data
      was = data.delete('meaning') || {}
      return if was.empty?

      setting.data = data
      setting.save!
      Choices.record(user, was.to_h { |k, v| ["meaning.#{k}", [v, nil]] })
    end
  end

  module MeaningHelper
    # Växeln: the segment Meningsvy | Klassisk vy, first among the page's actions (the owning view calls it
    # first in its div.contextual), only where the person may choose; it saves at once and the page is loaded again
    # with the same address. demo: true draws it whatever the mode, against the style guide's save address, and does not
    # reload. On core's pages the hook draws it (Hooks#meaning_tags) unless the view already did.
    def gk_gui_stuff_meaning_switch(key, demo: false)
      return ''.html_safe unless demo || GkGuiStuff::Meaning.choosable?(key)

      @gk_gui_stuff_meaning_drawn = true unless demo
      url = demo ? gk_gui_stuff_styleguide_save_path : gk_gui_stuff_meaning_choose_path(key: key)
      gk_gui_stuff_rail(url: url, method: :post, tag: :span,
                        html: { class: 'gk-gui-stuff-meaning', title: l(:text_gk_gui_stuff_meaning_switch_title),
                                data: { gk_gui_meaning: key, gk_gui_meaning_reload: demo ? '0' : '1' } }) do
        gk_gui_stuff_segment('view', gk_gui_stuff_meaning_views, demo ? 'meaning' : GkGuiStuff::Meaning.view_for(key),
                             label: l(:label_gk_gui_stuff_meaning_switch))
      end
    end

    # The two views as the segment's choices, and the three modes as the administrator's
    def gk_gui_stuff_meaning_views = [[l(:label_gk_gui_stuff_meaning_view), 'meaning'], [l(:label_gk_gui_stuff_classic_view), 'classic']]
    def gk_gui_stuff_meaning_modes = gk_gui_stuff_meaning_views + [[l(:label_gk_gui_stuff_meaning_choice), 'choice']]
  end
end
