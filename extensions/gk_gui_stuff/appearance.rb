# frozen_string_literal: true

require_relative 'table_cells' # the words of the table values' cells, given at the registration

module GkGuiStuff
  # gui_stuff's appearance settings in records' register (GkRecords::AppearanceSettings): every module of the Registry
  # but actions_menu (always on), the settings that are not modules (the account menu's colours, the boxes' alignment,
  # the counter at the name, the buttons' placement, the icons per area, the sidebar and the header), the shared values,
  # and a setting per core page type of the Meaning register. The modules keep what they load in the Registry; here is
  # only what the register shows and stores: the group on the page, the levels, the values, GK's proposal and what goes
  # with what, and what each changes on the pages (footprint: and applies:, from Footprints, where the register takes
  # them). Without records nothing is declared and every setting is off.
  module Appearance
    PLUGIN = :gk_gui_stuff

    # The group on the page Appearance, by where the setting shows
    GROUPS = {
      'instance' => %w[instance_band footer_text help_link declutter recent_pages branch_jump fullscreen account_menu personal_count
                       icons_tabs icons_other layout_sidebar layout_header color_mode],
      'text' => %w[link_preview user_status arrows mailto_copy mailto_issue inline_copy code_copy core_copy_whisper filled_badges flag_icons link_preview_external external_new_tab],
      'lists' => %w[short_descriptions overdue_mark sticky_columns list_filter select_search scroll_shade custom_mark hide_disabled
                    members_by_group report_clarity align],
      'issue' => %w[long_fields notes_collapse private_notes_collapse code_blocks attachments_collapse quick_done parent_link
                    collapse_all history_navigator openers placements icons_issue],
      'forms' => %w[week_number key_suggest image_crop sticky_save settings_frame save_sweep],
      'calendar' => %w[calendar_compact gantt_width gantt_fill],
      'notices' => %w[whisper_tooltip wave flash_timeout flash_icon warning_text outcome_notice corner login_warning],
      'admin' => %w[admin_groups attachment_sizes]
    }.freeze

    # The settings that apply to all or none (the instance's own, and the pure corrections)
    TWO_MODES = %w[instance_band footer_text help_link declutter login_warning account_menu align flag_icons].freeze
    # The settings each person chooses, with the levels Off and Optional only: nobody forces them on everyone
    PERSON_ONLY = %w[external_new_tab].freeze
    # The plugin a module's row names while the module is not there (Registry needs:): user_status needs a source, which
    # GK Readup gives; arrows needs GK Core Stuff's pass over formatted text
    NEEDS_PLUGIN = { 'user_status' => 'gk_readup', 'arrows' => 'gk_core_stuff' }.freeze
    # Names of the plugins above that records' list may not hold, for a row shown while the plugin is not installed
    PLUGIN_NAMES = { 'gk_core_stuff' => 'GK Core Stuff', 'gk_icons' => 'GK Icons' }.freeze

    # GK's proposal; every setting not named is off in it
    PROPOSAL = {
      'forced' => %w[instance_band admin_groups attachment_sizes sticky_save settings_frame account_menu align],
      'optional' => %w[overdue_mark list_filter select_search mailto_copy mailto_issue inline_copy code_copy core_copy_whisper whisper_tooltip warning_text week_number
                       external_new_tab]
    }.freeze

    # A row's warning, the sharper one while its domain list holds "*", and the reason a save then needs
    ROW_EXTRAS = {
      'link_preview_external' => { warning: :text_gk_gui_stuff_lpe_warning, warning_sharp: :text_gk_gui_stuff_lpe_warning_all,
                                   sharp_when: { value: 'domains', includes: '*' }, reason_when_sharp: true }
    }.freeze

    FOLDS = %w[long_fields notes_collapse private_notes_collapse code_blocks attachments_collapse].freeze
    RELATED = {
      'list_filter' => %w[select_search], 'select_search' => %w[list_filter], 'sticky_save' => %w[settings_frame attachment_sizes],
      'settings_frame' => %w[sticky_save], 'attachment_sizes' => %w[sticky_save], 'gantt_width' => %w[gantt_fill],
      'gantt_fill' => %w[gantt_width], 'wave' => %w[flash_timeout outcome_notice], 'flash_timeout' => %w[wave outcome_notice],
      'outcome_notice' => %w[wave flash_timeout], 'instance_band' => %w[login_warning footer_text],
      'login_warning' => %w[instance_band], 'footer_text' => %w[declutter], 'help_link' => %w[declutter], 'declutter' => %w[footer_text help_link],
      'history_navigator' => %w[recent_pages], 'recent_pages' => %w[history_navigator],
      'link_preview' => %w[branch_jump members_by_group link_preview_external],
      'link_preview_external' => %w[link_preview external_new_tab], 'external_new_tab' => %w[link_preview_external],
      'branch_jump' => %w[link_preview], 'members_by_group' => %w[link_preview], 'sticky_columns' => %w[scroll_shade],
      'scroll_shade' => %w[sticky_columns], 'code_blocks' => %w[code_copy], 'code_copy' => %w[code_blocks inline_copy core_copy_whisper], 'core_copy_whisper' => %w[code_copy whisper_tooltip], 'whisper_tooltip' => %w[core_copy_whisper],
      'inline_copy' => %w[code_copy mailto_copy], 'mailto_copy' => %w[inline_copy mailto_issue], 'mailto_issue' => %w[mailto_copy], 'placements' => %w[icons_issue icons_other],
      'icons_issue' => %w[placements], 'icons_other' => %w[placements], 'layout_sidebar' => %w[layout_header],
      'layout_header' => %w[layout_sidebar]
    }.freeze
    # Other plugins' settings that go with gui_stuff's, by their whole key
    RELATED_ELSEWHERE = {
      'filled_badges' => %w[core_stuff.list_badge core_stuff.heading_badge], 'quick_done' => %w[core_stuff.done_ratio_text],
      'footer_text' => %w[core_stuff.footer_version], 'mailto_copy' => %w[core_stuff.external_links], 'mailto_issue' => %w[core_stuff.external_links], 'user_status' => %w[people.name_chat],
      'color_mode' => %w[core_stuff.dark_mode],
      'link_preview_external' => %w[core_stuff.external_links], 'external_new_tab' => %w[core_stuff.external_links]
    }.freeze

    # The settings that show no picture under Visa: three steps each, text_gk_gui_stuff_step_<name>_1 to _3
    STEPS = %w[key_suggest history_navigator private_notes_collapse recent_pages].freeze
    # The settings Visa shows off and on, drawn by the style guide's helpers: gk_gui_stuff_appearance/previews/_<name>
    PREVIEWS = %w[wave corner flash_timeout flash_icon warning_text outcome_notice filled_badges flag_icons long_fields notes_collapse code_blocks save_sweep personal_count].freeze

    ICON_CHOICES = %w[core both icon].freeze

    module_function

    def register = GkGuiStuff.appearance_settings
    def key(name) = "gui_stuff.#{name}"
    def group_of(name) = GROUPS.find { |_g, keys| keys.include?(name.to_s) }&.first
    # The name of a plugin a row needs, also while that plugin is not installed
    def plugin_name(plugin) = ::Redmine::Plugin.registered_plugins[plugin.to_sym]&.name || PLUGIN_NAMES[plugin.to_s] || GkRecords::Features.name_of(plugin)

    def proposal_of(name)
      PROPOSAL.find { |_level, keys| keys.include?(name.to_s) }&.first || 'off'
    end

    def related_of(name) = Array(RELATED[name.to_s]).map { |k| key(k) } + Array(RELATED_ELSEWHERE[name.to_s])
    def steps_of(name) = STEPS.include?(name.to_s) ? (1..3).map { |i| :"text_gk_gui_stuff_step_#{name}_#{i}" } : nil
    def preview_of(name) = PREVIEWS.include?(name.to_s) ? "gk_gui_stuff_appearance/previews/#{name}" : nil

    # A value under a setting whose name, help text and field are the same as on the settings page before
    def value(label, kind, default, **o)
      { kind: kind, default: default, label: :"label_gk_gui_stuff_#{label}", help: :"text_gk_gui_stuff_#{label}" }.merge(o)
    end

    def choices(prefix, list) = -> { list.map { |c| [::I18n.t(:"#{prefix}_#{c}"), c] } }

    # The sidebar's place: stored as before and after the content, the buttons saying Left and Right where that is on
    # the page, so that they swap in a right-to-left language (core's own direction word)
    def side_choices
      lambda do
        rtl = ::I18n.t(:direction, default: 'ltr').to_s == 'rtl'
        words = { 'before' => rtl ? 'right' : 'left', 'after' => rtl ? 'left' : 'right', 'hidden' => 'hidden' }
        %w[before after hidden].map { |c| [::I18n.t(:"label_gk_gui_stuff_layout_side_#{words[c]}"), c] }
      end
    end

    # The values under each module's setting
    def module_values
      {
        'link_preview' => { 'preview_delay_ms' => value('preview_delay', :number, 500, min: 0, max: 3000, step: 50) },
        'attachments_collapse' => { 'fold_attachments' => value('fold_attachments', :number, 6, min: 2, max: 100, step: 1),
                                    'attachments_newest' => value('attachments_newest', :flag, false) },
        'footer_text' => { 'footer_text' => value('footer_text', :text, '', max: 500) },
        'flash_timeout' => { 'flash_seconds' => value('flash_seconds', :number, 8, min: 0, max: 120, step: 1) },
        'wave' => { 'wave_opacity_pct' => value('wave_opacity_pct', :number, 60, min: 0, max: 100, step: 5),
                    'wave_first_ms' => value('wave_first_ms', :number, 1600, min: 0, max: 5000, step: 100),
                    'wave_ms' => value('wave_ms', :number, 600, min: 0, max: 5000, step: 50),
                    'wave_min_ms' => value('wave_min_ms', :number, 400, min: 0, max: 5000, step: 50),
                    'wave_start_delay_ms' => value('wave_start_delay_ms', :number, 50, min: 0, max: 5000, step: 50),
                    'loading_delay_ms' => value('loading_delay_ms', :number, 1300, min: 200, max: 10_000, step: 100),
                    'wave_hide_flash' => value('wave_hide_flash', :flag, true) },
        'corner' => { 'corner_max_entries' => value('corner_max_entries', :number, 20, min: 1, max: 100, step: 1) },
        'short_descriptions' => { 'description_lines' => value('description_lines', :number, 1, min: 1, max: 10, step: 1) },
        'custom_mark' => { 'custom_mark_style' => value('custom_mark_style', :select, 'diamond',
                                                        choices: choices('label_gk_gui_stuff_custom_mark', CustomMark::STYLES)) },
        'login_warning' => { 'login_warning_animate' => value('lw_animate', :flag, true),
                             'login_warning_endless' => value('lw_endless', :flag, false) },
        # the three ways Help can lead, one table: kind (core, url or wiki), url, wiki_project, wiki_page. Each table says
        # what counts as empty in its cells and gives their words (TableCells), which an older GK Records passes over
        'help_link' => { 'help_link' => value('help_kind', :table, { 'kind' => 'core' }, choices: 'help_link', **TableCells.options('help_link')) },
        'declutter' => { 'declutter' => value('declutter', :table, {}, choices: 'declutter', **TableCells.options('declutter')) },
        'quick_done' => { 'quick_done_status' => value('quick_done_status', :table, {}, choices: 'quick_done_status', **TableCells.options('quick_done_status')) },
        'admin_groups' => { 'admin_rows' => value('ag_rows', :table, {}, choices: 'admin_rows', **TableCells.options('admin_rows')) }
      }.merge(defined?(External) ? { 'link_preview_external' => external_values } : {})
    end

    # The values of the preview of external links, in the page's order: the domain list, the plain links, the limits of
    # the fetch, the picture folder and its cap, and the button that empties what is kept. Kinds and limits are External's own.
    def external_values
      v = lambda do |name, **o|
        { label: :"label_gk_gui_stuff_lpe_#{name}", help: :"text_gk_gui_stuff_lpe_#{name}" }.merge(External::VALUES.fetch(name)).merge(o)
      end
      { 'domains' => v.call('domains', pattern: External::Domains::ENTRY, info: :text_gk_gui_stuff_lpe_domains_info),
        'bare_links' => v.call('bare_links', info: :text_gk_gui_stuff_lpe_bare_links_info),
        'max_parallel' => v.call('max_parallel'), 'domain_interval_seconds' => v.call('domain_interval_seconds'),
        'page_max_kb' => v.call('page_max_kb'), 'image_max_kb' => v.call('image_max_kb'),
        'timeout_seconds' => v.call('timeout_seconds'),
        'queue_max' => v.call('queue_max', info: :text_gk_gui_stuff_lpe_queue_max_info),
        'refresh_days' => v.call('refresh_days'), 'forget_days' => v.call('forget_days'),
        'link_previews_dir' => v.call('link_previews_dir', placeholder: -> { External::Storage.default_dir },
                                                           info: :text_gk_gui_stuff_lpe_link_previews_dir_info),
        'image_folder_max_mb' => v.call('image_folder_max_mb', info: :text_gk_gui_stuff_lpe_image_folder_max_mb_info),
        'clear' => { kind: :action, label: :label_gk_gui_stuff_lpe_clear, url: :gk_gui_stuff_external_preview_clear_path,
                     confirm: :text_gk_gui_stuff_lpe_clear_confirm } }
    end

    # Whether records' register takes a keyword of register (an older register lacks the newer ones)
    def takes?(r, keyword) = r.method(:register).parameters.any? { |_, n| n == keyword }

    # The register knows warnings, list values and the person's default
    def extras?(r) = r.const_defined?(:KINDS) && r::KINDS.include?('list') && takes?(r, :warning) && takes?(r, :person_default)

    # A row's warning keywords, given only to a register that takes them
    def extras_for(name, r) = extras?(r) ? (ROW_EXTRAS[name] || {}) : {}

    # What the setting changes on the pages (Footprints), given only to a register that takes it
    def footprint_for(name, r) = takes?(r, :footprint) && takes?(r, :applies) ? Footprints.for(name) : {}

    # A shared value's own footprint, given only to a register whose register_shared takes it
    def shared_footprint_for(name, r)
      params = r.method(:register_shared).parameters.map(&:last)
      params.include?(:footprint) && params.include?(:applies) ? Footprints.for_shared(name) : {}
    end

    # The levels of a module: Off and Optional for what each person chooses, Off and Forced for all or none, else three
    def modes_of(name, r)
      return r::PERSON_MODES if PERSON_ONLY.include?(name) && r.const_defined?(:PERSON_MODES)

      TWO_MODES.include?(name) ? %w[off forced] : %w[off optional forced]
    end

    # Every module of the Registry but the ones always on, with the module's own loading facts (anonymous, needs). A
    # row with warnings is never declared half: with an older register, or without its values, it is left out.
    def declare_modules!(r)
      vals = module_values
      Registry.all.each_value do |m|
        next if m.always

        group = group_of(m.key)
        unless group
          Rails.logger.warn("[gk_gui_stuff] module #{m.key} has no group on the page Appearance and is not declared")
          next
        end
        if ROW_EXTRAS.key?(m.key) && !(extras?(r) && vals.key?(m.key))
          Rails.logger.warn("[gk_gui_stuff] module #{m.key} needs a newer GK Records register and is not declared")
          next
        end
        r.register(key(m.key), plugin: PLUGIN, group: group, label: m.label_key, help: m.text_key, modes: modes_of(m.key, r),
                               proposal: proposal_of(m.key), values: vals[m.key] || {}, related: related_of(m.key), steps: steps_of(m.key), preview: preview_of(m.key),
                               anonymous: m.anonymous, needs: m.needs, needs_plugin: NEEDS_PLUGIN[m.key],
                               **extras_for(m.key, r), **footprint_for(m.key, r))
      end
    end

    # The settings that are not modules: rules in the head, the counter, and the values that were the settings page's
    # placements
    def declare_own!(r)
      own = ->(name, **o) { r.register(key(name), plugin: PLUGIN, group: group_of(name), proposal: proposal_of(name), related: related_of(name),
                                                  label: :"label_gk_gui_stuff_mod_#{name}", help: :"text_gk_gui_stuff_mod_#{name}",
                                                  **footprint_for(name, r), **o) }
      # the rule finds the account menu's links by GK Core Stuff's mark on a menu's links (menu_marks)
      own.call('account_menu', modes: %w[off forced], anonymous: true, needs: -> { defined?(::GkCoreStuff::MenuMarks) ? true : false },
                               needs_plugin: 'gk_core_stuff')
      own.call('align', modes: %w[off forced], anonymous: true)
      # the common icon and one per sort, all kept in one table so that the form's one reason covers them; flags are on
      # the pages someone not logged in sees too
      own.call(FlagIcons::SETTING, modes: %w[off forced], anonymous: true, preview: preview_of(FlagIcons::SETTING),
                                   needs: -> { defined?(::GkIcons) ? true : false }, needs_plugin: 'gk_icons',
                                   values: { FlagIcons::VALUE => value('flag_icons', :table, {}, choices: 'flag_icons', **TableCells.options('flag_icons')) })
      own.call('personal_count', person: :select, person_off: true, preview: preview_of('personal_count'),
                                 values: { 'shown_as' => { kind: :choice, default: 'waiting', person: true, label: :label_gk_gui_stuff_count_shown_as,
                                                           choices: choices('label_gk_gui_stuff_count_shown_as', %w[waiting split zero]) } })
      own.call('placements', person: :table,
                             values: { 'placements' => { kind: :table, default: {}, person: true, choices: 'placements',
                                                         label: :label_gk_gui_stuff_placements, help: :text_gk_gui_stuff_placements,
                                                         **TableCells.options('placements') } })
      %w[tabs issue other].each do |area|
        own.call("icons_#{area}", person: :segment,
                                  values: { 'mode' => { kind: :choice, default: 'icon', person: true, label: :"label_gk_gui_stuff_icons_#{area}",
                                                        choices: choices('label_gk_gui_stuff_placement', ICON_CHOICES) } })
      end
      own.call('layout_sidebar', person: :segment,
                                 values: { 'side' => { kind: :choice, default: 'before', person: true, label: :label_gk_gui_stuff_layout_sidebar,
                                                       choices: side_choices } })
      own.call('layout_header', person: :segment,
                                values: { 'height' => { kind: :choice, default: 'compact', person: true, label: :label_gk_gui_stuff_layout_header,
                                                        choices: choices('label_gk_gui_stuff_layout_header', %w[tall compact]) } })
      # the light, dark or automatic button in the top menu (ColorMode): the administrator's on or off, no person's
      # level; it counts only while GK Core Stuff's dark mode (the mode, whose value is the choice) is optional
      own.call(ColorMode::NAME, modes: %w[off forced], needs: -> { ColorMode.core_dark ? true : false }, needs_plugin: 'gk_core_stuff')
      # a new tab is each person's own choice, off for each person until chosen; never forced
      if r.const_defined?(:PERSON_MODES) && takes?(r, :person_default)
        own.call('external_new_tab', modes: r::PERSON_MODES, person: :switch, person_default: 'off')
      else
        Rails.logger.warn('[gk_gui_stuff] external_new_tab needs a newer GK Records register and is not declared')
      end
    end

    # The values several settings read, without a level of their own
    def declare_shared!(r)
      r.register_shared(key('fold_height'), plugin: PLUGIN, label: :label_gk_gui_stuff_shared_fold_height, help: :text_gk_gui_stuff_shared_fold_height, used_by: %w[long_fields notes_collapse code_blocks].map { |k| key(k) },
                                            values: { 'fold_height_px' => value('fold_height', :number, 320, min: 80, max: 2000, step: 20) })
      # GK's own notices (the tray of gk_gui_stuff_elements.js); the settings that show one that goes away by itself are
      # the wave (an outcome it cannot show), the outcome notice and Snabbhopp (nothing to jump to). Core's green message is flash_timeout's,
      # with its own seconds.
      notices = shared_footprint_for('notices', r)
      r.register_shared(key('notices'), plugin: PLUGIN, label: :label_gk_gui_stuff_shared_notices, help: :text_gk_gui_stuff_shared_notices,
                                        used_by: %w[wave outcome_notice history_navigator].map { |k| key(k) }, **notices,
                                        values:{ 'notice_seconds' => value('notice_seconds', :number, 6, min: 4, max: 60, step: 1, info: :text_gk_gui_stuff_notice_seconds_info),
                                                  'notice_max' => value('notice_max', :number, 3, min: 1, max: 50, step: 1, info: :text_gk_gui_stuff_notice_max_info),
                                                  'notice_countdown' => value('notice_countdown', :flag, true) })
      r.register_shared(key('due_soon'), plugin: PLUGIN, label: :label_gk_gui_stuff_shared_due_soon, help: :text_gk_gui_stuff_shared_due_soon, used_by: [key('overdue_mark')],
                                         values: { 'due_soon_days' => value('due_soon_days', :number, 3, min: 0, max: 60, step: 1, info: :text_gk_gui_stuff_due_soon_days_info) })
      r.register_shared(key('beat'), plugin: PLUGIN, label: :label_gk_gui_stuff_shared_beat, help: :text_gk_gui_stuff_shared_beat, used_by: [key('corner')],
                                     values: { 'beat_seconds' => value('beat_seconds', :number, 30, min: 0, max: 600, step: 5, info: :text_gk_gui_stuff_beat_seconds_info) })
      # whether the instance reaches other websites; other GK plugins may read it too
      r.register_shared(key('network'), plugin: PLUGIN, label: :label_gk_gui_stuff_shared_network, help: :text_gk_gui_stuff_shared_network,
                                        used_by: [key('link_preview_external')],
                                        values: { 'closed_network' => value('closed_network', :flag, false, info: :text_gk_gui_stuff_closed_network_info) })
    end

    # A core page type of the Meaning register: off is the classic view (a new installation), optional lets each person
    # choose with a default, forced is the Meaning view for everyone
    def declare_core_pages!(r)
      Meaning.types.select(&:core).each do |t|
        r.register(Meaning.row_key(t.key), plugin: PLUGIN, group: t.group, label: t.label_key, help: :text_gk_gui_stuff_meaning_core_page,
                                           values: { 'default_view' => { kind: :choice, default: t.default_view, label: :label_gk_gui_stuff_meaning_default_view,
                                                                         choices: -> { Meaning.view_choices } } })
      end
    end

    # Called once every plugin has loaded (records loads after gui_stuff), and again after a reload
    def declare!
      r = register
      return unless r

      declare_modules!(r)
      declare_own!(r)
      declare_shared!(r)
      declare_core_pages!(r)
      # Like Redmine for me is the person's own only while the administrator allows it
      r.grant_redmine(-> { Switches.user_core_like_allowed? })
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] appearance settings not declared: #{e.class} #{e.message}")
    end

    # Readers for gui_stuff's own settings: off and nil without records
    def mode(name) = (r = register) ? r.mode(key(name)) : 'off'
    def on?(name) = mode(name) != 'off'
    def on_for?(name, user = ::User.current) = (r = register) ? r.on_for?(key(name), user) : false

    # The administrator's value of a setting that is not off, else nil
    def admin_value(name, value_name, allowed = nil)
      return nil unless on?(name)

      v = register.value(key(name), value_name)
      allowed.nil? || allowed.include?(v.to_s) ? v : nil
    end

    # The person's own value of an optional setting the person has it on for, else nil
    def own_value(name, value_name, user, allowed = nil)
      r = register
      return nil unless r && user&.logged? && r.mode(key(name)) == 'optional' && r.on_for?(key(name), user)

      raw = r.person_choice(key(name), user)[:values][value_name.to_s]
      return nil if raw.nil?

      allowed.nil? || allowed.include?(raw.to_s) ? raw : nil
    end
  end
end
