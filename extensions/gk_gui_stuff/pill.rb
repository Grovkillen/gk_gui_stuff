# frozen_string_literal: true

module GkGuiStuff
  # The pill, a primitive of its own file: a helper of PrimitivesHelper like the others (the module is opened again
  # here, so it is included wherever the primitives are). Bound by gk_gui_stuff_parts.js (GkGui.pill and the note's
  # form), styled by gk_gui_stuff_primitives.css.
  module PrimitivesHelper
    # Bricka: a tag, a status, a category; one pill, its parts parted by a thin line in its colour.
    #   text        the pill's text, cut short with … when the row is too narrow (the tooltip has all of it)
    #   role:       a category 1 to 12, an alert level (tip, info, notice, warning, alarm, critical), admin or muted;
    #               nil for the neutral pill
    #   type_icon:  the type's icon, first in the pill (inside its link or button) and only to read, with no divider
    #               between it and the name; type_label: the type's name for its tooltip ("Typ: Projekt"); nothing
    #               when blank (a tag without a type) or when a pack's icon cannot be drawn (no GK Icons, or the pack
    #               is gone)
    #   href:       the whole pill (the text and the count) is one link, with href_title: as its tooltip and href_html:
    #               as its other attributes (role, aria-pressed)
    #   part_href:  a last part with an arrow is a link of its own (a tag's page), with part_title: as its tooltip and
    #               for the screen reader; only with href:, never with remove: or chosen:
    #   note:       a second text, cut short in the pill with all of it in the tooltip (a new choice's "ny"). With
    #               note_icon: true it is a mark's note: the part is the note icon as a button whose tooltip is the
    #               note, opening a small popover with the heading (note_label:, "Lapp" by default), the quiet words after
    #               it (note_hint:, "bara du ser den"), the whole note and, with note_edit: (the address that changes
    #               the note), "Ändra lappen", which opens the note's form in the same popover: the field, Spara and
    #               Avbryt. The script sends PATCH with the field note (Enter in the field or Spara); an answer that
    #               is not ok shows its error in the popover ({ "error": … } or { "errors": [ … ] } as JSON, else the
    #               general words), an ok one loads the page again. note_open: true writes the note out after the
    #               icon, cut short with …, the icon and the text one part that opens the same popover
    #   count:      a number inside the pill, after the text
    #   remove:     an address that takes the pill away (the x, last), posted, or a plain link with remove_method: :get,
    #               with remove_title: as its tooltip
    #   chosen:     filled in its role (a chosen filter)
    #   button:     { type:, name:, value:, title:, data:, aria: } the text (and the count) is a button: type
    #               'button' by default, for a script that opens a layer under the pill; type 'submit' with name: and
    #               value: makes it a button of its form (a mark to click)
    #   choice:     true: the pill is a choice in a chooser (the marks' popover, the chooser's panel), its one button the
    #               text: the text underlined on hover, a ring 2 px outside on keyboard focus; only with button: and
    #               without part_buttons:
    #   pressed:    true or false gives a choice aria-pressed; true draws it filled in its role with the check; only
    #               with choice:
    #   check:      false: a pressed choice is filled in its role without the check (the library's chips)
    #   part_buttons: [{ content:, title:, aria_label:, data:, aria: }] parts after the text that are buttons, each its
    #               own (the sentence's operator, value and x); a pill with buttons holds no link and no x link
    #   open:       the part that opened a layer stands out (-open; GkGui.layer sets it on its own)
    #   dashed:     a dashed edge, quiet: possible but not chosen
    #   suggested:  the system's suggestion: dashed in the role info, with the part "Förslag" last
    #   quiet:      dimmed like the quiet text around it (an issue's history), clear under the pointer and in focus
    #   struck:     the text struck through (a tag taken away, in an issue's history)
    # The pill's variants, named after what they mean:
    #   dot:        a dot in the pill's role before the text, always the edge's colour (white on a chosen pill)
    #   icon_after: an icon from GK Icons after the text, in the pill's role (a lock: what cannot be changed by hand);
    #               icon_after_label: its words for the screen reader and the tooltip. note_icon: before the text is
    #               another thing and stays
    #   current:    a ring in the role outside the pill with a light gap, drawn as a shadow so that nothing moves (the
    #               step one stands on)
    #   expected:   a dashed edge in the pill's own role (what comes but is not here yet); dashed: is grey and means
    #               possible but not chosen, the two are never the same
    #   muted:      the whole pill toned towards the surface without changing its role, its edge still 3:1 against the
    #               surface (what cannot be chosen); quiet: is lighter and clears under the pointer, muted: does not.
    #               Not the role muted, which is a role of its own
    #   as:         :button: the whole pill is one button with the same classes (a pill that opens a box); it holds no
    #               link, no x and no button of its own
    # current: and expected: may go with dot: and icon_after:; chosen: and muted: never go together
    def gk_gui_stuff_pill(text, role: nil, type_icon: nil, type_label: nil, href: nil, href_title: nil, href_html: {}, part_href: nil, part_title: nil,
                          note: nil, note_icon: false, note_open: false, note_label: nil, note_hint: nil, note_edit: nil,
                          count: nil, remove: nil, remove_title: nil, remove_method: :post, chosen: false, button: nil, part_buttons: nil, choice: false,
                          pressed: nil, check: true, open: false, dashed: false, suggested: false, quiet: false, struck: false, title: nil, html: {},
                          dot: false, icon_after: nil, icon_after_label: nil, current: false, expected: false, muted: false, as: nil)
      raise ArgumentError, 'a chosen pill is never muted' if muted && (chosen || (choice && pressed))
      raise ArgumentError, "as: is :button or nil, not #{as.inspect}" unless as.nil? || as.to_s == 'button'
      if as
        raise ArgumentError, 'a pill that is a button holds no link, no x and no button of its own' if href || part_href || remove || button || part_buttons.present? || note_icon
      end
      if part_href
        raise ArgumentError, 'a pill is not split while edited or chosen' if remove || chosen
        raise ArgumentError, 'a pill is split only when it is a link (href:)' unless href
      end
      raise ArgumentError, 'a note is written out only as the note icon (note_icon:)' if note_open && !note_icon
      buttons = !button.nil? || part_buttons.present?
      raise ArgumentError, 'a pill with buttons holds no link and no x link' if buttons && (href || part_href || remove)
      raise ArgumentError, 'a choice is a pill whose one button is its text (button:, no part_buttons:)' if choice && (button.nil? || part_buttons.present?)
      raise ArgumentError, 'pressed: is for a choice (choice: true)' if !pressed.nil? && !choice

      inner = [content_tag(:span, text.to_s, class: 'gk-gui-stuff-pill-text')]
      # with a count the two are one part, so that they share a baseline (gk_gui_stuff_primitives.css)
      inner = [content_tag(:span, safe_join([inner.first, content_tag(:span, count, class: 'gk-gui-stuff-pill-count')]), class: 'gk-gui-stuff-pill-words')] unless count.nil?
      # the icon after the text, inside the link or button with it; its words for the screen reader
      if icon_after.present? && gk_gui_stuff_icon_drawable?(icon_after)
        inner << content_tag(:span, gk_gui_stuff_icon(icon_after, icon_after, size: 12), class: 'gk-gui-stuff-pill-icon-after',
                                                                                       title: icon_after_label.presence, 'aria-hidden': 'true')
        inner << content_tag(:span, icon_after_label, class: 'gk-gui-stuff-sr-only') if icon_after_label.present?
      end
      # the dot first before the text (after the type icon and the check below, which are unshifted before it)
      inner.unshift(content_tag(:span, '', class: 'gk-gui-stuff-pill-dot', 'aria-hidden': 'true')) if dot
      if type_icon.present? && gk_gui_stuff_icon_drawable?(type_icon)
        t = ::I18n.t(:text_gk_gui_stuff_pill_type, name: type_label.to_s)
        inner.unshift(content_tag(:span, gk_gui_stuff_icon(type_icon, type_icon, size: 12), class: 'gk-gui-stuff-pill-type', title: t, 'aria-hidden': 'true'))
      end
      # the check of a pressed choice in its own mark, so that a script finds it by its anchor (GkGui.choose moves it)
      if choice && pressed && check
        inner.unshift(content_tag(:span, sprite_icon('checked', nil, size: 12), class: 'gk-gui-stuff-pill-check', 'aria-hidden': 'true',
                                                                              data: { gk_gui_pill_check: '1' }))
      end
      cls = ['gk-gui-stuff-pill', GkGuiStuff::Primitives.role_class(role), chosen || (choice && pressed) ? 'gk-gui-stuff-pill-chosen' : nil,
             buttons ? 'gk-gui-stuff-pill-buttons' : nil, choice ? 'gk-gui-stuff-pill-choice' : nil,
             open ? 'gk-gui-stuff-pill-open' : nil, dashed ? 'gk-gui-stuff-pill-dashed' : nil, suggested ? 'gk-gui-stuff-pill-suggested' : nil,
             quiet ? 'gk-gui-stuff-pill-quiet' : nil, struck ? 'gk-gui-stuff-pill-struck' : nil,
             dot ? 'gk-gui-stuff-pill-has-dot' : nil, current ? 'gk-gui-stuff-pill-current' : nil, expected ? 'gk-gui-stuff-pill-expected' : nil,
             muted ? 'gk-gui-stuff-pill-muted' : nil, as ? 'gk-gui-stuff-pill-as-button' : nil, html[:class]].compact.join(' ')

      parts = []
      parts << if button
                 b = button.to_h
                 aria = (b[:aria] || {}).merge(choice && !pressed.nil? ? { pressed: pressed ? 'true' : 'false' } : {})
                 content_tag(:button, safe_join(inner), type: b[:type] || 'button', name: b[:name], value: b[:value], title: b[:title],
                                                        data: b[:data], aria: aria, class: 'gk-gui-stuff-pill-button gk-gui-stuff-pill-main')
               elsif href
                 link_to(safe_join(inner), href, **href_html.except(:class), class: ['gk-gui-stuff-pill-main', href_html[:class]].compact.join(' '),
                                                                             title: href_title)
               else
                 safe_join(inner)
               end
      if note.present? && note_icon
        parts << gk_gui_stuff_pill_note(note, role, open: note_open, label: note_label, hint: note_hint, edit: note_edit)
      elsif note.present?
        parts << content_tag(:span, note, class: 'gk-gui-stuff-pill-note gk-gui-stuff-pill-part', title: note)
      end
      if part_href
        parts << link_to(gk_gui_stuff_icon('angle-right', 'angle-right', size: 12), part_href, class: 'gk-gui-stuff-pill-part gk-gui-stuff-pill-page',
                                                                                                title: part_title, 'aria-label': part_title)
      end
      if remove
        t = remove_title || ::I18n.t(:button_delete)
        how = remove_method.to_s == 'get' ? {} : { method: remove_method }
        parts << link_to(sprite_icon('close', nil, size: 12), remove, **how, class: 'gk-gui-stuff-pill-x gk-gui-stuff-pill-part', title: t, 'aria-label': t)
      end
      Array(part_buttons).each do |pb|
        parts << content_tag(:button, pb[:content], type: 'button', class: 'gk-gui-stuff-pill-button gk-gui-stuff-pill-part', title: pb[:title],
                                                    'aria-label': pb[:aria_label], data: pb[:data], aria: pb[:aria])
      end
      parts << content_tag(:span, ::I18n.t(:label_gk_gui_stuff_suggestion), class: 'gk-gui-stuff-pill-part') if suggested
      # the whole pill one button (a pill that opens a box: aria-expanded and aria-haspopup come with html:)
      return content_tag(:button, safe_join(parts), **html.except(:class, :type), type: 'button', class: cls, title: title) if as

      content_tag(:span, safe_join(parts), **html.except(:class), class: cls, title: title)
    end

    private

    # A pack's icon (a name with a slash) is drawn only by GK Icons; core's sprite has no such name and would leave an
    # empty slot
    def gk_gui_stuff_icon_drawable?(name)
      !name.to_s.include?('/') || (respond_to?(:gk_icon) && defined?(::GkIcons) && ::GkIcons.exists?(name))
    end

    # A mark's note in its pill: the note icon as the summary of a small popover (its tooltip the note, its name "Visa
    # lappen"), the box with the heading, the quiet words, the whole note and, when there is an address, "Ändra lappen"
    # as a fold of its own in the box holding the note's form (the field, Spara and Avbryt, and the place for the
    # server's error); open: the note written out after the icon in the same part, its name the hidden words and then
    # the note itself. The box's edge follows the pill's role
    def gk_gui_stuff_pill_note(note, role, open:, label:, hint:, edit:)
      icon = gk_gui_stuff_icon('issue-note', 'issue-note', size: 12)
      show = ::I18n.t(:button_gk_gui_stuff_pill_note_show)
      heading = label || ::I18n.t(:label_gk_gui_stuff_pill_note)
      shown = open ? safe_join([icon, content_tag(:span, "#{show}: ", class: 'gk-gui-stuff-sr-only'), content_tag(:span, note, class: 'gk-gui-stuff-pill-note-text')]) : icon
      summary = content_tag(:summary, shown, class: ['gk-gui-stuff-pill-part', 'gk-gui-stuff-pill-note-button', open ? 'gk-gui-stuff-pill-note-open' : nil].compact.join(' '),
                                             title: note, 'aria-label': (show unless open), data: GkGuiStuff::Primitives::POPOVER_ANCHOR)
      head = safe_join([content_tag(:b, heading), hint.present? ? content_tag(:span, hint, class: 'gk-gui-stuff-popover-hint') : nil].compact, ' ')
      box = [content_tag(:p, head, class: 'gk-gui-stuff-pill-note-head'), content_tag(:p, note, class: 'gk-gui-stuff-pill-note-full')]
      if edit
        # no form element: a pill may stand in another form (the rows of a list), where a form inside is dropped and
        # its field would go with the outer one; the field has no name, and the script sends it as note
        form = content_tag(:div, safe_join([text_field_tag(nil, note, id: nil, class: 'gk-gui-stuff-popover-field', 'aria-label': heading),
                                            content_tag(:p, '', class: 'gk-gui-stuff-pill-note-error', role: 'alert', hidden: true),
                                            content_tag(:p, safe_join([button_tag(::I18n.t(:button_save), type: 'button', class: 'gk-gui-stuff-pill-note-save'),
                                                                       button_tag(::I18n.t(:button_cancel), type: 'button', data: { gk_gui_popover_cancel: '1' })]),
                                                        class: 'gk-gui-stuff-popover-buttons')]),
                           class: 'gk-gui-stuff-pill-note-form', data: { gk_gui_note_url: edit })
        box << content_tag(:details, content_tag(:summary, ::I18n.t(:button_gk_gui_stuff_pill_note_edit)) + form, class: 'gk-gui-stuff-pill-note-change')
      end
      roled = GkGuiStuff::Primitives.role_class(role) ? 'gk-gui-stuff-popover-roled' : nil
      content_tag(:details, summary + content_tag(:div, safe_join(box), class: 'gk-gui-stuff-popover-box'),
                  class: ['gk-gui-stuff-popover', 'gk-gui-stuff-pill-note-popover', roled].compact.join(' '))
    end
  end
end
