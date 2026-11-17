# frozen_string_literal: true

module GkGuiStuff
  # The disclosure (fällningen), a helper of PrimitivesHelper like the others (the module is opened again here, so it
  # is included wherever the primitives are). A details the server draws, so that it folds without any script and
  # nothing is bound on the page: its summary is the button, the words turn with the state, a count may follow them.
  # It remembers nothing (the group has remember:, the disclosure has not). Styled by gk_gui_stuff_disclosure.css,
  # drawn from a script by GkGui.disclosure.make (gk_gui_stuff_disclosure.js). Not the fold module's GkGui.fold
  # (gk_gui_stuff_fold.js), which folds long blocks on the issue page and owns the class gk-gui-stuff-fold.
  module PrimitivesHelper
    # gk_gui_stuff_disclosure(texts:, open: false, count: nil, id: nil, html: {}) { content } -> SafeBuffer
    #   texts: [closed, open], e.g. [l(:label_gk_gui_stuff_changelog_show), l(:label_gk_gui_stuff_changelog_hide)];
    #          one text (a String, or one or two equal ones) is used for both and drawn once
    #   count: drawn with gk_gui_stuff_count after the text ("Visa alla" (12)); nil draws none
    #   open:  drawn open
    #   id:    the body's id (default: a unique one on the page)
    #   html:  more attributes on the details (class: added, data: { … } merged)
    def gk_gui_stuff_disclosure(texts:, open: false, count: nil, id: nil, html: {}, &block)
      closed, opened = GkGuiStuff::PrimitivesHelper.disclosure_texts(texts)
      @gk_gui_stuff_disclosure_n = (@gk_gui_stuff_disclosure_n || 0) + 1
      body_id = id.presence || "gk-gui-stuff-disclosure-#{@gk_gui_stuff_disclosure_n}"
      words = if closed == opened
                [content_tag(:span, closed, class: 'gk-gui-stuff-disclosure-text')]
              else
                [content_tag(:span, closed, class: 'gk-gui-stuff-disclosure-closed'), content_tag(:span, opened, class: 'gk-gui-stuff-disclosure-open')]
              end
      words << gk_gui_stuff_count(count) unless count.nil?
      summary = content_tag(:summary, safe_join(words), class: 'gk-gui-stuff-disclosure-toggle')
      body = content_tag(:div, block ? capture(&block) : '', class: 'gk-gui-stuff-disclosure-body', id: body_id)
      data = (html[:data] || {}).merge(gk_gui_stuff_disclosure: '')
      content_tag(:details, summary + body, **html.except(:class, :data), class: ['gk-gui-stuff-disclosure', html[:class]].compact.join(' '),
                                            data: data, open: open ? true : nil)
    end

    # The closed and the open words out of texts: (a String, or [closed, open]); both the same when one is given
    def self.disclosure_texts(texts)
      list = Array(texts).map(&:to_s)
      raise ArgumentError, 'a disclosure needs texts: [closed, open] or one text' if list.empty? || list.size > 2 || list.first.strip.empty?

      [list.first, list[1].presence || list.first]
    end
  end
end
