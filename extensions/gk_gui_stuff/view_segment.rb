# frozen_string_literal: true

module GkGuiStuff
  # The view segment, a primitive of its own file (PrimitivesHelper opened again, as the pill's): a segment that only
  # changes what is shown (Rutnät or Lista, Före or Efter, Sida or Bibliotek). It never saves and has no rail; the
  # browser remembers the choice. Its look tells it from the segment that saves at once: a dashed edge, and the chosen
  # part in a light tone of the choice role instead of filled. Bound by gk_gui_stuff_view_segment.js, styled by
  # gk_gui_stuff_view_segment.css; both come with the first view segment on a page.
  module PrimitivesHelper
    # choices: [[text, value], ...], two to five; selected: the value shown first (the one the browser remembers takes
    # its place when the page has loaded); label: the group's name for a screen reader. name: the key the browser keeps
    # the choice under (per person, in this browser only); remember: false where the page itself holds the choice (the
    # address, the page's light or dark), so that nothing is kept. The script presses the part clicked and tells the page
    # by the event gk-gui-view-segment (detail: name, value), which the page's own script listens for
    def gk_gui_stuff_view_segment(name, choices, selected, label: nil, remember: true, html: {})
      raise ArgumentError, 'a view segment has two to five choices' unless (2..5).cover?(Array(choices).size)

      gk_gui_stuff_view_segment_assets
      btns = choices.map do |text, value|
        content_tag(:button, text, type: 'button', value: value, 'aria-pressed': (value.to_s == selected.to_s).to_s, data: { gk_gui_view_text: text })
      end
      content_tag(:span, safe_join(btns), **html.except(:class, :data), class: ['gk-gui-stuff-view-segment', html[:class]].compact.join(' '), role: 'group',
                                                                        'aria-label': label,
                                                                        data: (html[:data] || {}).merge(gk_gui_view_segment: name, gk_gui_view_remember: remember ? '1' : nil))
    end

    # The view segment's stylesheet and script, once per page
    def gk_gui_stuff_view_segment_assets
      return if @gk_gui_stuff_view_segment_assets

      @gk_gui_stuff_view_segment_assets = true
      content_for(:header_tags) do
        safe_join([stylesheet_link_tag('gk_gui_stuff_view_segment', plugin: 'gk_gui_stuff'), javascript_include_tag('gk_gui_stuff_view_segment', plugin: 'gk_gui_stuff')])
      end
    end
  end
end
