# frozen_string_literal: true

# The style guide's tile: one state of an element, its name and state word, the primitive drawn by its own helper on
# a canvas, and the call that drew it folded under it
module GkGuiStuffStyleguideHelper
  # One tile: the state's name with its flag, the drawing in its real size on the canvas, the call under it in a folded
  # "Kod" with the copy button. wide: true takes the whole row (nil: the element's own choice, set by the element
  # partial); the canvas scrolls sideways rather than cut anything. The drawing stands in its own box at the start, as on
  # a real page (what core places by the text's start, the error box's icon, the bar's legend, the dialog's rows, stays
  # in place); the box itself is centred on the canvas. mode: what the example does (GkGuiStuff::Styleguide::MODES;
  # nil: the element partial's own @gk_gui_stuff_sg_mode, and without it still), drawn as exactly one flag on the
  # state's name and set on the tile as data-gk-gui-sg-mode, where the guide's script finds the tiles that lead
  # nowhere. Counts the element's states and their modes for its heading. id: a steady anchor of the tile's own
  # (sg-tile-<words>), for a link or a picture that must scroll to that one tile; the library's small pictures are
  # copied without ids, so it stays unique
  TILE_ID = /\Asg-tile-[a-z0-9]+(?:-[a-z0-9]+)*\z/

  def gk_gui_stuff_sg_row(state, call, wide: nil, mode: nil, id: nil, &block)
    raise ArgumentError, "tile id #{id.inspect} is not sg-tile-<words>" if id && !TILE_ID.match?(id.to_s)

    mode = GkGuiStuff::Styleguide.mode_for(mode, @gk_gui_stuff_sg_mode)
    @gk_gui_stuff_sg_n = (@gk_gui_stuff_sg_n || 0) + 1
    (@gk_gui_stuff_sg_states ||= []) << state.to_s
    (@gk_gui_stuff_sg_modes ||= []) << mode
    wide = @gk_gui_stuff_sg_wide if wide.nil?
    drawn = block ? capture(&block) : ''
    head = content_tag(:div, gk_gui_stuff_sg_mode_flag(mode, state), class: 'gk-gui-stuff-sg-tile-head')
    canvas = content_tag(:div, content_tag(:div, drawn, class: 'gk-gui-stuff-sg-shown'), class: 'gk-gui-stuff-sg-canvas')
    # a div, not a region: the state's name stands as visible text in the head, and a page of many tiles is no list
    # of landmarks
    content_tag(:div, safe_join([head, canvas, call.present? ? gk_gui_stuff_sg_code(call) : nil].compact),
                class: ['gk-gui-stuff-sg-tile', wide ? 'gk-gui-stuff-sg-tile-wide' : nil].compact.join(' '), data: { gk_gui_sg_mode: mode }, id: id&.to_s)
  end

  # A tile's mode is a fact about the tile, part of its heading's text: the state's name and after it the flag as an own
  # element with its words, in the mode's role, on the next row where the row runs out. What it means is the pennant's
  # tooltip and, for a screen reader, a hidden text after the word; data-gk-gui-sg-mode-badge is the flag's anchor and
  # the mode the flag's sort, which the element's legend frames
  def gk_gui_stuff_sg_mode_flag(mode, state)
    mode = GkGuiStuff::Styleguide.mode_for(mode)
    means = l(:"text_gk_gui_stuff_sg_mode_#{mode}")
    flag = gk_gui_stuff_flag(l(:"label_gk_gui_stuff_sg_mode_#{mode}"), inline: true, role: GkGuiStuff::Styleguide::MODE_ROLES[mode], title: means, sort: mode,
                                                                       html: { data: { gk_gui_sg_mode_badge: mode } })
    safe_join([content_tag(:span, state, class: 'gk-gui-stuff-sg-state'), flag, content_tag(:span, ": #{means}", class: 'gk-gui-stuff-sr-only')])
  end

  # The short legend of an element's heading, as the flag's legend: first the facts given (the plugin, the number of
  # states), rows of text only; then the modes counted, one own element per mode in the mode's role with its count first
  # ("1 Bara bild, 2 Bara grafiskt, 1 Går att prova"), what it means as the pennant's tooltip and, for a screen reader, after it. The
  # pointer on a mode's row frames the tiles' flags of that mode in the element (area: its steady anchor). The
  # element's heading in the page form and the library's panel head draw it
  def gk_gui_stuff_sg_mode_badges(modes, area:, facts: [])
    counts = GkGuiStuff::Styleguide.mode_counts(modes)
    return nil if counts.empty? && facts.empty?

    items = facts.map { |f| { text: f } } + counts.map do |m, n|
      means = l(:"text_gk_gui_stuff_sg_mode_#{m}")
      { text: l(:"label_gk_gui_stuff_sg_mode_#{m}"), role: GkGuiStuff::Styleguide::MODE_ROLES[m], count: n, sort: m, title: means, means: means }
    end
    gk_gui_stuff_flag_legend(items, area: area, label: l(:label_gk_gui_stuff_sg_modes_legend), html: { class: 'gk-gui-stuff-sg-modes' })
  end

  # A sentence from the locale files with own-element flags in it: each %{name} in the words stands for the flag given
  # under that name, and the rest is text, escaped as any text is
  def gk_gui_stuff_sg_with_flags(key, **flags)
    marks = flags.keys.to_h { |k| [k, "\u0001#{k}\u0001"] }
    pieces = l(key, **marks).split(/\u0001(\w+)\u0001/)
    safe_join(pieces.each_with_index.map { |p, i| i.odd? ? flags.fetch(p.to_sym) : p })
  end

  def gk_gui_stuff_sg_mode_summary(modes)
    list = GkGuiStuff::Styleguide.mode_counts(modes).map { |m, n| "#{n} #{l(:"label_gk_gui_stuff_sg_mode_#{m}")}" }
    list.any? ? l(:text_gk_gui_stuff_sg_mode_summary, list: list.join(', ')) : nil
  end

  # The note at the top of the guide, in both forms, folded from the start: GK GUI Stuff's group in the role
  # info, its heading the fold button with the five flags (one per mode) as own elements with their words (a heading has no short
  # form; a screen reader reads the line after them and the five flags (one per mode) when it is open) and one line of text. Open: every example has
  # made-up values shaped after how the plugins use the element, nothing is saved on the server, the links and buttons
  # in the pictures lead nowhere but in the tiles that try the server, and some examples remember their state in this
  # browser; then the five flags (one per mode), each as the flag's own element with its words and what it means; last that hover and
  # focus are not shown still. Never remembered, so that it stands folded on every visit
  def gk_gui_stuff_sg_dummy_note
    roles = GkGuiStuff::Styleguide::MODE_ROLES
    legend = GkGuiStuff::Styleguide::MODES.map do |m|
      mark = gk_gui_stuff_flag(l(:"label_gk_gui_stuff_sg_mode_#{m}"), inline: true, role: roles[m])
      content_tag(:li, safe_join([content_tag(:span, mark, class: 'gk-gui-stuff-sg-mode', data: { gk_gui_sg_mode_badge: m }),
                                  content_tag(:span, l(:"text_gk_gui_stuff_sg_mode_#{m}"))], ' '))
    end
    marks = GkGuiStuff::Styleguide::MODES.map do |m|
      gk_gui_stuff_flag(l(:"label_gk_gui_stuff_sg_mode_#{m}"), inline: true, role: roles[m])
    end
    title = safe_join([content_tag(:span, safe_join(marks), class: 'gk-gui-stuff-sg-dummy-marks', 'aria-hidden': 'true'),
                       content_tag(:span, l(:label_gk_gui_stuff_sg_dummy_summary), class: 'gk-gui-stuff-sg-dummy-line')])
    gk_gui_stuff_group(title, role: :info, collapsed: true, level: 3, html: { class: 'gk-gui-stuff-sg-dummy', role: 'note', 'data-gk-gui-sg-dummy': '1' }) do
      safe_join([content_tag(:p, l(:text_gk_gui_stuff_sg_dummy)), content_tag(:p, l(:text_gk_gui_stuff_sg_legend)),
                 content_tag(:ul, safe_join(legend), class: 'gk-gui-stuff-sg-legend'),
                 content_tag(:p, l(:text_gk_gui_stuff_sg_no_still_states), class: 'gk-gui-stuff-direct-note')])
    end
  end

  # The page's own choices, for every element at once: Visa all kod, light or dark (when GK Core Stuff's
  # dark mode is there) and computer or phone. A bar that follows on scroll (the page's script holds it at the top of
  # the window, under core's fixed header on a phone), in both forms. Visa all kod twice, one drawn at a time by the
  # stylesheet: the button with its words on a computer, and under 899 px GK GUI Stuff's icon button (core's
  # toggle-plus, toggle-minus while all the code is open, as core's own expand and collapse; the words as its tooltip
  # and for a screen reader), so that the bar is one row on a phone
  def gk_gui_stuff_sg_page_tools(dark: false)
    show = l(:label_gk_gui_stuff_sg_show_all_code)
    words = { gk_gui_sg_all_code: '1', gk_gui_sg_show: show, gk_gui_sg_hide: l(:label_gk_gui_stuff_sg_hide_all_code) }
    code = button_tag(show, type: 'button', class: 'gk-gui-stuff-sg-all-code', data: words)
    icon = gk_gui_stuff_icon_button('toggle-plus', show, html: { class: 'gk-gui-stuff-sg-all-code-icon',
                                                               data: words.merge(gk_gui_sg_icon_show: 'toggle-plus', gk_gui_sg_icon_hide: 'toggle-minus') })
    choices = gk_gui_stuff_sg_choices('page', dark: dark, scheme_label: l(:label_gk_gui_stuff_sg_scheme_page), width_label: l(:label_gk_gui_stuff_sg_width_page))
    bar = content_tag(:div, safe_join([choices, code, icon]), class: 'gk-gui-stuff-sg-tools', data: { gk_gui_sg_bar: '1' })
    content_tag(:div, bar, class: 'gk-gui-stuff-sg-bar-place', data: { gk_gui_sg_bar_place: '1' })
  end

  # What every element's partial is given: the guide's save address and the one that fails, the made-up tag names,
  # a role's name, and the note that a module is off where an example needs it (@on, the controller's)
  # The frame page's own mark on the root (data-gk-gui-stuff-sg-frame), in its head before the first paint
  # (gk_gui_stuff_root_mark.js copies the script tag's mark onto the root): the guide's stylesheet keeps no room there
  # for the band, the login warning or a jump (gk_gui_stuff_styleguide.css)
  def gk_gui_stuff_sg_frame_mark
    content_for(:header_tags, javascript_include_tag('gk_gui_stuff_root_mark', plugin: 'gk_gui_stuff', data: { gk_gui_stuff_sg_frame: '1' }))
  end

  # A module's words as its script reads them (GkGui.t: the key without gk_gui_stuff_), for an example that has the
  # module's look whether the module is on or not (the list filter's example): the page's configuration carries them
  # only for the modules that are on
  def gk_gui_stuff_sg_module_words(key)
    mod = GkGuiStuff::Registry.find(key)
    Array(mod&.texts).to_h { |k| [k.to_s.sub('gk_gui_stuff_', ''), l(k)] }
  end

  # The scripts and stylesheets a module's example needs where the module is not loaded: the list filter's example
  # (data-gk-gui-filter="example") has gk_gui_stuff_lists whether list_filter is on or not; the file comes once, with
  # list_filter or select_search on it is the module's own (both have the same file)
  def gk_gui_stuff_sg_example_assets
    return ''.html_safe if (Array(@on) & %w[list_filter select_search]).any?

    safe_join([javascript_include_tag('gk_gui_stuff_lists', plugin: 'gk_gui_stuff'), stylesheet_link_tag('gk_gui_stuff_lists', plugin: 'gk_gui_stuff')])
  end

  def gk_gui_stuff_sg_locals
    on = @on || []
    { save: gk_gui_stuff_styleguide_save_path, fail: gk_gui_stuff_styleguide_save_path(fail: 1),
      sample: ->(k) { l(:"label_gk_gui_stuff_sg_tag_#{k}") },
      role_name: ->(r) { r.is_a?(Integer) ? l(:label_gk_gui_stuff_category_n, n: r) : l(:"label_gk_gui_stuff_role_alert_#{r}") },
      module_off: lambda { |key|
        on.include?(key) ? ''.html_safe : content_tag(:p, l(:text_gk_gui_stuff_sg_module_off, name: l(:"label_gk_gui_stuff_mod_#{key}")), class: 'gk-gui-stuff-direct-note')
      } }
  end

  # The call folded under its drawing, as the library's code: a field that selects all on focus with the copy button
  # ("Kopiera: Kod", "Kopierat" by the button), a code block only for a call of more than one line; Visa all kod opens
  # every one on the page
  def gk_gui_stuff_sg_code(call)
    content_tag(:details, safe_join([content_tag(:summary, l(:label_gk_gui_stuff_sg_code)),
                                     content_tag(:div, gk_gui_stuff_library_code(l(:label_gk_gui_stuff_sg_code), call, bare: true), class: 'gk-gui-stuff-sg-code-body')]),
                class: 'gk-gui-stuff-sg-code')
  end

  # One element drawn: its partial (the tiles), the number of its states, their names (the library form searches
  # them as the page form does) and their modes. The partial is drawn before the heading, so that the heading can say
  # how many states it has; a partial that fails is core's warning with its key, logged, and the rest of the page is
  # drawn. Both forms of the page draw an element through here
  def gk_gui_stuff_sg_draw(section, locals)
    @gk_gui_stuff_sg_n = 0
    @gk_gui_stuff_sg_states = []
    @gk_gui_stuff_sg_modes = []
    @gk_gui_stuff_sg_wide = section.wide
    @gk_gui_stuff_sg_mode = nil
    body = begin
      render(partial: section.partial, locals: locals)
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] style guide section #{section.key} failed: #{e.class} #{e.message}")
      content_tag(:p, l(:text_gk_gui_stuff_sg_section_failed, key: section.key), class: 'warning')
    end
    { body: body, n: @gk_gui_stuff_sg_n, states: @gk_gui_stuff_sg_states, modes: @gk_gui_stuff_sg_modes }
  ensure
    @gk_gui_stuff_sg_wide = @gk_gui_stuff_sg_mode = nil
  end

  # The element's heading: the name, after it on the same line its short legend (gk_gui_stuff_sg_element_legend, on the
  # next line where the line runs out), the choices light or dark and computer or phone, "Används för" and "Inte för",
  # and for a Redmine form the GK section that does the same.
  # The name takes the focus from a click or a tap (tabindex -1, never in the Tab order), so that a touch screen shows
  # the element's own choices as a pointer does on hover; under 899 px they are not drawn
  def gk_gui_stuff_sg_element_head(section, count, all: [], dark: false, modes: [])
    name = content_tag(:h3, content_tag(:span, section.label, id: "#{section.anchor}-name"), class: 'gk-gui-stuff-sg-name', tabindex: '-1')
    legend = gk_gui_stuff_sg_element_legend(section, count, modes, area: "##{section.anchor}")
    head = content_tag(:div, safe_join([name, legend, gk_gui_stuff_sg_tools(section, dark: dark)]), class: 'gk-gui-stuff-sg-element-head')
    safe_join([head, gk_gui_stuff_sg_uses(section), gk_gui_stuff_sg_counterpart(section, all)].compact)
  end

  # The short legend of an element's heading: the plugin, the number of states and the tiles' modes counted (modes:
  # the tiles' modes); the modes' rows frame the tiles' flags in the element (area: its steady anchor), the other two
  # are text. In the library form the panel's head draws it
  def gk_gui_stuff_sg_element_legend(section, count, modes, area:)
    gk_gui_stuff_sg_mode_badges(modes, area: area, facts: [section.plugin_name, l(:label_gk_gui_stuff_sg_n_states, count: count)])
  end

  # The element's choices, light or dark and computer or phone, shown only while the pointer or the focus is on the
  # element's heading (the stylesheet), and always in the library form's panel head. Light and dark is the whole page's (the dark mode is
  # GK Core Stuff's, its class set on the page's root), so every element's choice follows and the element stays in view; without
  # GK Core Stuff's dark mode the choice is not drawn. Telefon draws the element's tiles in a phone's screen 390 px wide (the
  # guide's frame page); the page's own choice sets every element's, and an element may then choose its own. Both only
  # change the view: view segments that keep nothing (the page's light or dark is the page's own), pressed by the
  # guide's script
  def gk_gui_stuff_sg_tools(section, dark: false)
    choices = gk_gui_stuff_sg_choices(section.key, dark: dark, scheme_label: l(:label_gk_gui_stuff_sg_scheme), width_label: l(:label_gk_gui_stuff_sg_width),
                                                   phone_title: l(:text_gk_gui_stuff_sg_phone_frame, name: section.label))
    content_tag(:span, choices, class: 'gk-gui-stuff-sg-element-tools')
  end

  # the two choices as view segments, an element's (key: its key) or the page's (key: 'page', data-gk-gui-sg-page-choice)
  def gk_gui_stuff_sg_choices(key, dark:, scheme_label:, width_label:, phone_title: nil)
    page = key.to_s == 'page'
    scheme = dark ? gk_gui_stuff_view_segment("sg_scheme_#{key}", [[l(:label_gk_gui_stuff_sg_light), 'light'], [l(:label_gk_gui_stuff_sg_dark), 'dark']], 'light',
                                             label: scheme_label, remember: false) : nil
    width = gk_gui_stuff_view_segment("sg_width_#{key}", [[l(:label_gk_gui_stuff_sg_width_desktop), 'desktop'], [l(:label_gk_gui_stuff_sg_width_phone), 'phone']], 'desktop',
                                     label: width_label, remember: false)
    scheme &&= content_tag(:span, scheme, data: { gk_gui_sg_choice: 'scheme', gk_gui_sg_page_choice: page ? '1' : nil })
    width = content_tag(:span, width, data: { gk_gui_sg_choice: 'width', gk_gui_sg_page_choice: page ? '1' : nil, gk_gui_sg_phone_title: phone_title })
    safe_join([scheme, width].compact)
  end

  # "Används för" and "Inte för" side by side, those of them the element has
  def gk_gui_stuff_sg_uses(section)
    uses = [[:label_gk_gui_stuff_sg_uses, section.uses], [:label_gk_gui_stuff_sg_not_for, section.not_for]].select { |_k, t| t.present? }
    uses.any? ? content_tag(:div, safe_join(uses.map { |k, t| content_tag(:p, safe_join([content_tag(:b, l(k)), t])) }), class: 'gk-gui-stuff-sg-use') : nil
  end

  # Hör ihop med in the library form: a Redmine form's GK counterpart, and for a GK element the Redmine forms it stands
  # for; a Redmine form without one says that GK uses Redmine's own
  def gk_gui_stuff_sg_related(section, all)
    links = if section.part == 'core'
              [section.counterpart && all.find { |s| s.key == section.counterpart }].compact
            else
              all.select { |s| s.part == 'core' && s.counterpart == section.key }
            end
    none = section.part == 'core' ? l(:text_gk_gui_stuff_sg_no_counterpart) : nil
    gk_gui_stuff_library_related(links.map { |s| [s.label, "##{s.anchor}"] }, none: none)
  end

  # A Redmine form's line to its GK counterpart, or that GK uses Redmine's own
  def gk_gui_stuff_sg_counterpart(section, all)
    return nil unless section.part == 'core'

    gk = section.counterpart && all.find { |s| s.key == section.counterpart }
    text = gk ? safe_join([l(:label_gk_gui_stuff_sg_counterpart), link_to(gk.label, "##{gk.anchor}")], ' ') : l(:text_gk_gui_stuff_sg_no_counterpart)
    content_tag(:p, text, class: 'gk-gui-stuff-sg-counterpart')
  end

  # The still picture of what only shows live, beside Prova:
  # the element as its script draws it, with the same classes, laid in the page, inert so that nothing in it can be
  # reached; the live one opens by Prova. kind: :notice, :banner, :surface, :palette, :wave, :corner, :drawer, :whisper,
  # :where or :layer; the words come from the caller (the locale files)
  def gk_gui_stuff_sg_still(kind, **o)
    inner = case kind
            when :notice then gk_gui_stuff_sg_still_notice(o)
            when :banner then gk_gui_stuff_sg_still_banner(o)
            when :surface, :palette then content_tag(:div, gk_gui_stuff_sg_still_surface(kind, o), class: 'gk-gui-stuff-sg-still-back')
            when :wave then gk_gui_stuff_sg_still_wave(o)
            when :corner then gk_gui_stuff_sg_still_corner(o)
            when :drawer then gk_gui_stuff_sg_still_drawer(o)
            when :whisper then content_tag(:div, o[:text], class: 'gk-gui-stuff-notice gk-gui-stuff-notice-on')
            when :layer then gk_gui_stuff_sg_still_layer(o)
            when :where then gk_gui_stuff_sg_still_where(o)
            else raise ArgumentError, "unknown still #{kind}"
            end
    content_tag(:div, inner, class: "gk-gui-stuff-sg-still gk-gui-stuff-sg-still-#{kind}", inert: true)
  end

  # Prova: a link that opens the element from the page's script (gk_gui_stuff_styleguide.js); what it shows
  # comes as data-gk-gui-sg-* from the locale files, a Hash or an Array as JSON
  def gk_gui_stuff_sg_try(kind, **data)
    attrs = data.to_h { |k, v| [:"gk_gui_sg_#{k}", v.is_a?(Hash) || v.is_a?(Array) ? v.to_json : v] }
    link_to l(:label_gk_gui_stuff_sg_try), '#', data: { gk_gui_sg_try: kind }.merge(attrs)
  end

  # The sweep of the save bar as an example, in the style guide's tile and under Visa on the page Appearance: a row with
  # the real rail, only a picture (a press there saves nothing and says so in the guide), and Prova for each answer,
  # which plays a made-up answer on that row (GkGui.save.rehearse). The delayed answer is a good one after 6 s. sweep:
  # 'never' shows the row without the setting; answers: the Prova links drawn
  SWEEP_ANSWERS = { 'saved' => { answer: 'saved', delay: 1000 }, 'failed' => { answer: 'failed', delay: 1000 }, 'slow' => { answer: 'saved', delay: 6000 } }.freeze
  def gk_gui_stuff_sg_sweep(sweep: 'always', answers: SWEEP_ANSWERS.keys)
    content_tag(:div, safe_join([content_tag(:div, gk_gui_stuff_sg_sweep_row(sweep), class: 'gk-gui-stuff-sg-still', inert: true),
                                 content_tag(:p, l(:text_gk_gui_stuff_sg_sweep_example), class: 'gk-gui-stuff-direct-note'),
                                 content_tag(:p, gk_gui_stuff_sg_sweep_tries(sweep, answers), class: 'gk-gui-stuff-sg-try')]),
                data: { gk_gui_sg_sweep: true })
  end

  # The sweep's row and its Prova links apart, for Visa, which holds the row in its picture and Prova beside it
  def gk_gui_stuff_sg_sweep_row(sweep)
    events = l(:label_gk_gui_stuff_sg_example_events)
    gk_gui_stuff_rail(url: '#') { safe_join([events, gk_gui_stuff_switch("sg_sweep_#{sweep}", true, label: events)], ' ') }
  end

  def gk_gui_stuff_sg_sweep_tries(sweep, answers = SWEEP_ANSWERS.keys)
    tries = answers.map do |name|
      link_to l(:"label_gk_gui_stuff_sg_sweep_try_#{name}"), '#', data: { gk_gui_sg_try: 'sweep', gk_gui_sg_sweep_mode: sweep }.merge(SWEEP_ANSWERS.fetch(name).transform_keys { |k| :"gk_gui_sg_#{k}" })
    end
    safe_join(tries, ' | ')
  end

  # Visa: a setting's Av and På side by side, side by side as long as there is room. Under the fixed flag Exempel, an
  # element of its own that says what the pictures are; both pictures inert, so that neither the pointer nor the keyboard
  # reaches their links and fields (a press on one says that the example leads nowhere, gk_gui_stuff_styleguide.js). Av is
  # also a still sample, as Redmine's own, which a module's stylesheet leaves alone. Prova stands outside the picture.
  # mid_line: a dashed line in the role effect through the middle of the text, over the whole example, where a setting
  # moves something in height. off or on as an Array: rows of their own, each with its own line. stack: one over the
  # other, for an example that needs the width. try_off, try_on: the Prova links of each side. note: more words after the
  # flag. side_data: data attributes on each side, for a Prova that looks for its picture there
  def gk_gui_stuff_sg_compare(off:, on:, mid_line: false, stack: false, try_off: nil, try_on: nil, note: nil, side_data: {})
    try = try_off.present? || try_on.present?
    words = [l(try ? :text_gk_gui_stuff_compare_example_try : :text_gk_gui_stuff_compare_example), mid_line ? l(:text_gk_gui_stuff_compare_mid_line) : nil, note].compact.join(' ')
    head = content_tag(:p, safe_join([gk_gui_stuff_flag(l(:label_gk_gui_stuff_compare_example), inline: true, role: :tip), words], ' '), class: 'gk-gui-stuff-compare-head')
    side = lambda do |word, shown, tries, still|
      rows = Array(shown).map { |r| content_tag(:div, r, class: ['gk-gui-stuff-compare-row', mid_line ? 'gk-gui-stuff-compare-mid' : nil].compact.join(' ')) }
      picture = content_tag(:div, safe_join(rows), class: ['gk-gui-stuff-compare-picture', still ? 'gk-gui-stuff-sg-still' : nil].compact.join(' '), inert: true, data: { gk_gui_compare_picture: true })
      parts = [content_tag(:figcaption, word), picture, tries.present? ? content_tag(:p, tries, class: 'gk-gui-stuff-sg-try') : nil]
      content_tag(:figure, safe_join(parts.compact), class: 'gk-gui-stuff-compare-side', data: side_data)
    end
    sides = side.call(l(:label_gk_gui_stuff_col_off), off, try_off, true) + side.call(l(:label_gk_gui_stuff_col_on), on, try_on, false)
    content_tag(:div, head + content_tag(:div, sides, class: 'gk-gui-stuff-compare-sides'),
                class: ['gk-gui-stuff-compare', stack ? 'gk-gui-stuff-compare-stack' : nil].compact.join(' '),
                data: { gk_gui_compare: true, gk_gui_sg_nowhere: l(:text_gk_gui_stuff_sg_nowhere) })
  end

  # Core's badges as core draws them: an open and a closed status (their names given), locked and private; the style
  # guide's row and the previews of badges under Visa. only: the badges drawn, of :open, :closed, :locked and :private,
  # in that order (all four without it)
  def gk_gui_stuff_sg_badges(open = nil, closed = nil, only: nil)
    badges = { open: content_tag(:span, open, class: 'badge badge-status-open'), closed: content_tag(:span, closed, class: 'badge badge-status-closed'),
               locked: content_tag(:span, l(:status_locked), class: 'badge badge-status-locked'), private: content_tag(:span, l(:field_is_private), class: 'badge badge-private') }
    safe_join(only ? badges.slice(*only).values : badges.values, ' ')
  end

  # The fold (gk_gui_stuff_fold.js) closed, as the script leaves a long block: the block itself cut at height px with
  # the shade, and the bar on its lower edge with its icon and Visa allt. Still, so that nothing opens and the script
  # passes it by. tag and html_class: the long block's own element (a wiki text, a pre); content: what it holds; slot:
  # what stands in the fold list's slot, as the script lays it
  def gk_gui_stuff_sg_fold(tag, content, html_class: nil, height: 72, slot: nil)
    block = content_tag(tag, content, class: [html_class, 'gk-gui-stuff-fold gk-gui-stuff-fold-host'].compact.join(' '),
                                      style: "max-block-size: #{height.to_i}px;", data: { gk_gui_stuff_fold: 'sample' })
    bar = content_tag(:button, safe_join([gk_gui_stuff_icon('angle-down', size: 14), l(:gk_gui_stuff_fold_more)], ' '),
                      type: 'button', class: 'gk-gui-stuff-fold-btn gk-gui-stuff-fold-icon gk-gui-stuff-fold-bar', 'aria-expanded': 'false')
    bar = content_tag(:div, content_tag(:div, slot, class: 'gk-gui-stuff-fold-slot') + bar, class: 'gk-gui-stuff-fold-list') if slot
    content_tag(:div, block + bar, class: 'gk-gui-stuff-sg-still', inert: true)
  end

  # Core's messages (render_flash_messages) with the words given instead of the request's flash, which is left as it
  # is; core's own helper draws them, so that each series shows its own.
  # Core gives each message the id flash_<kind>, which is the page's own message's: an id stands once in a page, and
  # a page can show several examples. An example is therefore drawn without the id and carries
  # data-gk-gui-sg-flash="<kind>" instead. The id is left out where core hands it to content_tag (the tag whose id is
  # flash_<kind> for a kind given here), so the drawn HTML is never read or rewritten; every other tag core draws on
  # the way (the icon) passes as it is
  def gk_gui_stuff_sg_flash(messages)
    shown = ActionDispatch::Flash::FlashHash.new(messages.transform_keys(&:to_s))
    kinds = shown.keys.to_h { |k| ["flash_#{k}", k] }
    define_singleton_method(:flash) { shown }
    define_singleton_method(:content_tag) do |name, content = nil, options = nil, escape = true, &block|
      given = block ? content : options
      kind = given.is_a?(Hash) ? kinds[(given[:id] || given['id']).to_s] : nil
      if kind
        mine = given.except(:id, 'id').merge('data-gk-gui-sg-flash' => kind)
        block ? (content = mine) : (options = mine)
      end
      super(name, content, options, escape, &block)
    end
    render_flash_messages
  ensure
    %i[flash content_tag].each { |m| singleton_class.send(:remove_method, m) if singleton_class.instance_methods(false).include?(m) }
  end

  # The line's example (GkGuiStuff::Line): two halves, two lanes, all four states, a step with a required reason,
  # one with an optional reason in the second lane, one with the lock, the way gone and "förväntat nu"; every word from
  # the locale files and the dates from today. key: unique on the page; save: the address a step posts to (mode :save);
  # chosen: the step pressed in a form (mode :choose); editable: four steps with the inputs of the guide's own form,
  # one of them the system's suggestion and two on the same place (the collision, cleared by moving one); crowd: two
  # neighbours with long labels and a third between them (the lifted label and the cut one), and a step on the same
  # place as another (the collision)
  def gk_gui_stuff_sg_line_data(key, save: nil, chosen: nil, editable: false, crowd: false)
    t = ->(k) { l(:"label_gk_gui_stuff_sg_example_#{k}") }
    day = ->(n) { format_date(Date.today - n) }
    band = ->(k, upto) { { key: k, label: t.call("band_#{k}"), upto: upto } }
    since = l(:text_gk_gui_stuff_sg_example_since, date: day.call(10))
    steps = [
      { id: '1', label: t.call('step_new'), half: 'open', at: 40, lane: 'main', band: 'incoming', state: :done, when: day.call(18) },
      { id: '2', label: t.call('step_analysis'), half: 'open', at: 260, lane: 'main', band: 'active', state: :done, when: day.call(15) },
      { id: '3', label: t.call('step_action'), half: 'open', at: 420, lane: 'main', band: 'active', state: :now, when: since },
      { id: '4', label: t.call('step_waiting'), half: 'open', at: 540, lane: 'main', band: 'active', state: :other },
      { id: '5', label: t.call('step_verification'), half: 'open', at: 720, lane: 'main', band: 'active', state: :next, reason: :off },
      { id: '6', label: t.call('step_approved'), half: 'open', at: 900, lane: 'main', band: 'settled', state: :next, reason: :off, elevate: true },
      { id: '9', label: t.call('complaint'), half: 'open', at: 600, lane: 'complaint', band: 'active', state: :next, reason: :optional },
      { id: '7', label: t.call('step_closed'), half: 'closed', at: 300, lane: 'main', band: 'closed', state: :next, reason: :required,
        reason_box: { text: l(:text_gk_gui_stuff_sg_example_closes), button: l(:label_gk_gui_stuff_sg_example_action) } },
      { id: '8', label: t.call('step_archived'), half: 'closed', at: 900, lane: 'main', band: 'archived', state: :other }
    ]
    steps.each { |s| s[:chosen] = s[:id] == chosen.to_s } if chosen
    if crowd
      steps += [{ id: '10', label: t.call('step_review_customer'), half: 'open', at: 300, lane: 'main', band: 'active', state: :other },
                { id: '11', label: t.call('step_review_internal'), half: 'open', at: 330, lane: 'main', band: 'active', state: :other },
                { id: '12', label: t.call('step_waiting_supplier'), half: 'open', at: 360, lane: 'main', band: 'active', state: :other },
                { id: '13', label: t.call('step_waiting_supplier'), half: 'open', at: 540, lane: 'main', band: 'active', state: :other }]
    end
    if editable
      steps = steps.select { |s| %w[1 3 4 7].include?(s[:id]) }.map do |s|
        s.slice(:id, :label, :half, :at, :lane, :band).merge(state: :other, suggested: s[:id] == '7', at: s[:id] == '4' ? 420 : s[:at],
                                                             inputs: { half: "sg_line[#{s[:id]}][side]", at: "sg_line[#{s[:id]}][expected]", lane: "sg_line[#{s[:id]}][lane]" })
      end
    end
    { key: key, title: l(:text_gk_gui_stuff_sg_example_line_title), max: 999,
      halves: [{ key: 'open', label: t.call('half_work'), weight: 7, bands: [band.call('incoming', 199), band.call('active', 799), band.call('settled', 999)], marks: [] },
               { key: 'closed', label: t.call('half_closing'), weight: 2, bands: [band.call('closed', 799), band.call('archived', 999)],
                 marks: [{ key: 'reopen_anyone', at: 333, label: t.call('reopen_anyone') }, { key: 'reopen_reason', at: 666, label: t.call('reopen_reason') }] }],
      lanes: [{ key: 'main', label: t.call('lane_main') }, { key: 'complaint', label: t.call('complaint') }],
      steps: steps,
      texts: { marks: t.call('reopen_lead') },
      track: editable ? [] : [{ half: 'open', lane: 'main', from: 40, to: 420 }],
      expected_now: editable ? nil : { half: 'open', lane: 'main', at: 660 },
      summary: l(:text_gk_gui_stuff_sg_example_summary, status: t.call('step_action'), since: since, band: t.call('band_active'), expected: t.call('step_verification')),
      save: save ? { url: save, method: :post, name: 'status_id', after: :none } : nil,
      field: chosen ? { select_id: "#{key}-select", current: '3' } : nil,
      edit: editable ? { form: "#{key}-form", limits: { 'active' => 'sg_limits[active]' }, marks: {}, band_cells: true } : nil }
  end

  private

  # the mark of each level, as the notice's script draws it (gk_gui_stuff_elements.js)
  SG_NOTE_MARK = { 'tip' => 'help', 'info' => 'help', 'notice' => 'checked', 'warning' => 'warning', 'alarm' => 'warning', 'critical' => 'warning' }.freeze

  def gk_gui_stuff_sg_close_button(cls, label, size = 14)
    content_tag(:button, gk_gui_stuff_icon('close', size: size), type: 'button', class: cls, title: label, 'aria-label': label)
  end

  # a notice: the level's mark, the text, an icon button when given (icon:, label:) and the cross; no countdown, as a
  # notice of warning and up has none
  def gk_gui_stuff_sg_still_notice(o)
    lv = SG_NOTE_MARK.key?(o[:level].to_s) ? o[:level].to_s : 'info'
    # beside an icon button the cross is one too, so that the two stand on one line
    cross = o[:icon] ? gk_gui_stuff_icon_button(:close, l(:gk_gui_stuff_dismiss)) : gk_gui_stuff_sg_close_button('gk-gui-stuff-note-close', l(:gk_gui_stuff_dismiss))
    buttons = [o[:icon] ? gk_gui_stuff_icon_button(o[:icon], o[:label]) : nil, cross].compact
    # buttons in words, Visa and Stäng on the fold's notice: the same as a script draws them, without the cross
    buttons = Array(o[:words]).map { |w| content_tag(:button, w, type: 'button', class: 'gk-gui-stuff-btn') } if o[:words]
    content_tag(:div, safe_join([content_tag(:span, gk_gui_stuff_icon(SG_NOTE_MARK[lv], size: 14), class: 'gk-gui-stuff-note-mark'),
                                 content_tag(:span, o[:text], class: 'gk-gui-stuff-note-text'), content_tag(:span, safe_join(buttons), class: 'gk-gui-stuff-note-buttons')]),
                class: "gk-gui-stuff-note gk-gui-stuff-note-#{lv}")
  end

  # Visa var as its script draws it, laid in the page: the arrow up and down with its word, Tillbaka, the target with
  # its ring standing still, and a step with its text and Nästa
  def gk_gui_stuff_sg_still_where(o)
    arrow = lambda do |dir, text, extra = nil|
      mark = content_tag(:span, gk_gui_stuff_icon(dir == :up ? 'angle-up' : 'angle-down', size: 16), class: 'gk-gui-stuff-where-mark', 'aria-hidden': 'true')
      content_tag(:button, safe_join([mark, content_tag(:span, text, class: 'gk-gui-stuff-where-word')]), type: 'button',
                                                                                                          class: ['gk-gui-stuff-where-arrow', extra].compact.join(' '), data: { gk_gui_where: dir })
    end
    step = content_tag(:div, safe_join([arrow.call(:down, o[:word]), gk_gui_stuff_sg_close_button('gk-gui-stuff-where-close', l(:gk_gui_stuff_close)),
                                        content_tag(:p, o[:text], class: 'gk-gui-stuff-where-text'),
                                        content_tag(:button, o[:next], type: 'button', class: 'gk-gui-stuff-where-next')]), class: 'gk-gui-stuff-where-step')
    content_tag(:div, safe_join([arrow.call(:up, o[:word]), content_tag(:span, o[:goal], class: 'gk-gui-stuff-sg-where-goal gk-gui-stuff-where-ring'),
                                 arrow.call(:down, o[:back], 'gk-gui-stuff-where-back'), step]), class: 'gk-gui-stuff-sg-where-still')
  end

  # a banner: the text, then the icon button when given, else the cross
  def gk_gui_stuff_sg_still_banner(o)
    button = o[:icon] ? gk_gui_stuff_icon_button(o[:icon], o[:label]) : gk_gui_stuff_sg_close_button('gk-gui-stuff-banner-close', l(:gk_gui_stuff_dismiss))
    content_tag(:div, safe_join([content_tag(:span, o[:text], class: 'gk-gui-stuff-banner-text'), button]), class: "gk-gui-stuff-banner gk-gui-stuff-banner-#{o[:level] || 'info'}")
  end

  # the surface with its title and cross over the dimmed page; :palette, the palette's field and list in it, the first
  # row marked as the arrow keys mark it
  def gk_gui_stuff_sg_still_surface(kind, o)
    head = content_tag(:div, safe_join([content_tag(:h3, o[:title].to_s, class: 'gk-gui-stuff-surface-title'), content_tag(:div, '', class: 'gk-gui-stuff-surface-buttons'),
                                        gk_gui_stuff_sg_close_button('gk-gui-stuff-surface-close', l(:gk_gui_stuff_close), 18)]), class: 'gk-gui-stuff-surface-head')
    body = if kind == :palette
             items = Array(o[:items]).each_with_index.map do |t, i|
               content_tag(:li, content_tag(:span, t, class: 'gk-gui-stuff-palette-label'), class: ['gk-gui-stuff-palette-item', i.zero? ? 'gk-gui-stuff-palette-at' : nil].compact.join(' '))
             end
             content_tag(:div, safe_join([tag.input(type: 'text', class: 'gk-gui-stuff-palette-input', placeholder: o[:placeholder], 'aria-label': o[:placeholder], readonly: true),
                                          content_tag(:ul, safe_join(items), class: 'gk-gui-stuff-palette-list')]), class: 'gk-gui-stuff-palette-body')
           else
             content_tag(:p, o[:text])
           end
    content_tag(:div, head + content_tag(:div, body, class: 'gk-gui-stuff-surface-body'), class: 'gk-gui-stuff-surface')
  end

  # the wave standing: the backdrop at its default strength and the word in capitals
  def gk_gui_stuff_sg_still_wave(o)
    text = content_tag(:div, safe_join([content_tag(:div, o[:word].to_s.upcase, class: 'gk-gui-stuff-wave-word'), content_tag(:div, o[:text].to_s, class: 'gk-gui-stuff-wave-line')]),
                       class: 'gk-gui-stuff-wave-text')
    content_tag(:div, safe_join([content_tag(:div, '', class: 'gk-gui-stuff-wave-backdrop', style: 'opacity: 0.6;'), content_tag(:div, '', class: 'gk-gui-stuff-wave-motion'), text]),
                class: 'gk-gui-stuff-wave gk-gui-stuff-wave-done gk-gui-stuff-wave-on')
  end

  # the fold in the page's corner with its count and its card open: the title, reload and the cross, the changes
  def gk_gui_stuff_sg_still_corner(o)
    entries = Array(o[:entries])
    title = l(:gk_gui_stuff_corner_title)
    fold = content_tag(:button, content_tag(:span, entries.size, class: 'gk-gui-stuff-corner-count'), type: 'button', class: 'gk-gui-stuff-corner-fold',
                                                                                                      'aria-expanded': 'true', 'aria-label': "#{title} (#{entries.size})")
    head = content_tag(:div, safe_join([content_tag(:strong, title),
                                        content_tag(:span, gk_gui_stuff_icon_button(:reload, l(:gk_gui_stuff_reload)) + gk_gui_stuff_icon_button(:close, l(:gk_gui_stuff_dismiss)),
                                                    class: 'gk-gui-stuff-corner-buttons')]), class: 'gk-gui-stuff-corner-head')
    card = content_tag(:div, head + content_tag(:ul, safe_join(entries.map { |e| content_tag(:li, e) })), class: 'gk-gui-stuff-corner-card')
    content_tag(:div, content_tag(:div, fold + card, class: 'gk-gui-stuff-corner gk-gui-stuff-corner-info'), class: 'gk-gui-stuff-corner-host gk-gui-stuff-sg-still-page')
  end

  # the drawer open at the foot with its one tab and its body
  def gk_gui_stuff_sg_still_drawer(o)
    tab = content_tag(:div, safe_join([content_tag(:button, o[:title], type: 'button', class: 'gk-gui-stuff-drawer-name'),
                                       gk_gui_stuff_sg_close_button('gk-gui-stuff-drawer-x', l(:gk_gui_stuff_close))]), class: 'gk-gui-stuff-drawer-tab gk-gui-stuff-drawer-tab-on')
    content_tag(:div, content_tag(:div, tab, class: 'gk-gui-stuff-drawer-tabs') + content_tag(:div, content_tag(:p, o[:text]), class: 'gk-gui-stuff-drawer-body'),
                class: 'gk-gui-stuff-drawer')
  end

  # the layer as GkGui.layer.open draws it: the title, the cross and the body
  def gk_gui_stuff_sg_still_layer(o)
    head = content_tag(:div, safe_join([content_tag(:h3, o[:title], class: 'gk-gui-stuff-layer-title'),
                                        content_tag(:button, '×', type: 'button', class: 'gk-gui-stuff-layer-close', title: l(:gk_gui_stuff_close), 'aria-label': l(:gk_gui_stuff_close))]),
                       class: 'gk-gui-stuff-layer-head')
    content_tag(:div, head + content_tag(:div, content_tag(:p, o[:text]), class: 'gk-gui-stuff-layer-body'), class: 'gk-gui-stuff-layer')
  end
end
