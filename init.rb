# frozen_string_literal: true
# Depends on: none required; optional gk_records, gk_fields, gk_icons, gk_compat, gk_core_stuff, gk_scenarios.

require_relative 'extensions/gk_gui_stuff/core'
# The preview of external links: allow list, address guard, fetch queue, pictures, cleanup and jobs
require_relative 'extensions/gk_gui_stuff/external/external'
# Links to other websites in formatted text: rel, the look's tooltip, a new tab and the preview mark
require_relative 'extensions/gk_gui_stuff/external_text'
# Links to other websites outside formatted text: rel on link_to, on a custom value's links and in the syntax help
require_relative 'extensions/gk_gui_stuff/external_rel'
# The wiki macro {{gk_link_preview(url)}}
require_relative 'extensions/gk_gui_stuff/external_macro'
require_relative 'extensions/gk_gui_stuff/appearance' # The appearance settings in records' register
require_relative 'extensions/gk_gui_stuff/footprints' # What each of them changes on the pages, as data for the register
require_relative 'extensions/gk_gui_stuff/choices_box' # The box of choices above a list's rows
require_relative 'extensions/gk_gui_stuff/elements'
require_relative 'extensions/gk_gui_stuff/primitives' # The design language's primitives and the style guide
require_relative 'extensions/gk_gui_stuff/pill' # The pill, a helper of the primitives in its own file
require_relative 'extensions/gk_gui_stuff/view_segment' # The view segment, a segment that only changes the view
require_relative 'extensions/gk_gui_stuff/flag' # The flag, a pennant and a word on top of what it says something about
require_relative 'extensions/gk_gui_stuff/flag_icons' # The pennant swapped for icons out of GK Icons, a setting off from the start
require_relative 'extensions/gk_gui_stuff/top_band' # The top band as a row of parts, each with its panel
require_relative 'extensions/gk_gui_stuff/marker' # The marker, where a setting or a function changes something on the page
require_relative 'extensions/gk_gui_stuff/library' # The library (search, groups, grid and panel), a primitive of its own file
require_relative 'extensions/gk_gui_stuff/line' # The line, a primitive of its own file
require_relative 'extensions/gk_gui_stuff/sentence' # The sentence, a primitive of its own file
require_relative 'extensions/gk_gui_stuff/meaning' # Meningsvy och Klassisk vy: the register of page types and the switch
require_relative 'extensions/gk_gui_stuff/styleguide' # The style guide's register of sections
require_relative 'extensions/gk_gui_stuff/user_status'
require_relative 'extensions/gk_gui_stuff/page_data' # The page's data and the shared pulse
require_relative 'extensions/gk_gui_stuff/page_facts' # What gui_stuff's own scripts read from the page's data
require_relative 'extensions/gk_gui_stuff/arrows' # The module arrows, a text processor in formatted text
require_relative 'extensions/gk_gui_stuff/personal' # The person's own pages
require_relative 'extensions/gk_gui_stuff/wave_forms' # The wave's words for a form that is not a save
require_relative 'extensions/gk_gui_stuff/overdue'
require_relative 'extensions/gk_gui_stuff/admin_groups'
require_relative 'extensions/gk_gui_stuff/row_editor' # The shared row editor (add, remove, move rows)
require_relative 'extensions/gk_gui_stuff/row_menu' # The shared row menu (a list's row actions in a menu)
require_relative 'extensions/gk_gui_stuff/top_menu' # the GK plugins' top menu entries under the installation's own word
require_relative 'extensions/gk_gui_stuff/patches' # The core patches, all in one place

