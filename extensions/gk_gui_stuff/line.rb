# frozen_string_literal: true

module GkGuiStuff
  # Linjen: a flow drawn from data, in three forms (utförlig, kompakt, redigerbar). The primitive
  # knows nothing of statuses: the caller builds the hash below, and every text in it is already translated.
  # Drawn by gk_gui_stuff_line, bound by gk_gui_stuff_line.js (GkGui.line), styled by gk_gui_stuff_line.css.
  #   key:          unique on the page, the base of the ids (the panel's template, the layer's key)
  #   title:        the line's name for the screen reader (role group) and the panel's heading
  #   max:          each half's scale is 1..max
  #   halves:       exactly two, the work and then the closing, the stroke between them:
  #                 [{ key:, label:, weight:, bands: [{ key: (a band), label:, cell_label:, upto: }], marks: [{ key:, at:, label: }] }]
  #                 weight: the half's share of the width; a band's last upto is max; cell_label: the band's word
  #                 in a table cell the editable form fills (data-gk-gui-line-band-of), the label when none
  #   lanes:        [{ key:, label: }], the first the main lane
  #   steps:        [{ id:, label:, half:, at:, lane:, band:, state: (:done, :now, :next, :other), when:,
  #                 reason: (:off, :optional, :required: the place's mode), reason_box: { text:, button: },
  #                 elevate: (the lock), suggested: (the system's suggestion), chosen: (mode :choose), inputs: { half:, at:, lane: } }]
  #   track:        [{ half:, lane:, from:, to: }] the way gone, on its lane's row
  #   expected_now: { half:, lane:, at: } "förväntat nu", or nil
  #   summary:      the compact form's line of text
  #   save:         { url:, method:, name:, after: (:none, :reload, :html) } for mode :save; the answer is the rail's
  #                 JSON {ok, message}, with html: (the new content) for after: :html
  #   field:        { select_id:, current: } for mode :choose: core's select and what stood in it
  #   edit:         { form: (the id of the form that holds the inputs), limits: { band => input name },
  #                 marks: { mark => input name }, band_cells: true } for the form :editable
  #   texts:        { stroke:, show:, hide:, marks: } instead of gui_stuff's words (marks: the lead of the editable
  #                 form's legend of its limits, "Gränser:" by default)
  module Line
    FORMS = %w[detailed compact editable].freeze
    MODES = %w[read save choose].freeze
    STATES = %w[done now next other].freeze

    module_function

    # The contract, checked as role_class checks a role
    def check!(data, form, mode)
      raise ArgumentError, "unknown line form #{form}" unless FORMS.include?(form)
      raise ArgumentError, "unknown line mode #{mode}" unless MODES.include?(mode)

      halves = Array(data[:halves])
      raise ArgumentError, 'a line has exactly two halves' unless halves.size == 2

      halves.each do |h|
        Array(h[:bands]).each { |b| raise ArgumentError, "unknown band #{b[:key]}" unless Primitives::BANDS.include?(b[:key].to_s) }
      end
      Array(data[:steps]).each { |s| raise ArgumentError, "unknown step state #{s[:state]}" unless STATES.include?(s[:state].to_s) }
      raise ArgumentError, 'a line that saves needs save: { url: }' if mode == 'save' && form != 'editable' && data.dig(:save, :url).blank?
      raise ArgumentError, 'an editable line needs edit: { form: }' if form == 'editable' && data.dig(:edit, :form).blank?
    end

    # A place 1..max as a share of its half, as the script computes it
    def pct(at, max) = ((at.to_f - 1) / [max.to_f - 1, 1].max * 100).clamp(0, 100).round(2)

    # The steps along the line: the half, the place, the main lane first (as workflow_rules' Entry#rank)
    def ordered(data)
      halves = Array(data[:halves]).map { |h| h[:key].to_s }
      main = Array(data[:lanes]).first&.dig(:key).to_s
      Array(data[:steps]).sort_by { |s| [halves.index(s[:half].to_s) || halves.size, s[:at].to_i, s[:lane].to_s == main ? 0 : 1] }
    end

    # The collision: the groups of two or more steps on the same half, place and lane, in the line's order;
    # the editable form's script counts the same from its inputs
    def clashes(data)
      ordered(data).group_by { |s| [s[:half].to_s, s[:at].to_i, s[:lane].to_s] }.values.select { |g| g.size > 1 }
    end

    # The marks of both halves in the line's order, each with its number (1, 2, …) at its foot and in the legend
    def marks(data) = Array(data[:halves]).flat_map { |h| Array(h[:marks]) }

    def mark_number(data, mark) = marks(data).each_with_index.to_h { |m, i| [m, i + 1] }.fetch(mark, 1)

    # "A och B", "A, B och C"
    def names(labels)
      list = labels.map(&:to_s)
      list.size < 2 ? list.join : "#{list[0..-2].join(', ')} #{::I18n.t(:text_gk_gui_stuff_line_and)} #{list.last}"
    end
  end

  module LineHelper
    # Linjen: data as GkGuiStuff::Line says.
    #   form:     :detailed (the strip, the lanes, the legend), :compact (the band bar, the summary, the next steps and
    #             the fold button that opens the detailed form as a panel in the layer), :editable (the
    #             steps dragged along the line, across the stroke and between lanes, writing the form's inputs)
    #   mode:     :read (no actions), :save (a step saves at once, the line is a rail), :choose (in a form: the
    #             step is pressed and written into core's select); :editable has its own and ignores mode:
    #   remember: a GkGuiStuff::ViewStates key (values closed, open) under which the open panel is kept, compact
    #   remember_url: another address the open and closed panel is posted to instead of the view states' (key and
    #             value as there); the state is then not read from the view states either (the style guide's own
    #             address, which stores nothing)
    #   legend:   the signs explained; by default with :detailed only
    #   vertical: the form below 899 px whatever the width (the style guide; the page turns by itself)
    def gk_gui_stuff_line(data, form: :detailed, mode: :read, remember: nil, remember_url: nil, legend: nil, vertical: false, html: {})
      form = form.to_s
      mode = mode.to_s
      GkGuiStuff::Line.check!(data, form, mode)
      mode = 'edit' if form == 'editable'
      legend = form == 'detailed' if legend.nil?
      key = data[:key].to_s
      attrs = { role: 'group', 'aria-label': data[:title], 'data-gk-gui-line-key': key, 'data-gk-gui-line-mode': mode }
      if mode == 'save'
        attrs['data-gk-gui-line-name'] = data.dig(:save, :name)
        attrs['data-gk-gui-line-after'] = (data.dig(:save, :after) || :none).to_s
      end
      chosen = mode == 'choose' && Array(data[:steps]).find { |s| s[:chosen] && s[:state].to_s == 'next' }
      if mode == 'choose'
        attrs['data-gk-gui-line-select'] = data.dig(:field, :select_id)
        attrs['data-gk-gui-line-current'] = data.dig(:field, :current)
        attrs['data-gk-gui-line-chosen-text'] = ::I18n.t(:text_gk_gui_stuff_line_chosen, step: '%{step}')
      end
      parts = []
      case form
      when 'compact'
        open = remember.present? && remember_url.blank? && GkGuiStuff::ViewStates.for(::User.current)[remember.to_s] == 'open'
        attrs['data-gk-gui-line-open'] = open ? '1' : '0'
        if remember.present? && ::User.current.logged?
          attrs['data-gk-gui-line-remember'] = remember
          attrs['data-gk-gui-line-remember-url'] = remember_url.presence || gk_gui_stuff_view_state_path
        end
        parts << content_tag(:div, gk_gui_stuff_line_compact(data, mode, open, chosen), class: 'gk-gui-stuff-line-content')
        parts << content_tag(:template, gk_gui_stuff_line(data, form: :detailed, mode: mode.to_sym, legend: true),
                             id: "gk-gui-stuff-line-tpl-#{key}", class: 'gk-gui-stuff-line-tpl')
      when 'editable'
        attrs['data-gk-gui-line'] = gk_gui_stuff_line_json(data).to_json
        parts << content_tag(:div, gk_gui_stuff_line_detailed(data, mode, legend, true), class: 'gk-gui-stuff-line-content')
      else
        parts << content_tag(:div, gk_gui_stuff_line_detailed(data, mode, legend, false), class: 'gk-gui-stuff-line-content')
      end
      cls = ['gk-gui-stuff-line', "gk-gui-stuff-line-#{form}", vertical ? 'gk-gui-stuff-line-vertical' : nil,
             form == 'compact' && mode == 'choose' ? 'gk-gui-stuff-line-field' : nil, chosen ? 'gk-gui-stuff-field-changed' : nil, html[:class]].compact.join(' ')
      attrs = html.except(:class).merge(attrs)
      return gk_gui_stuff_rail(url: data.dig(:save, :url), method: data.dig(:save, :method) || :patch, html: attrs.merge(class: cls)) { safe_join(parts) } if mode == 'save'

      content_tag(:div, safe_join(parts), **attrs, class: cls)
    end

    private

    # The detailed and the editable form: the strip of bands, the halves with their lanes, the row that names a
    # collision, the legend. The strip and the halves stand in one box that scrolls sideways when the line does not
    # fit (the script's -scrolls), so that no label is clipped
    def gk_gui_stuff_line_detailed(data, mode, legend, editable)
      track = content_tag(:div, safe_join([gk_gui_stuff_line_strip(data), gk_gui_stuff_line_body(data, mode, editable)]), class: 'gk-gui-stuff-line-scroll')
      out = [track, gk_gui_stuff_line_clash(data)]
      out << gk_gui_stuff_line_legend if legend
      out << gk_gui_stuff_line_marks_legend(data) if editable
      out << content_tag(:span, ::I18n.t(:text_gk_gui_stuff_line_drag), id: "gk-gui-stuff-line-#{data[:key]}-drag", class: 'gk-gui-stuff-sr-only') if editable
      safe_join(out)
    end

    # The strip on top: each half's bands, as wide as their share of the scale
    def gk_gui_stuff_line_strip(data)
      halves = data[:halves].map do |h|
        prev = 0
        bands = Array(h[:bands]).map do |b|
          w = [b[:upto].to_i - prev, 1].max
          prev = b[:upto].to_i
          content_tag(:span, b[:label], class: 'gk-gui-stuff-line-band', style: "flex: #{w} 1 0", title: b[:label], 'data-gk-gui-band': b[:key])
        end
        content_tag(:div, safe_join(bands), class: 'gk-gui-stuff-line-strip-half', style: "--gk-gui-w: #{h[:weight] || 1}", 'data-gk-gui-half': h[:key])
      end
      content_tag(:div, safe_join([halves[0], content_tag(:div, '', class: 'gk-gui-stuff-line-strip-gap'), halves[1]]),
                  class: 'gk-gui-stuff-line-strip', 'aria-hidden': 'true')
    end

    # The halves with their lanes: the lane's name at the start of its row in the work half, the way gone and
    # "förväntat nu" on the row of their lane, the steps on theirs; the stroke between the halves. A lane empty in both
    # halves is left out, except in the editable form, where every row is a place to drop a step. For the form below
    # 899 px each lane has its heading, the half's name and the lane's name quiet after it, shown when the half
    # has more than one lane with steps (-lanes on the half; -empty on a lane without steps in it), and the stroke
    # carries its words, which that form shows as a row. Steps in a collision are -taken.
    def gk_gui_stuff_line_body(data, mode, editable)
      max = data[:max].to_i
      steps = GkGuiStuff::Line.ordered(data)
      taken = GkGuiStuff::Line.clashes(data).flatten.to_h { |s| [s[:id].to_s, true] }
      order = {}
      steps.group_by { |s| s[:half].to_s }.each_value { |list| list.each_with_index { |s, i| order[s[:id].to_s] = (i * 2) + 2 } }
      ex = data[:expected_now]
      on_lane = ->(x, h, ln) { x && x[:half].to_s == h[:key].to_s && x[:lane].to_s == ln[:key].to_s }
      lanes = Array(data[:lanes])
      unless editable
        lanes = lanes.select do |ln|
          data[:halves].any? { |h| steps.any? { |s| on_lane.call(s, h, ln) } || Array(data[:track]).any? { |t| on_lane.call(t, h, ln) } || on_lane.call(ex, h, ln) }
        end
      end
      halves = data[:halves].each_with_index.map do |h, hi|
        used = lanes.count { |ln| steps.any? { |s| on_lane.call(s, h, ln) } }
        rows = lanes.map do |ln|
          row = [content_tag(:span, '', class: 'gk-gui-stuff-line-base')]
          Array(data[:track]).select { |t| on_lane.call(t, h, ln) }.each do |t|
            row << content_tag(:span, '', class: 'gk-gui-stuff-line-track',
                                          style: "--gk-gui-from: #{GkGuiStuff::Line.pct(t[:from], max)}%; --gk-gui-to: #{GkGuiStuff::Line.pct(t[:to], max)}%")
          end
          if on_lane.call(ex, h, ln)
            before = steps.count { |s| s[:half].to_s == h[:key].to_s && s[:at].to_i <= ex[:at].to_i }
            row << content_tag(:span, ::I18n.t(:label_gk_gui_stuff_line_expected_now), class: 'gk-gui-stuff-line-expected',
                                                                                       style: "--gk-gui-at: #{GkGuiStuff::Line.pct(ex[:at], max)}%; --gk-gui-order: #{(before * 2) + 1}")
          end
          mine = steps.select { |s| on_lane.call(s, h, ln) }
          mine.each { |s| row << gk_gui_stuff_line_step(data, s, mode, editable, order[s[:id].to_s], taken[s[:id].to_s]) }
          lane_head = content_tag(:span, safe_join([h[:label], content_tag(:span, ln[:label], class: 'gk-gui-stuff-line-lane-head-name')], ' '),
                                  class: 'gk-gui-stuff-line-lane-head')
          content_tag(:div, safe_join([content_tag(:span, hi.zero? ? ln[:label] : " ", class: 'gk-gui-stuff-line-lane-name'), lane_head,
                                       content_tag(:div, safe_join(row), class: 'gk-gui-stuff-line-row')]),
                      class: ['gk-gui-stuff-line-lane', mine.empty? ? 'gk-gui-stuff-line-lane-empty' : nil].compact.join(' '), 'data-gk-gui-lane': ln[:key])
        end
        inner = [content_tag(:div, h[:label], class: 'gk-gui-stuff-line-half-title')] + rows
        if editable
          Array(h[:marks]).each do |m|
            n = GkGuiStuff::Line.mark_number(data, m)
            inner << content_tag(:span, content_tag(:span, n, class: 'gk-gui-stuff-line-mark-n', 'aria-hidden': 'true'),
                                 class: 'gk-gui-stuff-line-mark', style: "--gk-gui-at: #{GkGuiStuff::Line.pct(m[:at], max)}%",
                                 title: "#{m[:label]} ≤ #{m[:at]}", 'data-gk-gui-line-mark': m[:key])
          end
          inner << content_tag(:div, safe_join([content_tag(:span, '1'), content_tag(:span, max.to_s)]), class: 'gk-gui-stuff-line-scale', 'aria-hidden': 'true')
        end
        content_tag(:div, safe_join(inner), class: ['gk-gui-stuff-line-half', used > 1 ? 'gk-gui-stuff-line-half-lanes' : nil].compact.join(' '),
                                            style: "--gk-gui-w: #{h[:weight] || 1}", 'data-gk-gui-half': h[:key])
      end
      words = data.dig(:texts, :stroke) || ::I18n.t(:text_gk_gui_stuff_line_stroke)
      stroke = content_tag(:div, content_tag(:span, words, class: 'gk-gui-stuff-line-stroke-text'), class: 'gk-gui-stuff-line-stroke', title: words)
      content_tag(:div, safe_join([halves[0], stroke, halves[1]]), class: 'gk-gui-stuff-line-body')
    end

    # The row under the line that names a collision: core's warning icon, one sentence per group ("2 steg står
    # på samma plats: A och B.") and Visa, which takes the focus to the group's first step; hidden when there is none.
    # The editable form's script writes it again as the steps move
    def gk_gui_stuff_line_clash(data)
      groups = GkGuiStuff::Line.clashes(data)
      said = groups.map do |g|
        safe_join([content_tag(:span, ::I18n.t(:text_gk_gui_stuff_line_clash, count: g.size, names: GkGuiStuff::Line.names(g.map { |s| s[:label] }))),
                   link_to(::I18n.t(:button_show), '#', class: 'gk-gui-stuff-line-clash-show', 'data-gk-gui-line-show': g.first[:id])], ' ')
      end
      content_tag(:p, safe_join([content_tag(:span, sprite_icon('warning', nil, size: 12), class: 'gk-gui-stuff-line-clash-icon', 'aria-hidden': 'true'),
                                 content_tag(:span, safe_join(said, ' '), class: 'gk-gui-stuff-line-clash-text')]),
                  class: 'gk-gui-stuff-line-clash', hidden: groups.empty?)
    end

    # A step on its row: a div at its place, holding its face (the dot with a tick when done and an arrow when it can be
    # chosen; the label, cut short with all of it in the tooltip; the date, or the number in the
    # editable form). The face is a span, a button that saves or chooses, the box with the reason (Krävs: "…"), or the
    # lock (elevate; one who is not an administrator sees the step as not allowed for the role)
    def gk_gui_stuff_line_step(data, s, mode, editable, order, taken = false)
      state = s[:state].to_s
      elevate = state == 'next' && s[:elevate] && !editable
      if elevate && !GkGuiStuff::Primitives.account_admin?
        state = 'other'
        elevate = false
      end
      required = state == 'next' && GkGuiStuff::Primitives.reason_mode(s[:reason]) == 'required'
      id = s[:id].to_s
      label = s[:label].to_s
      icon = { 'done' => 'checked', 'next' => 'angle-right' }[state] unless editable
      inner = [content_tag(:span, icon ? sprite_icon(icon, nil, size: 10) : '', class: 'gk-gui-stuff-line-dot', 'aria-hidden': 'true'),
               content_tag(:span, label, class: 'gk-gui-stuff-line-label', title: label)]
      if editable
        inner << content_tag(:span, s[:at], class: 'gk-gui-stuff-line-n')
      else
        inner << content_tag(:span, s[:when], class: 'gk-gui-stuff-line-when') if s[:when].present?
        word = { 'done' => :label_gk_gui_stuff_line_done, 'now' => :label_gk_gui_stuff_line_now, 'next' => :label_gk_gui_stuff_line_can_choose,
                 'other' => :label_gk_gui_stuff_line_other }[state]
        inner << content_tag(:span, ::I18n.t(word), class: 'gk-gui-stuff-sr-only')
      end
      inner << content_tag(:span, sprite_icon('lock', nil, size: 12), class: 'gk-gui-stuff-line-lock', 'aria-hidden': 'true') if elevate
      inner = safe_join(inner)
      go = ::I18n.t(:text_gk_gui_stuff_line_go, step: label)
      button = lambda do |**more|
        content_tag(:button, inner, type: 'button', class: 'gk-gui-stuff-line-face', 'data-gk-gui-line-step': id, 'aria-label': go, **more)
      end
      face = if editable
               content_tag(:button, inner, type: 'button', class: 'gk-gui-stuff-line-face', 'data-gk-gui-line-step': id,
                                           title: "#{label}. #{::I18n.t(:text_gk_gui_stuff_line_drag)}", 'aria-describedby': "gk-gui-stuff-line-#{data[:key]}-drag")
             elsif state != 'next' || mode == 'read'
               content_tag(:span, inner, class: 'gk-gui-stuff-line-face')
             elsif elevate
               gk_gui_stuff_lock(label, summary: inner, summary_class: 'gk-gui-stuff-line-face') { mode == 'choose' ? button.call('aria-pressed': s[:chosen] ? 'true' : 'false') : button.call }
             elsif mode == 'choose'
               button.call('aria-pressed': s[:chosen] ? 'true' : 'false')
             elsif required
               gk_gui_stuff_line_reason_fly(data, s, inner, go)
             else
               button.call
             end
      cls = ['gk-gui-stuff-line-step', "gk-gui-stuff-line-step-#{state}", required ? 'gk-gui-stuff-line-step-reason' : nil,
             s[:suggested] ? 'gk-gui-stuff-line-step-suggested' : nil, taken ? 'gk-gui-stuff-line-step-taken' : nil].compact.join(' ')
      content_tag(:div, face, class: cls, style: "--gk-gui-at: #{GkGuiStuff::Line.pct(s[:at], data[:max])}%; --gk-gui-order: #{order}",
                              'data-gk-gui-band': s[:band], 'data-gk-gui-line-id': id)
    end

    # A drawn step that needs a reason: the step opens a fly in the role line-next with the box's words first, then
    # the box's button and Avbryt, and the reason under them, as every box; drawn by hand with the fly's classes, since
    # the summary is the step. The script sends it (GkGui.line); the reason box opens from the panel without closing it.
    def gk_gui_stuff_line_reason_fly(data, s, inner, go)
      rid = "gk-gui-stuff-reason-#{@gk_gui_stuff_mount_n = (@gk_gui_stuff_mount_n || 0) + 1}"
      box = []
      box << content_tag(:p, s.dig(:reason_box, :text)) if s.dig(:reason_box, :text).present?
      box << gk_gui_stuff_fly_buttons(s.dig(:reason_box, :button) || s[:label], name: data.dig(:save, :name), value: s[:id], keys: true)
      box << gk_gui_stuff_reason_block(required: true, id: rid, name: 'reason')
      content_tag(:details, content_tag(:summary, inner, class: 'gk-gui-stuff-line-face', 'aria-label': "#{go}…") +
                            content_tag(:div, safe_join(box), class: 'gk-gui-stuff-fly-box'),
                  class: "gk-gui-stuff-fly #{GkGuiStuff::Primitives.role_class('line-next')} gk-gui-stuff-fly-roled")
    end

    # The compact form: the band bar (the current segment says the status, the others their band), the
    # summary, and the row of actions: the next steps as buttons (with their reason as gk_gui_stuff_reason_button
    # draws it) or as choices in a form, and the fold button, whose words turn (Visa hela flödet, Dölj
    # flödet); the row's other parts hide while the panel is open
    def gk_gui_stuff_line_compact(data, mode, open, chosen)
      steps = GkGuiStuff::Line.ordered(data)
      now = steps.find { |s| s[:state].to_s == 'now' }
      max = [data[:max].to_i, 1].max
      show = data.dig(:texts, :show) || ::I18n.t(:button_gk_gui_stuff_line_show)
      hide = data.dig(:texts, :hide) || ::I18n.t(:button_gk_gui_stuff_line_hide)
      segs = data[:halves].each_with_index.flat_map do |h, hi|
        prev = 0
        Array(h[:bands]).each_with_index.map do |b, bi|
          w = [b[:upto].to_i - prev, 1].max
          prev = b[:upto].to_i
          here = now && now[:half].to_s == h[:key].to_s && now[:band].to_s == b[:key].to_s
          cls = ['gk-gui-stuff-line-seg', here ? 'gk-gui-stuff-line-seg-now' : nil, hi == 1 && bi.zero? ? 'gk-gui-stuff-line-seg-stroke' : nil].compact.join(' ')
          content_tag(:span, here ? content_tag(:b, now[:label]) : b[:label], class: cls, style: "--gk-gui-w: #{((h[:weight] || 1).to_f * w / max).round(3)}",
                                                                              'data-gk-gui-band': b[:key])
        end
      end
      # the bar at least as wide as its words, in a box that scrolls sideways rather than clip
      out = [content_tag(:div, content_tag(:div, safe_join(segs), class: 'gk-gui-stuff-line-bar', title: show, 'aria-hidden': 'true'), class: 'gk-gui-stuff-line-scroll-bar')]
      out << content_tag(:p, data[:summary], class: 'gk-gui-stuff-line-summary') if data[:summary].present?
      out << gk_gui_stuff_line_clash(data)
      nexts = steps.select { |s| s[:state].to_s == 'next' }
      row = []
      if mode == 'choose'
        row << content_tag(:span, ::I18n.t(:text_gk_gui_stuff_line_now_choose, step: content_tag(:b, now ? now[:label] : '')).html_safe, class: 'gk-gui-stuff-line-now-text')
        nexts.each do |s|
          text = GkGuiStuff::Primitives.reason_mode(s[:reason]) == 'required' ? "#{s[:label]}…" : s[:label]
          choice = content_tag(:button, text, type: 'button', class: 'gk-gui-stuff-line-choice', 'aria-pressed': s[:chosen] ? 'true' : 'false', 'data-gk-gui-line-step': s[:id])
          row << (s[:elevate] ? gk_gui_stuff_lock(s[:label]) { choice } : choice)
        end
      elsif mode == 'save' && nexts.any?
        row << content_tag(:span, ::I18n.t(:label_gk_gui_stuff_line_next), class: 'gk-gui-stuff-line-next-label')
        nexts.each do |s|
          row << gk_gui_stuff_reason_button(s[:label], reason: s[:reason] || :off, role: 'line-next', name: data.dig(:save, :name), value: s[:id],
                                                       info: s.dig(:reason_box, :text), submit_label: s.dig(:reason_box, :button), elevate: s[:elevate])
        end
      end
      row << gk_gui_stuff_group_toggle(show, hide, open: open, html: { class: 'gk-gui-stuff-line-toggle', data: { gk_gui_line_toggle: '1' } })
      out << content_tag(:div, safe_join(row), class: 'gk-gui-stuff-line-actions')
      if mode == 'choose'
        out << content_tag(:p, chosen ? ::I18n.t(:text_gk_gui_stuff_line_chosen, step: chosen[:label]) : '', class: 'gk-gui-stuff-line-chosen', role: 'status', hidden: !chosen)
      end
      safe_join(out)
    end

    # The legend, with the signs: "…" asks a reason, the lock a step up
    def gk_gui_stuff_line_legend
      dot = ->(state, icon = nil) { content_tag(:span, content_tag(:span, icon ? sprite_icon(icon, nil, size: 8) : '', class: 'gk-gui-stuff-line-dot'), class: "gk-gui-stuff-line-step-#{state}") }
      items = [[dot.call('done', 'checked'), :label_gk_gui_stuff_line_done], [dot.call('now'), :label_gk_gui_stuff_line_now],
               [dot.call('next', 'angle-right'), :label_gk_gui_stuff_line_can_choose], [dot.call('other'), :label_gk_gui_stuff_line_other],
               [content_tag(:b, '…'), :label_gk_gui_stuff_line_needs_reason], [sprite_icon('lock', nil, size: 12), :label_gk_gui_stuff_line_needs_step_up]]
      content_tag(:div, safe_join(items.map { |sign, k| content_tag(:span, safe_join([content_tag(:span, sign, 'aria-hidden': 'true'), ::I18n.t(k)], ' ')) }),
                  class: 'gk-gui-stuff-line-legend')
    end

    # The editable form's limits explained: the lead, then per mark the dotted sign, its number and its words with
    # the place ("vem som helst ≤ 333"); the script writes the place again as the limit's input changes. Nothing
    # when the line has no marks
    def gk_gui_stuff_line_marks_legend(data)
      list = GkGuiStuff::Line.marks(data)
      return ''.html_safe if list.empty?

      items = list.each_with_index.map do |m, i|
        sign = content_tag(:span, safe_join([content_tag(:span, '', class: 'gk-gui-stuff-line-mark-sign'), content_tag(:span, i + 1, class: 'gk-gui-stuff-line-mark-key')], ' '),
                           'aria-hidden': 'true')
        content_tag(:span, safe_join([sign, m[:label], '≤', content_tag(:span, m[:at], 'data-gk-gui-mark-at': m[:key])], ' '))
      end
      lead = data.dig(:texts, :marks) || ::I18n.t(:label_gk_gui_stuff_line_marks)
      content_tag(:div, safe_join([content_tag(:span, lead)] + items), class: 'gk-gui-stuff-line-legend gk-gui-stuff-line-marks')
    end

    # What the editable form's script redraws from: the scale, the bands and marks, the lanes, where the inputs
    # are, and the steps with their inputs
    def gk_gui_stuff_line_json(data)
      clash = ::I18n.t(:text_gk_gui_stuff_line_clash, count: '%{count}', names: '%{names}') # for the script to fill
      { max: data[:max].to_i,
        halves: data[:halves].map do |h|
          { key: h[:key].to_s, bands: Array(h[:bands]).map { |b| { key: b[:key].to_s, label: b[:label], cell_label: b[:cell_label] || b[:label], upto: b[:upto].to_i } },
            marks: Array(h[:marks]).map { |m| { key: m[:key].to_s, label: m[:label], at: m[:at].to_i } } }
        end,
        lanes: Array(data[:lanes]).map { |ln| { key: ln[:key].to_s, label: ln[:label] } },
        edit: data[:edit],
        steps: Array(data[:steps]).map { |s| { id: s[:id].to_s, label: s[:label], inputs: s[:inputs], suggested: !!s[:suggested] } },
        texts: { taken: ::I18n.t(:text_gk_gui_stuff_line_taken), drag: ::I18n.t(:text_gk_gui_stuff_line_drag),
                 clash: clash,
                 and: ::I18n.t(:text_gk_gui_stuff_line_and), show: ::I18n.t(:button_show) } }
    end
  end
end
