# frozen_string_literal: true
# Depends on: none required; optional gk_records, gk_fields, gk_icons, gk_compat, gk_core_stuff, gk_scenarios.

require_relative 'extensions/gk_gui_stuff/core'
require_relative 'extensions/gk_gui_stuff/choices_box' # The box of choices above a list's rows
require_relative 'extensions/gk_gui_stuff/elements'
require_relative 'extensions/gk_gui_stuff/user_status'
require_relative 'extensions/gk_gui_stuff/page_data' # The page's data and the shared pulse
require_relative 'extensions/gk_gui_stuff/personal' # The person's own pages
require_relative 'extensions/gk_gui_stuff/wave_forms' # The wave's words for a form that is not a save
require_relative 'extensions/gk_gui_stuff/overdue'
require_relative 'extensions/gk_gui_stuff/admin_groups'
require_relative 'extensions/gk_gui_stuff/row_editor' # The shared row editor (add, remove, move rows)
require_relative 'extensions/gk_gui_stuff/row_menu' # The shared row menu (a list's row actions in a menu)
require_relative 'extensions/gk_gui_stuff/core_stuff_looks' # core_stuff's look modules, linked from here
require_relative 'extensions/gk_gui_stuff/top_menu' # the GK plugins' top menu entries under the installation's own word
require_relative 'extensions/gk_gui_stuff/patches' # The core patches, all in one place

Redmine::Plugin.register :gk_gui_stuff do
  name        'GK GUI Stuff'
  author      'Jimmy Westberg'
  description 'Collection of small, switchable UI modules'
  version     '1.02.000'
  requires_redmine version_or_higher: '6.0.0'

  # Administration > Funktioner, every plugin's declared functions, read from gk_records' register
  menu :admin_menu, :gk_gui_stuff_features, { controller: 'gk_gui_stuff_features', action: 'index' },
       caption: :label_gk_gui_stuff_features, icon: 'settings', html: { class: 'icon' }

  settings default: { 'core_like' => '0', 'user_core_like' => '1', 'preview_delay_ms' => '500', 'fold_height_px' => '320', 'fold_attachments' => '6', 'attachments_newest' => '0', 'footer_text' => '',
                      'login_warning_animate' => '1', 'login_warning_endless' => '0', 'beat_seconds' => '30', 'wave_opacity_pct' => '60',
                      'wave_first_ms' => '1600', 'wave_ms' => '600', 'loading_delay_ms' => '1300', 'wave_hide_flash' => '1', 'notice_seconds' => '6',
                      'corner_max_entries' => '20', 'declutter' => {}, 'flash_seconds' => '8', 'notice_countdown' => '1', 'custom_mark_style' => 'diamond', 'quick_done_status' => {}, 'wave_min_ms' => '400', 'wave_start_delay_ms' => '0', 'help_kind' => 'core', 'help_url' => '',
                      'help_wiki_project' => '', 'help_wiki_page' => '', 'due_soon_days' => '3', 'placements' => {}, 'admin_rows' => {}, 'top_menu' => {},'personal_count_seconds' => '60', 'description_lines' => '1',
                      'modules' => {} }, # each module's mode; a module declared default: true is on in a new installation

           partial: 'settings/gk_gui_stuff_settings'
end

GkGuiStuff::Registry.register('link_preview', label_key: :label_gk_gui_stuff_mod_link_preview, text_key: :text_gk_gui_stuff_mod_link_preview,
                                               script: 'gk_gui_stuff_link_preview', stylesheet: 'gk_gui_stuff_link_preview')
GkGuiStuff::Registry.register('members_by_group', label_key: :label_gk_gui_stuff_mod_members_by_group, text_key: :text_gk_gui_stuff_mod_members_by_group)
GkGuiStuff::Registry.register('report_clarity', label_key: :label_gk_gui_stuff_mod_report_clarity, text_key: :text_gk_gui_stuff_mod_report_clarity,
                                                 script: 'gk_gui_stuff_report_clarity', stylesheet: 'gk_gui_stuff_report_clarity')
GkGuiStuff::Preview.register_core!

# The control layer's first primitives (fold, copy, time, content) with the modules that are only declarations of
# where, the issue page's two small helps, the history list, the footer line and the login warning.
# They share the kernel (gk_gui_stuff_core.js) and one stylesheet; each is switched on its own.
gk_gui_stuff_sw_mod = GkGuiStuff::Switches
gk_gui_stuff_fold_opts = { script: 'gk_gui_stuff_fold', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :fold,
             texts: %i[gk_gui_stuff_fold_more gk_gui_stuff_fold_less gk_gui_stuff_fold_private gk_gui_stuff_fold_files] }
