# frozen_string_literal: true

module GkGuiStuff
  # Meningen: a lead, the conditions as pills whose parts are buttons, the words between
  # them, groups in parentheses, quiet text, choices as whole pills, and "+ Villkor" as a plain button. The
  # server draws it with gk_gui_stuff_sentence, a script with GkGui.sentence.mount (gk_gui_stuff_sentence.js), in the
  # same markup; the script binds both. The frame is a rail without an address: it only shows the state, changed
  # while something waits for Verkställ, and never saves itself.
  module SentenceHelper
    # items: [{ kind: :condition, key:, field:, op:, value:, incomplete: false, role: :choice, open: nil (:field, :value) },
    #         { kind: :word, key:, text:, logic: :and | :or | :not, fixed: false, title: },
    #         { kind: :group, items: [...] }, { kind: :text, text: }, { kind: :choice, key:, text:, dashed: false, open: false }]
    # add: { label:, title: } or nil; empty: the quiet words when there is no item; inline: true draws no frame;
    # pending: true puts the frame in the rail's state changed; key: the sentence's name for the script
    def gk_gui_stuff_sentence(lead, items:, add: nil, empty: nil, inline: false, pending: false, key: nil, html: {})
      parts = []
      parts << content_tag(:strong, lead, class: 'gk-gui-stuff-sentence-lead') if lead.present?
      list = Array(items)
      parts << content_tag(:em, empty, class: 'gk-gui-stuff-sentence-empty') if list.empty? && empty.present?
      parts.concat(list.map { |i| gk_gui_stuff_sentence_item(i) })
      if add
        parts << content_tag(:button, safe_join([sprite_icon('add', nil, size: 14), content_tag(:span, add[:label] || l(:gk_gui_stuff_sentence_add))], ' '),
                             type: 'button', class: 'gk-gui-stuff-sentence-add', title: add[:title], data: { gk_gui_sentence_add: '1' })
      end
      parts << content_tag(:span, '', class: 'gk-gui-stuff-rail-bar', 'aria-hidden': 'true')
      cls = ['gk-gui-stuff-sentence', inline ? 'gk-gui-stuff-sentence-inline' : nil, 'gk-gui-stuff-rail', html[:class]].compact.join(' ')
      content_tag(:div, safe_join(parts, ' '), **html.except(:class, :data), class: cls,
                                               data: (html[:data] || {}).merge(gk_gui_sentence: key, gk_gui_save: pending ? 'changed' : 'direct'))
    end

    # "Inte verkställt: …" beside core's Verkställ, the same quiet text as beside a box's Save;
    # GkGui.sentence.note draws it from a script
    def gk_gui_stuff_sentence_note(text)
      content_tag(:span, text, class: 'gk-gui-stuff-form-status gk-gui-stuff-sentence-note', role: 'status', 'aria-live': 'polite')
    end

    private

    def gk_gui_stuff_sentence_item(i)
      case i[:kind].to_s
      when 'condition' then gk_gui_stuff_sentence_condition(i)
      when 'word'
        cls = "gk-gui-stuff-sentence-word gk-gui-stuff-sentence-#{%w[or not].include?(i[:logic].to_s) ? i[:logic] : 'and'}"
        if i[:fixed]
          content_tag(:span, i[:text], class: "#{cls} gk-gui-stuff-sentence-word-fixed", title: i[:title])
        else
          content_tag(:button, i[:text], type: 'button', class: cls, title: i[:title], data: { gk_gui_sentence_word: i[:key] })
        end
      when 'group' then content_tag(:span, safe_join(Array(i[:items]).map { |c| gk_gui_stuff_sentence_item(c) }, ' '), class: 'gk-gui-stuff-sentence-paren')
      when 'text' then content_tag(:span, i[:text], class: 'gk-gui-stuff-sentence-text')
      when 'choice'
        gk_gui_stuff_pill(i[:text], role: i[:dashed] ? nil : (i[:role] || :choice), dashed: i[:dashed] ? true : false, open: i[:open] ? true : false,
                                    button: { title: i[:title], aria: { haspopup: 'true', expanded: i[:open] ? 'true' : 'false' },
                                              data: { gk_gui_sentence_part: 'choice', gk_gui_sentence_key: i[:key] } })
      else raise ArgumentError, "unknown sentence item #{i[:kind]}"
      end
    end

    # A condition: the field's name, the operator and the value, the x; incomplete in the role warning with
    # "?" and the words for the screen reader; open: the part that opened the box
    def gk_gui_stuff_sentence_condition(i)
      value = i[:incomplete] ? '?' : i[:value].to_s
      shown = [content_tag(:span, i[:op], class: 'gk-gui-stuff-pill-op'), content_tag(:span, value, class: 'gk-gui-stuff-pill-value', title: value)]
      shown << content_tag(:span, l(:gk_gui_stuff_sentence_incomplete), class: 'gk-gui-stuff-sr-only') if i[:incomplete]
      data = ->(part) { { gk_gui_sentence_part: part, gk_gui_sentence_key: i[:key] } }
      remove = l(:gk_gui_stuff_sentence_remove)
      gk_gui_stuff_pill(i[:field], role: i[:incomplete] ? :warning : (i[:role] || :choice), open: i[:open] ? true : false,
                                   button: { title: l(:gk_gui_stuff_sentence_field), aria: { haspopup: 'true', expanded: (i[:open].to_s == 'field').to_s }, data: data.call('field') },
                                   part_buttons: [{ content: safe_join(shown, ' '), title: l(:gk_gui_stuff_sentence_edit), data: data.call('value'),
                                                    aria: { haspopup: 'true', expanded: (i[:open].to_s == 'value').to_s } },
                                                  { content: sprite_icon('close', nil, size: 12), title: remove, aria_label: remove, data: data.call('remove') }])
    end
  end
end