Redmine::Plugin.register :gk_gui_stuff do
  name        'GK GUI Stuff'
  author      'Jimmy Westberg'
  description 'Collection of small, switchable UI modules'
  version     '1.04.000'
  requires_redmine version_or_higher: '6.0.0'

  # Administration > Funktioner, every plugin's declared functions, read from gk_records' register
  menu :admin_menu, :gk_gui_stuff_features, { controller: 'gk_gui_stuff_features', action: 'index' },
       caption: :label_gk_gui_stuff_features, icon: 'settings', html: { class: 'icon' }
  # Administration > Utseende, right after Funktioner: every plugin's appearance settings in one form, read from
  # gk_records' register
  menu :admin_menu, :gk_gui_stuff_appearance, { controller: 'gk_gui_stuff_appearance', action: 'index' },
       caption: :label_gk_gui_stuff_appearance, icon: 'settings', html: { class: 'icon' }, after: :gk_gui_stuff_features
  # Administration > Meningsvy och Klassisk vy, there only when a plugin has registered a type of GK's pages
  # (core's page types are appearance settings)
  menu :admin_menu, :gk_gui_stuff_meaning, { controller: 'gk_gui_stuff_meaning_admin', action: 'index' },
       caption: :label_gk_gui_stuff_meaning_admin, icon: 'settings', html: { class: 'icon' }, if: proc { GkGuiStuff::Meaning.own_any? }
  # Senast besökta (recent_pages): an entry of core's top menu, drawn by core among its own wherever core puts them
  # and renamable as every GK entry (TopMenu); its link's class is what the module's script finds it by and hangs the
  # list on. There only when the module is on for the person
  menu :top_menu, :gk_gui_stuff_recent_pages, '#', caption: :gk_gui_stuff_history, html: { class: 'gk-gui-stuff-history-toggle' },
                                             if: proc { (m = GkGuiStuff::Registry.find('recent_pages')) && GkGuiStuff::Switches.on_for?(m) ? true : false }

  # Only what is not an appearance: the grant of Like Redmine for me, the top menu's words, the counters' cache time
  # and the Meaning modes of GK's page types. The modules' levels and values are appearance settings in records'
  # register (GkGuiStuff::Appearance), every one off in a new installation
  settings default: { 'user_core_like' => '1', 'top_menu' => {}, 'personal_count_seconds' => '60', 'meaning' => {} },

           partial: 'settings/gk_gui_stuff_settings'
end

GkGuiStuff::Registry.register('link_preview', label_key: :label_gk_gui_stuff_mod_link_preview, text_key: :text_gk_gui_stuff_mod_link_preview,
                                               script: 'gk_gui_stuff_link_preview', stylesheet: 'gk_gui_stuff_link_preview')
# The card for links to other websites: link_preview's script and stylesheet (loaded once when both are on), its own
# setting with the domain list and the limits of the fetch
GkGuiStuff::Registry.register('link_preview_external', script: 'gk_gui_stuff_link_preview', stylesheet: 'gk_gui_stuff_link_preview')
# {{gk_link_preview(url)}}: a link to another website that may show the external preview
GkGuiStuff::ExternalMacro.register!
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
%w[mailto_copy inline_copy code_copy core_copy_whisper].each do |key|
  GkGuiStuff::Registry.register(key, script: 'gk_gui_stuff_copy', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :copy,
                                      texts: %i[gk_gui_stuff_copied gk_gui_stuff_copy_address gk_gui_stuff_copy_click gk_gui_stuff_copy_code gk_gui_stuff_copied_mail gk_gui_stuff_copied_code gk_gui_stuff_copied_block])
end
# A whisper puts out Redmine's tooltip at once (the kernel's whisper, gk_gui_stuff_core.js)
GkGuiStuff::Registry.register('whisper_tooltip', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :copy)
GkGuiStuff::Registry.register('week_number', script: 'gk_gui_stuff_time', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :time, texts: %i[gk_gui_stuff_week_short])
# arrows: no script; the server writes the arrows as the text is formatted (Arrows::Processor, GK Core Stuff's
# formatting_processors); listed and switched only where that pass is there
GkGuiStuff::Registry.register('arrows', group: :content, needs: -> { GkGuiStuff::Arrows.available? })
GkGuiStuff::Registry.register('quick_done', script: 'gk_gui_stuff_issue', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :issue,
                                             texts: %i[gk_gui_stuff_quick_done gk_gui_stuff_quick_done_title gk_gui_stuff_quick_done_title_status],
                                             options: lambda {
                                               h = gk_gui_stuff_sw_mod.value('quick_done', 'quick_done_status', {})
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
                     gk_gui_stuff_drawer_size_small gk_gui_stuff_drawer_size_half gk_gui_stuff_drawer_size_full gk_gui_stuff_drawer_size_back gk_gui_stuff_drawer_empty gk_gui_stuff_menu gk_gui_stuff_view_not_saved gk_gui_stuff_flash_pause gk_gui_stuff_flash_resume
                     gk_gui_stuff_wave_saved gk_gui_stuff_wave_deleted gk_gui_stuff_wave_failed] }