%w[long_fields notes_collapse private_notes_collapse code_blocks attachments_collapse].each do |key|
  GkGuiStuff::Registry.register(key, **gk_gui_stuff_fold_opts)
end
%w[mailto_copy inline_copy code_copy].each do |key|
  GkGuiStuff::Registry.register(key, script: 'gk_gui_stuff_copy', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :copy,
                                      texts: %i[gk_gui_stuff_copied gk_gui_stuff_copy_address gk_gui_stuff_copy_click gk_gui_stuff_copy_code gk_gui_stuff_copied_mail gk_gui_stuff_copied_code gk_gui_stuff_copied_block])
end
GkGuiStuff::Registry.register('week_number', script: 'gk_gui_stuff_time', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :time, texts: %i[gk_gui_stuff_week_short])
GkGuiStuff::Registry.register('arrows', script: 'gk_gui_stuff_content', kernel: true, group: :content)
GkGuiStuff::Registry.register('quick_done', script: 'gk_gui_stuff_issue', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :issue,
                                             texts: %i[gk_gui_stuff_quick_done gk_gui_stuff_quick_done_title gk_gui_stuff_quick_done_title_status],
                                             options: lambda {
                                               h = gk_gui_stuff_sw_mod.settings['quick_done_status']
                                               map = h.is_a?(Hash) ? h.select { |_, v| v.to_s.match?(/\A\d+\z/) } : {}
                                               { status: map, names: IssueStatus.where(id: map.values).to_h { |s| [s.id.to_s, s.name] } }
                                             })
GkGuiStuff::Registry.register('parent_link', script: 'gk_gui_stuff_issue', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :issue, texts: %i[gk_gui_stuff_parent])
# recent_pages: the pages one was last on
GkGuiStuff::Registry.register('recent_pages', script: 'gk_gui_stuff_history', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :navigation,
                                               texts: %i[gk_gui_stuff_history gk_gui_stuff_history_empty])

# The shared elements (surface, notice, wave, banner, ribbon, corner, palette, drawer; gk_gui_stuff_elements.js) and
# their first users. Every user is a module; the elements load when one of them is on.
gk_gui_stuff_el_opts = { script: 'gk_gui_stuff_uses', kernel: true, elements: true, group: :elements,
           texts: %i[gk_gui_stuff_close gk_gui_stuff_dismiss gk_gui_stuff_reload gk_gui_stuff_reload_unsaved gk_gui_stuff_and_more gk_gui_stuff_no_hits gk_gui_stuff_corner_title
                     gk_gui_stuff_drawer_size gk_gui_stuff_drawer_empty gk_gui_stuff_menu gk_gui_stuff_view_not_saved gk_gui_stuff_flash_pause gk_gui_stuff_flash_resume
                     gk_gui_stuff_wave_saved gk_gui_stuff_wave_deleted gk_gui_stuff_wave_failed] }
