# frozen_string_literal: true

module GkGuiStuff
  # Växa, inte drunkna. Every plugin declares its functions with a name, a short explanation and the default for a
  # new installation, off for all that is not needed on day one: GkGuiStuff::Features.register('tags.marks',
  # plugin::gk_tags, default: false, label::label_gk_tags_feature_marks, help::text_gk_tags_feature_marks) and asks
  # before it draws a menu row, a tab, a section, a button or a column: GkGuiStuff::Features.on?('tags.marks') A
  # function that is off is gone for the users; its data stays (P1).
  # The administrator switches functions on and off under Administration > Funktioner; every switch is an event in
  # records with the reason. A plugin without gui_stuff asks through its own small helper that answers with the
  # default it would have declared. Later a setup for new installations can switch many on at once (set_many!).
  module Features
    Feature = Struct.new(:key, :plugin, :default, :label_key, :help_key, :admin_only, keyword_init: true) do
      def label = ::I18n.t(label_key, default: key)
      def help = help_key ? ::I18n.t(help_key, default: '') : ''
      def plugin_name = Redmine::Plugin.registered_plugins[plugin.to_sym]&.name || plugin.to_s
    end

    KIND = 'gui_feature_switched'
    TTL = 30 # seconds before another process's switch is seen

    module_function

    def all = (@all ||= {})

    def register(key, plugin:, default: false, label: nil, help: nil, admin_only: false)
      k = key.to_s
      all[k] = Feature.new(key: k, plugin: plugin.to_s, default: default ? true : false, label_key: label || :"label_gk_feature_#{k.tr('.', '_')}",
                           help_key: help, admin_only: admin_only)
    end

    def find(key) = all[key.to_s]

    # On for a new installation unless declared off; a key nobody declared is on (so a forgotten declaration never
    # hides something by accident)
    def on?(key)
      f = find(key)
      return true unless f

      v = stored[f.key]
      v.nil? ? f.default : v
    end

    def off?(key) = !on?(key)

    def stored
      if @stored.nil? || @loaded_at.nil? || Time.current - @loaded_at > TTL
        @stored = ::GkGuiStuffFeature.table_exists? ? ::GkGuiStuffFeature.pluck(:key, :enabled).to_h : {}
        @loaded_at = Time.current
      end
      @stored
    rescue StandardError
      {}
    end

    def forget! = (@stored = nil)

    # The administrator's switch, with the reason; an event in records when records is there
    def set!(key, enabled, reason: nil, user: User.current)
      f = find(key) or raise ArgumentError, "gk_gui_stuff: no feature #{key}"
      forget! # decide from the table, not from memory
      before = on?(f.key)
      row = ::GkGuiStuffFeature.find_or_initialize_by(key: f.key)
      row.enabled = enabled ? true : false
      row.updated_by_id = user&.logged? ? user.id : nil
      row.save!
      forget!
      record(row, before, row.enabled, reason) if before != row.enabled
      row
    end

    def set_many!(changes, reason: nil) = changes.each { |k, v| set!(k, v, reason: reason) }

    def by_plugin = all.values.group_by(&:plugin).sort_by { |p, _| Redmine::Plugin.registered_plugins[p.to_sym]&.name.to_s }

    def record(row, before, after, reason)
      return unless defined?(::GkRecords) && ::GkRecords::Targets.find('gui_feature') && ::GkRecords::Kinds.find(:event, KIND)

      ::GkRecords::Events.write(row, KIND, details: { 'feature' => row.key, 'enabled' => [before, after] }, reason: reason.presence,
                                            user: User.current.logged? ? User.current : nil)
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] feature switch not recorded for #{row.key}: #{e.message}")
    end

    def register_records!
      ::GkRecords::Targets.register('gui_feature', model: 'GkGuiStuffFeature',
                                                    visible: ->(_f, user) { user.admin? }, editable: ->(_f, user) { user.admin? },
                                                    label: ->(f) { "#{::I18n.t(:label_gk_gui_stuff_features)}: #{f.name}" },
                                                    url: ->(_f) { Rails.application.routes.url_helpers.gk_gui_stuff_features_path })
      ::GkRecords::Kinds.register_event(KIND, plugin: :gk_gui_stuff, label_key: 'label_gk_gui_stuff_event_feature_switched', target: 'gui_feature')
    end
  end
end
