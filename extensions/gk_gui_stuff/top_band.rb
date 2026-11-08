# frozen_string_literal: true

module GkGuiStuff
  # The top band as a row of parts. A part is a state that holds for the whole page or the session (the person at a
  # shared computer, a preview, an operation that runs), registered by a plugin and drawn in the same band as the
  # instance's role, which always stands first. In the band a part shows only its icon, a short word and at most one
  # count; never buttons, segments, fields or links. What can be done with it stands in its panel, which the part
  # opens under itself (a fly fastened in the band, one at a time, Esc and a click outside close it, a sheet below
  # 899 px). A part is drawn whenever its condition holds, also in production and when the module instance_band is off.
  #
  #   GkGuiStuff::TopBand.register('people.actor', plugin: :gk_people, weight: :shared_computer, icon: 'user',
  #                                role: ->(view) { ... ? :info : :quiet }, full: ->(view) { ... }, short: ->(view) { ... },
  #                                count: nil, panel: ->(view) { view.render(partial: ...) }, condition: ->(view) { ... })
  #
  # role: admin for what exists only under elevation, info for a chosen person, quiet for an operation that runs; never
  # the alarm, which is the banner's. weight: preview, shared_computer, operation or other, or a number that ranks among
  # the others (1 to 199); the band orders the parts by weight and shrinks the lightest first. full and short: the part's
  # two lengths of words (a String, a locale key as a Symbol, or a lambda of the view); the third length is the icon with
  # the count. count: an Integer, or a short number as text (62 %). panel: the panel's content (html, or a lambda of the
  # view giving html); without one the part cannot be opened. title: the panel's heading, the full words by default.
  # html: classes and data of the plugin's own on the part (a lambda of the view, or a Hash). Every value but key, plugin,
  # weight and condition may be a lambda of the view.
  module TopBand
    # A plugin may ask for this before it registers a part in this form
    API = 2
    # The part's role and the primitive's role class it is drawn with
    ROLES = { 'admin' => 'admin', 'info' => 'info', 'quiet' => 'muted' }.freeze
    # Never in the top band: what alarms is the banner's
    REFUSED_ROLES = %w[alarm critical warning].freeze
    # The order after the instance's role: heavier first, and the lightest shrinks first
    WEIGHTS = { 'preview' => 400, 'shared_computer' => 300, 'operation' => 200, 'other' => 100 }.freeze
    OTHER_MAX = 199
    LENGTHS = %w[full short icon].freeze
    # A count longer than this is no count
    COUNT_MAX = 8
    # What the page's head links when a part is drawn (besides gk_gui_stuff_elements, which the instance's band shares):
    # the real band is drawn after the head is written, so a primitive in a panel cannot add its own files there; the
    # band's script, and the view segment of the preview's Before and After
    HEAD_STYLESHEETS = %w[gk_gui_stuff_view_segment].freeze
    HEAD_SCRIPTS = %w[gk_gui_stuff_top_band gk_gui_stuff_view_segment].freeze

    Part = Struct.new(:key, :plugin, :condition, :role, :icon, :full, :short, :count, :weight, :panel, :title, :html,
                      keyword_init: true)
    # A part as drawn on one page, every value given
    Drawn = Struct.new(:key, :role, :icon, :full, :short, :count, :weight, :panel, :title, :html, keyword_init: true) do
      # Only a part with a panel has something to press; one without is words, not a button that opens nothing
      def openable? = panel.present?
      # What a screen reader hears and the tooltip says: the full words, and the count after them
      def said = count.nil? ? full : "#{full}, #{count}"
    end

    module_function

    def all = (@all ||= {})

    # A part's definition, checked, not registered (the style guide draws made-up ones)
    def define(key, plugin:, role:, icon:, full:, short: nil, count: nil, weight: :other, panel: nil, title: nil, html: nil, condition: nil)
      k = key.to_s.strip
      raise ArgumentError, 'a top band part needs a key' if k.empty?
      raise ArgumentError, "top band part #{k} has no icon" if !icon.respond_to?(:call) && icon.to_s.strip.empty?
      raise ArgumentError, "top band part #{k} has no words" if !full.respond_to?(:call) && full.to_s.strip.empty?

      role_name(role) unless role.respond_to?(:call)
      Part.new(key: k, plugin: plugin.to_s, condition: condition, role: role, icon: icon, full: full, short: short, count: count,
               weight: weight_of(weight), panel: panel, title: title, html: html)
    end

    # A plugin registers its part once, after start. The band takes only parts: a plugin older than this that still
    # hands over a block drawing a whole segment gets no place in the band, but must not stop Redmine from starting, so
    # the call is logged and registers nothing.
    def register(key, plugin:, condition: nil, **attrs, &renderer)
      if renderer && !attrs.key?(:full)
        Rails.logger.warn("[gk_gui_stuff] top band part #{key} (#{plugin}) not registered: the band takes only parts; this plugin needs a newer version")
        return nil
      end

      p = define(key, plugin: plugin, condition: condition, **attrs)
      all[p.key] = p
    end

    def unregister(key) = all.delete(key.to_s)

    def role_name(role)
      r = role.to_s
      raise ArgumentError, 'the top band never carries the alarm' if REFUSED_ROLES.include?(r)
      raise ArgumentError, "unknown top band role #{role.inspect}" unless ROLES.key?(r)

      r
    end

    def weight_of(weight)
      return weight.clamp(1, OTHER_MAX) if weight.is_a?(Integer)

      WEIGHTS.fetch(weight.to_s) { raise ArgumentError, "unknown top band weight #{weight.inspect}" }
    end

    def value(v, view) = v.respond_to?(:call) ? v.call(view) : v

    def words(v, view)
      x = value(v, view)
      x.is_a?(Symbol) ? ::I18n.t(x) : x.to_s
    end

    def count_of(v, view)
      c = value(v, view)
      return c if c.is_a?(Integer)
      return c.to_s if c.is_a?(Numeric) || (c.is_a?(String) && !c.strip.empty? && c.length <= COUNT_MAX)

      nil
    end

    # The part on this page, or nil when it has no words
    def resolve(part, view)
      full = words(part.full, view).strip
      return nil if full.empty?

      panel = value(part.panel, view)
      html = value(part.html, view)
      Drawn.new(key: part.key, role: role_name(value(part.role, view)), icon: value(part.icon, view).to_s, full: full,
                short: words(part.short, view).strip.then { |s| s.empty? ? full : s }, count: count_of(part.count, view),
                weight: part.weight, panel: panel.blank? ? nil : panel, title: words(part.title, view).strip.then { |s| s.empty? ? full : s },
                html: html.is_a?(Hash) ? html : {})
    end

    # A made-up part from a Hash of the same names as register's (the style guide)
    def example(attrs, view)
      a = attrs.to_h.transform_keys(&:to_sym)
      resolve(define(a.delete(:key) || 'example', plugin: a.delete(:plugin) || :gk_gui_stuff, **a), view)
    end

    # The parts whose condition holds on this page, in their order: heavier first, then by key
    def present(view)
      all.values.sort_by { |p| [-p.weight, p.key] }.select do |p|
        p.condition.nil? || (p.condition.call(view) ? true : false)
      rescue StandardError => e
        Rails.logger.warn("[gk_gui_stuff] top band part #{p.key} left out: #{e.class} #{e.message}")
        false
      end
    end

    def any?(view) = present(view).any?

    # The parts drawn on this page, each resolved; one that fails is left out and logged
    def parts(view)
      present(view).filter_map do |p|
        resolve(p, view)
      rescue StandardError => e
        Rails.logger.error("[gk_gui_stuff] top band part #{p.key} not drawn: #{e.class} #{e.message}")
        nil
      end
    end

    # The longest length the band starts from: full for one or two parts (the instance's role counted), short from
    # three; the script shortens further where the room is short
    def max_length(total) = total >= 3 ? 'short' : 'full'
  end

  module PrimitivesHelper
    # The top band: the instance's segment first (html, or nil), then each part (TopBand::Drawn, or a Hash as
    # TopBand.register takes it, for a made-up one), then +N, which the script fills with what does not fit.
    # landmark: false for an example in a page (the style guide), which is no landmark of its own.
    def gk_gui_stuff_top_band(parts, instance: nil, landmark: true, html: {})
      drawn = Array(parts).filter_map { |p| p.is_a?(Hash) ? GkGuiStuff::TopBand.example(p, self) : p }
      max = GkGuiStuff::TopBand.max_length(drawn.size + (instance.blank? ? 0 : 1))
      items = drawn.each_with_index.map { |p, i| gk_gui_stuff_top_band_part(p, max, i) }
      gk_gui_stuff_top_band_assets
      cls = ['gk-gui-stuff-band', 'gk-gui-stuff-band-parts', drawn.size == 1 ? 'gk-gui-stuff-band-one' : nil, html[:class]].compact.join(' ')
      mark = landmark ? { role: 'region', 'aria-label': ::I18n.t(:label_gk_gui_stuff_band_landmark) } : {}
      content_tag(:div, safe_join([instance.presence, *items, gk_gui_stuff_top_band_more].compact),
                  **html.except(:class, :data), **mark, class: cls, data: (html[:data] || {}).merge(gk_gui_band: '1', gk_gui_band_max: max))
    end

    # One part: its icon, its full and its short words (the length shown is a class the script changes), its count, and
    # ▾ when it opens; a part that opens is a fly whose button carries the full words and whose box is its panel, a
    # dialog named by its heading. A part without a panel is a note with the same words.
    def gk_gui_stuff_top_band_part(part, max, index)
      rc = GkGuiStuff::Primitives.role_class(GkGuiStuff::TopBand::ROLES[part.role])
      inner = [part.icon.present? ? sprite_icon(part.icon, nil, size: 14) : nil,
               content_tag(:span, part.full, class: 'gk-gui-stuff-band-full'),
               content_tag(:span, part.short, class: 'gk-gui-stuff-band-short'),
               part.count.nil? ? nil : content_tag(:span, part.count, class: 'gk-gui-stuff-band-count'),
               part.openable? ? content_tag(:span, sprite_icon('angle-down', nil, size: 12), class: 'gk-gui-stuff-band-caret', 'aria-hidden': 'true') : nil].compact
      own = part.html || {}
      cls = ['gk-gui-stuff-band-part', "gk-gui-stuff-band-role-#{part.role}", rc, "gk-gui-stuff-band-len-#{max}", own[:class]]
      data = (own[:data] || {}).merge(gk_gui_band_part: part.key, gk_gui_band_weight: part.weight, gk_gui_band_order: index)
      unless part.openable?
        return content_tag(:span, safe_join(inner), **own.except(:class, :data), class: cls.compact.join(' '), data: data, role: 'note',
                                                    title: part.said, 'aria-label': part.said)
      end

      summary = content_tag(:summary, safe_join(inner), class: 'gk-gui-stuff-band-button', title: part.said, 'aria-label': part.said)
      box = content_tag(:div, safe_join([content_tag(:p, content_tag(:strong, part.title), class: 'gk-gui-stuff-band-panel-title'), part.panel]),
                        class: 'gk-gui-stuff-fly-box gk-gui-stuff-band-panel', role: 'dialog', 'aria-label': part.title)
      content_tag(:details, summary + box, **own.except(:class, :data), class: [*cls, 'gk-gui-stuff-fly', rc ? 'gk-gui-stuff-fly-roled' : nil].compact.join(' '),
                                           data: data)
    end

    # +N: hidden until the script moves a part into it; its words for one and for more, with %{count}
    def gk_gui_stuff_top_band_more
      one = ::I18n.t(:text_gk_gui_stuff_band_more_one, count: '%{count}')
      other = ::I18n.t(:text_gk_gui_stuff_band_more_other, count: '%{count}')
      summary = content_tag(:summary, safe_join([content_tag(:span, '+0', class: 'gk-gui-stuff-band-more-n'),
                                                 content_tag(:span, sprite_icon('angle-down', nil, size: 12), class: 'gk-gui-stuff-band-caret', 'aria-hidden': 'true')]),
                            class: 'gk-gui-stuff-band-button')
      box = content_tag(:div, content_tag(:div, '', class: 'gk-gui-stuff-band-more-list', data: { gk_gui_band_more_list: '1' }),
                        class: 'gk-gui-stuff-fly-box gk-gui-stuff-band-panel', role: 'dialog', 'aria-label': ::I18n.t(:label_gk_gui_stuff_band_more))
      content_tag(:details, summary + box, class: 'gk-gui-stuff-fly gk-gui-stuff-band-part gk-gui-stuff-band-more', hidden: true,
                                           data: { gk_gui_band_more: '1', one: one, other: other })
    end

    # The panel of the preview: Before and After with the view segment, the marker's own panel (gk_gui_stuff_marker_panel),
    # what changes and for whom, then Save… with the reason under the buttons and Cancel the preview. setting: the
    # setting's name; from and to: its value now and the value tried; places: the number of places on the page.
    # save_url: where Save sends (nil: the buttons belong to the surrounding form). marker: what else the marker's
    # panel is drawn with (scope:, html: for a still picture of the part).
    def gk_gui_stuff_band_preview_panel(setting:, from:, to:, places:, save_url: nil, params: {}, marker: {})
      t = ->(k, **o) { ::I18n.t(k, **o) }
      segment = gk_gui_stuff_view_segment('band_preview', [[t.(:label_gk_gui_stuff_band_preview_before), 'before'], [t.(:label_gk_gui_stuff_band_preview_after), 'after']],
                                         'after', label: t.(:label_gk_gui_stuff_band_preview_view))
      row = content_tag(:div, segment, class: 'gk-gui-stuff-band-panel-row')
      marks = gk_gui_stuff_marker_panel(places: places, **marker)
      info = content_tag(:p, t.(:text_gk_gui_stuff_band_preview_info, from: from, to: to), class: 'gk-gui-stuff-fly-hint')
      save = gk_gui_stuff_reason_button(t.(:button_save), reason: :required, url: save_url, params: params,
                                                          question: t.(:text_gk_gui_stuff_band_preview_save, setting: setting, to: to))
      cancel = button_tag(t.(:button_gk_gui_stuff_band_preview_cancel), type: 'button', data: { gk_gui_band_preview: 'cancel' })
      safe_join([row, marks, info, content_tag(:div, safe_join([save, cancel]), class: 'gk-gui-stuff-fly-buttons gk-gui-stuff-band-panel-buttons')])
    end

    # The preview's part, as the preview will register it: role admin (it exists only under elevation), the heaviest
    # weight, the number of places as its count, and its panel above
    def gk_gui_stuff_band_preview_part(setting:, from:, to:, places:, save_url: nil, marker: {})
      { key: 'gui_stuff.preview', role: :admin, icon: 'zoom-in', weight: :preview, count: places,
        full: ::I18n.t(:label_gk_gui_stuff_band_preview_full, setting: setting), short: ::I18n.t(:label_gk_gui_stuff_band_preview),
        panel: gk_gui_stuff_band_preview_panel(setting: setting, from: from, to: to, places: places, save_url: save_url, marker: marker) }
    end

    # The band's script and the stylesheet, once per page (the real band has them from the page's head)
    def gk_gui_stuff_top_band_assets
      return if @gk_gui_stuff_top_band_assets

      @gk_gui_stuff_top_band_assets = true
      content_for(:header_tags) do
        safe_join([stylesheet_link_tag('gk_gui_stuff_elements', plugin: 'gk_gui_stuff'), javascript_include_tag('gk_gui_stuff_top_band', plugin: 'gk_gui_stuff')])
      end
    end
  end
end