# openers: a button the server writes (a field type's appearance) that opens its content as a panel or the whole screen
GkGuiStuff::Registry.register('openers', **gk_gui_stuff_el_opts, script: 'gk_gui_stuff_openers', stylesheet: 'gk_gui_stuff_modules')
GkGuiStuff::Registry.register('wave', **gk_gui_stuff_el_opts, options: lambda {
  { saved: ::I18n.t(:gk_gui_stuff_wave_saved), saving: ::I18n.t(:gk_gui_stuff_wave_saving), deleted: ::I18n.t(:gk_gui_stuff_wave_deleted), failed: ::I18n.t(:gk_gui_stuff_wave_failed),
    deleting: ::I18n.t(:gk_gui_stuff_wave_deleting), loading: ::I18n.t(:gk_gui_stuff_wave_loading),
    first_ms: gk_gui_stuff_sw_mod.int('wave_first_ms', 1600, 0), ms: gk_gui_stuff_sw_mod.int('wave_ms', 600, 0), min_ms: gk_gui_stuff_sw_mod.int('wave_min_ms', 400, 0),
    start_delay: gk_gui_stuff_sw_mod.int('wave_start_delay_ms', 0, 0), loading_delay: gk_gui_stuff_sw_mod.int('loading_delay_ms', 1300, 200),
    hide_flash: gk_gui_stuff_sw_mod.flag(gk_gui_stuff_sw_mod.settings['wave_hide_flash'], true), forms: GkGuiStuff::WaveForms.for_page }
})
GkGuiStuff::Registry.register('corner', **gk_gui_stuff_el_opts)
GkGuiStuff::Registry.register('history_navigator', **gk_gui_stuff_el_opts.merge(texts: gk_gui_stuff_el_opts[:texts] + %i[gk_gui_stuff_hn_title gk_gui_stuff_hn_placeholder gk_gui_stuff_hn_empty gk_gui_stuff_hn_changes]))
GkGuiStuff::Registry.register('actions_menu', **gk_gui_stuff_el_opts, always: true) # forced
GkGuiStuff::Registry.register('fullscreen', **gk_gui_stuff_el_opts)
GkGuiStuff::Registry.register('branch_jump', **gk_gui_stuff_el_opts.merge(stylesheet: 'gk_gui_stuff_link_preview', texts: gk_gui_stuff_el_opts[:texts] + %i[gk_gui_stuff_branch gk_gui_stuff_branch_open gk_gui_stuff_branch_projects gk_gui_stuff_loading]))
# Core's green message goes away by itself
gk_gui_stuff_forms_opts = { script: 'gk_gui_stuff_forms', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :forms }
GkGuiStuff::Registry.register('flash_timeout', **gk_gui_stuff_forms_opts, texts: %i[gk_gui_stuff_close gk_gui_stuff_flash_pause gk_gui_stuff_flash_resume],
                                                options: -> { { seconds: gk_gui_stuff_sw_mod.int('flash_seconds', 8, 0) } })
GkGuiStuff::Registry.register('custom_mark', group: :forms)
# A project's description in a list cut after a few lines, the whole text as tooltip
GkGuiStuff::Registry.register('short_descriptions', script: 'gk_gui_stuff_short_descriptions', kernel: true, group: :lists, default: true)
# A faint shadow at the edge of a scrolling GK surface where there is more to scroll to
GkGuiStuff::Registry.register('scroll_shade', script: 'gk_gui_stuff_scroll_shade', stylesheet: 'gk_gui_stuff_scroll_shade', kernel: true, group: :forms, default: true)
# Actions that may not be used are left out of the context menu instead of dimmed; off in a new installation (a choice)
GkGuiStuff::Registry.register('hide_disabled', stylesheet: 'gk_gui_stuff_hide_disabled', group: :forms)
# Core's status badges filled with their own colour on every page; off: core's outlined badges. Badges follow core,
# and are filled only through this module
GkGuiStuff::Registry.register('filled_badges', stylesheet: 'gk_gui_stuff_filled_badges', anonymous: true)
GkGuiStuff::Registry.register('key_suggest', script: 'gk_gui_stuff_key_suggest', kernel: true, group: :forms, default: true, texts: %i[gk_gui_stuff_key_hint])
# A square part of a picture chosen in the browser (people's pictures of users); on in a new installation
GkGuiStuff::Registry.register('image_crop', script: 'gk_gui_stuff_crop', kernel: true, group: :forms, default: true, texts: %i[gk_gui_stuff_crop_hint gk_gui_stuff_crop_size])
GkGuiStuff::Registry.register('help_link', safety: true, anonymous: true, group: :instance)
GkGuiStuff::Registry.register('declutter', safety: true, anonymous: true, group: :instance)

GkGuiStuff::ViewStates.register('fullscreen', values: %w[off on], default: 'off', label: :label_gk_gui_stuff_mod_fullscreen)
GkGuiStuff::Menu.register('history', section: :show, context: :issue, label: :gk_gui_stuff_menu_history, plugin: :gk_gui_stuff, kind: :action, action: :history, order: 10, icon: 'history')
GkGuiStuff::Menu.register('fullscreen', section: :show, context: %i[issue issue_list project wiki_page version other], label: :gk_gui_stuff_menu_fullscreen,
                                         plugin: :gk_gui_stuff, kind: :action, action: :fullscreen, order: 20, icon: 'zoom-in')
