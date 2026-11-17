# frozen_string_literal: true

module GkGuiStuff
  # The choices' primitives, helpers of PrimitivesHelper like the others (the module is opened again here, so they are
  # included wherever the primitives are): the choice list in its two modes, the only choice shown as text, and the
  # writing box under a list of entries. Drawn by the server and styled by gk_gui_stuff_choice_list.css; the small
  # script gk_gui_stuff_choice_list.js makes the whole row of a choice list a press surface and shows the writing box's
  # counter. They belong to every plugin, none of them to one page. (The box of choices above a list's rows,
  # gk_gui_stuff_choices_box, is something else.)
  module PrimitivesHelper
    # Vallistan: a list where every row is a choice, in two modes.
    #   name   the field's name (many: give it with [] for a list of values, or give each row its own name:)
    #   rows   [{ value:, word:, hint:, checked:, disabled:, name:, unchecked:, id:, input:, after:, html: }]
    #            word:      the choice's word, a text or a pill; it is the choice's label
    #            hint:      quiet text after the word, in the same running text: it wraps beside the choice when the
    #                       row is too narrow, never under it; it describes the choice for a screen reader
    #            name:      the row's own field name instead of name. A disabled choice without a name of its own has
    #                       no name at all, so it is never sent
    #            unchecked: mode :many only, the value a hidden field before the check box sends when it is not ticked
    #            id:        the choice's id instead of "<id>-<n>"
    #            input:     more attributes on the choice (data:, required:)
    #            after:     markup after the hint (hidden fields, one more quiet line)
    #            html:      more attributes on the row (data:, class: added after the primitive's own)
    #   mode:  :many (check boxes) or :one (radio buttons)
    #   head:  the heading, drawn before the list: in core's .tabular form (the caller puts the list in a
    #          div.gk-gui-stuff-tabular-row) it stands in the labels' column, and above the list on a narrow screen
    #   label: the list's name for a screen reader when it has no heading; one of head: and label: is needed
    #   id:    the list's id, from which the heading's, the choices' and the hints' ids are made
    # The whole row can be pressed (the script), not only the choice and its word.
    def gk_gui_stuff_choice_list(name, rows, mode:, head: nil, label: nil, id: nil, html: {})
      m = mode.to_s
      raise ArgumentError, "unknown choice list mode #{mode.inspect}" unless %w[many one].include?(m)
      raise ArgumentError, 'a choice list needs head: or label:' if head.blank? && label.blank?

      id = id.presence || "gk-gui-stuff-choice-list-#{@gk_gui_stuff_choice_list_n = (@gk_gui_stuff_choice_list_n || 0) + 1}"
      items = Array(rows).each_with_index.map do |row, i|
        r = row.to_h.transform_keys(&:to_sym)
        row_id = r[:id].presence || "#{id}-#{i}"
        field = r[:name].presence || (r[:disabled] ? nil : name)
        hint_id = r[:hint].present? ? "#{row_id}-hint" : nil
        more = (r[:input] || {}).to_h.transform_keys(&:to_sym).except(:type, :name, :value, :id, :checked, :disabled)
        parts = []
        parts << hidden_field_tag(field, r[:unchecked], id: nil) if m == 'many' && !r[:unchecked].nil? && field
        parts << tag.input(class: ['gk-gui-stuff-choice-list-input', more.delete(:class)].compact.join(' '), type: m == 'many' ? 'checkbox' : 'radio', name: field, value: r[:value], id: row_id, checked: r[:checked] ? true : nil,
                           disabled: r[:disabled] ? true : nil, 'aria-describedby': hint_id, **more)
        # the word, the hint and what comes after are one running text beside the choice: the choice keeps its place
        # first on the row and the text wraps beside it, never under it
        text = [content_tag(:label, r[:word], for: row_id, class: 'gk-gui-stuff-choice-list-word')]
        text << gk_gui_stuff_quiet(r[:hint], html: { id: hint_id }) if hint_id
        text << r[:after].presence
        parts << content_tag(:span, safe_join(text.compact, ' '), class: 'gk-gui-stuff-choice-list-text')
        row_html = (r[:html] || {}).to_h
        # the list is a group of choices, so a row is no list item to a screen reader: the choice and its word are read
        content_tag(:li, safe_join(parts.compact), role: 'presentation', **row_html.except(:class, :role), class: ['gk-gui-stuff-choice-list-row', row_html[:class]].compact.join(' '))
      end
      parts = []
      parts << content_tag(:span, head, class: 'gk-gui-stuff-choice-list-head', id: "#{id}-head") if head.present?
      parts << content_tag(:ul, safe_join(items), class: 'gk-gui-stuff-choice-list-rows', role: m == 'many' ? 'group' : 'radiogroup',
                                                  'aria-labelledby': head.present? ? "#{id}-head" : nil, 'aria-label': head.present? ? nil : label)
      content_tag(:div, safe_join(parts), **html.except(:class, :data),
                  class: ['gk-gui-stuff-choice-list', "gk-gui-stuff-choice-list-#{m}", html[:class]].compact.join(' '),
                  data: (html[:data] || {}).merge(gk_gui_choice_list: m))
    end

    # Enda valet: when a list has only one choice, the choice is shown as text where the list's text would have stood,
    # never as a pill (a pill already means a kind or a status). With name: the value goes with the form in a hidden
    # field before the text.
    #   name:, value:  the hidden field; id: its id (none by default), input: more attributes on it (data:, class:)
    #   html:          more attributes on the text
    def gk_gui_stuff_only_choice(text, name: nil, value: nil, id: nil, input: {}, html: {})
      shown = content_tag(:span, text, **html.except(:class), class: ['gk-gui-stuff-only-choice', html[:class]].compact.join(' '))
      return shown if name.blank?

      more = (input || {}).to_h.transform_keys(&:to_sym).except(:type, :name, :value, :id)
      safe_join([hidden_field_tag(name, value, id: id.presence, **more), shown])
    end

    # Skrivrutan: where one writes an entry of a list. The list for the kind and, after it, what one answers or
    # corrects as quiet text; the text field over the whole width; the button that adds, with Avbryt beside it; and a
    # counter of characters at the end under the field, shown first when 80 per cent of the field's longest length is
    # used (the script; only with max:).
    #   url           where the form is sent; method: :post by default
    #   kinds:        [[word, value], ...] the kinds to choose from, selected: the chosen one. A single kind is shown
    #                 as text (gk_gui_stuff_only_choice) with its value in a hidden field
    #   label:        the text field's name for a screen reader; kind_label: the list's
    #   name:         the text field's name ('body'); kind_name: the list's ('kind')
    #   max:          the field's longest length (maxlength), which the counter counts towards
    #   value:        what stands in the field from the start (the text given back after a refused save)
    #   placeholder:, rows: (3)  the text field's
    #   submit:       the button's word, core's "Add" by default
    #   hidden:       the caller's hidden fields, drawn first in the form
    #   anchors:      { kind:, context:, text:, cancel: } classes of the caller's own on those parts, for its script.
    #                 What stands in the context and when Avbryt shows is the caller's script's to say: the context is
    #                 empty and Avbryt hidden from the start
    #   id:, html:    the form's id (the counter's is "<id>-count") and its other attributes; id: wins over html[:id]
    def gk_gui_stuff_compose(url, kinds:, label:, kind_label:, name: 'body', kind_name: 'kind', selected: nil, max: nil, value: nil, placeholder: nil,
                             submit: nil, rows: 3, method: :post, hidden: nil, anchors: {}, id: nil, html: {})
      id = id.presence || html[:id].presence || "gk-gui-stuff-compose-#{@gk_gui_stuff_compose_n = (@gk_gui_stuff_compose_n || 0) + 1}"
      at = (anchors || {}).to_h.transform_keys(&:to_sym)
      cls = ->(own, more) { [own, more].flatten.compact.join(' ') }
      list = Array(kinds)
      kind = if list.size == 1
               gk_gui_stuff_only_choice(list.first[0], name: kind_name, value: list.first[1], input: { class: at[:kind] })
             else
               select_tag(kind_name, options_for_select(list, selected), id: "#{id}-kind", 'aria-label': kind_label, class: cls.call('gk-gui-stuff-compose-kind', at[:kind]))
             end
      context = gk_gui_stuff_quiet('', html: { class: cls.call('gk-gui-stuff-compose-context', at[:context]), 'aria-live': 'polite' })
      max = max.presence&.to_i
      used = value.to_s.length
      count = nil
      if max
        template = ::I18n.t(:text_gk_gui_stuff_compose_count, count: '%{count}', max: '%{max}')
        shown = used >= (max * 0.8).ceil
        count = gk_gui_stuff_quiet(shown ? template.sub('%{count}', used.to_s).sub('%{max}', max.to_s) : '',
                                   html: { class: 'gk-gui-stuff-compose-count', id: "#{id}-count", role: 'status', hidden: !shown,
                                           data: { gk_gui_compose_count: template } })
      end
      field = text_area_tag(name, value, id: "#{id}-text", rows: rows, maxlength: max, placeholder: placeholder, 'aria-label': label,
                                         'aria-describedby': max ? "#{id}-count" : nil, class: cls.call('gk-gui-stuff-compose-text', at[:text]))
      cancel = link_to(::I18n.t(:button_cancel), '#', class: cls.call('gk-gui-stuff-compose-cancel', at[:cancel]), hidden: true)
      foot = content_tag(:div, safe_join([submit_tag(submit.presence || ::I18n.t(:button_add), name: nil), ' ', cancel, count].compact), class: 'gk-gui-stuff-compose-foot')
      form_tag(url, **html.except(:class, :id), method: method, class: cls.call('gk-gui-stuff-compose', html[:class]), id: id) do
        safe_join([hidden.presence, content_tag(:div, safe_join([kind, context]), class: 'gk-gui-stuff-compose-head'), field, foot].compact)
      end
    end
  end
end
