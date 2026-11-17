# frozen_string_literal: true

module GkGuiStuff
  # The lists' primitives, helpers of PrimitivesHelper like the others (the module is opened again here, so they are
  # included wherever the primitives are): quiet text, the entry with its thread, values in two modes, the thing, the
  # shown reason and the scroll box for preformatted text. Drawn by the server only, with no script; styled by
  # gk_gui_stuff_entry.css. They belong to every plugin, none of them to one page.
  module PrimitivesHelper
    # Tyst text: small and muted, for what stands beside the content (a time, a number, an origin, a line of help).
    #   text / block  the text
    #   soft:   italic in the soft text tone, for what says something about the record ("corrects #39", a basis)
    #   inline: stands after a field on its row, a little apart from it
    #   full:   the size of the text around it, otherwise the same tone (what stands in the content's own place, such
    #           as a thing that may not be seen)
    #   nowrap: never breaks inside, for a point in time
    #   tag:    :span (default), :p, :div or :a (with html: { href: })
    #   html:   more attributes (class: added after the primitive's own)
    # A link inside quiet text takes the text's colour with a dotted underline.
    def gk_gui_stuff_quiet(text = nil, soft: false, inline: false, full: false, nowrap: false, tag: :span, html: {}, &block)
      raise ArgumentError, "unknown quiet tag #{tag.inspect}" unless %w[span p div a].include?(tag.to_s)

      cls = ['gk-gui-stuff-quiet', soft ? 'gk-gui-stuff-quiet-soft' : nil, inline ? 'gk-gui-stuff-quiet-inline' : nil,
             full ? 'gk-gui-stuff-quiet-full' : nil, nowrap ? 'gk-gui-stuff-quiet-nowrap' : nil, html[:class]].compact.join(' ')
      content_tag(tag.to_sym, block ? capture(&block) : text, **html.except(:class), class: cls)
    end

    # Posten: one entry of a list of notes, with a line between the entries. Four parts in a fixed order: the head
    # (kind, who, when, number, then head: and the actions at its end), the text (the block), a quiet line under it
    # and the thread of answers, indented behind a line. Empty parts are not drawn.
    #   kind:        the kind's pill, drawn by the caller
    #   who:         who wrote it, in bold
    #   at:          when, as quiet text that never breaks inside
    #   number:      the entry's number ("#41"), quiet; number_href: makes it a link
    #   head:        more in the head after the number (an origin's pill, a quiet "corrects #39")
    #   actions:     the actions as drawn by the caller, icons with their word as the tooltip (gk_gui_stuff_icon_button,
    #                gk_gui_stuff_reason_button with icon_only:)
    #   state:       nil, :voided, :corrected or a list of them. A voided entry is folded under voided:, the heading
    #                that says who, when and why; a corrected entry has its text in the soft tone
    #   under:       a quiet line under the text ("corrected by #43")
    #   thread:      the answers, each a drawn entry (a list or markup)
    #   id:, html:   the element's id and its other attributes; id: wins over an id in html:
    def gk_gui_stuff_entry(kind:, who:, at:, number: nil, number_href: nil, head: nil, actions: nil, state: nil, voided: nil, under: nil, thread: nil,
                           id: nil, html: {}, &block)
      states = Array(state).map(&:to_s)
      unknown = states - %w[voided corrected]
      raise ArgumentError, "unknown entry state #{unknown.first}" if unknown.any?
      raise ArgumentError, 'a voided entry needs voided: (who, when and why)' if states.include?('voided') && voided.blank?

      top = [kind.presence]
      top << content_tag(:span, who, class: 'gk-gui-stuff-entry-who') if who.present?
      top << gk_gui_stuff_quiet(at, nowrap: true) if at.present?
      if number.present?
        top << (number_href.present? ? gk_gui_stuff_quiet(number, tag: :a, html: { href: number_href }) : gk_gui_stuff_quiet(number))
      end
      top << head.presence
      # a div, not a span: an action may be a form of its own with a popover in it (the reason button with url:)
      top << content_tag(:div, actions, class: 'gk-gui-stuff-entry-actions') if actions.present?
      text = block ? capture(&block) : nil
      body = text.present? ? content_tag(:div, text, class: 'gk-gui-stuff-entry-body') : nil
      body = gk_gui_stuff_disclosure(texts: voided) { body } if states.include?('voided')
      answers = thread.is_a?(Array) ? safe_join(thread.compact) : thread
      parts = [content_tag(:div, safe_join(top.compact), class: 'gk-gui-stuff-entry-head'), body,
               under.present? ? gk_gui_stuff_quiet(under, soft: true, tag: :div) : nil,
               answers.present? ? content_tag(:div, answers, class: 'gk-gui-stuff-entry-thread') : nil]
      cls = ['gk-gui-stuff-entry', *%w[voided corrected].select { |s| states.include?(s) }.map { |s| "gk-gui-stuff-entry-#{s}" }, html[:class]].compact.join(' ')
      content_tag(:div, safe_join(parts.compact), **html.except(:class), class: cls, id: id.presence || html[:id])
    end

    # Värden: a list of values under their labels, in two modes.
    #   mode: :now      the value that holds, the earlier one struck through after it.
    #                   rows: [{ label:, value:, was: }]; with the key was: the earlier value is drawn, an empty one as "-"
    #   mode: :changes  what changed, from and to with an arrow between them, so that the direction shows without colour.
    #                   rows: [{ label:, from:, to: }]; only to: draws the new value alone, only from: the old one alone,
    #                   value: a value that is neither
    # In both modes a row may be { html: }, the whole row as drawn by the caller. The label gets its colon here.
    # unmarked: true on a row draws it without the dot the mode changes gives its rows (the fold "show all" as the
    # list's last row); it stands with any of the row's other keys and changes nothing in the mode now, which has no dots.
    # A script draws the same list with GkGui.values(rows, mode) (gk_gui_stuff_parts.js, the box of a form page's
    # Spara): the two give the same markup and are changed together.
    def gk_gui_stuff_values(rows, mode: :now, html: {})
      m = mode.to_s
      raise ArgumentError, "unknown values mode #{mode.inspect}" unless %w[now changes].include?(m)

      before = ::I18n.t(:text_gk_gui_stuff_values_before)
      items = Array(rows).map do |row|
        r = row.to_h.transform_keys(&:to_sym)
        bare = r[:unmarked] ? 'gk-gui-stuff-values-unmarked' : nil
        next content_tag(:li, r[:html], class: bare) if r.key?(:html)

        parts = []
        parts << content_tag(:span, "#{r[:label]}:", class: 'gk-gui-stuff-values-label') if r[:label].present?
        if m == 'now'
          parts << r[:value] if r[:value].present?
          parts << content_tag(:del, r[:was].presence || '-', title: before) if r.key?(:was)
        else
          change = []
          change << content_tag(:del, r[:from]) if r[:from].present?
          change << content_tag(:span, '→', class: 'gk-gui-stuff-values-arrow', 'aria-hidden': 'true') if r[:from].present? && r[:to].present?
          change << content_tag(:ins, r[:to]) if r[:to].present?
          parts << (change.any? ? safe_join(change) : r[:value])
        end
        content_tag(:li, safe_join(parts.compact, ' '), class: bare)
      end
      content_tag(:ul, safe_join(items), **html.except(:class), class: ['gk-gui-stuff-values', "gk-gui-stuff-values-#{m}", html[:class]].compact.join(' '))
    end

    # Saken: a reference to a thing in three parts, the kind's pill, the thing as a link and the place in it. On a
    # narrow screen it breaks between its parts, never inside the pill.
    #   kind:        the kind's pill, or nil
    #   thing:       the link
    #   place:       where in the thing ("page 4, paragraph 2"), place_title: its tooltip
    #   lead:        words before it ("Refers to"), drawn as soft quiet text
    #   after:       a list of parts after it (a closed status, a verification), each kept on one line
    def gk_gui_stuff_thing(kind, thing, place: nil, place_title: nil, lead: nil, after: nil, html: {})
      parts = [lead.present? ? gk_gui_stuff_quiet(lead, soft: true) : nil, kind.presence, thing.presence]
      parts << content_tag(:span, place, class: 'gk-gui-stuff-thing-place', title: place_title.presence) if place.present?
      parts.concat(Array(after).select(&:present?).map { |a| content_tag(:span, a, class: 'gk-gui-stuff-thing-part') })
      content_tag(:span, safe_join(parts.compact, ' '), **html.except(:class), class: ['gk-gui-stuff-thing', html[:class]].compact.join(' '))
    end

    # Det visade skälet: a reason as it stands afterwards (the reason button and the reason block are where it is
    # written), with the edge and the soft ground of the role notice. The line at its top says who (by:), or the word
    # for a reason when who already stands in a heading above it.
    def gk_gui_stuff_reason_shown(text = nil, by: nil, html: {}, &block)
      top = content_tag(:span, by.presence || ::I18n.t(:label_gk_gui_stuff_reason), class: 'gk-gui-stuff-reason-shown-by')
      content_tag(:div, safe_join([top, block ? capture(&block) : text]), **html.except(:class),
                  class: ['gk-gui-stuff-reason-shown', html[:class]].compact.join(' '))
    end

    # Rullrutan: preformatted text in a box that looks like core's code, with a largest height and its scrolling
    # inside; long lines break instead of widening the page. It takes the keyboard's focus, so that it can be
    # scrolled with the keys; label: names it for a screen reader.
    def gk_gui_stuff_pre(text = nil, label: nil, html: {}, &block)
      content_tag(:pre, block ? capture(&block) : text, **html.except(:class), class: ['gk-gui-stuff-pre', html[:class]].compact.join(' '),
                                                        tabindex: 0, 'aria-label': label.presence)
    end
  end
end
