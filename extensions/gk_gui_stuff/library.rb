# frozen_string_literal: true

require 'json'

module GkGuiStuff
  # The library: a collection of things to look through, as the icon library shows its icons. The search field, the
  # chips (the groups as choice pills with their counts as a part of the pill), the grid of items (a small picture and
  # the name), Rutnät or Lista with the view segment (Lista is core's table.list), and the panel of the item chosen: its
  # name and facts, the large picture on the chequered ground, its states as small tiles, its code in a field with the
  # copy button and what goes with it. A wide item opens its panel under the grid over the whole width; under 899 px
  # every panel opens under the row of the item chosen. Arrow keys move in the grid, Enter opens, Esc closes, and the
  # item open stands in the address (its anchor), so that a link leads to it.
  #
  # Two modes. Drawn on the server (items given): every item and every panel is in the page from the start, and the
  # script shows and hides them (the style guide). As data (source: or data:): the server draws only the shell, and the
  # script draws the items from the list, with the page numbers and Per sida of core, a sort, chip rows of the caller's
  # own (also chips that cannot be chosen, with the reason), the caller's own search (a ranked one), a selection over
  # every page, a click that does something (copies), and reload() that keeps the page and the item open
  # (GkGuiLibrary.bind in gk_gui_stuff_library.js). Bound by gk_gui_stuff_library.js, styled by
  # gk_gui_stuff_library.css; the stylesheet and the script come with the first library on a page. What is pure (the
  # items, the counts, the per page choices, the texts) is in GkGuiStuff::Library, so that it can be tried without a view.
  module Library
    ITEM_KEYS = %i[key anchor name group words wide facts legend tools summary thumb thumb_from body].freeze
    # the words the script needs, from the locale files (core's own where core has the word)
    TEXTS = { copied_short: :text_gk_gui_stuff_lib_copied_short, copied: :text_gk_gui_stuff_lib_copied, copy: :label_gk_gui_stuff_lib_copy,
              check: :label_gk_gui_stuff_lib_check, check_column: :label_gk_gui_stuff_lib_check_column, chip_off: :text_gk_gui_stuff_lib_chip_off,
              load_failed: :text_gk_gui_stuff_lib_load_failed, all: :label_gk_gui_stuff_lib_all, none: :text_gk_gui_stuff_lib_none,
              close: :gk_gui_stuff_close, previous: :label_previous, next: :label_next, per_page: :label_display_per_page,
              name: :field_name, group: :label_gk_gui_stuff_lib_group, code: :label_gk_gui_stuff_lib_code }.freeze

    module_function

    # Each item with every key, the anchor its own or "lib-<key>", the words to search its name and its words in
    # lower case; an item without a key or a name is refused
    def items(list)
      Array(list).map do |raw|
        i = raw.to_h.transform_keys(&:to_sym)
        raise ArgumentError, "unknown library item keys #{(i.keys - ITEM_KEYS).join(', ')}" unless (i.keys - ITEM_KEYS).empty?
        raise ArgumentError, 'a library item has a key and a name' if i[:key].to_s.empty? || i[:name].to_s.empty?

        ITEM_KEYS.to_h { |k| [k, i[k]] }.merge(key: i[:key].to_s, anchor: (i[:anchor].presence || "lib-#{i[:key]}").to_s, group: i[:group].to_s,
                                                wide: i[:wide] ? true : false, facts: Array(i[:facts]).compact_blank,
                                                words: [i[:name], i[:words]].compact.join(' ').downcase)
      end
    end

    # The groups in their order, each with the number of items in it; a group with none is left out. groups: [{ key:,
    # title: }], items as items gives them
    def groups(groups, items)
      counts = items.group_by { |i| i[:group] }.transform_values(&:size)
      Array(groups).filter_map do |g|
        g = g.to_h.transform_keys(&:to_sym)
        n = counts[g[:key].to_s].to_i
        n.positive? ? { key: g[:key].to_s, title: g[:title].to_s, count: n } : nil
      end
    end

    # The choices of Per sida: whole numbers above nought, each once, in order (core's per_page_options and a library's
    # own larger ones); nil or none: the list is not paged
    def per_page(list)
      Array(list).map(&:to_i).select(&:positive?).uniq.sort.presence
    end

    # The items of a list as data (data:), each a hash with a key and a name; the script draws them. Anything else is
    # refused, so that a page never sends a list the script cannot draw
    def data(list)
      Array(list).map do |raw|
        i = raw.to_h.transform_keys(&:to_s)
        raise ArgumentError, 'a library item as data has a key and a name' if i['key'].to_s.empty? || i['name'].to_s.empty?

        i
      end
    end

    def texts = TEXTS.transform_values { |k| ::I18n.t(k) }
  end

  module PrimitivesHelper
    # Bibliotek, drawn on the server: items is a list of { key:, name:, group:, words:, wide:, facts:, thumb:,
    # thumb_from:, body:, anchor: }
    #   key, name   the item's key (unique in the library) and the name under its picture
    #   group       the key of its group among groups:
    #   words       more words the search finds it by (its use, its states)
    #   wide        its panel opens under the grid over the whole width (what does not fit a narrow panel)
    #   facts       short texts, the short legend after the name in the panel's head (the plugin, the number of states)
    #   legend      the panel head's legend drawn by the caller (gk_gui_stuff_flag_legend), instead of the facts there
    #   summary     what the small picture shows, in words, after the name for a screen reader (the picture is hidden
    #               from it); not shown
    #   thumb       the small picture, drawn by the caller (an icon), or thumb_from: a selector of the caller's own
    #               (a class or a data attribute) for the part of the item's body the script copies as the small
    #               picture: the copy is still, scaled down, without ids and out of reach (inert, aria-hidden)
    #   body        the panel's content under its head (gk_gui_stuff_library_preview, _states, _code, _related, or the
    #               caller's own); every panel is drawn with the page and shown one at a time
    #   anchor      the item's id and its address (#anchor); "lib-<key>" without it
    # groups: [{ key:, title: }] in their order; title: the heading of the grid; search: the search field's words;
    # empty: what stands when nothing matches. Rutnät or Lista is the viewer's own, kept in the browser by the view
    # switch.
    #
    # Bibliotek as data: items nil, and source: (an address that answers the list as JSON: an array, or { items: [...] }),
    # data: (the list itself, written into the page) or neither (the caller's script loads it, opts.load), each item a
    # hash with key and name (and what the caller's script reads). The server draws the shell, and the script draws the
    # rest (GkGuiLibrary.bind(root, opts) for the caller's own parts; without a call it draws the names and the codes of
    # each item, item.code [{ label:, code: }]).
    #   per_page:   the choices of Per sida (core's per_page_options and more); without, the list is not paged
    #   sorts:      [[label, key], ...] the choices of Sortera; sort: the one chosen first; name_asc and name_desc are
    #               the script's own, any other key the caller's script sorts by
    #   columns:    [[label, key, heard], ...] the headings of Lista (core's table.list); name and group are the script's
    #               own; heard: the word a screen reader hears for a heading whose label stands empty (a picture)
    #   tools:      the caller's own controls in the head, before Sortera and Visa som (Ett klick kopierar)
    def gk_gui_stuff_library(key, items = nil, groups: [], title:, search: nil, empty: nil, html: {}, source: nil, data: nil, per_page: nil, sorts: nil,
                             sort: nil, columns: nil, tools: nil)
      as_data = items.nil?
      raise ArgumentError, 'a library is drawn either from items or as data (source: or data:), never both' if !as_data && !(source.nil? && data.nil?)

      gk_gui_stuff_library_assets
      search ||= ::I18n.t(:label_gk_gui_stuff_lib_search)
      keys_id = "gk-gui-stuff-lib-#{key}-keys"
      field = tag.input(type: 'search', class: 'gk-gui-stuff-lib-search', placeholder: search, 'aria-label': search, data: { gk_gui_lib_search: '1' })
      # Visa som: the switch with its words before it, as Sortera has its label
      view_label = ::I18n.t(:label_gk_gui_stuff_lib_view)
      view = content_tag(:span, safe_join([view_label, ' ', gk_gui_stuff_view_segment("lib.view.#{key}", [[::I18n.t(:label_gk_gui_stuff_lib_grid), 'grid'],
                                                                                                          [::I18n.t(:label_gk_gui_stuff_lib_list), 'list']], 'grid',
                                                                                     label: view_label)]),
                         class: 'gk-gui-stuff-lib-view-choice')
      grid_attrs = { class: 'gk-gui-stuff-lib-grid', role: 'list', 'aria-label': title, 'aria-describedby': keys_id, data: { gk_gui_lib_grid: '1' } }
      none = content_tag(:p, empty || ::I18n.t(:text_gk_gui_stuff_lib_none), class: 'nodata', role: 'status', hidden: true, data: { gk_gui_lib_none: '1' })
      keys = content_tag(:span, ::I18n.t(:text_gk_gui_stuff_lib_keys), id: keys_id, class: 'gk-gui-stuff-sr-only')
      table = content_tag(:div, '', class: 'autoscroll gk-gui-stuff-lib-table', hidden: true, data: { gk_gui_lib_table: '1' })
      said = content_tag(:span, '', class: 'gk-gui-stuff-sr-only', role: 'status', 'aria-live': 'polite', data: { gk_gui_lib_said: '1' })
      cols = Array(columns).presence || [[::I18n.t(:field_name), 'name'], [::I18n.t(:label_gk_gui_stuff_lib_group), 'group']]
      root = { gk_gui_lib: key, gk_gui_lib_mode: as_data ? 'data' : 'page', gk_gui_lib_columns: cols.map { |t, k, h| { key: k.to_s, label: t.to_s, heard: h.presence&.to_s }.compact }.to_json }
      if as_data
        pages = GkGuiStuff::Library.per_page(per_page)
        root.merge!(gk_gui_lib_source: source, gk_gui_lib_per_page: pages&.join(','), gk_gui_lib_texts: GkGuiStuff::Library.texts.to_json, gk_gui_lib_sort: sort)
        count = content_tag(:span, '', class: 'gk-gui-stuff-lib-count', data: { gk_gui_lib_count: '1' })
        chips = content_tag(:div, '', class: 'gk-gui-stuff-lib-rows', data: { gk_gui_lib_rows: '1' })
        grid = content_tag(:div, '', **grid_attrs, 'aria-busy': 'true')
        panel = content_tag(:div, '', class: 'box gk-gui-stuff-lib-panel', hidden: true, data: { gk_gui_lib_panel: '1' })
        list = data.nil? ? nil : content_tag(:script, json_escape(GkGuiStuff::Library.data(data).to_json).html_safe, type: 'application/json', data: { gk_gui_lib_items: '1' })
        pages_box = pages ? content_tag(:span, '', class: 'pagination', data: { gk_gui_lib_pages: '1' }) : nil
        tpls = gk_gui_stuff_library_templates
      else
        list_items = GkGuiStuff::Library.items(items)
        count = gk_gui_stuff_count(list_items.size, title: nil)
        all = gk_gui_stuff_library_chip(::I18n.t(:label_gk_gui_stuff_lib_all), '', list_items.size, true)
        pills = [all] + GkGuiStuff::Library.groups(groups, list_items).map { |g| gk_gui_stuff_library_chip(g[:title], g[:key], g[:count], false) }
        chips = content_tag(:div, safe_join(pills, ' '), class: 'gk-gui-stuff-lib-chips', role: 'group', 'aria-label': ::I18n.t(:label_gk_gui_stuff_lib_groups),
                                                         data: { gk_gui_lib_row: 'group' })
        grid = content_tag(:div, safe_join(list_items.map { |i| gk_gui_stuff_library_item(i) }), **grid_attrs)
        panel = content_tag(:div, safe_join(list_items.map { |i| gk_gui_stuff_library_body(i) }), class: 'box gk-gui-stuff-lib-panel', hidden: true,
                                                                                                data: { gk_gui_lib_panel: '1' })
      end
      sorter = gk_gui_stuff_library_sort(sorts, sort)
      head = content_tag(:div, safe_join([content_tag(:h3, safe_join([title, ' ', count]), class: 'gk-gui-stuff-lib-title'),
                                          content_tag(:span, safe_join([tools, sorter, view].compact, ' '), class: 'gk-gui-stuff-lib-view', data: { gk_gui_lib_view: '1' })]),
                         class: 'gk-gui-stuff-lib-head')
      browse = content_tag(:div, safe_join([head, grid, table, none, pages_box, keys].compact), class: 'box gk-gui-stuff-lib-browse')
      content_tag(:div, safe_join([content_tag(:div, field, class: 'gk-gui-stuff-lib-tools'), chips,
                                   content_tag(:div, safe_join([browse, panel]), class: 'gk-gui-stuff-lib-main', data: { gk_gui_lib_main: '1' }), said, list, tpls].compact),
                  **html.except(:class, :data), class: ['gk-gui-stuff-lib', html[:class]].compact.join(' '), data: (html[:data] || {}).merge(root))
    end

    # The library's stylesheet and script, once per page; also for a page that draws the library's parts (the chips,
    # the canvas, the code field and its copy button) without a library
    def gk_gui_stuff_library_assets
      return if @gk_gui_stuff_library_assets

      @gk_gui_stuff_library_assets = true
      gk_gui_stuff_view_segment_assets
      content_for(:header_tags) do
        safe_join([stylesheet_link_tag('gk_gui_stuff_library', plugin: 'gk_gui_stuff'), javascript_include_tag('gk_gui_stuff_library', plugin: 'gk_gui_stuff')])
      end
    end

    # The large picture on the chequered ground, at least 160 px high and as high as it needs; from: a selector of
    # the caller's own in the item's body, whose first match the script copies here still and out of reach (as the
    # small picture), and here with the flags the real part has laid on the copy, which the small picture is without;
    # else the block's content
    def gk_gui_stuff_library_preview(from: nil, &block)
      content_tag(:div, block ? capture(&block) : '', class: 'gk-gui-stuff-lib-preview gk-gui-stuff-lib-canvas', data: from ? { gk_gui_lib_from: from } : {})
    end

    # The states as small tiles in a row that wraps; the block holds gk_gui_stuff_library_state or the caller's own tiles
    def gk_gui_stuff_library_states(&block)
      content_tag(:div, capture(&block), class: 'gk-gui-stuff-lib-states')
    end

    # One state: its example on the chequered ground and its name under it
    def gk_gui_stuff_library_state(label, &block)
      content_tag(:figure, content_tag(:div, capture(&block), class: 'gk-gui-stuff-lib-canvas') + content_tag(:figcaption, label), class: 'gk-gui-stuff-lib-state')
    end

    # A code to read and copy: its label and, for a code of one line, a field that selects all of it on focus with the
    # copy button beside it; a code longer than one line stands in a code block with the button. bare: no visible label
    # (a fold whose summary already says what it is); the field then carries the label for a screen reader
    def gk_gui_stuff_library_code(label, code, bare: false)
      copy = gk_gui_stuff_library_copy_button(label)
      if code.to_s.include?("\n")
        head = bare ? nil : content_tag(:span, label, class: 'gk-gui-stuff-lib-code-label')
        body = content_tag(:div, safe_join([content_tag(:pre, content_tag(:code, code), class: 'gk-gui-stuff-lib-code-block'), copy]), class: 'gk-gui-stuff-lib-code-body')
      else
        @gk_gui_stuff_lib_code_n = (@gk_gui_stuff_lib_code_n || 0) + 1
        id = "gk-gui-stuff-lib-code-#{@gk_gui_stuff_lib_code_n}"
        head = bare ? nil : content_tag(:label, label, for: id, class: 'gk-gui-stuff-lib-code-label')
        input = tag.input(type: 'text', id: id, value: code.to_s, readonly: true, spellcheck: 'false', class: 'gk-gui-stuff-lib-code-field', 'aria-label': (label if bare),
                          data: { gk_gui_lib_code_field: '1' })
        body = content_tag(:div, safe_join([input, copy]), class: 'gk-gui-stuff-lib-code-body')
      end
      content_tag(:div, safe_join([head, body].compact), class: 'gk-gui-stuff-lib-code')
    end

    # The copy button: the icon button "Kopiera: <what>", which copies the code beside it (the field or the code block
    # in its parent); "Kopierat" stands by the button for a moment, and a screen reader hears "Kopierat: <what>"
    def gk_gui_stuff_library_copy_button(what, html: {})
      gk_gui_stuff_icon_button(:copy, ::I18n.t(:label_gk_gui_stuff_lib_copy, what: what),
                               html: html.merge(class: ['gk-gui-stuff-lib-copy', html[:class]].compact.join(' '),
                                                data: (html[:data] || {}).merge(gk_gui_lib_copy: ::I18n.t(:text_gk_gui_stuff_lib_copied, what: what),
                                                                                gk_gui_lib_copied: ::I18n.t(:text_gk_gui_stuff_lib_copied_short))))
    end

    # Hör ihop med: links to the items that go with this one ([[text, '#anchor'], ...]); a link to an item of the same
    # library opens its panel. none: what stands when there is nothing
    def gk_gui_stuff_library_related(links, title: ::I18n.t(:label_gk_gui_stuff_lib_related), none: nil)
      return nil if links.blank? && none.blank?

      body = if links.present?
               content_tag(:ul, safe_join(links.map { |text, href| content_tag(:li, link_to(text, href)) }), class: 'gk-gui-stuff-lib-related-list')
             else
               content_tag(:p, none, class: 'gk-gui-stuff-lib-related-none')
             end
      content_tag(:div, content_tag(:span, title, class: 'gk-gui-stuff-lib-code-label') + body, class: 'gk-gui-stuff-lib-related')
    end

    private

    # A chip: GK GUI Stuff's choice pill, filled in its role when chosen and without the check, its count a part of the
    # pill with a solid divider (the library's stylesheet)
    def gk_gui_stuff_library_chip(text, value, count, pressed)
      gk_gui_stuff_pill(text, count: count, button: { type: 'button', data: { gk_gui_lib_chip: value } }, choice: true, pressed: pressed, check: false,
                              html: { class: 'gk-gui-stuff-lib-chip' })
    end

    # Sortera: core's select with its label, when there is more than one way
    def gk_gui_stuff_library_sort(sorts, chosen)
      list = Array(sorts)
      return nil if list.size < 2

      content_tag(:label, safe_join([::I18n.t(:label_sort), ' ',
                                     select_tag(nil, options_for_select(list.map { |t, k| [t, k.to_s] }, chosen.to_s), id: nil, data: { gk_gui_lib_sort: '1' })]),
                  class: 'gk-gui-stuff-lib-sort')
    end

    # The parts the script copies for the items it draws: the cross of the panel's head and the copy button, each as
    # the server draws it (the icon buttons, their icons from GK Icons or core's sprite)
    def gk_gui_stuff_library_templates
      close = gk_gui_stuff_icon_button(:close, ::I18n.t(:gk_gui_stuff_close), html: { class: 'gk-gui-stuff-lib-close', data: { gk_gui_lib_close: '1' } })
      copy = gk_gui_stuff_icon_button(:copy, '', html: { class: 'gk-gui-stuff-lib-copy' })
      safe_join([content_tag(:template, close, data: { gk_gui_lib_tpl: 'close' }), content_tag(:template, copy, data: { gk_gui_lib_tpl: 'copy' })])
    end

    # One item in the grid: the small picture (out of reach) and the name, a button that covers the whole item; the
    # summary in the button after the name, for a screen reader only
    def gk_gui_stuff_library_item(item)
      thumb = content_tag(:div, content_tag(:div, item[:thumb] || '', class: 'gk-gui-stuff-lib-thumb-inner'), class: 'gk-gui-stuff-lib-thumb', inert: true, 'aria-hidden': 'true',
                                                                                                             data: item[:thumb_from] ? { gk_gui_lib_thumb_from: item[:thumb_from] } : {})
      said = item[:summary].present? ? content_tag(:span, ", #{item[:summary]}", class: 'gk-gui-stuff-sr-only') : nil
      name = content_tag(:button, safe_join([item[:name], said].compact), type: 'button', class: 'gk-gui-stuff-lib-item-name', 'aria-expanded': 'false', 'aria-controls': "#{item[:anchor]}-panel",
                                               data: { gk_gui_lib_open: item[:key] })
      facts = item[:facts].any? ? content_tag(:span, safe_join(item[:facts], ' · '), class: 'gk-gui-stuff-lib-item-facts') : nil
      content_tag(:div, safe_join([thumb, name, facts].compact), id: item[:anchor], role: 'listitem',
                                                                 class: ['gk-gui-stuff-lib-item', item[:wide] ? 'gk-gui-stuff-lib-item-wide' : nil].compact.join(' '),
                                                                 data: { gk_gui_lib_item: item[:key], gk_gui_lib_group: item[:group], gk_gui_lib_words: item[:words],
                                                                         gk_gui_lib_wide: item[:wide] ? '1' : nil, gk_gui_lib_name: item[:name],
                                                                         gk_gui_lib_facts: item[:facts].any? ? item[:facts].join(' · ') : nil })
    end

    # One item's panel: the head with the name, its facts as a short legend after the name (own elements with their
    # words, on the next row where the row runs out), the caller's choices for the item (tools:, in the head's flow, so
    # that their place is kept) and the cross, and the caller's body
    def gk_gui_stuff_library_body(item)
      close = gk_gui_stuff_icon_button(:close, ::I18n.t(:gk_gui_stuff_close), html: { class: 'gk-gui-stuff-lib-close', data: { gk_gui_lib_close: '1' } })
      name = content_tag(:span, item[:name], id: "#{item[:anchor]}-name")
      legend = item[:legend] || (item[:facts].any? ? gk_gui_stuff_flag_legend(item[:facts].map { |f| { text: f } }, area: "##{item[:anchor]}-panel") : nil)
      title = content_tag(:div, safe_join([content_tag(:h3, name, class: 'gk-gui-stuff-lib-name', tabindex: '-1'), legend].compact), class: 'gk-gui-stuff-lib-panel-title')
      head = content_tag(:div, safe_join([title, item[:tools], close].compact), class: 'gk-gui-stuff-lib-panel-head')
      content_tag(:div, safe_join([head, item[:body]].compact), id: "#{item[:anchor]}-panel", class: 'gk-gui-stuff-lib-body', role: 'region', 'aria-label': item[:name],
                                                                hidden: true, data: { gk_gui_lib_body: item[:key] })
    end
  end
end
