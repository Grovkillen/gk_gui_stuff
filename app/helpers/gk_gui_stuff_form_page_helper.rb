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
  def gk_gui_stuff_form_page_data(fills: {}, words: {})
    gk_gui_stuff_form_changes.merge(gk_gui_leave: '1', gk_gui_fills: fills.to_json,
                                    gk_gui_words: { was: l(:text_gk_gui_stuff_was), change: l(:text_gk_gui_stuff_change_line),
                                                    values: l(:text_gk_gui_stuff_change_values), on: l(:text_gk_gui_stuff_group_on),
                                                    ask: l(:text_gk_gui_stuff_requires_question), yes: l(:general_text_Yes),
                                                    cancel: l(:button_cancel), nothing: l(:text_gk_gui_stuff_nothing_to_save),
                                                    warning: l(:label_gk_gui_stuff_warning) }.merge(words).to_json)
  end

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
  # in core's warning box, then the lines of the changes, Spara and Avbryt, and the reason under them, the order of every
  # box with a reason.
  # floor: the reason mode the bar offers while the place asks for none; what is written then is kept all the same
  # (GkGuiStuff::Primitives.written_reason in the page's controller)
  def gk_gui_stuff_form_page_bar(place, floor: nil)
    changes = content_tag(:span, '', class: 'gk-gui-stuff-form-page-changes')
    reason = floor && GkGuiStuff::Primitives.reason_mode(place) == 'off' ? floor : place
    content_tag(:div, safe_join([gk_gui_stuff_reason_button(l(:button_save), reason: reason, info: changes,
                                                                             html: { data: { gk_gui_box_save: '1' } }),
                                 button_tag(l(:button_gk_gui_stuff_undo_all), type: 'button', data: { gk_gui_undo_all: '1' })], ' '),
                class: 'gk-gui-stuff-form-page-bar', role: 'region', 'aria-label': l(:button_save))
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

  # A radio button of a row's level in its centred column, in a label with the level's word (word:). On a wide screen
  # the word is not shown, since the column's heading says it; below 899 px the row stacks and the label is a button
  # in full width with its word. extra: what stands under the button (the quiet mark of the default)
  def gk_gui_stuff_form_page_radio(name, value, checked, label:, word:, disabled: false, extra: nil)
    choice = content_tag(:label, safe_join([radio_button_tag(name, value, checked, id: nil, disabled: disabled, 'aria-label': label),
                                            content_tag(:span, word, class: 'gk-gui-stuff-form-page-choice-word', 'aria-hidden': 'true')]),
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
    sections = defined?(GkGuiStuff::Styleguide) ? GkGuiStuff::Styleguide.all : {}
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