# The instance's own: never the user's choice (there is no user for the login warning; the footer is the
# instance's statement). The administrator switches them.
GkGuiStuff::Registry.register('footer_text', safety: true, anonymous: true, stylesheet: 'gk_gui_stuff_modules', group: :instance)
GkGuiStuff::Registry.register('login_warning', safety: true, anonymous: true, script: 'gk_gui_stuff_login_warning', stylesheet: 'gk_gui_stuff_modules',
                                                kernel: true, group: :instance, texts: %i[gk_gui_stuff_lw_close],
                                                options: lambda {
                                                  { text: ::I18n.t(:text_gk_gui_stuff_lw, system: Setting.app_title),
                                                    animate: gk_gui_stuff_sw_mod.flag(gk_gui_stuff_sw_mod.settings['login_warning_animate'], true),
                                                    endless: gk_gui_stuff_sw_mod.flag(gk_gui_stuff_sw_mod.settings['login_warning_endless'], false) }
                                                })

# user_status, the dot after a person's name. Draws nothing and asks nothing when no source is on for the
# person, and is not there at all when no plugin has registered a source (readup is the one that does)
GkGuiStuff::Registry.register('user_status', script: 'gk_gui_stuff_user_status', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :people,
                                              options: -> { GkGuiStuff::UserStatus.options }, needs: -> { GkGuiStuff::UserStatus.sources.any? })

# Three of the planned ones from the redmine.org review: sticky_columns (#43641, #14508), overdue_mark (#20812)
# and collapse_all (#29034). Each has its own stylesheet, so a module that is off draws nothing.
GkGuiStuff::Registry.register('sticky_columns', script: 'gk_gui_stuff_sticky', stylesheet: 'gk_gui_stuff_sticky', kernel: true, group: :lists)
# overdue_mark's stripe says in its tip what it means (gk_gui_stuff_row_marks.js)
GkGuiStuff::Registry.register('overdue_mark', stylesheet: 'gk_gui_stuff_overdue', script: 'gk_gui_stuff_row_marks', kernel: true, group: :lists,
                                              options: lambda {
                                                { marks: [{ cls: 'overdue', text: ::I18n.t(:text_gk_gui_stuff_mark_overdue) },
                                                          { cls: 'gk-gui-stuff-due-soon', text: ::I18n.t(:text_gk_gui_stuff_mark_due_soon, days: GkGuiStuff::Overdue.soon_days) }] }
                                              })
# A double click on the Gantt chart's subjects column widens it to its longest subject and back; on in a new
# installation, also a proposal to core
GkGuiStuff::Registry.register('gantt_width', script: 'gk_gui_stuff_gantt_width', kernel: true, group: :lists, default: true)
# A Gantt chart narrower than its area gets more months to the right until the area is filled; also a proposal to
# core
GkGuiStuff::Registry.register('gantt_fill', script: 'gk_gui_stuff_gantt_fill', kernel: true, group: :lists)
# The calendar's compact view beside core's, chosen on the page and kept with the account (core's preferences, as
# the proposal to core does it); on in a new installation
GkGuiStuff::ViewStates.register('calendar_compact', values: %w[off on], default: 'off', label: :label_gk_gui_stuff_mod_calendar_compact, pref: true)
GkGuiStuff::Registry.register('calendar_compact', script: 'gk_gui_stuff_calendar_compact', stylesheet: 'gk_gui_stuff_calendar_compact', kernel: true,
                                                   group: :lists, default: true,
                                                   texts: %i[gk_gui_stuff_cal_compact gk_gui_stuff_cal_normal gk_gui_stuff_cal_compact_title gk_gui_stuff_cal_normal_title],
                                                   options: -> { { on: GkGuiStuff::ViewStates.for(User.current)['calendar_compact'] == 'on' } })
GkGuiStuff::Registry.register('collapse_all', script: 'gk_gui_stuff_sections', stylesheet: 'gk_gui_stuff_sections', kernel: true, group: :issue,
                                               texts: %i[gk_gui_stuff_sec_attributes gk_gui_stuff_sec_close_all gk_gui_stuff_sec_open_all gk_gui_stuff_sec_empty])

# Long lists, on core's pages and ours, each its own module and on in a new installation: a filter field above a long
# list of check boxes or a long table, a searchable chooser for a long list of choices (the real list stays in the
# form)
gk_gui_stuff_lists_opts = { script: 'gk_gui_stuff_lists', stylesheet: 'gk_gui_stuff_lists', kernel: true, group: :lists, default: true }
GkGuiStuff::Registry.register('list_filter', **gk_gui_stuff_lists_opts,
                                              texts: %i[gk_gui_stuff_lf_placeholder gk_gui_stuff_lf_label gk_gui_stuff_lf_label_of gk_gui_stuff_lf_count gk_gui_stuff_lf_clear gk_gui_stuff_no_hits])
