# GK GUI Stuff

GK GUI Stuff is a collection of small, switchable user interface modules for Redmine. It also provides shared interface parts that other GK plugins use: the page that switches every plugin's functions (declared in GK Records), rows in Redmine's three-dot menu, personal pages and on-page notices.

## Features

Switching and choice:

- Every module can be set to Off, Optional (each person may switch it off) or Forced (on for everyone). A module that is off loads no script and no stylesheet.
- "Core-like (everything off)" switches every module off for everyone, and administrators can let each user choose the core-like experience for themselves.
- On from the start in a new installation: rows in the three-dot menu (always on), short project descriptions in lists, the scroll shadow, key suggested from the name, image cropping, the Gantt chart's wider subjects column, the calendar's Compact view, the filter field above long lists, the searchable chooser for long lists, the sticky Save, the Configure frame of GK plugins, the attachment size buttons and administration in groups. The other modules are off until an administrator switches them on.
- Administration > Functions lists the functions every GK plugin declares in the register of gk_records and lets an administrator switch each on or off, each switch kept there as an event with an optional reason. A function is off until it is switched on; one that is off is not shown to users, and its data stays. Without gk_records no function is listed and all are off.

Modules:

- **Card on hover**: a card with the essentials of an issue, a person or a group when the pointer rests on its link (Alt and arrow down opens it from the keyboard).
- **Members through a group are shown as the group** in the project's Members box.
- **Clearer report table**: the "Issues by" report separates statuses from the Open and Closed sums and the total, and each chart gets a heading and an explanation.
- **Folding**: long descriptions, long notes, long code blocks and many attachments are shown short with a "Show all" button; private notes are shown only when clicked.
- **Copying**: a copy button after mail links, click on inline code to copy, and Redmine's copy button on code blocks always visible and keyboard reachable.
- **Week number at date fields** (ISO 8601) and **arrows in text** (`<-->`, `-->`, `<--` shown as arrows, never in code).
- **Issue page**: "100 % done" button that sets % done to 100 and optionally a status per tracker (only where the workflow allows it); the parent issue also listed among subtasks and related issues; sections that fold under their label with Collapse all and Expand all; jump in the issue's history (`g` opens a searchable list of notes, `j` and `k` move between notes); a corner fold when someone changed the issue since the page was opened, driven by a configurable heartbeat.
- **Navigation**: a "Recently visited" list in the top menu (kept in the browser only), jump in the project branch (parent, siblings and children with open issues), "Only the content" view that hides menus, header and sidebar, and the administration rows grouped under headings both on the Administration page and in the sidebar.
- **Forms and feedback**: a "wave" word over the page when saving, saved, deleting or loading; Redmine's green message box goes away by itself with a countdown; a mark on custom fields in the row menu (diamond, stripe or italic); a key field filled in from the name; a square part of a picture chosen in the browser when a picture is added; a faint shadow at the edge of a scrolling surface where there is more to scroll to; actions that may not be used left out of the issue list's menu instead of dimmed.
- **Lists**: column headers that stay at the top while scrolling (and the first column of the workflow matrix); overdue open issues marked with a red edge and red due date, and optionally issues due within a set number of days with a yellow edge; a project's description in a list cut after a set number of lines, the whole text on hover; a double click on the Gantt chart's subjects column widens it to its longest subject and back.
- **Long lists**: a filter field above a list of more than 12 check boxes or a table of more than 12 rows, never two for one list, with a magnifier, a clear button and "x of y" while it filters (a long list of check boxes also scrolls in a box of its own height; a check box in a table's cell belongs to its row, and a table of settings rows that is a section's one list gets the field above the section); a searchable chooser for a list of more than 15 choices, single or multiple, that keeps the real list in the form: closed it looks like Redmine's list, open it shows a panel with a search field, the chosen choice checked and the matched words in bold, and several choices stand as removable chips. Hidden items are still sent as before. Pages with Redmine's query filters get no extra filter.
- **Long settings pages**: the form's one Save kept reachable in a bar at the bottom of the window on Redmine's settings and every plugin's Configure page; every GK plugin's Configure page with folded boxes, a search over the settings' names and help texts (`#gk-find=<text>` in the address fills it in) and the change log folded per version, latest first; quick sizes (5 MB, 20 MB, 100 MB, 1 GB) beside the attachment size settings.
- **Calendar**: a Compact view beside Redmine's, with the days as wide as Redmine's and one short line per issue.
- **People**: a status dot after a person's name (active, idle, away, absent, busy), drawn when another plugin supplies the data for that person.
- **Instance**: a footer line on every page, a login reminder banner for visitors who are not signed in, a configurable target for the Help link in the top menu (Redmine's guide, an address or a wiki page), and hiding selected core elements for everyone (Help in the top menu, "Powered by Redmine", Log time and Copy on the issue page, Watchers in the sidebar, Estimated time and % done in forms).

Shared parts for other plugins:

- Rows in Redmine's three-dot menu, in sections; per button the administrator, and each user for themselves, chooses whether it stands out among the page's own links or in the menu.
- Personal pages declared by plugins, placed in core's user menu on Redmine 7.0 and in the My account sidebar on 6.0 and 6.1, with counts summed at the user's name and a "My pages" block for My page.
- A shared page data and pulse request so modules and plugins can refresh counts and states without separate polling.
- A row editor for lists of rows in a form (see "Row editor" below), and markup that other plugins' pages use with the modules above: `data-gk-gui-sticky-save` on a form (optionally a selector for its own Save) gives it the sticky Save; `data-gk-gui-settings-frame` on an element gives its fieldsets the Configure frame; `data-gk-gui-filter` asks for a filter field whatever the list's length and `data-gk-gui-filter="off"` or `data-gk-gui-select="off"` refuses one.
- GK Core Stuff's modules that change how Redmine's own pages look (done ratio as text, a no-break space before AM and PM, Redmine's version in the footer, and its fixes of badges, check boxes, margins, widths, heights, words and orders) listed with their state on the settings page and Administration > Functions, with a link to GK Core Stuff's settings, when it is installed.

### Row editor

A view marks its rows and calls `<%= gk_gui_stuff_row_editor %>` once (a plugin without GK GUI Stuff checks `respond_to?(:gk_gui_stuff_row_editor)` and renders its rows as plain fields). The script adds Redmine's sort handle, a delete link per row and an "Add row" link; there is no limit on the number of rows.

```erb
<table class="list">
  <tbody data-gk-gui-rows="myplugin.items" data-gk-gui-rows-name="thing[items]">
    <% @items.each_with_index do |item, i| %>
      <tr data-gk-gui-row>
        <td data-gk-gui-row-handle></td>
        <td><%= text_field_tag "thing[items][#{i}][text]", item.text %>
            <%= hidden_field_tag "thing[items][#{i}][position]", i + 1, data: { gk_gui_row_position: true } %></td>
        <td data-gk-gui-row-remove></td>
      </tr>
    <% end %>
    <template data-gk-gui-row-template>
      <tr data-gk-gui-row>
        <td data-gk-gui-row-handle></td>
        <td><%= text_field_tag 'thing[items][__INDEX__][text]', '' %>
            <%= hidden_field_tag 'thing[items][__INDEX__][position]', '', data: { gk_gui_row_position: true } %></td>
        <td data-gk-gui-row-remove></td>
      </tr>
    </template>
  </tbody>
</table>
<%= gk_gui_stuff_row_editor %>
```

- `data-gk-gui-rows="<key>"`: the container (any element whose children are the rows); each row has `data-gk-gui-row`.
- `data-gk-gui-rows-name="<prefix>"` (optional): field names start with `<prefix>[N]`; N is renumbered 0, 1, 2 ... in the order shown after every change, and ids `<prefix_with_underscores>_N_...` and `label for` follow. Without it, a new row gets the next free number and nothing is renumbered.
- `data-gk-gui-rows-min="<n>"` (optional, default 0): never fewer rows; `data-gk-gui-rows-sortable="false"` (optional): no handle.
- `<template data-gk-gui-row-template>` inside the container, or anywhere as `template[data-gk-gui-row-template="<key>"]`: the new row; `__INDEX__` in any attribute becomes its number.
- Optional in a row: `[data-gk-gui-row-handle]` and `[data-gk-gui-row-remove]` are where the handle and the delete link go (else first in the first cell and last in the last cell); `input[data-gk-gui-row-position]` gets 1, 2, 3 ... in the order shown; `input[data-gk-gui-row-destroy]` (a saved row, Rails' `_destroy`) is set to 1 and the row hidden instead of taken out of the form.
- Optional anywhere: `[data-gk-gui-rows-add="<key>"]` is where the add link goes (else in a paragraph after the table or container).
- Keyboard: the handle is focusable and arrow up and down move its row. Every change fires `gk-gui-rows:change` on the container (`detail.action`: add, remove, move); `window.gkGuiStuffRows.init(el)` and `.add(el)` are there for scripts that draw rows.

### Row menu

A list's row actions in a "..." button at the row's end (Redmine's `icon-actions` with the `3-bullets` icon) and in a menu on a right click on the row, in the look of Redmine's context menu; Delete stands last with Redmine's `icon-del`. Only tables marked `data-gk-gui-rowmenu` are touched; Redmine's own context menu (issues, time entries) is left alone. Without JavaScript the actions stand in the row as before.

```erb
<table class="list" data-gk-gui-rowmenu>
  <tbody>
    <% @things.each do |t| %>
      <tr>
        <td class="name"><%= t.name %></td>
        <td class="buttons">
          <%= link_to l(:button_edit), edit_thing_path(t), class: 'icon icon-edit', data: { gk_gui_row_action: true } %>
          <%= link_to l(:button_delete), thing_path(t), method: :delete, class: 'icon icon-del',
                      data: { confirm: l(:text_are_you_sure), gk_gui_row_action: true } %>
          <%= link_to l(:button_copy), copy_thing_path(t), class: 'icon icon-copy', data: { gk_gui_row_action: 'keep' } %>
        </td>
      </tr>
    <% end %>
  </tbody>
</table>
<%= gk_gui_stuff_row_menu %>
```

- `table[data-gk-gui-rowmenu]`: the list. Each action in a row has `data-gk-gui-row-action`: a link, a button or a `button_to` form (`form: { data: { gk_gui_row_action: true } }`; its button is pressed).
- The action stays in the row, hidden, and the menu's item presses it, so Rails' `data-confirm`, `data-method` and every script on it work exactly as before.
- `data-gk-gui-row-action="keep"`: the action also stays visible in the row and is not in the menu. `data-gk-gui-row-action="delete"`, `a.icon-del`, `data-method="delete"` or a form with `_method=delete` marks the delete, which goes last.
- `data-gk-gui-row-action-label` on an action gives the menu's word (else its aria-label, value, text or title); `data-gk-gui-row-menu-label` on the row names the menu for screen readers (else the row's first cell). The item's icon is the action's own icon.
- The "..." button goes into the cell of the row's first action (else the row's last cell). A right click on a field, or with Shift, gives the browser's own menu.
- Keyboard: the button opens with Enter, Space or arrow down; arrow up and down, Home and End move; Enter or Space chooses; Escape and Tab close, and focus goes back to the button. A click outside closes.
- Rows added later (by the row editor or a script) get their button too; `window.gkGuiStuffRowMenu.init(table)` and `.close()` are there for scripts.

## Requirements

- Redmine 6.0.0 or higher.
- Ruby 3.2 or later, the version your Redmine release runs on.
- PostgreSQL.

This plugin is developed and tested on Windows 11 with PostgreSQL only. That is a deliberate choice made for the maintainer's own convenience: the production system and the whole toolchain run there, and supporting other platforms and databases would cost time without adding anything for our own use. The Ruby code avoids needless Windows or PostgreSQL specific constructs, so it may well run on Linux, but that is untested and not supported. The migrations use only ordinary column types, but PostgreSQL is the only database the plugin is tested on.

GK plugins:

- Required: none.
- Optional: gk_records (the register of every plugin's functions that Administration > Functions shows and switches, users' choices kept as events, and the reason field), gk_fields (translated names for the administration rows), gk_icons (icons in the modules and the custom field mark), gk_compat (core's colour variables, icons and the account menu where an older Redmine series lacks them), gk_core_stuff (its appearance modules listed with a link), gk_scenarios (the plugin's scenario steps and checks).

## Installation

The plugin directory must be named `gk_gui_stuff` (it is the plugin id): `plugins/gk_gui_stuff/`.

This version is installed anew and does not upgrade an earlier one: uninstall the earlier version first (as under Uninstall below, while its own files are in place), then install this one. Nothing is carried over from the earlier installation.

1. Unpack the release package into Redmine's `plugins` directory.
2. Run the migrations: `bundle exec rake redmine:plugins:migrate RAILS_ENV=production`
3. Restart Redmine.

Uninstall:

1. `bundle exec rake redmine:plugins:migrate NAME=gk_gui_stuff VERSION=0 RAILS_ENV=production`
2. Remove the `plugins/gk_gui_stuff` directory and restart Redmine.

## Configuration

- Administration > Plugins > Configure (GK GUI Stuff): Core-like for everyone and per user, the mode of each module, placement of buttons (out or in the three-dot menu), rows of the administration (group tags and names), values (fold height, number of attachments shown, footer text, login reminder animation, heartbeat, wave timings, notice and message box timeouts, due soon days and more), the status per tracker for "100 % done", where Help leads, and what is hidden.
- Administration > Functions: switch the functions declared by GK plugins in gk_records on or off.

## Usage

- My account > Appearance and aids: each user chooses Core-like for themselves, switches off the modules the administrator allows, and places buttons out or in the three-dot menu.
- The modules appear where described above: issue lists, issue pages, forms, the top menu, the administration and every page's footer.
- On Redmine 7.0 personal pages from GK plugins appear in the user menu; on 6.0 and 6.1 in the My account sidebar under My pages.

## Changelog

See CHANGELOG.md.

## License

GPL-2.0-or-later, the same license as Redmine. Copyright (C) 2026 Jimmy Westberg. See the LICENSE file for the full text.
