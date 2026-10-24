# frozen_string_literal: true

module GkGuiStuff
  # admin_groups.
  # Core's administration menu stays as core renders it; the module's script sorts its rows under headings. A row
  # carries tags; the first tag is the group it stands in.
  # A tag that is one of GROUPS (or its word in the language at hand) has a name per language; any other tag is
  # free text and is shown as written. A row can also get another word than core's (Inställningar becomes
  # Grundinställningar): the default per language is in this plugin's locales, the instance's own word is kept in
  # the settings and offered to fields' page Översättningar.
  module AdminGroups
    GROUPS = %w[projects people issues traceability appearance system].freeze
    OTHER = 'other'
    CORE = {
      'projects' => %w[projects], 'users' => %w[people], 'groups' => %w[people], 'roles' => %w[people],
      'ldap_authentication' => %w[people], 'trackers' => %w[issues], 'issue_statuses' => %w[issues],
      'workflows' => %w[issues], 'custom_fields' => %w[issues], 'enumerations' => %w[issues],
      'settings' => %w[system], 'applications' => %w[system], 'plugins' => %w[system], 'info' => %w[system],
      'webhooks' => %w[system] # core 7.0
    }.freeze
    # Provisional: these belong to their plugins (AdminGroups.register in each init.rb) and leave this list as they do
    PROVISIONAL = {
      'gk_project_types_types' => %w[projects],
      'gk_people_schemes' => %w[people], 'gk_people_credential_kinds' => %w[people], 'gk_people_processing' => %w[people],
      'gk_people_elevations' => %w[people], 'gk_people_sync_log' => %w[people],
      'gk_workflow_rules_rules' => %w[issues], 'gk_workflow_rules_line' => %w[issues], 'gk_triggers_triggers' => %w[issues], 'gk_queries_periods' => %w[issues],
      'gk_records_events' => %w[traceability], 'gk_retention_annulments' => %w[traceability], 'gk_retention_rules' => %w[traceability],
      'gk_revisions_schemes' => %w[traceability], 'gk_records_reasons' => %w[traceability],
      'gk_theme_engine' => %w[appearance], 'gk_theme_engine_palette' => %w[appearance], 'gk_icons_library' => %w[appearance],
      'gk_fields_translations' => %w[appearance], 'gk_snippets_snippets' => %w[appearance],
      'gk_ops_jobs' => %w[system], 'gk_ops_backups' => %w[system], 'gk_ops_server' => %w[system], 'gk_scenarios_index' => %w[system],
      'gk_ops_logs' => %w[system], 'gk_ops_deployments' => %w[system], 'gk_gui_stuff_features' => %w[system],
      'gk_publishing_doc_types' => %w[traceability], 'gk_revisions_names' => %w[traceability],
      'gk_signoff_roles' => %w[people], 'gk_people_org_kinds' => %w[people], 'gk_checklists_templates' => %w[issues],
      # records' readings under traceability, people's quick words under people
      'gk_records_readings' => %w[traceability], 'gk_people_quick_words' => %w[people]
    }.freeze

    module_function

    def registered = (@registered ||= {})

    # A plugin says where its row belongs: AdminGroups.register(:gk_ops_jobs, 'system', plugin: :gk_ops)
    def register(item, *tags, plugin:)
      list = tags.flatten.map { |t| clean(t) }.reject(&:empty?)
      registered[item.to_s] = { tags: list, plugin: plugin.to_s } unless list.empty?
    end

    def clean(tag) = tag.to_s.strip.gsub(/\s+/, ' ').first(40)

    def stored
      h = Switches.settings['admin_rows']
      h.is_a?(Hash) ? h : {}
    end

    def row(item)
      r = stored[item.to_s]
      r.is_a?(Hash) ? r : {}
    end

    def default_tags(item)
      k = item.to_s
      (registered[k] && registered[k][:tags]) || CORE[k] || PROVISIONAL[k] || [OTHER]
    end

    def own_tags(item) = row(item)['tags'].to_s.split(',').map { |t| clean(t) }.reject(&:empty?)
    def tags(item) = own_tags(item).presence || default_tags(item)

    # The administrator may write the group's word instead of its key ("Personer och behörighet" for people). The
    # word is stored as written, so it is also known in the instance's language and in English: the row must stand
    # in the same group whatever language the person looking has.
    def key_for(tag)
      t = tag.to_s.downcase
      keys = GROUPS + [OTHER]
      keys.detect { |k| k == t } || keys.detect { |k| words(k).include?(t) } || tag.to_s
    end

    def words(key)
      [::I18n.locale, ::Setting.default_language, 'en'].map(&:to_s).reject(&:empty?).uniq.filter_map do |lang|
        ::I18n.t(:"label_gk_gui_stuff_ag_#{key}", locale: lang.to_sym, default: '').to_s.downcase.presence
      rescue StandardError
        nil
      end
    end

    def group(item) = key_for(tags(item).first)
    def label(key) = (GROUPS + [OTHER]).include?(key.to_s) ? ::I18n.t(:"label_gk_gui_stuff_ag_#{key}") : key.to_s

    # Core's rows and every plugin's, in the order core draws them (also those a condition hides right now)
    def items
      root = Redmine::MenuManager.items(:admin_menu)
      root.respond_to?(:children) ? root.children.to_a : []
    end

    # The row's word in a language: the instance's own, else this plugin's default, else '' (core's word stands)
    def caption(item, lang = ::I18n.locale)
      own = row(item)['caption']
      text = own.is_a?(Hash) ? own[lang.to_s].to_s.strip : ''
      return text unless text.empty?

      ::I18n.t(:"gk_gui_stuff_ag_caption_#{item}", locale: lang.to_sym, default: '').to_s
    rescue StandardError
      ''
    end

    def core_caption(item_node, lang = ::I18n.locale)
      ::I18n.with_locale(lang) { item_node.caption.to_s }
    rescue StandardError
      item_node.name.to_s.humanize
    end

    # What the script needs: every row by the class core gives its link (the row's name, dasherized), its group
    # and its word when it has another than core's; the groups in order (the known ones, the free ones, Övrigt last)
    def options
      return {} unless ::User.current.admin?

      seen = []
      # a free tag is one group whatever its case ("Drift" and "drift"): the spelling met first names it
      free = {}
      rows = items.map do |i|
        g = group(i.name)
        g = (free[g.downcase] ||= g) unless (GROUPS + [OTHER]).include?(g)
        seen << g unless seen.include?(g)
        { cls: i.name.to_s.dasherize, group: g, caption: caption(i.name).presence }.compact
      end
      keys = (GROUPS & seen) + (seen - GROUPS - [OTHER]).sort_by(&:downcase) + ([OTHER] & seen)
      { rows: rows, groups: keys.map { |k| { key: k, label: label(k) } } }
    rescue StandardError => e
      # this runs for every page an administrator opens: a fault here leaves core's list, never a broken page
      Rails.logger.warn("[gk_gui_stuff] admin_groups left out: #{e.class} #{e.message}")
      {}
    end

    # fields' page Översättningar gets the rows' words as a source of its own: the word in the instance's language
    # is the text as written, the other languages are its translations. Saved here, in this plugin's settings.
    def register_texts!
      return unless defined?(::GkFields::Translations) && ::GkFields::Translations.respond_to?(:register_source)

      ::GkFields::Translations.register_source('gk_gui_stuff_admin_rows', label: -> { ::I18n.t(:label_gk_gui_stuff_ag_rows) }, entries: -> { entries })
    end

    def entries
      t = ::GkFields::Translations
      core_lang = t.core_language
      items.map do |i|
        name = i.name.to_s
        core = caption(name, core_lang).presence || core_caption(i, core_lang)
        others = t.languages.to_h { |l| [l.to_s, caption(name, l)] }.reject { |_l, v| v.empty? }
        t::Entry.new(key: "gk_gui_stuff_admin_row:#{name}:caption", thing: core, what: ::I18n.t(:label_gk_gui_stuff_ag_caption), core: core,
                     translations: others, history: nil, saver: ->(texts, _user, _origin) { save_captions(name, texts) })
      end
    end

    def save_captions(name, texts)
      s = Switches.settings.deep_dup
      rows = s['admin_rows'].is_a?(Hash) ? s['admin_rows'] : (s['admin_rows'] = {})
      r = rows[name].is_a?(Hash) ? rows[name] : (rows[name] = {})
      before = r['caption'].is_a?(Hash) ? r['caption'] : {}
      after = before.merge(texts.to_h.transform_keys(&:to_s).transform_values { |v| v.to_s.strip }).reject { |_l, v| v.empty? }
      return false if after == before

      r['caption'] = after
      ::Setting.plugin_gk_gui_stuff = s
      true
    end
  end
end
