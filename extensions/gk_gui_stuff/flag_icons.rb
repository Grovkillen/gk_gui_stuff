# frozen_string_literal: true

module GkGuiStuff
  # The flag's pennant swapped for icons out of GK Icons (the setting flag_icons on Administration, Appearance, off from
  # the start): one common icon for all sorts and one of its own per sort. The pennant stays what gk_gui_stuff_flag.css
  # draws; an icon only fills in the stylesheet's four custom properties on the flag, per sort by the steady data
  # attribute every flag carries (data-gk-gui-flag, data-gk-gui-flag-inline), so the helper, the script's flags and the
  # flags other plugins draw all follow without being told. The icon is a mask, so its colour is the flag's role in
  # light, dark and forced colours alike. An icon that cannot be drawn is as no icon: the next one in line, and last the
  # pennant, never an empty box (a mask whose picture does not load hides the element, so nothing is asked of the
  # browser that the server has not found). Plain Ruby without Rails: the plugin's tests stand in for GkIcons.
  module FlagIcons
    SETTING = 'flag_icons'
    VALUE = 'icons'
    COMMON = 'common'
    SORTS = %w[fixed new changed gone].freeze
    # The value's parts, as the setting's table keeps them and in the order of the form
    PARTS = ([COMMON] + SORTS).freeze
    # The icon's height is the pennant's; the width follows the icon's own proportion, within what an icon in text gets
    HEIGHT = 10
    RATIO = (0.25..4.0)
    # What may stand in the url() of a rule that goes into the page's head as it is; GkIcons.url encodes names, and an
    # address with anything else is as no icon
    SAFE_URL = %r{\A[A-Za-z0-9/_.~%?=+:-]+\z}
    # The stylesheet's properties, all taken back to the pennant by initial (its var() then falls back)
    PROPERTIES = %w[--gk-gui-flag-mask --gk-gui-flag-clip --gk-gui-flag-w --gk-gui-flag-fill].freeze
    # A sort that has an icon of its own has no stripes: they are how the common icon tells the temporary sorts apart.
    # As an image, so that forced colours leave it alone; currentColor is the system's text colour there
    SOLID = 'linear-gradient(currentColor, currentColor)'
    # The icons of the style guide's example, in GK Icons' own sprite in every series
    EXAMPLE = { COMMON => 'flag', 'new' => 'swatch' }.freeze

    module_function

    # Whether GK Icons offers the icon now. A pack's icon is drawn in text even when disabled or gone from disk, so
    # that no written text breaks; a flag has a pennant to fall back on, so only an active one counts here
    def offered?(name)
      return false unless ::GkIcons.exists?(name)
      return true unless name.include?('/') && defined?(::GkIcons::Store) && ::GkIcons::Store.ready?

      ::GkIcons::Store.offered?(name) ? true : false
    end

    # { url:, width: } of an icon that can be drawn, else nil: no GK Icons, no such icon, disabled, gone from disk
    def drawn(name)
      n = name.to_s.strip
      return nil if n.empty? || !defined?(::GkIcons) || !offered?(n)

      url = ::GkIcons.url(n).to_s
      return nil unless SAFE_URL.match?(url)

      ratio = ::GkIcons.respond_to?(:text_ratio) ? ::GkIcons.text_ratio(n).to_f : 1.0
      ratio = 1.0 unless ratio.positive?
      { url: url, width: (HEIGHT * ratio.clamp(RATIO.min, RATIO.max)).round(2) }
    rescue StandardError
      nil
    end

    # What a sort draws, from the value's parts: { url:, width:, own: } or nil for the pennant. A sort without an icon of
    # its own, or whose own cannot be drawn, takes the common one
    def icon_of(sort, chosen)
      parts = chosen.is_a?(Hash) ? chosen : {}
      own = drawn(parts[sort.to_s])
      return own.merge(own: true) if own

      common = drawn(parts[COMMON])
      common&.merge(own: false)
    end

    # The custom properties of a sort that has an icon, as declarations
    def declarations(icon)
      list = ["--gk-gui-flag-mask: url(\"#{icon[:url]}\")", '--gk-gui-flag-clip: none', "--gk-gui-flag-w: #{icon[:width]}px"]
      list << "--gk-gui-flag-fill: #{SOLID}" if icon[:own]
      list.join('; ')
    end

    # The rules for the page's head, '' while every sort has the pennant
    def css(chosen)
      SORTS.filter_map do |sort|
        icon = icon_of(sort, chosen)
        icon && %([data-gk-gui-flag="#{sort}"], [data-gk-gui-flag-inline="#{sort}"] { #{declarations(icon)}; })
      end.join(' ')
    end

    # A flag's own style that draws the sort as chosen, whatever the instance has: for a preview and an example. No
    # chosen, or nothing to draw: the pennant
    def style(sort, chosen = nil)
      icon = icon_of(sort, chosen)
      return PROPERTIES.map { |p| "#{p}: initial" }.join('; ') unless icon

      fill = icon[:own] ? '' : '; --gk-gui-flag-fill: initial'
      "#{declarations(icon)}#{fill}"
    end

    # The instance's parts while the setting is on, else nil
    def chosen_now
      return nil unless Appearance.on?(SETTING)

      v = Appearance.register.value(Appearance.key(SETTING), VALUE)
      v.is_a?(Hash) ? v : nil
    end

    # The rules for this instance now; a fault here must never cost a page, and the pennant is always there
    def head_css
      chosen = chosen_now
      chosen ? css(chosen) : ''
    rescue StandardError => e
      ::Rails.logger.warn("[gk_gui_stuff] flag icons not drawn: #{e.class}") if defined?(::Rails) && ::Rails.respond_to?(:logger) && ::Rails.logger
      ''
    end
  end

  module PrimitivesHelper
    # Every sort of the flag in both forms in a table of core's: on a target, as an own element and in its short form,
    # for a preview under Visa and the style guide's example. chosen: the parts to draw (nil the pennant), each flag
    # with its own style so that what the instance has does not count. preview: the mark that lets the form's pickers
    # repaint them (gk_gui_stuff_form_page.js). Every word is made up, and nothing is kept as seen
    def gk_gui_stuff_flag_sorts_table(chosen = nil, preview: false)
      t = ->(k) { ::I18n.t(:"label_gk_gui_stuff_flag_icon_#{k}") }
      ex = ->(k) { ::I18n.t(:"label_gk_gui_stuff_sg_example_flag_#{k}") }
      head = [t.call('sort'), t.call('on_target'), t.call('own'), t.call('short')].map { |w| content_tag(:th, w) }
      rows = GkGuiStuff::FlagIcons::SORTS.each_with_index.map do |sort, i|
        kind = sort == 'fixed' ? nil : sort
        word = kind ? nil : ex.call(:active)
        html = { style: GkGuiStuff::FlagIcons.style(sort, chosen), data: preview ? { gk_gui_flag_preview: sort } : {} }
        on_target = gk_gui_stuff_flagged(ex.call(:pump), [{ text: word, kind: kind, html: html }])
        own = gk_gui_stuff_flag(word, inline: true, kind: kind, html: html)
        short = gk_gui_stuff_flag(word, inline: true, kind: kind, short: true, html: html)
        cells = [t.call(sort), on_target, own, short].map { |c| content_tag(:td, c) }
        content_tag(:tr, safe_join(cells), class: i.even? ? 'odd' : 'even')
      end
      content_tag(:table, content_tag(:thead, content_tag(:tr, safe_join(head))) + content_tag(:tbody, safe_join(rows)), class: 'list')
    end
  end
end
