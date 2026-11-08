# frozen_string_literal: true

module GkGuiStuff
  # What gui_stuff's own appearance settings and its function change on the pages, as data for records' register
  # (footprint: and applies:, GkRecords::Footprint): the anchors where the change shows, the style guide's elements it
  # changes, the page types it shows on and what it hides. Read from the code that does the change, never guessed; a
  # setting not listed here has no line Påverkar on Utseende. What a module draws or styles itself also carries the
  # effect mark data-gk-gui-stuff-effect="<name>" (Effect), which counts as the setting's anchor without being listed.
  # Plain Ruby without Rails: the plugin's tests compare it with config/registrations.yml, the file's print of it.
  module Footprints
    ALL = %w[all].freeze
    ISSUE = %w[core.issue].freeze

    # The parts of core's pages declutter hides (Declutter::TARGETS), each named by its row in the setting's table
    DECLUTTER = {
      'top_help' => '#top-menu a.help', 'footer_powered' => '#footer',
      'issue_log_time' => '#content .contextual a.icon-time-add', 'issue_copy' => '#content .contextual a.icon-copy',
      'sidebar_watchers' => '#sidebar #watchers', 'form_estimated_hours' => '[data-field="estimated_hours"]',
      'form_done_ratio' => '[data-field="done_ratio"]'
    }.freeze

    SETTINGS = {
      # the instance's band at the top of every page, also the login page (core.rb view_layouts_base_body_top)
      'instance_band' => { applies: %w[server], footprint: { anchors: ['.gk-gui-stuff-instance'], elements: %w[top_band], pages: ALL } },
      # the instance's own line at the bottom of every page (core.rb view_layouts_base_body_bottom)
      'footer_text' => { applies: %w[server], footprint: { anchors: ['.gk-gui-stuff-footer-text'], pages: ALL } },
      # the top menu's Hjälp leads elsewhere (core.rb view_layouts_base_content)
      'help_link' => { applies: %w[script], footprint: { anchors: ['#top-menu a.help'], pages: ALL } },
      # the parts ticked under Dolt are hidden for everyone (Declutter.css)
      'declutter' => { applies: %w[server],
                       footprint: { pages: ALL, removes: DECLUTTER.map { |k, a| { anchor: a, label: "label_gk_gui_stuff_dc_#{k}" } } } },
      # Senast besökta: an entry of core's top menu with the list hung on it (gk_gui_stuff_history.js)
      'recent_pages' => { applies: %w[server script], footprint: { anchors: ['#top-menu a.gk-gui-stuff-history-toggle', '#gk-gui-stuff-history'], pages: ALL } },
      # the buttons in the header's project path and their card (gk_gui_stuff_uses.js)
      'branch_jump' => { applies: %w[script], footprint: { anchors: ['#header .site-title .gk-gui-stuff-branch-btn', '.gk-gui-stuff-branch'] } },
      # the whole window for the content, a row in the three-dot menu (gk_gui_stuff_uses.js)
      'fullscreen' => { applies: %w[script], footprint: { anchors: ['html.gk-gui-stuff-fullscreen'], pages: ALL } },
      # the account menu's links keep core's colours (core.rb instance_head), found by GK Core Stuff's menu mark
      'account_menu' => { applies: %w[server], footprint: { anchors: ['#account .dropdown-content a[data-menu="account_menu"]'], pages: ALL } },
      # the project's tabs with an icon (gk_gui_stuff_uses.js, Menu.icons)
      'icons_tabs' => { applies: %w[script], footprint: { anchors: ['#main-menu'] } },
      # the sidebar's place and the header's height (Menu.layout_classes, gk_gui_stuff_uses.js)
      'layout_sidebar' => { applies: %w[script], footprint: { anchors: ['#sidebar'], pages: ALL } },
      'layout_header' => { applies: %w[script], footprint: { anchors: ['#header'], pages: ALL } },
      # the card of a link inside the instance and the one of a link to another website (gk_gui_stuff_link_preview.js)
      'link_preview' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-preview'] } },
      'link_preview_external' => { applies: %w[script data], footprint: { anchors: ['.gk-gui-stuff-preview'] } },
      # the dot after a person's name (gk_gui_stuff_user_status.js)
      'user_status' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-status'] } },
      # arrows written in formatted text (Arrows::Processor)
      'arrows' => { applies: %w[server], footprint: { anchors: ['.wiki'] } },
      # the copy buttons and the code one clicks to copy (gk_gui_stuff_copy.js)
      'mailto_copy' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-copy-btn'], elements: %w[copy] } },
      'inline_copy' => { applies: %w[script], footprint: { anchors: ['.wiki .gk-gui-stuff-copy-code'], elements: %w[copy] } },
      'code_copy' => { applies: %w[script], footprint: { anchors: ['.pre-wrapper .gk-gui-stuff-copy-pre'], elements: %w[copy] } },
      # the whisper for what Redmine's own buttons copy, and the whisper putting out Redmine's tooltip (gk_gui_stuff_copy.js, the kernel)
      'core_copy_whisper' => { applies: %w[script], footprint: { anchors: ['.pre-wrapper .copy-pre-content-link'], elements: %w[copy] } },
      'whisper_tooltip' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-notice'], elements: %w[copy] } },
      # core's status badges filled (gk_gui_stuff_filled_badges.css)
      'filled_badges' => { applies: %w[script], footprint: { anchors: ['.badge'], elements: %w[core_badges], pages: ALL } },
      # the flag's pennant drawn as an icon (flag_icons.rb, rules in the page's head): no anchor, as a pennant is too small
      # a place to mark, and the marker's own flags would count as places
      'flag_icons' => { applies: %w[server], footprint: { elements: %w[flag], pages: ALL } },
      # a project's description cut after a few lines in a list (CORE_RULES, gk_gui_stuff_short_descriptions.js)
      'short_descriptions' => { applies: %w[server script], footprint: { anchors: ['table.list td.short_description'], elements: %w[core_tables] } },
      # the stripe on an overdue or soon due issue's row and the due date's colour in the list and on the issue page
      # (gk_gui_stuff_overdue.css, gk_gui_stuff_row_marks.js); the server gives the soon due issue its class
      # (Issue#css_classes, overdue.rb)
      'overdue_mark' => { applies: %w[server script],
                          footprint: { anchors: ['tr.issue.overdue td.checkbox', 'tr.issue.gk-gui-stuff-due-soon td.checkbox',
                                                 'div.issue.overdue', 'div.issue.gk-gui-stuff-due-soon'],
                                       elements: %w[core_tables] } },
      # a list's first column kept in view (gk_gui_stuff_sticky.js)
      'sticky_columns' => { applies: %w[script], footprint: { anchors: ['table.list', '.gk-gui-stuff-sticky-clone'], elements: %w[core_tables] } },
      # the filter field above a long list, and the chooser for a long list of choices (gk_gui_stuff_lists.js)
      'list_filter' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-lf'] } },
      # custom fields marked in the issue list's right click menu (CustomMark.css): only each custom field's own submenu
      # (li.folder.cf_<id>), so no anchor is declared that would name every submenu of the menu
      'custom_mark' => { applies: %w[server], footprint: { elements: %w[core_context_menu] } },
      # actions that may not be used left out of the right click menu (gk_gui_stuff_hide_disabled.css)
      'hide_disabled' => { applies: %w[script], footprint: { removes: ['#context-menu a.disabled'], elements: %w[core_context_menu] } },
      # the project overview's members box with the groups (projects/_members_box)
      'members_by_group' => { applies: %w[server], footprint: { anchors: ['div.members.box'] } },
      # the issue report's heading row over the kinds and the chart's heading (gk_gui_stuff_report_clarity.js)
      'report_clarity' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-rep-groups', '.gk-gui-stuff-rep-chart-head'] } },
      # the content a field's opener shows as a panel or the whole screen (gk_gui_stuff_openers.js)
      'openers' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-opener-body'] } },
      # the boxes aligned to the start or the end (core.rb instance_head)
      'align' => { applies: %w[server], footprint: { anchors: ['.gk-gui-stuff-align-start', '.gk-gui-stuff-align-end'] } },
      # long texts, notes, code blocks and files folded on the issue page (gk_gui_stuff_fold.js)
      'long_fields' => { applies: %w[script], footprint: { anchors: ['div.issue .description .wiki'], pages: ISSUE } },
      'notes_collapse' => { applies: %w[script], footprint: { anchors: ['#history .journal .wiki'], pages: ISSUE } },
      'private_notes_collapse' => { applies: %w[script], footprint: { anchors: ['#history .journal.private-notes .wiki'], pages: ISSUE } },
      'code_blocks' => { applies: %w[script], footprint: { anchors: ['.wiki .gk-gui-stuff-fold-btn'] } },
      'attachments_collapse' => { applies: %w[script], footprint: { anchors: ['.attachments'], pages: ISSUE } },
      # Klart: a button beside Skicka in the issue's edit form (gk_gui_stuff_issue.js)
      'quick_done' => { applies: %w[script], footprint: { anchors: ['#issue-form .gk-gui-stuff-quick-done'], pages: ISSUE } },
      # the parent issue's line above Underaktiviteter or Relaterade ärenden (gk_gui_stuff_issue.js)
      'parent_link' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-parent'], pages: ISSUE } },
      # the issue page's sections folded, and Fäll ihop allt (gk_gui_stuff_sections.js, core.rb collapse_all_link)
      'collapse_all' => { applies: %w[server script], footprint: { anchors: ['.gk-gui-stuff-sec-toggle', '.gk-gui-stuff-sec-all', '#content .contextual [data-gk-gui-stuff-menu-key="collapse_all"]'], pages: ISSUE } },
      # the week beside a date field (gk_gui_stuff_time.js)
      'week_number' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-week'], elements: %w[core_forms] } },
      # the examples under a key field (gk_gui_stuff_key_suggest.js)
      'key_suggest' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-key-examples'] } },
      # the square part of a picture chosen in the browser (gk_gui_stuff_crop.js)
      'image_crop' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-crop-stage'] } },
      # the save bar, the folded boxes with search on a GK plugin's Configure page, the quick sizes (gk_gui_stuff_settings.js)
      'sticky_save' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-savebar'] } },
      'settings_frame' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-sf-bar', '.gk-gui-stuff-sf-section', '.gk-gui-stuff-sf-key'] } },
      # the line along a long row that saves at once, to its save bar (GkGui.save in gk_gui_stuff_primitives.js)
      'save_sweep' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-rail'], elements: %w[rail], pages: ALL } },
      'attachment_sizes' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-sizes'] } },
      # the calendar's compact view and its switch (gk_gui_stuff_calendar_compact.js)
      'calendar_compact' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-cal-mode', '.gk-gui-stuff-cal-compact'] } },
      # the Gantt chart's subjects column widened, and more months to fill the area (gk_gui_stuff_gantt_width.js, gantt_fill)
      'gantt_width' => { applies: %w[script], footprint: { anchors: ['td.gantt_subjects_column', 'td.gantt_selected_column'] } },
      'gantt_fill' => { applies: %w[script], footprint: { anchors: ['#gantt_area'] } },
      # the wave over the page while a form is sent (gk_gui_stuff_elements.js, core.rb wave_carry)
      'wave' => { applies: %w[script], footprint: { anchors: ['#gk-gui-stuff-wave'], pages: ALL } },
      # core's green message goes away by itself, with its tools (gk_gui_stuff_forms.js)
      'flash_timeout' => { applies: %w[script], footprint: { anchors: ['#content .flash.notice', '.gk-gui-stuff-flash'], elements: %w[core_flash] } },
      # the icon of core's messages lifted to the middle of the text (gk_gui_stuff_flash_icon.css)
      'flash_icon' => { applies: %w[script], footprint: { anchors: ['.flash'], elements: %w[core_flash], pages: ALL } },
      # the outcome of a form that was sent, as a notice in the corner (gk_gui_stuff_uses.js)
      'outcome_notice' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-notices'], elements: %w[messages], pages: ALL } },
      # the corner on the issue page when someone else changed it (gk_gui_stuff_uses.js, GkGui.corner)
      'corner' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-corner'], pages: ISSUE } },
      # the login page's warning (gk_gui_stuff_login_warning.js)
      'login_warning' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-lw'] } },
      # the administration's rows in groups (gk_gui_stuff_admin_groups.js)
      'admin_groups' => { applies: %w[script], footprint: { anchors: ['#admin-menu', '.gk-gui-stuff-ag'] } },
      # a link to another website with the external look, in formatted text and outside it, and in its card opens in a
      # new tab (ExternalText.new_tab, ExternalRel, gk_gui_stuff_link_preview.js), the person's own choice; the links
      # carry the effect mark
      'external_new_tab' => { applies: %w[server script], footprint: { anchors: ['.gk-gui-stuff-preview-external .gk-gui-stuff-preview-title'] } },
      # Snabbhopp: the jump list over the issue's history and the note it lands on (gk_gui_stuff_uses.js)
      'history_navigator' => { applies: %w[script], footprint: { anchors: ['#history .journal', '.gk-gui-stuff-hn-at'], pages: ISSUE } },
      # the area's buttons to the right with icon and text or the icon only (Menu.icons, gk_gui_stuff_uses.js)
      'icons_issue' => { applies: %w[server script], footprint: { anchors: ['#content .contextual a.icon'], pages: ISSUE } },
      'icons_other' => { applies: %w[server script], footprint: { anchors: ['#content .contextual a.icon'] } },
      # each button in the bar, in the three-dot menu or as its icon (Menu.rows_for, gk_gui_stuff_uses.js)
      'placements' => { applies: %w[server script], footprint: { anchors: ['#content .contextual a.icon', '#content .contextual [data-gk-gui-stuff-menu-key]'] } },
      # the counts at the person's name and in Mina sidor (gk_gui_stuff_personal.js, GkGui.count)
      'personal_count' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-count[data-gk-gui-stuff-painted]'], elements: %w[count], pages: ALL } },
      # the shade at the edge of core's scrolling boxes (gk_gui_stuff_shade.js)
      'scroll_shade' => { applies: %w[script], footprint: { anchors: ['.autoscroll.gk-gui-stuff-shaded'], elements: %w[core_tables] } },
      # the searchable chooser on a long list of choices (gk_gui_stuff_lists.js, gk_gui_stuff_select.js)
      'select_search' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-ss'], elements: %w[ss] } }
    }.freeze

    # The shared values with an effect of their own, not the one of the settings in their used_by: notices is how long
    # GK's own notices stay (gk_gui_stuff_elements.js, noticeShow, in their tray)
    SHARED = {
      'notices' => { applies: %w[script], footprint: { anchors: ['.gk-gui-stuff-notices'], pages: ALL } }
    }.freeze

    # gui_stuff's function: the style guide, a page of its own and its link on Utseende and Funktioner
    FEATURES = {
      'gui_stuff.styleguide' => { applies: %w[server],
                                  footprint: { pages: %w[gui_stuff.styleguide],
                                               adds: [{ anchor: '[data-gk-gui-stuff-effect~="styleguide"]', label: 'label_gk_gui_stuff_styleguide' }] } }
    }.freeze

    module_function

    # The keywords for a setting's registration, {} for one not described
    def for(name)
      h = SETTINGS[name.to_s]
      h ? { footprint: h[:footprint], applies: h[:applies] } : {}
    end

    def for_shared(name)
      h = SHARED[name.to_s]
      h ? { footprint: h[:footprint], applies: h[:applies] } : {}
    end

    def for_feature(key)
      h = FEATURES[key.to_s]
      h ? { footprint: h[:footprint], applies: h[:applies] } : {}
    end
  end

  # The effect mark on what one of gui_stuff's modules draws or styles: data-gk-gui-stuff-effect with the settings' names
  # (without gui_stuff.), several separated by a space. A script marks with GkGui.effect(element, name).
  #   content_tag(:div, text, class: 'gk-gui-stuff-footer-text', **GkGuiStuff::Effect.attributes('footer_text'))
  module Effect
    ATTRIBUTE = 'data-gk-gui-stuff-effect'

    module_function

    def attributes(*names) = { ATTRIBUTE => names.flatten.map(&:to_s).join(' ') }
  end
end
