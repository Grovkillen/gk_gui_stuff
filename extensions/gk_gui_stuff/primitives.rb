# frozen_string_literal: true

module GkGuiStuff
  # The design language's primitives: every plugin draws these with the helpers below
  # and writes no CSS or markup of its own for them. Not modules: like the box of choices they are always there, their
  # stylesheet and script come with every page (Hooks#instance_head).
  # The page /gk_gui_stuff/styleguide shows every primitive in all its states, drawn by these same helpers.
  module Primitives
    # Colour in data is a category of the palette, never a hue; markings take the alert levels
    CATEGORIES = (1..12).to_a.freeze
    ALERTS = %w[tip info notice warning alarm critical].freeze
    # The rail's states
    SAVE_STATES = %w[direct changed saved failed].freeze
    # What the admin-only mark says, a level (the person's choice of what shows without step-up)
    ADMIN_LEVELS = %w[info warning alarm].freeze
    # What a control or a button asks of a reason
    REASON_MODES = %w[off optional required].freeze
    # How many modes a cycle button (gk_gui_stuff_cycle_button) has
    CYCLE_MODES = (2..4)
    # The line's bands and its roles; a band is also a role of a pill (band-active)
    BANDS = %w[incoming active settled closed archived].freeze
    # A band's line: the sister role an edge in the band's colour reads (band-active-line). The band's own role is a
    # ground under text and is lowered where the tone is dark; the line carries no text and keeps a clear tone there
    BAND_LINES = BANDS.map { |b| "#{b}-line" }.freeze
    LINE_ROLES = %w[done now now-soft next next-soft expected stroke track].freeze
    # Every colour role by its group, as registrations.yml color_roles lists them (the custom property is
    # --gk-role-<group>-<key>); the swatches draw them. -on-dark: the role mixed lighter for core's dark
    # menus. alert alarm-row: the ground of a table row with an error, a step lighter than the alarm's soft tone.
    # SOFT: the groups whose roles have a -soft tone, or the roles that have one. link: a link that leads out
    # of the instance (external), with -soft for a card's head. ui effect: where a change shows (the marker's outline,
    # the flags new, changed and gone), with -soft; the info role by default. ui text: the body text, its -soft the
    # secondary text (a tone of text, never a background); raised: a ground a step off the surface; link: a link inside
    # the instance; on-fill: text and marks on a filled role; canvas: the squares of the chequered ground under an
    # example; neutral: a primitive that has no role or category (a chosen pill's fill, the dot, the ring, a bar), with
    # -soft the ground under it. diff: what a diff added and took away, each with -soft. band: each band and its line
    # (<band>-line), no -soft
    ROLES = { 'category' => CATEGORIES.map(&:to_s), 'alert' => ALERTS + %w[alarm-on-dark alarm-row],
              'ui' => %w[admin admin-on-dark muted muted-fill choice surface frame divider shadow code possible effect text raised link on-fill canvas neutral],
              'save' => SAVE_STATES + %w[saved-strong], 'logic' => %w[and or not], 'band' => BANDS + BAND_LINES, 'line' => LINE_ROLES, 'link' => %w[external],
              'diff' => %w[added removed] }.freeze
    SOFT = { 'category' => true, 'alert' => ALERTS, 'ui' => %w[admin choice code effect text neutral], 'link' => %w[external], 'diff' => true }.freeze
    # The mark of a button that opens a popover, on the button also while the popover is closed: the attribute
    # data-gk-gui-popover-anchor. Every summary of a popover the helpers draw carries it, and GkGui.popover.open puts it
    # on the link or button it is called with; a button a script will open a popover at may carry it in its markup from
    # the start. The stylesheet reads it where core would clip what stands out of a value on the issue
    POPOVER_ANCHOR = { gk_gui_popover_anchor: '1' }.freeze
    # The icon an icon button draws when GK Icons, whose own sprite has the name, is not there
    ICON_FALLBACK = { 'minimize' => 'maximize' }.freeze

    module_function

    # The custom property of a role; role_soft? whether it also has the -soft tone
    def role_var(group, key) = "--gk-role-#{group}-#{key}"

    def role_soft?(group, key)
      s = SOFT[group.to_s]
      s == true || (s.is_a?(Array) && s.include?(key.to_s))
    end

    # A role's name from the locale files: "Kategori 3", "Varning", "Logik: och"
    def role_label(group, key)
      g = group.to_s
      k = key.to_s.tr('-', '_')
      return ::I18n.t(:label_gk_gui_stuff_category_n, n: k) if g == 'category'
      return ::I18n.t(:"label_gk_gui_stuff_role_#{k}") if g == 'ui'

      ::I18n.t(:"label_gk_gui_stuff_role_#{g}_#{k}")
    end

    # The class that gives a primitive its role: a category 1 to 12, an alert level, admin, muted, choice (what one
    # has chosen) or effect (where a change shows), a band (band-active), or the line's next and now (line-next,
    # line-now: a popover from a step); nil for none. An underscore is read as a dash (:line_next)
    def role_class(role)
      r = role.to_s.tr('_', '-')
      return nil if r.empty?
      return "gk-gui-stuff-cat-#{r}" if CATEGORIES.include?(r.to_i) && r.to_i.to_s == r
      return "gk-gui-stuff-alert-#{r}" if ALERTS.include?(r)
      return "gk-gui-stuff-role-#{r}" if %w[admin muted choice effect saved line-next line-now].include?(r)
      return "gk-gui-stuff-role-#{r}" if r.start_with?('band-') && BANDS.include?(r.delete_prefix('band-'))

      raise ArgumentError, "unknown role #{role}"
    end

    # The reason mode of a control or a button: nil or false is off; :off, :optional, :required;
    # a String with a dot is a place of records' reasons (GkRecords::Reasons.mode, which says optional for a place
    # nobody declared, so a forgotten declaration never refuses), off without records
    def reason_mode(reason)
      return 'off' if reason.nil? || reason == false

      r = reason.to_s
      return r if REASON_MODES.include?(r)
      raise ArgumentError, "unknown reason #{reason}" unless r.include?('.')

      defined?(::GkRecords::Reasons) ? ::GkRecords::Reasons.mode(r) : 'off'
    end

    # The reason to keep where the pen is offered whatever the place's mode (a form page's floor), after the place's
    # check said yes: what was written. The check answers no text while its place is off, which holds for the places
    # that draw no field then, never for a page that drew one. Utseende, Funktioner and the emptying of the external
    # links' previews draw no field while their place is off and keep the check's own answer. The one caller in GK GUI
    # Stuff is Utseende, for a row that always asks in its sharp state: its field is drawn while the place is off, and
    # what was written is kept for that row alone.
    def written_reason(raw) = raw.to_s.strip.presence

    # The plugin whose sprite carries an icon core's sprite lacks in the running series, as compat says (:sprite_icons,
    # such as maximize before 7.0); nil when core's own sprite has it
    def sprite_plugin(icon) = sprite_icons[icon.to_s]

    def sprite_icons
      defined?(::GkCompat) && ::GkCompat.shims.include?(:sprite_icons) ? ::GkCompat.call(:sprite_icons).to_h.transform_keys(&:to_s) : {}
    rescue StandardError
      {}
    end

    # The account is an administrator, stepped up or not (people's layer decides admin? while it holds)
    def account_admin?(user = ::User.current) = user.is_a?(::User) && user.logged? && user.read_attribute(:admin) == true

    # An administrator who may change the system now: stepped up where people governs, else simply an administrator
    def elevated?(user = ::User.current) = account_admin?(user) && user.admin?

    # Where Stega upp leads, back to the page one stands on; nil without people's elevation
    def step_up_path(back)
      helpers = Rails.application.routes.url_helpers
      helpers.respond_to?(:gk_people_elevate_path) ? helpers.gk_people_elevate_path(back_url: back) : nil
    end
  end

  module PrimitivesHelper
    # An icon from icons when it has the name, else core's sprite by the fallback name
    def gk_gui_stuff_icon(name, fallback = name, size: nil)
      opts = size ? { size: size } : {}
      if respond_to?(:gk_icon) && defined?(::GkIcons) && ::GkIcons.exists?(name)
        gk_icon(name, nil, **opts)
      else
        # an icon the running series' sprite lacks comes from the sprite compat names (unwatch before 6.1)
        from = GkGuiStuff::Primitives.sprite_plugin(fallback)
        sprite_icon(fallback.to_s, nil, **opts, **(from ? { plugin: from } : {}))
      end
    end

    # The pill (gk_gui_stuff_pill) is a helper of this module in a file of its own, pill.rb

    # Förslag från systemet: a suggestion's row, dashed in the role info; tag: :div for a block with a
    # heading and a list (the observed order)
    def gk_gui_stuff_suggestion(text = nil, tag: :p, &block)
      content_tag(tag, block ? capture(&block) : text, class: 'gk-gui-stuff-suggestion')
    end

    # Räknaren vid namnet: a number by a name. With an alert role it is filled (something waits); without
    # one it is a quiet number, as the count in a group's heading. shared: more than 0 shows own and shared apart, n
    # being the own ("2+3", the person's choice on the personal pages). n may also be a text that says the count in
    # words ("1 of 2 on", a form page's group heading). GkGui.count draws the same from a script.
    def gk_gui_stuff_count(n, role: nil, title: nil, shared: nil)
      cls = ['gk-gui-stuff-count', role ? GkGuiStuff::Primitives.role_class(role) : 'gk-gui-stuff-count-quiet'].join(' ')
      text = if n.is_a?(String) then n
             elsif shared.to_i.positive? then "#{n.to_i}+#{shared.to_i}"
             else n.to_i
             end
      content_tag(:span, text, class: cls, title: title, 'aria-label': title)
    end

    # Ikonknappen: in what carries a message or a surface (a banner, a notice, the fold's card, the panel's row
    # of tabs, the ribbon) an action that has an accepted icon in core's sprite is this button: core's icon by
    # sprite_icon, the label as the tooltip (core's title) and for the screen reader, a round hit area, in the colour
    # of the text around it. The accepted icons: close (the cross), reload (try again, reload), maximize (larger), cancel
    # (leave a state), comment (answer an entry), edit (correct an entry), and minimize (smaller, from GK Icons' own sprite; without GK Icons the fallback, maximize,
    # with the tooltip that says smaller). Text stays in forms, in a popover's buttons, in menus and where the action has no
    # accepted icon (Stoppa, Byt ut, Slå ihop). href: a link instead of a button; html: more attributes (data:, class:).
    # GkGui.iconButton draws the same from a script.
    def gk_gui_stuff_icon_button(icon, label, href: nil, html: {})
      attrs = html.except(:class).merge(class: ['gk-gui-stuff-icon-button', html[:class]].compact.join(' '), title: label, 'aria-label': label)
      # through gk_gui_stuff_icon: GK Icons when it has the name, else core's sprite, or compat's for an icon the running
      # series' sprite lacks (maximize before 7.0)
      glyph = gk_gui_stuff_icon(icon.to_s, GkGuiStuff::Primitives::ICON_FALLBACK.fetch(icon.to_s, icon.to_s), size: 16)
      href ? link_to(glyph, href, **attrs) : content_tag(:button, glyph, **attrs, type: 'button')
    end

    # Grupp: an edge of 3 px and the heading in a role, the heading a button that folds the group; remember: a
    # key under which the browser keeps the person's own state; texts: [closed, open] the button's words when they turn
    # with the state ("Visa", "Dölj"), the title otherwise.
    def gk_gui_stuff_group(title, role: nil, count: nil, collapsed: false, remember: nil, level: 4, texts: nil, html: {}, &block)
      @gk_gui_stuff_group_n = (@gk_gui_stuff_group_n || 0) + 1
      body_id = "gk-gui-stuff-group-#{@gk_gui_stuff_group_n}"
      head = gk_gui_stuff_group_toggle(texts ? texts[0] : title, texts&.[](1), open: !collapsed, controls: body_id, count: count)
      body = content_tag(:div, capture(&block), id: body_id, class: 'gk-gui-stuff-group-body', hidden: collapsed)
      cls = ['gk-gui-stuff-group', GkGuiStuff::Primitives.role_class(role), html[:class]].compact.join(' ')
      content_tag(:section, content_tag(:"h#{level.to_i.clamp(2, 6)}", head, class: 'gk-gui-stuff-group-head') + body,
                  **html.except(:class), class: cls, data: { gk_gui_group: remember })
    end

    # Fällknappen: the group's heading button, the chevron turning with the state; open_text given, its
    # words turn too (data-gk-gui-text-closed and -open). controls: the body it shows and hides; without one (the line's
    # panel, made later) a click only turns the button, and every click says so with the event gk-gui-group-toggle.
    def gk_gui_stuff_group_toggle(closed_text, open_text = nil, open: false, controls: nil, count: nil, html: {})
      words = open_text ? { gk_gui_text_closed: closed_text, gk_gui_text_open: open_text } : {}
      content_tag(:button, safe_join([sprite_icon('angle-down', nil, size: 14),
                                      content_tag(:span, open && open_text ? open_text : closed_text, class: 'gk-gui-stuff-group-title'),
                                      count.nil? ? nil : gk_gui_stuff_count(count)].compact),
                  **html.except(:class, :data), type: 'button', class: ['gk-gui-stuff-group-toggle', html[:class]].compact.join(' '),
                                                'aria-expanded': open.to_s, 'aria-controls': controls, data: (html[:data] || {}).merge(words))
    end

    # Popover (utfällsruta): GkGui.popover. The summary is the button, a plain button as core's, "…" when it
    # opens a box; the block is the box: the question or the information first, then the action's button and Avbryt
    # (gk_gui_stuff_popover_buttons), and a reason (gk_gui_stuff_reason_block) on its own line under them. The box's edge follows the button's role: grey without one, role: :alarm for what
    # cannot be undone. icon_only: the summary is the icon alone, as core's icon-only, the label its tooltip
    # and its name, with no "…" (core's add icon that opens the marks); plain: the summary is text with no button
    # around it (a line in the top menu); ellipsis: false leaves the "…" off a text button. tap: with icon_only, a press
    # surface of 24 × 24 px with the icon in em and in the role's colour, in the middle of its row, for an icon beside
    # running text or in the fold list's slot (gk_gui_stuff_fold.js). A popover never stands
    # inside a <p>: the parser closes the p at the details (in a .tabular form, gk-gui-stuff-tabular-row is the row).
    # width: :wide, a box of at least 22 characters on a wide screen (on a narrow one every box is a sheet over the whole
    # width). The button carries the mark of a button that opens a popover (Primitives::POPOVER_ANCHOR), also at rest.
    def gk_gui_stuff_popover(label, title: nil, icon: nil, icon_only: false, tap: false, plain: false, ellipsis: true, role: nil, width: nil, html: {}, &block)
      raise ArgumentError, 'an icon-only popover needs icon:' if icon_only && !icon
      raise ArgumentError, "unknown popover width #{width.inspect}" unless width.nil? || width.to_s == 'wide'

      text = label.to_s
      text = "#{text}…" if ellipsis && !icon_only && !text.end_with?('…', '...')
      summary = if icon_only
                  content_tag(:summary, sprite_icon(icon, nil, size: 14), class: 'icon-only gk-gui-stuff-popover-button', title: title || text, 'aria-label': text,
                                                                      data: GkGuiStuff::Primitives::POPOVER_ANCHOR)
                else
                  content_tag(:summary, icon ? safe_join([sprite_icon(icon, nil, size: 14), content_tag(:span, text)], ' ') : text,
                              class: ['gk-gui-stuff-popover-button', plain ? 'gk-gui-stuff-popover-text' : nil].compact.join(' '), title: title,
                              data: GkGuiStuff::Primitives::POPOVER_ANCHOR)
                end
      rc = GkGuiStuff::Primitives.role_class(role)
      cls = ['gk-gui-stuff-popover', icon_only ? 'gk-gui-stuff-popover-icon-only' : nil, icon_only && tap ? 'gk-gui-stuff-popover-tap' : nil,
             width ? 'gk-gui-stuff-popover-wide' : nil, rc, rc ? 'gk-gui-stuff-popover-roled' : nil, html[:class]].compact.join(' ')
      content_tag(:details, summary + content_tag(:div, capture(&block), class: 'gk-gui-stuff-popover-box'), **html.except(:class), class: cls)
    end

    # The popover box's buttons: the action and Avbryt side by side, the action first as core does; keys: true adds the
    # quiet line with the keys of a box with a reason
    def gk_gui_stuff_popover_buttons(submit_label, name: nil, value: nil, alarm: false, keys: false, html: {})
      submit = button_tag(submit_label, **html, type: 'submit', name: name, value: value, class: alarm ? 'gk-gui-stuff-btn-alarm' : nil)
      cancel = button_tag(::I18n.t(:button_cancel), type: 'button', data: { gk_gui_popover_cancel: '1' })
      content_tag(:div, safe_join([submit, cancel, keys ? gk_gui_stuff_reason_keys : nil].compact), class: 'gk-gui-stuff-popover-buttons')
    end

    # A part of the popover's box with a line before it (a review under the box's own buttons and reason); as the box's
    # first part it has no line and no room above it
    def gk_gui_stuff_popover_part(html: {}, &block)
      content_tag(:div, capture(&block), **html.except(:class), class: ['gk-gui-stuff-popover-part', html[:class]].compact.join(' '))
    end

    # Knapp med skäl: reason: as gk_gui_stuff_switch's. Krävs: "Ordet…" opens a popover with the box's button
    # and the reason under it; Valfritt: the button in two parts [ Ordet | ✎ ], the pen opening the same box, whose reason is
    # sent only when the box is open; Av: the button alone, except role: :alarm, which always asks in a popover ("det som inte
    # går att ångra frågar alltid"). elevate: true is the lock (gk_gui_stuff_lock) until stepped up. url: given, the
    # button is its own form (params: as hidden fields), which says autocomplete="off": it takes only a reason, so a
    # browser that puts a form's values back on a reload never offers an old reason there; without url: the buttons
    # belong to the surrounding form.
    # reason_name: the reason field's name, reason_value: what stood in it after a refused save; html: on the submit
    # buttons (data-gk-gui-box-save for a box's Save); submit_label: the box's button when it says more than the label
    # (the line's step "Stängd", its box "Stäng ärendet"). The required reason is checked by the script and by the
    # server (GkRecords::Reasons.check), never by HTML required, which would block the form's other buttons.
    # irreversible: true, det som inte går att ångra: "Ordet…" always opens the box, whatever the reason, the box and
    # its button in the role alarm; info: what disappears and that it cannot be undone. Never the button in two parts
    # that sends at once. form: the id of the form the reason belongs to by HTML's form attribute (the submit buttons
    # take it through html:), for a box drawn inside another form. ask: true, what must always be asked but can be undone
    # (Koppla bort konto): "Ordet…" always opens the same box, whatever the reason, in the button's own role (none, or
    # role:), with question: or the general question from the language files, and never the words that it cannot be
    # undone; the focus goes to the reason, else to Avbryt, as for what cannot be undone. irreversible: wins when both
    # are given.
    # icon:, icon_only: the button that opens the box, as gk_gui_stuff_popover's (an entry's bin with the word as its
    # tooltip): passed on where the button opens a box (Krävs, what is always asked, what cannot be undone, Av in the
    # role alarm); the box's own button keeps the word. The button in two parts (Valfritt) sends at once and cannot be
    # an icon alone, so icon_only: is refused there; the bare button (Av with no alarm) keeps its word.
    # Every box it draws (Krävs, Valfritt's pen, what cannot be undone, Av in the role alarm) has the same order: the
    # question or the warning first (question: in bold, then info:), then the box's button and Avbryt side by side, and
    # the reason on its own line under them. The focus goes to the reason when the box opens.
    # info_block: true, info: is a block of its own (a list, a warning box) and stands as it is, without the paragraph
    # info: is otherwise put in. width: :wide, every box it draws as gk_gui_stuff_popover's width: :wide.
    def gk_gui_stuff_reason_button(label, reason:, url: nil, method: :post, params: {}, name: nil, value: nil, role: nil, info: nil,
                                   reason_name: 'reason', reason_value: nil, elevate: false, purpose: nil, state: nil, submit_label: nil,
                                   irreversible: false, ask: false, question: nil, form: nil, icon: nil, icon_only: false,
                                   info_block: false, width: nil, html: {})
      if elevate
        return ''.html_safe unless GkGuiStuff::Primitives.account_admin?
        return gk_gui_stuff_lock(label, purpose: purpose, state: :locked) { '' } if state == :locked || !GkGuiStuff::Primitives.elevated?
      end
      mode = GkGuiStuff::Primitives.reason_mode(reason)
      alarm = irreversible || role.to_s == 'alarm'
      id = "gk-gui-stuff-reason-#{@gk_gui_stuff_mount_n = (@gk_gui_stuff_mount_n || 0) + 1}"
      question = ::I18n.t(:text_gk_gui_stuff_reason_ask_question) if ask && !irreversible && question.blank?
      asked = question.present? ? content_tag(:p, content_tag(:strong, question)) : nil
      info_p = info.present? ? (info_block ? info : content_tag(:p, info)) : nil
      buttons = -> { gk_gui_stuff_popover_buttons(submit_label || label, name: name, value: value, alarm: alarm, keys: mode != 'off', html: html) }
      reason_field = ->(req, **o) { gk_gui_stuff_reason_block(required: req, id: id, name: reason_name, value: reason_value, form: form, **o) }
      ordered = ->(field) { safe_join([asked, info_p, buttons.call, field].compact) }
      opener = { icon: icon, icon_only: icon_only, width: width }
      body = case irreversible ? 'irreversible' : (ask ? 'ask' : mode)
             when 'irreversible'
               gk_gui_stuff_popover(label, role: :alarm, **opener, html: { class: 'gk-gui-stuff-popover-irreversible' }) do
                 ordered.call(mode == 'off' ? nil : reason_field.call(mode == 'required'))
               end
             when 'ask'
               gk_gui_stuff_popover(label, role: role, **opener, html: { class: 'gk-gui-stuff-popover-ask' }) do
                 ordered.call(mode == 'off' ? nil : reason_field.call(mode == 'required'))
               end
             when 'required'
               gk_gui_stuff_popover(label, role: role, **opener) do
                 ordered.call(reason_field.call(true))
               end
             when 'optional'
               raise ArgumentError, 'the button in two parts sends at once and cannot be an icon alone (icon_only:)' if icon_only

               main = button_tag(label, **html, type: 'submit', name: name, value: value,
                                                class: ['gk-gui-stuff-btn-split-main', alarm ? 'gk-gui-stuff-btn-alarm' : nil].compact.join(' '))
               t = ::I18n.t(:button_gk_gui_stuff_add_reason)
               rc = GkGuiStuff::Primitives.role_class(role)
               # a reason given back after a refused save goes with the save like one just written
               pen = content_tag(:details, content_tag(:summary, sprite_icon('edit', nil, size: 14), class: 'gk-gui-stuff-popover-button', title: t, 'aria-label': t,
                                                                                                    data: GkGuiStuff::Primitives::POPOVER_ANCHOR) +
                                           content_tag(:div, ordered.call(reason_field.call(false, disabled: reason_value.blank?)), class: 'gk-gui-stuff-popover-box'),
                                 class: ['gk-gui-stuff-popover', 'gk-gui-stuff-btn-split-pen', width ? 'gk-gui-stuff-popover-wide' : nil,
                                         rc, rc ? 'gk-gui-stuff-popover-roled' : nil].compact.join(' '))
               content_tag(:div, main + pen, class: 'gk-gui-stuff-btn-split')
             else
               alarm ? gk_gui_stuff_popover(label, role: :alarm, **opener) { ordered.call(nil) } : button_tag(label, **html, type: 'submit', name: name, value: value)
             end
      return body unless url

      form_tag(url, method: method, class: 'gk-gui-stuff-reason-form', autocomplete: 'off') { safe_join(params.map { |k, v| hidden_field_tag(k, v, id: nil) } + [body]) }
    end

    # Åtgärdskort: a heading, what it does, and its button (often a gk_gui_stuff_popover) in the block;
    # role: :alarm for what cannot be undone
    def gk_gui_stuff_action_card(title, text = nil, role: nil, html: {}, &block)
      inner = [content_tag(:h4, title, class: 'gk-gui-stuff-action-card-title')]
      inner << content_tag(:p, text, class: 'gk-gui-stuff-action-card-text') if text.present?
      inner << content_tag(:div, capture(&block), class: 'gk-gui-stuff-action-card-actions') if block
      cls = ['gk-gui-stuff-action-card', role ? "gk-gui-stuff-action-card-#{role}" : nil, html[:class]].compact.join(' ')
      content_tag(:div, safe_join(inner), **html.except(:class), class: cls)
    end

    # Bara för administratörer: nothing for anyone else; for an administrator, stepped up or not, the block in a
    # dashed edge in the role admin with the crossed-out eye and "Syns bara för administratörer" as tooltip and for the
    # screen reader. tag: :div gives the box its soft tone too; :span marks a word in a line. level: info, warning or
    # alarm, for the person's choice of what shows without step-up (alarm always shows).
    def gk_gui_stuff_admin_only(tag: :div, level: :info, html: {}, &block)
      return ''.html_safe unless GkGuiStuff::Primitives.account_admin?

      said = ::I18n.t(:text_gk_gui_stuff_admin_only)
      eye = content_tag(:span, gk_gui_stuff_icon('eye-off', 'unwatch', size: 14), class: 'gk-gui-stuff-admin-only-eye', 'aria-hidden': 'true')
      cls = ['gk-gui-stuff-admin-only', "gk-gui-stuff-admin-only-#{tag == :span ? 'inline' : 'box'}", html[:class]].compact.join(' ')
      content_tag(tag, safe_join([eye, content_tag(:span, said, class: 'gk-gui-stuff-sr-only'), capture(&block)]),
                  **html.except(:class), class: cls, title: said, data: { gk_gui_admin_level: level.to_s })
    end

    # Låset: an action that changes the system for everyone; the lock means step up and nothing else.
    # Stepped up (or with no layer that steps up): the block as it is. Not stepped up: the label with a lock in the
    # dashed admin edge, opening a popover in the role admin with "Det här ändrar systemet för alla" and Stega upp. Nothing
    # for one who is not an administrator. purpose: what the step up is for. state: :locked draws the lock whatever the
    # step up (the style guide shows both). summary: the button's content instead of the lock and the label, with
    # summary_class: as its class (a drawn step of the line with its own lock icon)
    def gk_gui_stuff_lock(label, purpose: nil, state: nil, summary: nil, summary_class: nil, &block)
      return ''.html_safe unless GkGuiStuff::Primitives.account_admin?
      return capture(&block) if state != :locked && GkGuiStuff::Primitives.elevated?

      details = content_tag(:summary, summary || safe_join([sprite_icon('lock', nil, size: 14), content_tag(:span, label)], ' '),
                            class: summary_class || 'gk-gui-stuff-lock', title: ::I18n.t(:text_gk_gui_stuff_lock_title), data: GkGuiStuff::Primitives::POPOVER_ANCHOR)
      content_tag(:details, details + content_tag(:div, gk_gui_stuff_step_up_box(purpose, tag: :div), class: 'gk-gui-stuff-popover-box'),
                  class: 'gk-gui-stuff-popover gk-gui-stuff-lock-popover gk-gui-stuff-role-admin gk-gui-stuff-popover-roled')
    end

    # The save bar: a row that saves at once, with its rail of 3 px on the row's end side and its status, a hidden live
    # region for a screen reader; Sparat is whispered right under the control that was pressed (GkGui.save), never a
    # word inside the row. The controls inside (switch, segment, icon toggle, round check, inline edit, handle) save
    # through GkGui.save to url: (posted with the page's token as form data, answered with JSON {ok, message}); row:
    # true makes it a row with its own Spara (gk_gui_stuff_row_save_button) that posts all its named fields.
    # reason: true asks for a reason in a popover box before anything is saved. html: the element's other
    # attributes, its data joined with the rail's own (the Meaning switch's key).
    def gk_gui_stuff_rail(url:, method: :patch, row: false, reason: false, tag: :div, html: {}, &block)
      parts = [capture(&block)]
      parts << gk_gui_stuff_save_reason_box if reason
      parts << content_tag(:span, '', class: 'gk-gui-stuff-rail-bar', 'aria-hidden': 'true')
      parts << content_tag(:span, '', class: 'gk-gui-stuff-save-status', role: 'status', 'aria-live': 'polite')
      cls = ['gk-gui-stuff-rail', html[:class]].compact.join(' ')
      content_tag(tag, safe_join(parts), **html.except(:class, :data), class: cls,
                                         data: (html[:data] || {}).merge(gk_gui_save: 'direct', gk_gui_save_url: url, gk_gui_save_method: method.to_s.upcase,
                                                                         gk_gui_save_row: row ? '1' : nil, gk_gui_save_reason: reason ? '1' : nil))
    end

    # The words that say a part saves at once, once above it
    def gk_gui_stuff_direct_note = content_tag(:p, ::I18n.t(:text_gk_gui_stuff_saves_direct), class: 'gk-gui-stuff-direct-note')

    # What a search over settings looks in, the row's data-gk-gui-search (Utseende, Funktioner, Mitt konto > Utseende and
    # a Configure page): the row's name, its description and the plugin's name; with key: also the row's key (whole,
    # without its plugin's prefix and with spaces) and with label_key: its English name, so that the same words find the
    # row whatever language the page is in.
    def gk_gui_stuff_form_page_search_text(*parts, key: nil, label_key: nil)
      key = key.to_s
      parts += [key, key.split('.').last, key.tr('._', '  ')] if key.present?
      parts << ::I18n.t(label_key, locale: :en, default: '') if label_key
      parts.compact.join(' ').squish.downcase
    end

    # A field changed but not saved gets the rail in the role changed, and each box with its own Save says beside
    # it how many fields are changed and not saved, then "Sparat" after the save: put on a GK form. A box is a
    # fieldset.box or div.box with a Save inside, else the form; its Save is the button with data-gk-gui-box-save, else
    # its last submit button. A waiting order (gk_gui_stuff_order with applies:) or a row editor's list that has moved
    # counts as one change; a reason (gk_gui_stuff_reason_button) is no change of its own.
    def gk_gui_stuff_form_changes = { gk_gui_save_form: '1' }

    # Växel: on or off, saved at once by the rail it stands in, the state in words (På, Av) in the
    # switch. It stands in its mount, [ sign | switch ] in one rounded frame (gk_gui_stuff_mount): reason: as the
    # mode (nil off, :optional, :required, or a place of records' reasons). Krävs: the pen with a red star, the switch
    # dimmed and aria-disabled "Kräver skäl"; the tab or the switch opens the box under it, whose button makes the change
    # and is named after it ("Slå på"). Valfritt: the pen; the switch changes at once, the pen opens the same box first.
    # Av: the switch alone in the frame. elevate: true is the lock in the dashed admin edge until stepped up, the box
    # Stega upp; nothing for one who is not an administrator; state: :locked draws the lock whatever the step up.
    # label: is what the switch is ("Kopplingar"), the box says "Slå på Kopplingar".
    def gk_gui_stuff_switch(name, on, label:, reason: nil, elevate: false, purpose: nil, state: nil, on_text: nil, off_text: nil)
      mode = gk_gui_stuff_mount_mode(reason, elevate, state)
      return ''.html_safe unless mode

      n = @gk_gui_stuff_mount_n = (@gk_gui_stuff_mount_n || 0) + 1
      on_text ||= ::I18n.t(:label_gk_gui_stuff_switch_on)
      off_text ||= ::I18n.t(:label_gk_gui_stuff_switch_off)
      locked = %w[required elevate].include?(mode)
      btn = content_tag(:button, safe_join([content_tag(:span, '', class: 'gk-gui-stuff-switch-track', 'aria-hidden': 'true'),
                                            content_tag(:span, on ? on_text : off_text, class: 'gk-gui-stuff-switch-word')]),
                        type: 'button', role: 'switch', class: 'gk-gui-stuff-switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': label,
                        'aria-disabled': locked ? 'true' : nil, 'aria-describedby': locked ? "gk-gui-stuff-mount-#{n}-need" : nil,
                        data: { gk_gui_save_name: name, gk_gui_on: on_text, gk_gui_off: off_text })
      gk_gui_stuff_mount(:switch, mode, btn, n: n, label: label, on: on, purpose: purpose)
    end

    # Segment: one of two to five, saved at once. choices: [[text, value], ...]. reason:, elevate:, purpose: and state: as
    # the switch's: with the mode Av the segment stands bare as before; otherwise it stands in the mount, whose
    # box says "Byt till <choice>" and "Ändrar <label> till <choice>." for the choice clicked (the script fills it in).
    # Locked (Krävs, step up) every part is aria-disabled and the parts not chosen are dimmed; the chosen one stays whole.
    def gk_gui_stuff_segment(name, choices, selected, label: nil, reason: nil, elevate: false, purpose: nil, state: nil)
      mode = gk_gui_stuff_mount_mode(reason, elevate, state)
      return ''.html_safe unless mode

      n = @gk_gui_stuff_mount_n = (@gk_gui_stuff_mount_n || 0) + 1
      locked = %w[required elevate].include?(mode)
      btns = choices.map do |text, value|
        content_tag(:button, text, type: 'button', 'aria-pressed': (value.to_s == selected.to_s).to_s, value: value,
                                   'aria-disabled': locked ? 'true' : nil, 'aria-describedby': locked ? "gk-gui-stuff-mount-#{n}-need" : nil)
      end
      seg = content_tag(:span, safe_join(btns), class: 'gk-gui-stuff-segment', role: 'group', 'aria-label': label, data: { gk_gui_save_name: name })
      return seg if mode == 'off'

      other = choices.find { |_t, v| v.to_s != selected.to_s }&.first.to_s
      gk_gui_stuff_mount(:segment, mode, seg, n: n, label: label.to_s, on: false, purpose: purpose, choice: other)
    end

    # Ikonväxel (Bevaka, Favorit, Fäst): pressed or not, saved at once; the label as tooltip and for the screen reader.
    # reason:, elevate:, purpose: and state: as the switch's, the box saying "Slå på <label>" or "Slå av
    # <label>"; with the mode Av it stands bare as before
    def gk_gui_stuff_icon_toggle(name, pressed, icon:, label:, reason: nil, elevate: false, purpose: nil, state: nil)
      mode = gk_gui_stuff_mount_mode(reason, elevate, state)
      return ''.html_safe unless mode

      n = @gk_gui_stuff_mount_n = (@gk_gui_stuff_mount_n || 0) + 1
      locked = %w[required elevate].include?(mode)
      btn = content_tag(:button, gk_gui_stuff_icon(icon, icon, size: 16), type: 'button', class: 'gk-gui-stuff-icon-toggle', 'aria-pressed': pressed ? 'true' : 'false',
                                                                          title: label, 'aria-label': label, data: { gk_gui_save_name: name },
                                                                          'aria-disabled': locked ? 'true' : nil, 'aria-describedby': locked ? "gk-gui-stuff-mount-#{n}-need" : nil)
      return btn if mode == 'off'

      gk_gui_stuff_mount(:icon_toggle, mode, btn, n: n, label: label, on: pressed, purpose: purpose)
    end

    # Växlingsknapp (cycle button): a choice of two to four modes, each with an icon and a word, where one press moves to
    # the next mode in their order (after the last the first again) and saves it at once; one more press always moves on.
    # Only for a choice that is got back by pressing again, never for something that cannot be undone that way.
    # It shows the icon of the mode that holds now, never of the one a press gives. Its tooltip and its name for a screen
    # reader say what the choice is, the mode now and what a press gives ("<label>. Now: Dark. Press for
    # Automatic."); after a press the whisper at the button says the new mode, and the mode always stands in words
    # somewhere: in the tooltip, in the whisper, and on the row where there is room (row: true, or the class
    # gk-gui-stuff-cycle-row a script sets). The save posts name=value to url: with the page's token (GkGui.save.post,
    # answered with JSON {ok, message}); when it fails the button goes back to the mode last saved and a notice says
    # failed: (the choice could not be saved), never a whisper. modes: [{ value:, word:, said:, icon:, char: }]: word is
    # the mode's short word ("Press for <word>"), said what the whisper and the row say (the word by default), icon a
    # GK Icons name the script draws where GK Icons is there, char the sign drawn without it (the icon from core's
    # sprite when there is no char). current: the value that holds now. The element dispatches gk-gui-cycle
    # ({ value, from, back }) when its mode changes by a press or goes back, and GkGui.cycle (set, note, value) lets a
    # script follow a choice saved elsewhere and add a note to a mode's words in the tooltip.
    def gk_gui_stuff_cycle_button(name, modes, current, url:, label:, method: :post, failed: nil, row: false, html: {})
      modes = Array(modes).map { |m| m.to_h.transform_keys(&:to_sym) }
      raise ArgumentError, "a cycle button has #{GkGuiStuff::Primitives::CYCLE_MODES} modes, not #{modes.size}" unless GkGuiStuff::Primitives::CYCLE_MODES.cover?(modes.size)

      values = modes.map { |m| m[:value].to_s }
      raise ArgumentError, 'a cycle button needs a value for every mode, each its own' if values.any?(&:empty?) || values.uniq.size != values.size
      raise ArgumentError, 'every mode of a cycle button needs a word and an icon or a sign' unless modes.all? { |m| m[:word].present? && (m[:icon].present? || m[:char].present?) }

      i = values.index(current.to_s)
      raise ArgumentError, "unknown mode #{current.inspect} of the cycle button" unless i

      list = modes.map { |m| { value: m[:value].to_s, word: m[:word].to_s, said: (m[:said].presence || m[:word]).to_s, icon: m[:icon].presence&.to_s, char: m[:char].presence&.to_s } }
      now = list[i]
      tip = ::I18n.t(:text_gk_gui_stuff_cycle_tip, label: label, now: now[:said], next: list[(i + 1) % list.size][:word])
      sign = now[:char] ? now[:char] : gk_gui_stuff_icon(now[:icon], now[:icon], size: 14)
      btn = content_tag(:button, safe_join([content_tag(:span, sign, class: 'gk-gui-stuff-cycle-sign', 'aria-hidden': 'true'),
                                            content_tag(:span, now[:said], class: 'gk-gui-stuff-cycle-word', 'aria-hidden': 'true')]),
                        type: 'button', class: 'gk-gui-stuff-cycle-button', value: now[:value], title: tip, 'aria-label': tip, data: { gk_gui_save_name: name })
      conf = { label: label.to_s, tip: ::I18n.t(:text_gk_gui_stuff_cycle_tip), note: ::I18n.t(:text_gk_gui_stuff_cycle_note), modes: list }
      cls = ['gk-gui-stuff-cycle', row ? 'gk-gui-stuff-cycle-row' : nil, html[:class]].compact.join(' ')
      content_tag(:span, btn, **html.except(:class, :data), class: cls,
                              data: (html[:data] || {}).merge(gk_gui_save: 'direct', gk_gui_save_url: url, gk_gui_save_method: method.to_s.upcase,
                                                              gk_gui_save_failed: failed.presence || ::I18n.t(:text_gk_gui_stuff_cycle_failed),
                                                              gk_gui_cycle: conf.to_json, gk_gui_cycle_value: now[:value]))
    end

    # Rund bock: tick off in a list, saved at once (never a check box, which waits for Spara). The same mount as the
    # switch, its box saying "Bocka av" or "Ta bort bocken"; with the mode Av the
    # round check stands bare, with no frame, as it stands in lists
    def gk_gui_stuff_round_check(name, checked, label:, reason: nil, elevate: false, purpose: nil, state: nil)
      mode = gk_gui_stuff_mount_mode(reason, elevate, state)
      return ''.html_safe unless mode

      n = @gk_gui_stuff_mount_n = (@gk_gui_stuff_mount_n || 0) + 1
      locked = %w[required elevate].include?(mode)
      btn = content_tag(:button, sprite_icon('checked', nil, size: 12), type: 'button', role: 'checkbox', class: 'gk-gui-stuff-round-check',
                                                                  'aria-checked': checked ? 'true' : 'false', title: label, 'aria-label': label,
                                                                  'aria-disabled': locked ? 'true' : nil, 'aria-describedby': locked ? "gk-gui-stuff-mount-#{n}-need" : nil,
                                                                  data: { gk_gui_save_name: name })
      return btn if mode == 'off'

      gk_gui_stuff_mount(:round_check, mode, btn, n: n, label: label, on: checked, purpose: purpose)
    end

    # Redigera på plats: a value that becomes a field on a click, with the buttons of a reason: Av "Spara" and "Avbryt";
    # Valfritt [ Spara | ✎ ] and "Avbryt", Spara saving at once and the pen opening the box with the reason;
    # Krävs "Spara…" and "Avbryt", Spara… opening the box whose Spara saves with the reason. Enter is the first button,
    # Esc puts the value back. reason:, elevate:, purpose: as the switch's; elevate: true is the lock until stepped up.
    # An empty value shows core's word for none, quiet. The box is a template the script lays under the field (a sheet
    # on a narrow screen): its Spara and Avbryt, and the reason on its own line under them, as in every box
    def gk_gui_stuff_inline_edit(name, value, label:, reason: nil, elevate: false, purpose: nil)
      mode = gk_gui_stuff_mount_mode(reason, elevate, nil)
      return ''.html_safe unless mode

      none = ::I18n.t(:label_none)
      shown = value.to_s.presence || none
      return gk_gui_stuff_lock(shown, purpose: purpose, state: :locked) { '' } if mode == 'elevate'

      parts = [content_tag(:button, shown, type: 'button', title: label, 'aria-label': "#{label}: #{shown}",
                                           class: ['gk-gui-stuff-inline-value', ('gk-gui-stuff-inline-empty' if value.to_s.blank?)].compact.join(' '))]
      save = ::I18n.t(:button_save)
      ok = ->(text, more = nil) { button_tag(text, type: 'button', class: ['gk-gui-stuff-inline-ok', more].compact.join(' ')) }
      first = case mode
              when 'required' then ok.call("#{save}…")
              when 'optional'
                pen_t = ::I18n.t(:button_gk_gui_stuff_add_reason)
                content_tag(:span, ok.call(save, 'gk-gui-stuff-btn-split-main') +
                                   button_tag(sprite_icon('edit', nil, size: 14), type: 'button', class: 'gk-gui-stuff-inline-pen', title: pen_t, 'aria-label': pen_t),
                            class: 'gk-gui-stuff-btn-split')
              else ok.call(save)
              end
      parts << content_tag(:template, first + button_tag(::I18n.t(:button_cancel), type: 'button', class: 'gk-gui-stuff-inline-cancel'), class: 'gk-gui-stuff-inline-buttons-tpl')
      if mode != 'off'
        id = "gk-gui-stuff-reason-#{@gk_gui_stuff_mount_n = (@gk_gui_stuff_mount_n || 0) + 1}"
        box_ok = button_tag(save, type: 'button', class: 'gk-gui-stuff-inline-box-ok')
        cancel = button_tag(::I18n.t(:button_cancel), type: 'button', data: { gk_gui_popover_cancel: '1' })
        box = content_tag(:span, safe_join([content_tag(:span, safe_join([box_ok, cancel, gk_gui_stuff_reason_keys]), class: 'gk-gui-stuff-popover-buttons'),
                                            gk_gui_stuff_reason_block(required: mode == 'required', id: id)]),
                          class: 'gk-gui-stuff-popover-box gk-gui-stuff-mount-box', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': "#{id}-head")
        parts << content_tag(:template, box, class: 'gk-gui-stuff-inline-tpl')
      end
      content_tag(:span, safe_join(parts), class: 'gk-gui-stuff-inline-edit',
                                           data: { gk_gui_save_name: name, gk_gui_value: value.to_s, gk_gui_label: label, gk_gui_none: none, gk_gui_reason: mode })
    end

    # Rad med egen Spara: the row's Spara, asleep until something in the row changes
    def gk_gui_stuff_row_save_button = button_tag(::I18n.t(:button_save), type: 'button', class: 'gk-gui-stuff-row-save', disabled: true)

    # Handtag: the order of a list, by dragging or Alt and arrow; the list is gk_gui_stuff_order, each item has id:
    def gk_gui_stuff_handle(label: nil)
      t = label || ::I18n.t(:text_gk_gui_stuff_handle)
      content_tag(:button, sprite_icon('reorder', nil, size: 14), type: 'button', class: 'gk-gui-stuff-handle', title: t, 'aria-label': t)
    end

    # The list a handle orders; the handle saves as what surrounds it. url: given, it saves at once: name[] in
    # the new order is posted to url when an item has moved, in a rail. Without url: it waits for the form it stands
    # in, applies: :save (Spara) or :apply (Verkställ): each item sends name[] with its id in the order shown, an item
    # out of its first place gets the rail changed, and the note under the list says when the order holds
    def gk_gui_stuff_order(name, url: nil, method: :patch, applies: nil, tag: :ul, html: {}, &block)
      raise ArgumentError, 'an order that saves at once waits for nothing (no applies:)' if url && applies
      raise ArgumentError, 'an order that waits needs applies: :save or :apply' unless url || %w[save apply].include?(applies.to_s)

      list = lambda do
        content_tag(tag, capture(&block), **html, class: ['gk-gui-stuff-order', html[:class]].compact.join(' '), data: { gk_gui_save_name: "#{name}[]" })
      end
      return gk_gui_stuff_rail(url: url, method: method, tag: :div) { list.call } if url

      begin
        @gk_gui_stuff_order_wait = name
        items = list.call
      ensure
        @gk_gui_stuff_order_wait = nil
      end
      note = content_tag(:p, '', class: 'gk-gui-stuff-direct-note gk-gui-stuff-order-note', role: 'status', 'aria-live': 'polite', hidden: true)
      content_tag(:div, items + note, class: 'gk-gui-stuff-order-wait', data: { gk_gui_order_applies: applies.to_s })
    end

    # An item of the list; label: what the note names when it has moved ("Status har flyttats")
    def gk_gui_stuff_order_item(id, label: nil, tag: :li, &block)
      inner = capture(&block)
      inner = safe_join([inner, hidden_field_tag("#{@gk_gui_stuff_order_wait}[]", id, id: nil)]) if @gk_gui_stuff_order_wait
      content_tag(tag, inner, class: 'gk-gui-stuff-order-item', data: { gk_gui_id: id, gk_gui_label: label })
    end

    # Stapel i rutnät: rows of bars on one vertical line across all groups, the scale above the first group.
    # groups: [{ title:, role:, rows: [{ label: (text or HTML), value:, href: }] }]; scale: the largest value by default
    def gk_gui_stuff_bars(groups, scale: nil)
      groups = Array(groups)
      max = scale || groups.flat_map { |g| Array(g[:rows]).map { |r| r[:value].to_f } }.max.to_f
      max = 1.0 if max <= 0
      out = groups.each_with_index.map do |g, i|
        rows = Array(g[:rows]).map do |r|
          pct = (r[:value].to_f / max * 100).clamp(0, 100).round(1)
          label = r[:href] ? link_to(r[:label], r[:href]) : content_tag(:span, r[:label])
          content_tag(:div, safe_join([content_tag(:span, label, class: 'gk-gui-stuff-bars-label'),
                                       content_tag(:span, content_tag(:span, '', style: "inline-size: #{pct}%"), class: 'gk-gui-stuff-bars-bar',
                                                                                                                  title: r[:value].to_s, role: 'img', 'aria-label': r[:value].to_s)]),
                      class: 'gk-gui-stuff-bars-row')
        end
        head = []
        head << content_tag(:div, safe_join([content_tag(:span, '0'), content_tag(:span, max.round == max ? max.to_i : max.round(1))]), class: 'gk-gui-stuff-bars-scale') if i.zero?
        head << content_tag(:div, g[:title], class: 'gk-gui-stuff-bars-title') if g[:title].present?
        content_tag(:div, safe_join(head + rows), class: ['gk-gui-stuff-bars-group', GkGuiStuff::Primitives.role_class(g[:role])].compact.join(' '))
      end
      content_tag(:div, safe_join(out), class: 'gk-gui-stuff-bars')
    end

    # Kategoriväljaren: a button with the chosen category's swatch (and "Kategori N" with text: true, in
    # forms; text: false in rows) that opens a GkGui.popover with the twelve in a grid of four by three, then Ingen (none:
    # true), each a radio with the category's colour and number, never a free colour. The radios stay in the box, so a
    # closed box still sends the choice and the form works without the script; they sit in their labels, so rows of one
    # page need no ids. The box has no role (its edge stays grey). Drawn by hand with the popover's classes, since the
    # summary carries a swatch.
    def gk_gui_stuff_category_picker(name, selected, labelledby: nil, none: true, text: true)
      selected = selected.to_i
      shown = GkGuiStuff::Primitives::CATEGORIES.include?(selected) ? selected : 0
      swatch = lambda do |n|
        if n.zero?
          content_tag(:span, ::I18n.t(:label_gk_gui_stuff_category_none), class: 'gk-gui-stuff-swatch')
        else
          content_tag(:span, n.to_s, class: "gk-gui-stuff-swatch #{GkGuiStuff::Primitives.role_class(n)}")
        end
      end
      title = ->(n) { n.zero? ? ::I18n.t(:label_gk_gui_stuff_category_none_title) : ::I18n.t(:label_gk_gui_stuff_category_n, n: n) }
      choice = lambda do |n|
        content_tag(:label, radio_button_tag(name, n.zero? ? '' : n, n == shown, id: nil) + swatch.call(n),
                    class: 'gk-gui-stuff-category-choice', title: title.call(n))
      end
      now = title.call(shown)
      summary = content_tag(:summary, safe_join([swatch.call(shown), text ? content_tag(:span, now, class: 'gk-gui-stuff-category-text') : nil].compact),
                            class: 'gk-gui-stuff-popover-button gk-gui-stuff-category-button', title: now, 'aria-label': now, data: GkGuiStuff::Primitives::POPOVER_ANCHOR)
      group = [content_tag(:div, safe_join(GkGuiStuff::Primitives::CATEGORIES.map { |n| choice.call(n) }), class: 'gk-gui-stuff-category-grid')]
      group << content_tag(:div, choice.call(0), class: 'gk-gui-stuff-category-none') if none
      box = content_tag(:div, safe_join(group), class: 'gk-gui-stuff-category-group', role: 'radiogroup', 'aria-labelledby': labelledby,
                                                'aria-label': labelledby ? nil : ::I18n.t(:label_gk_gui_stuff_role_category))
      content_tag(:details, summary + content_tag(:div, box, class: 'gk-gui-stuff-popover-box'), class: 'gk-gui-stuff-popover gk-gui-stuff-category-picker')
    end

    # GkGui.layer from the server: a button that opens the block as a surface in the upper layer,
    # under the button, or at an edge of the window (edge: :end, :start, :bottom); width: :wide for a panel of at most
    # 64em. Nothing on the page moves; a second click on the button, Esc, the cross or a click outside closes it. The
    # layer stands in the page's body, since the block may hold a form of its own. above: :popover lifts it to 65, over an
    # open popover, a mount's box, a rail's reason, the corner and the other layers (an element can only be given in script)
    def gk_gui_stuff_layer_button(label, title: nil, edge: nil, width: nil, above: nil, &block)
      @gk_gui_stuff_layer_n = (@gk_gui_stuff_layer_n || 0) + 1
      id = "gk-gui-stuff-layer-tpl-#{@gk_gui_stuff_layer_n}"
      content_tag(:button, label, type: 'button', 'aria-expanded': 'false',
                                  data: { gk_gui_layer: id, gk_gui_layer_title: title || label, gk_gui_layer_edge: edge&.to_s, gk_gui_layer_width: width&.to_s,
                                          gk_gui_layer_above: (above&.to_s == 'popover' ? 'popover' : nil) }) +
        content_tag(:template, capture(&block), id: id)
    end

    # Innehållsförteckningen: the row that follows at the top of a long page; each part's title quiet, its
    # sections links to their headings. groups: [{ title: 'Redmine', items: [[label, 'sg-forms'], ...] }, ...].
    # GkGui.toc marks the section one reads (aria-current) and keeps a jump clear of the row.
    def gk_gui_stuff_toc(groups, label: ::I18n.t(:label_gk_gui_stuff_toc))
      parts = Array(groups).flat_map do |g|
        [content_tag(:span, g[:title], class: 'gk-gui-stuff-toc-part')] + Array(g[:items]).map { |text, anchor| link_to(text, "##{anchor}") }
      end
      content_tag(:nav, safe_join(parts), class: 'gk-gui-stuff-toc', 'aria-label': label)
    end

    # Färgrollerna som rutor med namn: one swatch, the strong tone and the soft one (striped when the role has
    # none), its name and its custom property. Only the style guide and theme_engine's palette draw them.
    # large: true, the tile: both tones large side by side, each with its word (fylld, mjuk, or ingen over the
    # stripes; the shadow's is "på en yta", a surface casting it), the name and the custom property under them
    def gk_gui_stuff_role_swatch(group, key, label: nil, large: false)
      p = GkGuiStuff::Primitives
      var = p.role_var(group, key)
      soft = p.role_soft?(group, key)
      shadow = group.to_s == 'ui' && key.to_s == 'shadow'
      style = "--gk-gui-fg: var(#{var});#{soft ? " --gk-gui-bg: var(#{var}-soft);" : ''}"
      words = large ? [shadow ? :label_gk_gui_stuff_role_tone_surface : :label_gk_gui_stuff_role_tone_strong, soft ? :label_gk_gui_stuff_role_tone_soft : :label_gk_gui_stuff_role_tone_none] : []
      tone = ->(cls, i) { content_tag(:span, large ? content_tag(:span, ::I18n.t(words[i]), class: 'gk-gui-stuff-role-swatch-word') : '', class: cls, 'aria-hidden': (large ? nil : 'true')) }
      tones = [tone.call('gk-gui-stuff-role-swatch-tone', 0),
               tone.call(['gk-gui-stuff-role-swatch-tone', soft ? 'gk-gui-stuff-role-swatch-soft' : 'gk-gui-stuff-role-swatch-none'].join(' '), 1)]
      tones = [content_tag(:span, safe_join(tones), class: 'gk-gui-stuff-role-swatch-tones')] if large
      name = content_tag(:span, safe_join([content_tag(:b, label || p.role_label(group, key)), content_tag(:code, var)]), class: 'gk-gui-stuff-role-swatch-name')
      content_tag(:div, safe_join(tones + [name]), class: ['gk-gui-stuff-role-swatch', shadow ? 'gk-gui-stuff-role-swatch-shadow' : nil, large ? 'gk-gui-stuff-role-swatch-large' : nil].compact.join(' '),
                                                   style: style)
    end

    # Every role of the groups, one grid per group (Primitives::ROLES); large: the tiles
    def gk_gui_stuff_role_swatches(groups = GkGuiStuff::Primitives::ROLES.keys, large: false)
      safe_join(Array(groups).map do |g|
        content_tag(:div, safe_join(GkGuiStuff::Primitives::ROLES.fetch(g.to_s).map { |k| gk_gui_stuff_role_swatch(g, k, large: large) }),
                    class: ['gk-gui-stuff-role-swatches', large ? 'gk-gui-stuff-role-swatches-large' : nil].compact.join(' '))
      end)
    end

    private

    # The mode of a control's mount (switch, round check, segment, icon toggle, edit in place): nil when it is not drawn (elevate: for one who is not an
    # administrator), elevate until stepped up (or state: :locked), else the reason mode
    def gk_gui_stuff_mount_mode(reason, elevate, state)
      if elevate
        return nil unless GkGuiStuff::Primitives.account_admin?
        return 'elevate' if state == :locked || !GkGuiStuff::Primitives.elevated?
      end
      GkGuiStuff::Primitives.reason_mode(reason)
    end

    # Fäste: [ sign | control ] in one rounded frame, every part a span so that it stands wherever a switch does
    # (a cell, a p, a rail that is a span). The sign is the pen (with the red star when required) or the lock; the box
    # under it says what the change does first, then its button, named after the change, and Avbryt, the reason under them;
    # on a narrow screen the box is a sheet at the bottom. The text area has no name, so that it never joins a form
    # around it: the script sends it with the change. data-gk-gui-turn-on/off and -what-on/off are the box's words for
    # the next change, the script turning them as the control flips. Kinds: switch, round_check, icon_toggle (the
    # switch's words) and segment, whose words are templates with %{choice} the script completes from the part clicked
    # (choice: the one the box names before any click).
    def gk_gui_stuff_mount(kind, mode, control, n:, label:, on:, purpose:, choice: nil)
      id = "gk-gui-stuff-mount-#{n}"
      return content_tag(:span, control, class: 'gk-gui-stuff-mount gk-gui-stuff-mount-bare', data: { gk_gui_mount: 'off' }) if mode == 'off'

      words = if kind == :segment
                turn = ::I18n.t(:button_gk_gui_stuff_segment_to, choice: '%{choice}')
                what = ::I18n.t(:text_gk_gui_stuff_segment_what, name: label, choice: '%{choice}')
                { gk_gui_mount: mode, gk_gui_turn_on: turn, gk_gui_turn_off: turn, gk_gui_what_on: what, gk_gui_what_off: what }
              else
                sw = kind != :round_check
                { gk_gui_mount: mode,
                  gk_gui_turn_on: ::I18n.t(sw ? :button_gk_gui_stuff_turn_on : :button_gk_gui_stuff_tick),
                  gk_gui_turn_off: ::I18n.t(sw ? :button_gk_gui_stuff_turn_off : :button_gk_gui_stuff_untick),
                  gk_gui_what_on: ::I18n.t(sw ? :text_gk_gui_stuff_turn_on_what : :text_gk_gui_stuff_tick_what, name: label),
                  gk_gui_what_off: ::I18n.t(sw ? :text_gk_gui_stuff_turn_off_what : :text_gk_gui_stuff_untick_what, name: label) }
              end
      fill = ->(s) { s.sub('%{choice}', choice.to_s) }
      elevate = mode == 'elevate'
      required = mode == 'required'
      tip = ::I18n.t(elevate ? :text_gk_gui_stuff_lock_title : :button_gk_gui_stuff_add_reason)
      sign = [sprite_icon(elevate ? 'lock' : 'edit', nil, size: 14)]
      sign << content_tag(:span, '*', class: 'required', 'aria-hidden': 'true') if required
      tab = content_tag(:button, safe_join(sign), type: 'button', class: 'gk-gui-stuff-mount-tab', title: tip, 'aria-label': tip,
                                                  'aria-expanded': 'false', 'aria-controls': id)
      parts = [tab, control]
      if elevate || required
        need = ::I18n.t(elevate ? :text_gk_gui_stuff_lock_title : :text_gk_gui_stuff_reason_needed)
        parts << content_tag(:span, need, id: "#{id}-need", class: 'gk-gui-stuff-sr-only')
      end
      next_on = !on
      box = if elevate
              content_tag(:span, gk_gui_stuff_step_up_box(purpose, tag: :span), id: id, class: 'gk-gui-stuff-popover-box gk-gui-stuff-mount-box gk-gui-stuff-role-admin gk-gui-stuff-mount-box-roled',
                                                                                 role: 'dialog', 'aria-modal': 'false', 'aria-label': tip, hidden: true)
            else
              # what the change does first and names the box, then its button and Avbryt, the reason under them
              what = content_tag(:span, fill.call(next_on ? words[:gk_gui_what_on] : words[:gk_gui_what_off]), id: "#{id}-what", class: 'gk-gui-stuff-reason-what')
              ok = button_tag(fill.call(next_on ? words[:gk_gui_turn_on] : words[:gk_gui_turn_off]), type: 'button', class: 'gk-gui-stuff-mount-ok')
              cancel = button_tag(::I18n.t(:button_cancel), type: 'button', data: { gk_gui_popover_cancel: '1' })
              content_tag(:span, safe_join([what, content_tag(:span, safe_join([ok, cancel, gk_gui_stuff_reason_keys]), class: 'gk-gui-stuff-popover-buttons'),
                                            gk_gui_stuff_reason_block(required: required, id: id)]),
                          id: id, class: 'gk-gui-stuff-popover-box gk-gui-stuff-mount-box', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': "#{id}-what", hidden: true)
            end
      parts << box
      cls = ['gk-gui-stuff-mount', "gk-gui-stuff-mount-#{mode}", elevate || required ? 'gk-gui-stuff-mount-locked' : nil,
             %i[segment icon_toggle].include?(kind) ? "gk-gui-stuff-mount-#{kind.to_s.tr('_', '-')}" : nil].compact.join(' ')
      content_tag(:span, safe_join(parts), class: cls, data: words)
    end

    # The reason in a box, on its own line under the box's buttons: the heading Skäl with the red star, or "valfritt"
    # after it; what the change does (what:, when it is not the box's first line); the text area with its placeholder; the line about the history; the error, hidden until a
    # required reason is missing. All spans, so that it stands in a mount; name: nil in a mount (the script sends it),
    # the form's field name in a button's box; disabled: true while a Valfritt box is closed (the script turns it);
    # form: the id of a form elsewhere on the page that the text area belongs to (HTML's form attribute);
    # area_id: the text area's own id instead of "<id>-text" (its label follows it), area: more attributes on the text
    # area (maxlength, aria-label, data-*), for a caller that hands its field over to the block
    def gk_gui_stuff_reason_block(required:, id:, name: nil, value: nil, what: nil, disabled: false, form: nil, area_id: nil, area: {})
      mark = if required
               content_tag(:span, '*', class: 'required')
             else
               content_tag(:span, ::I18n.t(:text_gk_gui_stuff_reason_optional), class: 'gk-gui-stuff-reason-optional-word')
             end
      text_id = area_id.presence || "#{id}-text"
      head = content_tag(:span, safe_join([content_tag(:label, ::I18n.t(:label_gk_gui_stuff_reason), for: text_id), mark], ' '),
                         id: "#{id}-head", class: 'gk-gui-stuff-reason-head')
      extra = area.to_h.transform_keys(&:to_s).except('id', 'name', 'rows', 'disabled', 'form', 'aria-describedby')
      area = text_area_tag(name, value, extra.merge('id' => text_id, 'rows' => 2, 'disabled' => disabled,
                                                    'placeholder' => extra['placeholder'] || ::I18n.t(:text_gk_gui_stuff_reason_placeholder),
                                                    'aria-required' => required ? 'true' : nil, 'aria-describedby' => "#{id}-hint", 'form' => form))
      content_tag(:span, safe_join([head, what, area,
                                    content_tag(:span, ::I18n.t(:text_gk_gui_stuff_reason_hint), id: "#{id}-hint", class: 'gk-gui-stuff-reason-hint'),
                                    content_tag(:span, ::I18n.t(:text_gk_gui_stuff_reason_write), class: 'gk-gui-stuff-reason-error', hidden: true)].compact),
                  class: 'gk-gui-stuff-reason')
    end

    # The quiet line with the keys of a box with a reason
    def gk_gui_stuff_reason_keys = content_tag(:span, ::I18n.t(:text_gk_gui_stuff_reason_keys), class: 'gk-gui-stuff-reason-keys')

    # Stega upp's content, the lock's popover and the mount's box: what it changes, then Stega upp (when people's
    # layer steps up) and Avbryt; tag: :span in a mount, :div in a popover
    def gk_gui_stuff_step_up_box(purpose, tag:)
      path = GkGuiStuff::Primitives.step_up_path(request&.fullpath.to_s)
      text = purpose.present? ? ::I18n.t(:text_gk_gui_stuff_lock_purpose, purpose: purpose) : ::I18n.t(:text_gk_gui_stuff_lock)
      line = tag == :span ? content_tag(:span, text, class: 'gk-gui-stuff-reason-head') : content_tag(:p, text)
      safe_join([line,
                 content_tag(tag, safe_join([path ? link_to(::I18n.t(:button_gk_gui_stuff_step_up), path, class: 'gk-gui-stuff-btn-admin') : nil,
                                             button_tag(::I18n.t(:button_cancel), type: 'button', data: { gk_gui_popover_cancel: '1' })].compact),
                             class: 'gk-gui-stuff-popover-buttons')])
    end

    # The reason box a rail with reason: true opens before saving: Spara with Avbryt, and the reason under them
    def gk_gui_stuff_save_reason_box
      content_tag(:div, safe_join([content_tag(:div, safe_join([button_tag(::I18n.t(:button_save), type: 'button', class: 'gk-gui-stuff-save-reason-ok'),
                                                                button_tag(::I18n.t(:button_cancel), type: 'button', class: 'gk-gui-stuff-save-reason-cancel')]),
                                               class: 'gk-gui-stuff-popover-buttons'),
                                   label_tag(nil, ::I18n.t(:label_gk_gui_stuff_reason), class: 'gk-gui-stuff-save-reason-label'),
                                   text_area_tag(nil, '', rows: 2, class: 'gk-gui-stuff-save-reason-text')]),
                  class: 'gk-gui-stuff-popover-box gk-gui-stuff-save-reason', hidden: true)
    end
  end
end
