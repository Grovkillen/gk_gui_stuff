# frozen_string_literal: true

module GkGuiStuff
  # The marker, a primitive of its own file: shows where a setting or a function changes something on the page. A
  # dashed outline in the role ui-effect around every place found (an outline, so nothing moves), solid at the current
  # place, with a striped flag there: "Ändrat: <setting> · 1 av N" (kind changed) or "Nytt: …" (kind new). What went
  # away stands as a quiet row "Borta: …" with "Visa var den stod" when its place is known. A screen
  # reader hears each place in a live region. The marker finds a place only by the footprint's anchors (footprint.rb in
  # gk_records: anchors:, adds:, removes:) and by the effect mark data-gk-<plugin>-effect; never by text, look, place or
  # a guessed nesting. Drawn by gk_gui_stuff_marker.js (GkGui.marker) and gk_gui_stuff_marker.css, both on every page
  # (Hooks#instance_head).
  #
  # It lasts as long as its caller says: the preview mode (GkGui.marker.show(items, { mode: 'preview' }) and hide()
  # when the mode ends), and after a save on Utseende or Funktioner until the administrator leaves the page. After a
  # save the marks start off: the panel has Visa markeringar and the number of places, and the person switches them on
  # and off with that button. The save is noted in the administrator's own session (note), and the first page drawn for the
  # same administrator outside the two settings pages (SETTINGS_PAGES: the save's own redirect back is not where it
  # shows) takes it out (take) and marks it; never another person, never a second page.
  module Marker
    SESSION_KEY = 'gk_gui_stuff_marks'
    # where a save is noted from
    FROM = %w[appearance features].freeze
    # the settings pages themselves, by their controllers: the note waits there for the first page outside them
    SETTINGS_PAGES = %w[gk_gui_stuff_appearance gk_gui_stuff_features].freeze
    # what the page is told: changed and new are marked, gone is a quiet row, and a setting whose footprint says
    # nothing is marked only where its effect mark is found; a setting with no place on the page, described or not, has
    # a row in the panel that says so, and the band's part then has no count
    KINDS = %w[changed new gone].freeze
    KEY = /\A[a-z0-9_]+(?:\.[a-z0-9_]+)+\z/
    # the session is a cookie: the noted keys are cut here, so that a large save never fills it
    MAX_CHARS = 1500
    # the band's part
    PART = 'gui_stuff.marks'
    # The script's words, with the primitives' on every page (gk-gui-stuff-primitives-texts, marker_<name>); %{...}
    # filled by the script
    WORDS = { marker_changed: :label_gk_gui_stuff_marker_changed, marker_new: :label_gk_gui_stuff_marker_new,
              marker_gone: :label_gk_gui_stuff_marker_gone, marker_gone_in: :label_gk_gui_stuff_marker_gone_in,
              marker_of: :label_gk_gui_stuff_marker_of, marker_at: :text_gk_gui_stuff_marker_at,
              marker_places_one: :text_gk_gui_stuff_marker_places_one, marker_places_other: :text_gk_gui_stuff_marker_places_other,
              marker_places_none: :text_gk_gui_stuff_marker_places_none, marker_none_here: :text_gk_gui_stuff_marker_none_here,
              marker_hidden: :text_gk_gui_stuff_marker_hidden,
              marker_all: :label_gk_gui_stuff_marker_all, marker_where: :button_gk_gui_stuff_marker_where,
              marker_shown_gone: :text_gk_gui_stuff_marker_shown_gone, marker_first: :text_gk_gui_stuff_marker_first }.freeze

    module_function

    # An administrator with a real id: only one is ever marked for
    def admin?(user)
      return false unless user.respond_to?(:admin?) && user.respond_to?(:id)

      user.admin? && user.id.to_i.positive? ? true : false
    end

    # The save noted in the session for the next page. changes: { key => [on before, on after] }. A later save before
    # that page replaces the note. Returns the keys noted.
    def note(session, user, from:, changes:)
      return [] unless session && admin?(user) && FROM.include?(from.to_s)

      list = []
      size = 0
      changes.each do |key, (was, now)|
        k = key.to_s
        next unless KEY.match?(k)

        entry = "#{k}|#{was ? 1 : 0}|#{now ? 1 : 0}"
        break if size + entry.size > MAX_CHARS

        list << entry
        size += entry.size + 1
      end
      return [] if list.empty?

      session[SESSION_KEY] = { 'u' => user.id.to_i, 'f' => from.to_s, 'k' => list }
      list.map { |e| e.split('|').first }
    end

    # The noted save taken out of the session: [[from, key, on before, on after], ...]; [] for another person, for one
    # who is no longer an administrator (the note is dropped all the same) and for anything not noted here
    def take(session, user)
      return [] unless session

      raw = session.delete(SESSION_KEY)
      return [] unless raw.is_a?(Hash) && admin?(user) && raw['u'].to_i == user.id.to_i
      return [] unless FROM.include?(raw['f'].to_s)

      Array(raw['k']).filter_map do |e|
        key, was, now = e.to_s.split('|')
        KEY.match?(key.to_s) ? [raw['f'].to_s, key, was == '1', now == '1'] : nil
      end
    end

    # What the page marks, from the entries take gave: each a Hash for the script,
    #   { key:, setting:, kind: 'changed' | 'new' | 'gone', anchors: [...], what: }
    # describe.call(from, key) gives { label:, footprint:, effect: } (the footprint as records keeps it, with string
    # keys and only stable anchors; effect: the selector of the effect mark) or nil for a key no longer declared.
    # t.call(locale_key, default) names what a footprint adds or removes.
    # A setting switched on: its anchors and effect mark are changed, what it adds is new, what it removes is gone;
    # switched off, the other way round; changed while on (a level, a value), only its anchors and effect mark.
    def items(entries, describe:, t: ->(_k, d) { d })
      entries.flat_map do |from, key, was, now|
        d = describe.call(from, key)
        next [] unless d

        fp = d[:footprint].is_a?(Hash) ? d[:footprint] : {}
        setting = d[:label].to_s
        anchors = (Array(fp['anchors']).map(&:to_s) + [d[:effect]].compact.map(&:to_s)).reject { |a| a.strip.empty? }.uniq
        out = [{ key: key, setting: setting, kind: 'changed', anchors: anchors }]
        if now != was
          added, removed = now ? %w[new gone] : %w[gone new]
          Array(fp['adds']).each { |e| out << listed(e, key, setting, added, t) }
          Array(fp['removes']).each { |e| out << listed(e, key, setting, removed, t) }
        end
        out.compact
      end
    end

    # One thing a footprint adds or removes, as new or gone: its anchor, and the words that name it (else the setting's)
    def listed(entry, key, setting, kind, t)
      h = entry.is_a?(Hash) ? entry.transform_keys(&:to_s) : { 'anchor' => entry.to_s }
      anchor = h['anchor'].to_s
      return nil if anchor.strip.empty?

      what = h['label'].to_s.empty? ? setting : t.call(h['label'], setting).to_s
      item = { key: key, setting: setting, kind: kind, anchors: [anchor], what: what }
      # a gone thing is no longer on the page: its anchor only says where it stood, when an element still has that place
      kind == 'gone' ? item.merge(anchors: [], where: anchor) : item
    end

    # ---- in Rails

    # What this page marks, taken once per request and kept on the controller, so that the head, the band and its
    # panel read the same: [] when nothing was noted, and on anything that fails (logged, the page drawn as always)
    def for_page(controller)
      return [] unless controller
      return controller.instance_variable_get(:@gk_gui_stuff_marks) if controller.instance_variable_defined?(:@gk_gui_stuff_marks)
      # core's password confirmation stands in place of the page asked for: the note waits for that page
      return [] if controller.instance_variable_get(:@sudo_form)
      # the settings pages (the save's redirect back, a second save there): the note waits for the first page outside
      return [] if controller.respond_to?(:controller_name) && SETTINGS_PAGES.include?(controller.controller_name.to_s)

      list = begin
        session = controller.respond_to?(:session) ? controller.session : nil
        entries = defined?(::User) ? take(session, ::User.current) : []
        entries.empty? ? [] : items(entries, describe: method(:describe), t: ->(k, d) { ::I18n.t(k, default: d) })
      rescue StandardError => e
        ::Rails.logger.warn("[gk_gui_stuff] marks left out: #{e.class} #{e.message}") if defined?(::Rails) && ::Rails.respond_to?(:logger) && ::Rails.logger
        []
      end
      controller.instance_variable_set(:@gk_gui_stuff_marks, list)
    end

    # A key's words, footprint and effect mark from records' registers
    def describe(from, key)
      reg = from == 'features' ? GkGuiStuff.features : GkGuiStuff.appearance_settings
      row = reg&.find(key)
      return nil unless row

      fp = reg.footprint(key)
      fp = ::GkRecords::Footprint.stable(fp) if fp && defined?(::GkRecords::Footprint)
      effect = defined?(::GkRecords::Footprint) ? ::GkRecords::Footprint.effect_selector(key) : nil
      { label: row.label, footprint: fp, effect: effect }
    end

    # The settings a page marks, by name, in their order
    def settings(list) = list.map { |i| i[:setting] }.uniq

    # The band's part while a page marks a save: in the admin role (only the administrator who saved sees it), light,
    # its panel the marker's own (gk_gui_stuff_marker_panel); the script gives it the number of places as its count
    def register_band!
      TopBand.register(
        PART, plugin: :gk_gui_stuff, weight: :other, icon: 'edit', role: :admin,
              condition: ->(view) { view.respond_to?(:controller) && for_page(view.controller).any? },
              full: lambda { |view|
                names = settings(for_page(view.controller))
                if names.size == 1
                  ::I18n.t(:label_gk_gui_stuff_marker_part_one, setting: names.first)
                else
                  ::I18n.t(:label_gk_gui_stuff_marker_part_other, count: names.size)
                end
              },
              short: :label_gk_gui_stuff_marker_part_short,
              title: :label_gk_gui_stuff_marker_part_title,
              html: { data: { gk_gui_marker_part: '1' } },
              panel: ->(view) { view.gk_gui_stuff_marker_panel }
      )
    end
  end

  module PrimitivesHelper
    # The marker's panel, the same wherever it stands (the page, the band's part, the preview's panel), with fixed
    # places, so that nothing moves when the marks go on and off: the button Visa markeringar / Dölj markeringar, the
    # number ("4 ställen", with the marks on "1 av 4"), Föregående and Nästa (switched off with the tip "Visa markeringarna
    # först" while the marks are off), Visa alla…, the row of what is gone (always there, empty when nothing is), and
    # the quiet rows for what does not show on this page. The button and the number hold all their words on top of each
    # other, so that their size stays. The script fills it; for a still picture places: and rows: draw it as it would
    # ([{ text:, where: true, index: }], where: the row's Visa var den stod). scope: 'page' for the page's own marks,
    # anything else for an example. items: what an example shows, taken up by the script at the first press, among
    # the places under the nearest data-gk-gui-marker-root.
    def gk_gui_stuff_marker_panel(scope: 'page', places: nil, rows: [], items: nil, html: {})
      t = ->(k, **o) { ::I18n.t(k, **o) }
      words = lambda do |n|
        if n.nil? then ''
        elsif n.zero? then t.(:text_gk_gui_stuff_marker_places_none)
        elsif n == 1 then t.(:text_gk_gui_stuff_marker_places_one)
        else t.(:text_gk_gui_stuff_marker_places_other, count: n)
        end
      end
      word = ->(k, which) { content_tag(:span, t.(k), data: { gk_gui_marker_word: which }) }
      toggle = button_tag(content_tag(:span, safe_join([word.(:button_gk_gui_stuff_marker_show, 'show'), word.(:button_gk_gui_stuff_marker_hide, 'hide')]),
                                          class: 'gk-gui-stuff-marker-stack'),
                          type: 'button', data: { gk_gui_marker: 'toggle' })
      room = ->(text) { content_tag(:span, text, class: 'gk-gui-stuff-marker-room', 'aria-hidden': 'true', data: { gk_gui_marker_room: '1' }) }
      count = content_tag(:span, safe_join([content_tag(:span, words.(places), data: { gk_gui_marker_places: '1' }), room.(words.(places)),
                                            room.(places.nil? ? '' : t.(:label_gk_gui_stuff_marker_of, n: places, total: places))]),
                          class: 'gk-gui-stuff-marker-stack gk-gui-stuff-marker-count')
      step = lambda do |which, k|
        button_tag(t.(k), type: 'button', class: 'no-tooltip', title: t.(:text_gk_gui_stuff_marker_first), 'aria-disabled': 'true',
                           data: { gk_gui_marker: which, gk_gui_marker_why: t.(:text_gk_gui_stuff_marker_first) })
      end
      row = content_tag(:div, safe_join([toggle, count, step.('prev', :button_gk_gui_stuff_marker_prev), step.('next', :button_gk_gui_stuff_marker_next),
                                         button_tag(t.(:button_gk_gui_stuff_marker_all), type: 'button', data: { gk_gui_marker: 'all' })]),
                        class: 'gk-gui-stuff-band-panel-row')
      gone = content_tag(:div, safe_join(Array(rows).map { |r| gk_gui_stuff_marker_row(r[:text], where: r[:where], index: r[:index]) }),
                         class: 'gk-gui-stuff-marker-gone', data: { gk_gui_marker_rows: '1' })
      quiet = content_tag(:div, '', data: { gk_gui_marker_quiet: '1' })
      data = (html[:data] || {}).merge(gk_gui_marker_panel: scope, gk_gui_marker_on: '0')
      data[:gk_gui_marker_items] = items.to_json if items
      content_tag(:div, safe_join([row, gone, quiet]), **html.except(:data, :class), class: ['gk-gui-stuff-marker-panel', html[:class]].compact.join(' '), data: data)
    end

    # A quiet row of the marker's panel: Borta: …, with Visa var den stod when the place is known (index: the gone
    # thing's number in the marks, which the button shows)
    def gk_gui_stuff_marker_row(text, where: false, index: nil)
      parts = [content_tag(:span, text)]
      if where
        parts << button_tag(::I18n.t(:button_gk_gui_stuff_marker_where), type: 'button', class: 'gk-gui-stuff-marker-where',
                                                                          data: { gk_gui_marker: 'where', gk_gui_marker_index: index&.to_s })
      end
      content_tag(:p, safe_join(parts, ' '), class: 'gk-gui-stuff-marker-row')
    end

    # A place marked as the server draws it, for a still picture (the style guide, a window that shows where a setting
    # shows): the content (or the block) in tag with the marker's dashed outline; current: true, the solid outline and
    # the striped flag label: on it (kind :changed or :new, in the role ui-effect).
    def gk_gui_stuff_mark(content = nil, kind: :changed, label: nil, current: false, tag: :span, html: {}, &block)
      k = kind.to_s
      raise ArgumentError, "a mark is changed or new, not #{kind.inspect}" unless %w[changed new].include?(k)

      inner = block ? capture(&block) : content
      # an inline mark with an element in it is one box, as the script makes such a place (see the frame in the stylesheet)
      box = tag.to_sym == :span && inner.to_s.include?('<') ? '1' : nil
      data = (html[:data] || {}).merge(gk_gui_mark: k, gk_gui_mark_current: current ? '1' : nil, gk_gui_mark_box: box).compact
      attrs = html.merge(data: data)
      return content_tag(tag, inner, **attrs) unless current && label.present?

      gk_gui_stuff_flagged(inner, [{ text: label, kind: k.to_sym, role: :effect }], tag: tag, html: attrs)
    end
  end
end
