# frozen_string_literal: true

module GkGuiStuff
  # What the table's helpers check their arguments against: the places of a column in a stacked row, a row's states,
  # a cell's tones and the form of a column's width.
  module Table
    # where a column's cell stands in the stacked row of a narrow screen: first on the first line, growing over the
    # rest of it, at its end, on a line of its own, and after that in the columns' order (the default). Columns that
    # share a place stand in the columns' order: two with :first are the first line's first two (a time, then a pill)
    SLOTS = %w[first grow end full after].freeze
    STATES = %w[voided error].freeze
    TONES = %w[muted soft].freeze
    COLUMN_KEYS = %i[key label width slot tone nowrap html].freeze
    WIDTH = /\A\d+(?:\.\d+)?(?:em|rem|ch|px|%)\z/

    module_function

    # the columns as the helpers keep them: { key:, label:, width:, slot:, tone:, nowrap:, html: }, the key a string
    def columns(list)
      cols = Array(list).map do |c|
        h = c.to_h.transform_keys(&:to_sym)
        raise ArgumentError, "unknown column option #{(h.keys - COLUMN_KEYS).first.inspect}" if (h.keys - COLUMN_KEYS).any?
        raise ArgumentError, 'a column needs key:' if h[:key].to_s.empty?
        raise ArgumentError, "unknown column width #{h[:width].inspect}" unless h[:width].nil? || WIDTH.match?(h[:width].to_s)

        { key: h[:key].to_s, label: h[:label], width: h[:width]&.to_s, slot: slot(h[:slot]), tone: tone(h[:tone]),
          nowrap: nowrap(h[:nowrap]), html: h[:html] || {} }
      end
      raise ArgumentError, 'a table needs columns' if cols.empty?
      raise ArgumentError, "the column keys are not unique: #{cols.map { |c| c[:key] }.join(', ')}" if cols.map { |c| c[:key] }.uniq.size != cols.size

      cols
    end

    def slot(value)
      s = (value || :after).to_s
      raise ArgumentError, "unknown column slot #{value.inspect}" unless SLOTS.include?(s)

      s
    end

    def tone(value)
      return nil if value.nil?
      raise ArgumentError, "unknown cell tone #{value.inspect}" unless TONES.include?(value.to_s)

      value.to_s
    end

    # whether a cell keeps its content on one line: true or false, nothing else
    def nowrap(value)
      return false if value.nil?
      raise ArgumentError, "unknown nowrap #{value.inspect}" unless [true, false].include?(value)

      value
    end

    def state(value)
      return nil if value.nil?
      raise ArgumentError, "unknown row state #{value.inspect}" unless STATES.include?(value.to_s)

      value.to_s
    end
  end

  # The table, the summary row and the button row, helpers of PrimitivesHelper like the others (the module is opened
  # again here, so they are included wherever the primitives are). Drawn by the server; a group folds by the group's
  # own button (GkGui.group), with no script of its own. Styled by gk_gui_stuff_table.css.
  module PrimitivesHelper
    # Tabellen: one table on top of core's table.list. Its columns are said once, with name, width and the place in
    # the stacked row; text stands from the start edge and in the middle of the row. Below 899 px every row is stacked
    # as a small card and the heading row is not shown.
    #   columns: [{ key:, label:, width: nil, slot: :after, tone: nil, nowrap: false, html: {} }]
    #            width: the column's width ('9em', '30%'); with a width on any column the table has a fixed layout
    #            slot:  the cell's place in the stacked row, :first, :grow, :end, :full or :after; columns with the
    #                   same place stand in the columns' order
    #            tone:  the tone of every cell of the column: :muted (italic, soft text) or :soft (soft text, upright)
    #            nowrap: true, the content of every cell of the column is never broken over lines (a pill, a time)
    #            html:  attributes of every cell of the column (class: 'buttons' for core's column of actions)
    #   html:    more attributes of the table (class: added after the primitive's own, data:)
    # The block draws the rows (gk_gui_stuff_table_row) or the groups (gk_gui_stuff_table_group), never both.
    # An action in the column with slot :end is core's icon link with its word (the word is hidden in the stacked
    # row, so the caller gives the link its word as title: too).
    def gk_gui_stuff_table(columns:, html: {}, &block)
      cols = GkGuiStuff::Table.columns(columns)
      @gk_gui_stuff_table_n = (@gk_gui_stuff_table_n || 0) + 1
      outer = @gk_gui_stuff_table
      table = @gk_gui_stuff_table = { columns: cols, n: @gk_gui_stuff_table_n, groups: 0, rows: 0, group: nil, row: nil }
      body = begin
        capture(&block)
      ensure
        @gk_gui_stuff_table = outer
      end
      body = content_tag(:tbody, body) if table[:groups].zero?
      colgroup = content_tag(:colgroup, safe_join(cols.map { |c| tag.col(style: c[:width] ? "inline-size: #{c[:width]}" : nil) }))
      head = content_tag(:thead, content_tag(:tr, safe_join(cols.map { |c| content_tag(:th, c[:label], scope: 'col') })))
      cls = ['list', 'gk-gui-stuff-table', cols.any? { |c| c[:width] } ? 'gk-gui-stuff-table-fixed' : nil, html[:class]].compact.join(' ')
      content_tag(:table, safe_join([colgroup, head, body]), **html.except(:class), class: cls)
    end

    # A group of the table: a row with the group's fold button and a count, and the group's rows, which fold with it.
    #   count:     nil, the number of the group's rows that are not voided (counted here); false, no count; a number
    #              or a text, that
    #   collapsed: true, folded from the start
    #   html:      more attributes of the group's own row group (class:, data:)
    def gk_gui_stuff_table_group(title, count: nil, collapsed: false, html: {}, &block)
      table = @gk_gui_stuff_table
      raise ArgumentError, 'a group stands in a table (gk_gui_stuff_table)' unless table
      raise ArgumentError, 'a group never stands in a group or in a row' if table[:group] || table[:row]
      raise ArgumentError, 'rows directly in the table and groups are never mixed' if table[:rows].positive?

      table[:groups] += 1
      id = "gk-gui-stuff-table-#{table[:n]}-#{table[:groups]}"
      group = table[:group] = { rows: 0, voided: 0 }
      rows = begin
        capture(&block)
      ensure
        table[:group] = nil
      end
      shown = if count.nil? then group[:rows] - group[:voided]
              elsif count == false then nil
              else count
              end
      toggle = gk_gui_stuff_group_toggle(title, open: !collapsed, controls: id, count: shown)
      head = content_tag(:tbody, content_tag(:tr, content_tag(:th, toggle, colspan: table[:columns].size, scope: 'colgroup')),
                         **html.except(:class), class: ['gk-gui-stuff-table-group', html[:class]].compact.join(' '))
      head + content_tag(:tbody, rows, id: id, class: 'gk-gui-stuff-table-group-rows', hidden: collapsed ? true : nil)
    end

    # A row of the table. state: nil, :voided (the muted tone, the cell of the column that grows struck through) or
    # :error (the alarm's soft tone as its ground). The block draws the cells, one per column in the columns' order;
    # a cell that is missing or out of its order is refused.
    def gk_gui_stuff_table_row(state: nil, html: {}, &block)
      table = @gk_gui_stuff_table
      raise ArgumentError, 'a row stands in a table (gk_gui_stuff_table)' unless table
      raise ArgumentError, 'a row never stands in a row' if table[:row]

      s = GkGuiStuff::Table.state(state)
      if table[:group]
        table[:group][:rows] += 1
        table[:group][:voided] += 1 if s == 'voided'
      else
        raise ArgumentError, 'rows directly in the table and groups are never mixed' if table[:groups].positive?

        table[:rows] += 1
      end
      drawn = table[:row] = []
      cells = begin
        capture(&block)
      ensure
        table[:row] = nil
      end
      wanted = table[:columns].map { |c| c[:key] }
      raise ArgumentError, "a row has one cell per column in the columns' order: #{wanted.join(', ')} (got #{drawn.join(', ')})" unless drawn == wanted

      cls = [s ? "gk-gui-stuff-table-row-#{s}" : nil, html[:class]].compact.join(' ')
      content_tag(:tr, cells, **html.except(:class), class: cls.presence)
    end

    # A cell of a row, named by its column's key. An empty cell is gk_gui_stuff_table_cell(:key), written with nothing
    # in it.
    #   content / block  what stands in the cell
    #   tone:     nil, the column's; false, none; :muted or :soft
    #   nowrap:   nil, the column's; true, the content is never broken over lines; false, it breaks as text does
    #   message:  a text or a list of texts under the content, in the alarm's colour (what is wrong in a row with
    #             state: :error)
    #   html:     more attributes of the cell (class: added after the column's)
    def gk_gui_stuff_table_cell(key, content = nil, tone: nil, nowrap: nil, message: nil, html: {}, &block)
      table = @gk_gui_stuff_table
      raise ArgumentError, 'a cell stands in a row (gk_gui_stuff_table_row)' unless table && table[:row]

      col = table[:columns].find { |c| c[:key] == key.to_s }
      raise ArgumentError, "unknown column #{key.inspect}" unless col

      table[:row] << col[:key]
      shade = if tone.nil? then col[:tone]
              elsif tone == false then nil
              else GkGuiStuff::Table.tone(tone)
              end
      whole = nowrap.nil? ? col[:nowrap] : GkGuiStuff::Table.nowrap(nowrap)
      inner = block ? capture(&block) : content
      parts = inner.present? ? [inner] : []
      parts.concat(Array(message).select(&:present?).map { |m| content_tag(:span, m, class: 'gk-gui-stuff-table-message') })
      cls = ["gk-gui-stuff-table-#{col[:slot]}", shade ? "gk-gui-stuff-table-#{shade}" : nil, whole ? 'gk-gui-stuff-table-nowrap' : nil,
             col[:html][:class], html[:class]].compact.join(' ')
      content_tag(:td, safe_join(parts), **col[:html].except(:class), **html.except(:class), class: cls)
    end

    # Sammanfattningsraden: what there is before it is opened. Three parts in a fixed order: the count in bold, the
    # parts with a dot between them, and the flags last.
    #   count:  the count with its word ("6 links"); href: makes it a link
    #   parts:  how the count is divided ("3 issues", "1 document")
    #   flags:  what needs attention, each a flag with its thing as drawn by the caller
    #   tag:    :p (default) or :div (for a row that holds block content, such as a rail)
    def gk_gui_stuff_summary(count, parts = [], flags: [], href: nil, tag: :p, html: {})
      raise ArgumentError, "unknown summary tag #{tag.inspect}" unless %w[p div].include?(tag.to_s)

      first = if href.present? then link_to(count, href, class: 'gk-gui-stuff-summary-count')
              else content_tag(:strong, count, class: 'gk-gui-stuff-summary-count')
              end
      items = [first]
      items.concat(Array(parts).select(&:present?).map { |p| content_tag(:span, p, class: 'gk-gui-stuff-summary-part') })
      items.concat(Array(flags).select(&:present?).map { |f| content_tag(:span, f, class: 'gk-gui-stuff-summary-flag') })
      content_tag(tag.to_sym, safe_join(items), **html.except(:class), class: ['gk-gui-stuff-summary', html[:class]].compact.join(' '))
    end

    # Knappraden: a row of buttons standing free on a page, in line and equally high also when one of them is the
    # button of a popover. Inside a popover the row is gk_gui_stuff_popover_buttons.
    def gk_gui_stuff_button_row(html: {}, &block)
      content_tag(:div, capture(&block), **html.except(:class), class: ['gk-gui-stuff-button-row', html[:class]].compact.join(' '))
    end
  end
end
