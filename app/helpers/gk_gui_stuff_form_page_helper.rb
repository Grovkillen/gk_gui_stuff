# frozen_string_literal: true

# The form pages Administration > Utseende and Administration > Funktioner: every row's level as core's radio buttons
# in columns, one form with one reason for all changes. The fill links stand in core's div.contextual beside the
# heading; the top row says that nothing applies before the save and has the search; the bar that stays in sight at the bottom has Spara with the reason of the page's place,
# Ångra alla and the count of changed rows. Each row says its latest change, quietly, in its name cell.
# The script is gk_gui_stuff_form_page.js and the styles gk_gui_stuff_form_page.css.
module GkGuiStuffFormPageHelper
  # The page's script and stylesheet
  def gk_gui_stuff_form_page_assets
    content_for(:header_tags) do
      safe_join([stylesheet_link_tag('gk_gui_stuff_form_page', plugin: 'gk_gui_stuff'),
                 javascript_include_tag('gk_gui_stuff_form_page', plugin: 'gk_gui_stuff')])
    end
  end

  # The form's own data: the counted changes of a GK form, the leaving question, the words the script needs, and the
  # fill links' targets ({ 'redmine' => { field name => value } })
  # example: true for a form page that only shows how it works (the style guide): the form carries
  # data-gk-gui-example, and the script then never sends it and never asks before the page is left (the script
  # decides both on data-gk-gui-example; data-gk-gui-leave only names a form with the leaving question and is left
  # out of an example); everything else (the rail, "var:", the count, the box at the top that locks and opens the
  # rows) is at work
  def gk_gui_stuff_form_page_data(fills: {}, words: {}, example: false)
    data = gk_gui_stuff_form_changes.merge(gk_gui_leave: '1', gk_gui_fills: fills.to_json,
                                           gk_gui_words: { was: l(:text_gk_gui_stuff_was), value_label: l(:text_gk_gui_stuff_change_value_label),
                                                           values_changed: l(:text_gk_gui_stuff_values_changed), on: l(:text_gk_gui_stuff_group_on),
                                                           ask: l(:text_gk_gui_stuff_requires_question), yes: l(:general_text_Yes), no: l(:general_text_No),
                                                           none: l(:label_none), cancel: l(:button_cancel), nothing: l(:text_gk_gui_stuff_nothing_to_save),
                                                           warning: l(:label_gk_gui_stuff_warning) }.merge(words).to_json)
    example ? data.except(:gk_gui_leave).merge(gk_gui_example: '1') : data
  end

  # The page writes autocomplete: 'off' in its own form_tag, beside this data (form_tag(url, autocomplete: 'off',
  # data: gk_gui_stuff_form_page_data(…))). Without it a browser that puts a form's choices back when the page is read
  # again leaves a choice that was never saved standing as if the page was read with it, and the primitives, which
  # read what stood from the fields as they are, would count nothing and say no "var:". Nothing here adds the
  # attribute for the page: Rails' way of building a form's attributes is its own and is left alone

  # The fill links, drawn as core draws its contextual links (an icon from core's sprite and the label). Each fills the
  # form form_id with the target fill key names and saves nothing; the tip says so, and the accessible name is the
  # visible label followed by the tip, so that voice control finds the label. fills: [[label, fill key, icon, tip]].
  # Below 899 px they stand in core's div.contextual before the h2, where core's own rules put them on their own full
  # line above the heading; on a computer's width they stand in the top row instead (gk_gui_stuff_form_page_top draws
  # them again there, and the stylesheet shows one of the two)
  def gk_gui_stuff_form_page_fill_links(form_id, fills)
    @gk_gui_stuff_form_page_fills = [form_id, fills]
    content_tag(:div, gk_gui_stuff_form_page_fill_tags(form_id, fills), class: 'contextual gk-gui-stuff-form-page-fill-ctx')
  end

  def gk_gui_stuff_form_page_fill_tags(form_id, fills)
    links = fills.map do |label, key, icon, tip|
      link_to(sprite_icon(icon, label), '#', class: "icon icon-#{icon}", title: tip, 'aria-label': "#{label}. #{tip}",
                                             data: { gk_gui_fill: key, gk_gui_form: form_id })
    end
    safe_join(links, ' ')
  end

  # The top row: that nothing applies before the save, and the search; on a computer's width the stylesheet puts the
  # search first and the fill links before the line at the end
  def gk_gui_stuff_form_page_top
    parts = [content_tag(:span, l(:text_gk_gui_stuff_form_applies_on_save), class: 'gk-gui-stuff-form-page-note'), gk_gui_stuff_form_page_search]
    if @gk_gui_stuff_form_page_fills
      parts << content_tag(:span, gk_gui_stuff_form_page_fill_tags(*@gk_gui_stuff_form_page_fills), class: 'gk-gui-stuff-form-page-fills')
    end
    content_tag(:div, safe_join(parts), class: 'gk-gui-stuff-form-page-top')
  end

  # The search over the rows that carry gk_gui_stuff_form_page_search_text (the script gk_gui_stuff_form_page.js). No name: it never
  # goes with a form, and is no change of it
  def gk_gui_stuff_form_page_search
    tag(:input, type: 'search', class: 'gk-gui-stuff-form-page-search', placeholder: l(:label_search), 'aria-label': l(:label_search))
  end

  # A row's key, quiet on the row, the same in every language, so that it can be read off and passed on; the search finds
  # it too (gk_gui_stuff_form_page_search_text)
  def gk_gui_stuff_form_page_key(key)
    content_tag(:span, key.to_s, class: 'gk-gui-stuff-form-page-quiet gk-gui-stuff-form-page-key', dir: 'ltr', translate: 'no')
  end

  # The bar at the bottom: at the start as core's buttons, Spara with the reason of the place and then Ångra alla; the
  # count of changed rows comes after them (the script puts it there), so that they never move when it comes, and the
  # box of the reason lists the changes: a warning first
  # in core's warning box, then the changes as GK GUI Stuff's values in the mode changes (one row per setting's level
  # and per value, the old struck through, an arrow, the new), Spara and Avbryt, and the reason under them, the order
  # of every box with a reason. The place of the list is a block (div.gk-gui-stuff-form-page-changes), never in a
  # paragraph, and the box is wide.
  # While the place is off, Spara opens the same box as ever, with the list of the changes and the warnings, Spara and
  # Avbryt, and no field for a reason: the box always shows what is saved, and the field is there or not by the place's
  # mode. No reason is offered then, and the page's controller keeps none (the place's own check answers no text).
  # Utseende and Funktioner give no floor.
  # floor: a reason mode the bar offers while the place asks for none, for a page that keeps what is written then
  # (GkGuiStuff::Primitives.written_reason in that page's controller).
  # sharp: true for a page with rows that always ask in their sharp state (data-gk-gui-reason-sharp on the row): while
  # the place is off, the box then carries the reason's field hidden and switched off, and the script shows it,
  # required, only while such a row stands changed, on and sharp; the page's controller keeps it for that row alone.
  # The bar takes for granted that the form's data: is gk_gui_stuff_form_page_data and that the form's own form_tag
  # says autocomplete: 'off'
  def gk_gui_stuff_form_page_bar(place, floor: nil, sharp: false)
    changes = content_tag(:div, '', class: 'gk-gui-stuff-form-page-changes')
    save = { data: { gk_gui_box_save: '1' } }
    reason = floor && GkGuiStuff::Primitives.reason_mode(place) == 'off' ? floor : place
    button = if GkGuiStuff::Primitives.reason_mode(reason) == 'off'
               gk_gui_stuff_popover(l(:button_save), width: :wide, html: { class: 'gk-gui-stuff-form-page-save-off' }) do
                 safe_join([changes, gk_gui_stuff_popover_buttons(l(:button_save), html: save),
                            sharp ? gk_gui_stuff_form_page_sharp_reason : nil].compact)
               end
             else
               gk_gui_stuff_reason_button(l(:button_save), reason: reason, info: changes, info_block: true, width: :wide, html: save)
             end
    content_tag(:div, safe_join([button, button_tag(l(:button_gk_gui_stuff_undo_all), type: 'button', data: { gk_gui_undo_all: '1' })], ' '),
                class: 'gk-gui-stuff-form-page-bar', role: 'region', 'aria-label': l(:button_save))
  end

  # The reason of a row that always asks, in the box of a bar whose place is off: hidden and switched off (nothing is
  # sent) until the script finds such a row changed, on and sharp
  def gk_gui_stuff_form_page_sharp_reason
    id = "gk-gui-stuff-reason-#{@gk_gui_stuff_mount_n = (@gk_gui_stuff_mount_n || 0) + 1}"
    content_tag(:span, gk_gui_stuff_reason_block(required: false, id: id, name: 'reason', disabled: true),
                class: 'gk-gui-stuff-form-page-sharp-reason', hidden: true)
  end

  # A row's latest change, quiet, last in its name cell: what it became, the date, who and the reason cut to one line,
  # with Historik when GK Records lists the events
  def gk_gui_stuff_form_page_last(word, change, history)
    return ''.html_safe unless change

    who = change[:user]&.name || l(:label_user_anonymous)
    date = format_date(User.current.time_to_date(change[:at]))
    reason = change[:reason].to_s
    text = if reason.present?
             l(:text_gk_gui_stuff_last_change, mode: word, date: date, user: who, reason: reason.truncate(80))
           else
             l(:text_gk_gui_stuff_last_change_plain, mode: word, date: date, user: who)
           end
    link = history ? link_to(l(:label_history), history) : nil
    content_tag(:span, safe_join([sprite_icon('history', nil, size: 12), content_tag(:span, text, class: 'gk-gui-stuff-form-page-last-text', title: reason.presence),
                                  link].compact, ' '), class: 'gk-gui-stuff-form-page-last')
  end

  # The events of one thing on GK Records' page Händelser (the target as "key:id", which the page reads and asks who
  # may see), nil without the page
  def gk_gui_stuff_form_page_history(target, id)
    return nil unless id && respond_to?(:gk_records_events_path)

    gk_records_events_path(target: "#{target}:#{id}")
  end

  # A group's heading in the page's one table: a body of its own with one row, the fold button over every column with
  # the group's count in words; the button shows and hides the group's rows (the body body_id)
  def gk_gui_stuff_form_page_group_head(title, count, body_id, columns)
    toggle = gk_gui_stuff_group_toggle(title, open: true, controls: body_id, count: count)
    content_tag(:tbody, content_tag(:tr, content_tag(:th, toggle, colspan: columns)), class: 'gk-gui-stuff-form-page-group',
                                                                                     data: { gk_gui_body: body_id })
  end

  # The page's table in core's scrolling box: the name column first, then the fact columns, then the level columns.
  # cols: the number of level columns, which the page says itself (2, 3 or 4); below 899 px a row's levels stand
  # under its name as buttons, three in a row with three levels and two and two with two or four. head: the name
  # column's heading, levels: the level columns' headings in order, facts: the fact columns' headings; the block is
  # the table's bodies (gk_gui_stuff_form_page_group_head and the rows). columns (the number of all columns, for a
  # group's heading) is 1 + facts + cols.
  def gk_gui_stuff_form_page_table(head:, levels:, cols: levels.size, facts: [], html: {}, &block)
    raise ArgumentError, "a form page's table has 2, 3 or 4 level columns, not #{cols.inspect}" unless [2, 3, 4].include?(cols)
    raise ArgumentError, "#{levels.size} headings for #{cols} level columns" unless levels.size == cols

    group = tag.colgroup(safe_join([tag.col(class: 'name')] + facts.map { tag.col(class: 'fact') } + levels.map { tag.col(class: 'choice') }))
    row = [content_tag(:th, head)] + facts.map { |f| content_tag(:th, f, class: 'gk-gui-stuff-form-page-fact-col') } +
          levels.map { |w| content_tag(:th, w, class: 'gk-gui-stuff-choice-col') }
    table = content_tag(:table, safe_join([group, content_tag(:thead, content_tag(:tr, safe_join(row))), capture(&block)]),
                        **html.except(:class),
                        class: ['list', 'gk-gui-stuff-form-page-table', "gk-gui-stuff-form-page-cols-#{cols}", html[:class]].compact.join(' '))
    content_tag(:div, table, class: 'autoscroll gk-gui-stuff-form-page-scroll')
  end

  # A fact cell of a row: something the row says and the person does not change here (Gäller nu). It stands from the
  # start edge in its own column; below 899 px on a line of its own under the name, with the column's word (word:)
  # before it, since the headings are not shown there
  def gk_gui_stuff_form_page_fact(content, word:)
    content_tag(:td, safe_join([content_tag(:span, "#{word}:", class: 'gk-gui-stuff-form-page-fact-word'), content], ' '),
                class: 'gk-gui-stuff-form-page-fact')
  end

  # A box at the top of the form, outside the table and in the same form, saved with the same Spara and the same
  # reason: one choice that holds for everything under it (the installation's mode on the page of the reasons).
  # title: its name, help: what the choice does, name: the field's name, choices: [[word, value], …] (each with its
  # own word, which need not be a column's), selected: the value that holds. The choices are radio buttons in a row;
  # below 899 px they stand two and two as buttons in full width. The form page's script counts the box as a row: the
  # rail while its choice is changed, "var:" with the word that stood, and it is counted by Spara and listed in the
  # box of Spara. locked: a line under the box, over the table, that says why the rows under it cannot be changed.
  # As a text it is that line, as it stands. As { value => line } it names the choices that lock the rows under the
  # box, each with its own line: the box then carries data-gk-gui-lead-locks (the values, as JSON) and
  # data-gk-gui-lead-line (the id of the line's place, where the script finds it, wherever it stands). The place is
  # a div with role="status" and data-gk-gui-lock-lines that is always in the page, empty of anything shown while no
  # choice locks, so that what comes into it is said to the one who listens; in it the line, with one part per value
  # (data-gk-gui-lock-line), shown for the choice that holds and hidden while none of them does. The form page's
  # script follows the choice before anything is saved: the rows' choices drawn with follows_lead: name
  # (gk_gui_stuff_form_page_radio) are switched off and on at once, and the line says the choice made.
  # locked_unsaved: { value => line }, beside locked: as { value => line }: the line of a locking choice that is
  # chosen and not saved yet, in its own words (what will hold when the form is saved), where locked: has the line of
  # the choice as it stands saved. Each is a part of the same line (data-gk-gui-lock-unsaved, the value), hidden when
  # the page is drawn; the script shows it in place of the saved part while the chosen value is another than the one
  # the page was read with (the choice the server drew as chosen, and the one the primitives keep as the first), and
  # the saved part when it is the same. A value without an unsaved line keeps its saved line for both. Only values
  # that locked: names.
  def gk_gui_stuff_form_page_lead(title, name:, choices:, selected:, help: nil, locked: nil, locked_unsaved: nil, html: {})
    lines = locked.is_a?(Hash) ? locked.transform_keys(&:to_s) : nil
    unsaved = (locked_unsaved || {}).transform_keys(&:to_s)
    raise ArgumentError, 'locked_unsaved: goes with locked: as { value => line }' if unsaved.any? && !lines
    unknown = lines ? unsaved.keys - lines.keys : []
    raise ArgumentError, "locked_unsaved: names values that locked: does not: #{unknown.inspect}" if unknown.any?

    line_id = "gk-gui-stuff-form-page-lock-lines-#{name.to_s.gsub(/[^A-Za-z0-9_-]+/, '-')}"
    html = html.merge(data: (html[:data] || {}).merge(gk_gui_lead_locks: lines.keys.to_json, gk_gui_lead_line: line_id)) if lines
    head = content_tag(:div, safe_join([content_tag(:span, title, class: 'gk-gui-stuff-form-page-name'),
                                        content_tag(:span, '', class: 'gk-gui-stuff-form-page-was', hidden: true),
                                        help.present? ? content_tag(:span, help, class: 'gk-gui-stuff-form-page-lead-help') : nil].compact, ' '),
                       class: 'gk-gui-stuff-form-page-lead-head')
    radios = choices.map do |word, value|
      content_tag(:label, safe_join([radio_button_tag(name, value, value.to_s == selected.to_s, id: nil, data: { gk_gui_word: word }),
                                     content_tag(:span, word, class: 'gk-gui-stuff-form-page-lead-word')]),
                  class: 'gk-gui-stuff-form-page-choice')
    end
    box = content_tag(:div, safe_join([head, content_tag(:div, safe_join(radios), class: 'gk-gui-stuff-form-page-lead-choices',
                                                                                  role: 'radiogroup', 'aria-label': title)]),
                      **html.except(:class), class: ['gk-gui-stuff-form-page-lead', 'gk-gui-stuff-field', html[:class]].compact.join(' '))
    return box if locked.blank?
    return safe_join([box, content_tag(:p, locked, class: 'gk-gui-stuff-form-page-lead-locked')]) unless lines

    parts = lines.map { |value, line| content_tag(:span, line, data: { gk_gui_lock_line: value }, hidden: value != selected.to_s) }
    parts += unsaved.map { |value, line| content_tag(:span, line, data: { gk_gui_lock_unsaved: value }, hidden: true) }
    line = content_tag(:p, safe_join(parts), class: 'gk-gui-stuff-form-page-lead-locked', hidden: !lines.key?(selected.to_s))
    safe_join([box, content_tag(:div, line, id: line_id, class: 'gk-gui-stuff-form-page-lead-status', role: 'status',
                                            data: { gk_gui_lock_lines: '1' })])
  end

  # The quiet word under the choice that is the row's default ("förval"), for extra: of gk_gui_stuff_form_page_radio:
  # one word and one look on every form page
  def gk_gui_stuff_form_page_default_mark
    content_tag(:span, l(:text_gk_gui_stuff_default_mark), class: 'gk-gui-stuff-form-page-default')
  end

  # A radio button of a row's level in its centred column, in a label with the level's word (word:). On a wide screen
  # the word is not shown, since the column's heading says it; below 899 px the row stacks and the label is a button
  # in full width with its word. extra: what stands under the button (the quiet mark of the default).
  # disabled: true, a choice that cannot be made here (a place the installation's mode locks, a setting whose plugin
  # is missing): the button stands in its column, switched off, and still shows which choice stands; nothing of it
  # is sent, and the fill links, Ångra alla and the row's question pass it over. Below 899 px every level then stays
  # a button, toned down, and the one that stands carries the lock in the round button's place (the stylesheet).
  # follows_lead: the field name of the box at the top of the form that locks and opens this choice
  # (gk_gui_stuff_form_page_lead with that name: and locked: as { value => line }): the button carries
  # data-gk-gui-follows-lead with the name, and the script switches it off and on with that box's choice, and with no
  # other box's; disabled: says how it stands when the page is read
  def gk_gui_stuff_form_page_radio(name, value, checked, label:, word:, disabled: false, follows_lead: nil, extra: nil)
    unless follows_lead.nil? || ((follows_lead.is_a?(String) || follows_lead.is_a?(Symbol)) && !follows_lead.to_s.empty?)
      raise ArgumentError, "follows_lead: is the field name of the box at the top, not #{follows_lead.inspect}"
    end

    opts = { id: nil, disabled: disabled, 'aria-label': label }
    opts[:data] = { gk_gui_follows_lead: follows_lead.to_s } if follows_lead
    lock = if disabled || follows_lead
             content_tag(:span, sprite_icon('lock', nil, size: 14), class: 'gk-gui-stuff-form-page-choice-lock', 'aria-hidden': 'true')
           end
    choice = content_tag(:label, safe_join([radio_button_tag(name, value, checked, **opts), lock,
                                            content_tag(:span, word, class: 'gk-gui-stuff-form-page-choice-word', 'aria-hidden': 'true')].compact),
                         class: 'gk-gui-stuff-form-page-choice')
    content_tag(:td, safe_join([choice, extra].compact), class: 'gk-gui-stuff-choice-col')
  end

  # The anchor of a row on the page
  def gk_gui_stuff_form_page_anchor(key) = "a-#{key.to_s.tr('._', '--')}"

  # The quiet line Påverkar under a setting's or a function's row (Utseende, Funktioner, Mitt konto > Utseende): what it
  # changes on the pages, read from its footprint in records' register (footprint: and applies:). The style guide's
  # elements it changes, then the pages (alla sidor, the page types by name, or their number where a page type has no
  # name yet), then what it adds and what it may hide; with only anchors, the number of places. No line where nothing is
  # described, never a guess; a row that applies none says it changes nothing that shows. Drawn as the row's other quiet
  # lines (Hör ihop med). Nothing with a register that has no footprints.
  def gk_gui_stuff_affects(register, key)
    return ''.html_safe unless register.respond_to?(:footprint) && register.respond_to?(:described?)

    row = register.find(key)
    return ''.html_safe unless row

    fp = register.footprint(key)
    text = if row.respond_to?(:applies) && Array(row.applies) == ['none'] then l(:text_gk_gui_stuff_affects_nothing)
           elsif register.described?(key) then gk_gui_stuff_affects_words(fp)
           end
    return ''.html_safe if text.blank?

    content_tag(:span, safe_join([l(:label_gk_gui_stuff_affects), text], ' '),
                class: 'gk-gui-stuff-form-page-related gk-gui-stuff-form-page-affects', data: { gk_gui_affects: key })
  end

  # The words of a footprint, in the order of the line: elements, pages, adds, removes; the places when only anchors
  def gk_gui_stuff_affects_words(fp)
    words = []
    sections = GkGuiStuff::Styleguide.all
    words.concat(Array(fp['elements']).filter_map { |k| sections[k]&.label })
    pages = Array(fp['pages'])
    if pages.include?(GkRecords::Footprint::ALL_PAGES)
      words << l(:text_gk_gui_stuff_affects_all_pages)
    elsif pages.any?
      names = pages.map { |p| gk_gui_stuff_page_type_name(p) }
      words.concat(names.all? ? names : [l(:text_gk_gui_stuff_affects_pages, count: pages.size)])
    end
    { 'adds' => :adds, 'removes' => :removes }.each do |part, word|
      list = Array(fp[part])
      next if list.empty?

      names = list.map { |e| e['label'] && ::I18n.exists?(e['label']) ? ::I18n.t(e['label']) : nil }
      words << if names.all? && names.size <= 3
                 l(:"text_gk_gui_stuff_affects_#{word}", names: names.join(', '))
               else
                 l(:"text_gk_gui_stuff_affects_#{word}_count", count: list.size)
               end
    end
    words << l(:text_gk_gui_stuff_affects_places, count: Array(fp['anchors']).size) if words.empty? && Array(fp['anchors']).any?
    words.join(', ')
  end

  # A page type's name while GK GUI Stuff has no register of page types: core's page types by the words the menu's
  # contexts already have (core.issue is Ärendet), nil for any other
  def gk_gui_stuff_page_type_name(key)
    owner, name = key.to_s.split('.', 2)
    return nil unless owner == 'core' && name

    k = :"label_gk_gui_stuff_page_#{name}"
    ::I18n.exists?(k) ? l(k) : nil
  end
end