GkGuiStuff::Registry.register('select_search', **gk_gui_stuff_lists_opts,
                                                texts: %i[gk_gui_stuff_ss_search gk_gui_stuff_ss_placeholder gk_gui_stuff_ss_remove gk_gui_stuff_no_hits])
# Long settings pages, each its own module and on in a new installation: the form's one Save kept in reach at the
# bottom of the window, every GK plugin's Configure page with folded boxes, a search and the change log per version,
# and quick sizes beside core's attachment sizes
gk_gui_stuff_settings_opts = { script: 'gk_gui_stuff_settings', stylesheet: 'gk_gui_stuff_settings', kernel: true, group: :forms, default: true }
GkGuiStuff::Registry.register('sticky_save', **gk_gui_stuff_settings_opts, texts: %i[gk_gui_stuff_savebar])
GkGuiStuff::Registry.register('settings_frame', **gk_gui_stuff_settings_opts,
                                                 texts: %i[gk_gui_stuff_sf_placeholder gk_gui_stuff_sf_label gk_gui_stuff_sf_open_all gk_gui_stuff_sf_close_all
                                                           gk_gui_stuff_sf_hits gk_gui_stuff_sf_none])
GkGuiStuff::Registry.register('attachment_sizes', **gk_gui_stuff_settings_opts, texts: %i[gk_gui_stuff_size_fill],
                                                   options: lambda {
                                                     { mb: ::I18n.t('number.human.storage_units.units.mb'), gb: ::I18n.t('number.human.storage_units.units.gb') }
                                                   })

# The page's buttons stand out or in the three-dot menu, as the administrator chooses per row. Fäll ihop allt is
# such a row, so it stands with readup's Hoppa till nytt.
GkGuiStuff::Menu.register('collapse_all', section: :show, context: :issue, label: :gk_gui_stuff_sec_close_all, plugin: :gk_gui_stuff,
                                           kind: :action, action: :collapse_all, order: 20, placement: :out, icon: 'angle-up')
# On by default; the administrator can turn it off
GkGuiStuff::Registry.register('admin_groups', script: 'gk_gui_stuff_admin_groups', stylesheet: 'gk_gui_stuff_admin_groups', kernel: true, group: :navigation, default: true,
                                               options: -> { GkGuiStuff::AdminGroups.options })
Rails.configuration.after_initialize do
  GkGuiStuff::AdminGroups.register_texts!
  GkGuiStuff::TopMenu.register_texts!
end

# Redmine::Hook is reloaded with core's lib/ in development mode: register again
Redmine::Hook.add_listener(GkGuiStuff::Hooks) unless Redmine::Hook.listeners.any?(GkGuiStuff::Hooks)
Redmine::Hook.add_listener(GkGuiStuff::PersonalHooks) unless Redmine::Hook.listeners.any?(GkGuiStuff::PersonalHooks)
# The person's own pages in the page's data and on the pulse
GkGuiStuff::Personal.register_page_data!

# Core patches (extensions/gk_gui_stuff/patches.rb), applied here and again on every reload: the due soon mark on
# issues (overdue_mark) and the classes other plugins register for an issue; a change forgets the person's counts;
# the people core links on a page are noted while it is drawn (the page's data, GkGuiStuff::PageData, and the shared
# pulse, GkGuiStuff::Pulse); and in every view gk_gui_stuff_choices_box (the box above a list for choices, additions
# and mass actions, made like core's Filter and Alternativ: collapsible fieldset, core's toggleFieldset, minimized,
# open when the list is empty, its state remembered in the browser), gk_gui_stuff_row_editor (the shared row editor's
# script and kit) and gk_gui_stuff_row_menu (the shared row menu's script and kit)
GkGuiStuff::Patches.apply!
# The reason places in gk_records (records may load after this plugin)
Rails.configuration.after_initialize do
  if defined?(::GkRecords::Reasons)
    ::GkRecords::Reasons.register('gui_stuff.feature_switch', plugin: :gk_gui_stuff, label: :label_gk_reason_gui_stuff_feature_switch, default: :optional, admin: true)
  end
end
# registrations.yml read through records' one reader: a label, word or done the file names that no
# locale has is written to the log at start (T-REG)
Rails.configuration.after_initialize { ::GkRecords::Registrations.check!(:gk_gui_stuff) if defined?(::GkRecords::Registrations) }