# openers: a button the server writes (a field type's appearance) that opens its content as a panel or the whole screen
GkGuiStuff::Registry.register('openers', **gk_gui_stuff_el_opts, script: 'gk_gui_stuff_openers', stylesheet: 'gk_gui_stuff_modules')
GkGuiStuff::Registry.register('wave', **gk_gui_stuff_el_opts, options: lambda {
  { saved: ::I18n.t(:gk_gui_stuff_wave_saved), saving: ::I18n.t(:gk_gui_stuff_wave_saving), deleted: ::I18n.t(:gk_gui_stuff_wave_deleted), failed: ::I18n.t(:gk_gui_stuff_wave_failed),
    deleting: ::I18n.t(:gk_gui_stuff_wave_deleting), loading: ::I18n.t(:gk_gui_stuff_wave_loading),
    first_ms: gk_gui_stuff_sw_mod.value('wave', 'wave_first_ms', 1600), ms: gk_gui_stuff_sw_mod.value('wave', 'wave_ms', 600), min_ms: gk_gui_stuff_sw_mod.value('wave', 'wave_min_ms', 400),
    start_delay: gk_gui_stuff_sw_mod.value('wave', 'wave_start_delay_ms', 50), loading_delay: gk_gui_stuff_sw_mod.value('wave', 'loading_delay_ms', 1300),
    hide_flash: gk_gui_stuff_sw_mod.value('wave', 'wave_hide_flash', true), forms: GkGuiStuff::WaveForms.for_page }
})
GkGuiStuff::Registry.register('corner', **gk_gui_stuff_el_opts)
# The outcome of a form that was sent as a notice in the corner, while the wave is not the one saying it
GkGuiStuff::Registry.register('outcome_notice', **gk_gui_stuff_el_opts)
GkGuiStuff::Registry.register('history_navigator', **gk_gui_stuff_el_opts.merge(texts: gk_gui_stuff_el_opts[:texts] + %i[gk_gui_stuff_hn_title gk_gui_stuff_hn_placeholder gk_gui_stuff_hn_empty gk_gui_stuff_hn_changes]))
GkGuiStuff::Registry.register('actions_menu', **gk_gui_stuff_el_opts, always: true) # forced
GkGuiStuff::Registry.register('fullscreen', **gk_gui_stuff_el_opts)
GkGuiStuff::Registry.register('branch_jump', **gk_gui_stuff_el_opts.merge(stylesheet: 'gk_gui_stuff_link_preview', texts: gk_gui_stuff_el_opts[:texts] + %i[gk_gui_stuff_branch gk_gui_stuff_branch_open gk_gui_stuff_branch_projects gk_gui_stuff_loading]))
# Core's green message goes away by itself
gk_gui_stuff_forms_opts = { script: 'gk_gui_stuff_forms', stylesheet: 'gk_gui_stuff_modules', kernel: true, group: :forms }
GkGuiStuff::Registry.register('flash_timeout', **gk_gui_stuff_forms_opts, texts: %i[gk_gui_stuff_close gk_gui_stuff_flash_pause gk_gui_stuff_flash_resume],
                                                options: -> { { seconds: gk_gui_stuff_sw_mod.value('flash_timeout', 'flash_seconds', 8) } })
GkGuiStuff::Registry.register('custom_mark', group: :forms)
# Every module below changes how core's pages look or behave, so each is off in a new installation and the
# administrator switches on what the instance is to have
# A project's description in a list cut after a few lines, the whole text as tooltip
GkGuiStuff::Registry.register('short_descriptions', script: 'gk_gui_stuff_short_descriptions', kernel: true, group: :lists)
# A faint shadow at the edge of a scrolling surface where there is more to scroll to, on core's pages: the shadow is a
# primitive (gk_gui_stuff_shade.js, always loaded and always on GK's own pages), which reads this switch through the
# kernel
GkGuiStuff::Registry.register('scroll_shade', kernel: true, group: :forms)
# A line along a long row that saves at once, from the control to its save bar: part of the rail's primitive (always
# loaded), which reads this switch through the kernel
GkGuiStuff::Registry.register('save_sweep', kernel: true, group: :forms)
# Actions that may not be used are left out of the context menu instead of dimmed; off in a new installation (a choice)
GkGuiStuff::Registry.register('hide_disabled', stylesheet: 'gk_gui_stuff_hide_disabled', group: :forms)
# Core's status badges filled with their own colour on every page; off: core's outlined badges. Badges follow core,
# and are filled only through this module
GkGuiStuff::Registry.register('filled_badges', stylesheet: 'gk_gui_stuff_filled_badges', anonymous: true)
# The icon of core's messages lifted to the middle of the text; off: core's own place
GkGuiStuff::Registry.register('flash_icon', stylesheet: 'gk_gui_stuff_flash_icon', anonymous: true)
GkGuiStuff::Registry.register('key_suggest', script: 'gk_gui_stuff_key_suggest', kernel: true, group: :forms, texts: %i[gk_gui_stuff_key_hint])
# A square part of a picture chosen in the browser (people's pictures of users)
GkGuiStuff::Registry.register('image_crop', script: 'gk_gui_stuff_crop', kernel: true, group: :forms, texts: %i[gk_gui_stuff_crop_hint gk_gui_stuff_crop_size])
GkGuiStuff::Registry.register('help_link', anonymous: true, group: :instance)
GkGuiStuff::Registry.register('declutter', anonymous: true, group: :instance)

GkGuiStuff::ViewStates.register('fullscreen', values: %w[off on], default: 'off', label: :label_gk_gui_stuff_mod_fullscreen)
# The line's panel open or closed, per person and page type; the style guide's own
GkGuiStuff::ViewStates.register('gui_stuff.styleguide_line', values: %w[closed open], default: 'closed', label: :label_gk_gui_stuff_sg_line)
GkGuiStuff::Menu.register('history', section: :show, context: :issue, label: :gk_gui_stuff_menu_history, plugin: :gk_gui_stuff, kind: :action, action: :history, order: 10, icon: 'history')
GkGuiStuff::Menu.register('fullscreen', section: :show, context: %i[issue issue_list project wiki_page version other], label: :gk_gui_stuff_menu_fullscreen,
                                         plugin: :gk_gui_stuff, kind: :action, action: :fullscreen, order: 20, icon: 'zoom-in')
# The instance's own: never the user's choice (there is no user for the login warning; the footer is the
# instance's statement). The administrator switches them.
# instance_band: the band with the instance's role (for example test) on every page and in the title, also on the
# login page; off in a new installation, the administrator switches it on
GkGuiStuff::Registry.register('instance_band', anonymous: true, group: :instance)
GkGuiStuff::Registry.register('footer_text', anonymous: true, stylesheet: 'gk_gui_stuff_modules', group: :instance)
GkGuiStuff::Registry.register('login_warning', anonymous: true, script: 'gk_gui_stuff_login_warning', stylesheet: 'gk_gui_stuff_modules',
                                                kernel: true, group: :instance, texts: %i[gk_gui_stuff_lw_close],
                                                options: lambda {
                                                  { text: ::I18n.t(:text_gk_gui_stuff_lw, system: Setting.app_title),
                                                    animate: gk_gui_stuff_sw_mod.value('login_warning', 'login_warning_animate', true),
                                                    endless: gk_gui_stuff_sw_mod.value('login_warning', 'login_warning_endless', false) }
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
# A double click on the Gantt chart's subjects column widens it to its longest subject and back; also a proposal to
# core
GkGuiStuff::Registry.register('gantt_width', script: 'gk_gui_stuff_gantt_width', kernel: true, group: :lists)
# A Gantt chart narrower than its area gets more months to the right until the area is filled; also a proposal to
# core
GkGuiStuff::Registry.register('gantt_fill', script: 'gk_gui_stuff_gantt_fill', kernel: true, group: :lists)
# The calendar's compact view beside core's, chosen on the page and kept with the account (core's preferences, as
# the proposal to core does it)
GkGuiStuff::ViewStates.register('calendar_compact', values: %w[off on], default: 'off', label: :label_gk_gui_stuff_mod_calendar_compact, pref: true)
GkGuiStuff::Registry.register('calendar_compact', script: 'gk_gui_stuff_calendar_compact', stylesheet: 'gk_gui_stuff_calendar_compact', kernel: true,
                                                   group: :lists,
                                                   texts: %i[gk_gui_stuff_cal_compact gk_gui_stuff_cal_normal gk_gui_stuff_cal_compact_title gk_gui_stuff_cal_normal_title],
                                                   options: -> { { on: GkGuiStuff::ViewStates.for(User.current)['calendar_compact'] == 'on' } })
GkGuiStuff::Registry.register('collapse_all', script: 'gk_gui_stuff_sections', stylesheet: 'gk_gui_stuff_sections', kernel: true, group: :issue,
                                               texts: %i[gk_gui_stuff_sec_attributes gk_gui_stuff_sec_close_all gk_gui_stuff_sec_open_all gk_gui_stuff_sec_empty])

# Long lists, on core's pages and ours, each its own module: a filter field above a long list of check boxes or a long
# table, a searchable chooser for a long list of choices (the real list stays in the form). The chooser itself is
# always there (gk_gui_stuff_select.js, its words with the primitives'); the module only gives core's and the plugins'
# long lists the chooser by itself
gk_gui_stuff_lists_opts = { script: 'gk_gui_stuff_lists', stylesheet: 'gk_gui_stuff_lists', kernel: true, group: :lists }
GkGuiStuff::Registry.register('list_filter', **gk_gui_stuff_lists_opts,
                                              texts: %i[gk_gui_stuff_lf_placeholder gk_gui_stuff_lf_label gk_gui_stuff_lf_label_of gk_gui_stuff_lf_count gk_gui_stuff_lf_clear gk_gui_stuff_no_hits])
GkGuiStuff::Registry.register('select_search', **gk_gui_stuff_lists_opts)
# Long settings pages, each its own module: the form's one Save kept in reach at the bottom of the window, every GK
# plugin's Configure page with folded boxes, a search and the change log per version, and quick sizes beside core's
# attachment sizes
gk_gui_stuff_settings_opts = { script: 'gk_gui_stuff_settings', stylesheet: 'gk_gui_stuff_settings', kernel: true, group: :forms }
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
# The administration's rows in groups; off in a new installation, the administrator switches it on
GkGuiStuff::Registry.register('admin_groups', script: 'gk_gui_stuff_admin_groups', stylesheet: 'gk_gui_stuff_admin_groups', kernel: true, group: :navigation,
                                               options: -> { GkGuiStuff::AdminGroups.options })
GkGuiStuff::AdminGroups.register(:gk_gui_stuff_meaning, 'appearance', plugin: :gk_gui_stuff)
# Funktioner and Utseende stand side by side in the same group
GkGuiStuff::AdminGroups.register(:gk_gui_stuff_features, 'system', plugin: :gk_gui_stuff)
GkGuiStuff::AdminGroups.register(:gk_gui_stuff_appearance, 'system', plugin: :gk_gui_stuff)
# The style guide's sections, gui_stuff's own
GkGuiStuff::Styleguide.register_own!
# The marker's part of the top band, on the page after a save on Utseende or Funktioner
GkGuiStuff::Marker.register_band!
Rails.configuration.after_initialize do
  GkGuiStuff::AdminGroups.register_texts!
  GkGuiStuff::TopMenu.register_texts!
end

# Redmine::Hook is reloaded with core's lib/ in development mode: register again
Redmine::Hook.add_listener(GkGuiStuff::Hooks) unless Redmine::Hook.listeners.any?(GkGuiStuff::Hooks)
Redmine::Hook.add_listener(GkGuiStuff::PersonalHooks) unless Redmine::Hook.listeners.any?(GkGuiStuff::PersonalHooks)
# The person's own pages in the page's data and on the pulse
GkGuiStuff::Personal.register_page_data!
# The page's name, an issue's parent and the calendar's issues in the page's data, for gui_stuff's own scripts
GkGuiStuff::PageFacts.register!

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
    ::GkRecords::Reasons.register('gui_stuff.meaning', plugin: :gk_gui_stuff, label: :label_gk_reason_gui_stuff_meaning, default: :optional, admin: true)
    ::GkRecords::Reasons.register('gui_stuff.appearance', plugin: :gk_gui_stuff, label: :label_gk_reason_gui_stuff_appearance, default: :optional, admin: true)
  end
  # The modules, the other appearance settings, the shared values and the core page types of the Meaning register, in
  # records' register (records loads after this plugin); every one off in a new installation
  GkGuiStuff::Appearance.declare!
  # Nothing is declared under another plugin's row: the places of the external look outside formatted text are GK
  # Core Stuff's values under core_stuff.external_links, declared with its row, and ExternalRel::Places only reads them
  # The preview of external links: the event of an emptying in records (its target is records' own) and the fetch and
  # forget jobs in GK Ops (ops loads after this plugin); both guarded, nothing without the other plugin
  GkGuiStuff::External.register_records!
  GkGuiStuff::External::Jobs.register!
  # The style guide is a function, off in a new installation like every other one; without records it is not declared
  # and off. What it adds to the pages goes with it where the register takes a footprint
  if defined?(::GkRecords::Features) && ::GkRecords::Features.respond_to?(:register)
    takes_footprint = ::GkRecords::Features.method(:register).parameters.any? { |_, n| n == :footprint }
    ::GkRecords::Features.register('gui_stuff.styleguide', plugin: :gk_gui_stuff, label: :label_gk_feature_gui_stuff_styleguide,
                                                           help: :text_gk_feature_gui_stuff_styleguide, admin_only: true,
                                                           **(takes_footprint ? GkGuiStuff::Footprints.for_feature('gui_stuff.styleguide') : {}))
  end
end
# registrations.yml read through records' one reader: a label, word or done the file names that no
# locale has is written to the log at start
Rails.configuration.after_initialize { ::GkRecords::Registrations.check!(:gk_gui_stuff) if defined?(::GkRecords::Registrations) }
