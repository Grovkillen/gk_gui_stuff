# frozen_string_literal: true

# Administration > Utseende and My account > Appearance: the words of a level, a setting's values as fields, the
# summary of a value that is a table (placements, admin_rows, quick_done_status, declutter, help_link), a list value
# and an action value (partials under gk_gui_stuff_appearance/kinds), a row's warning, a setting Redmine has built in,
# and Visa
module GkGuiStuffAppearanceHelper
  # The column word of a level: Av, Valfritt, Tvingat
  def gk_gui_stuff_mode_word(mode) = l(:"label_gk_gui_stuff_col_#{mode.presence || 'off'}")

  # The field name of a value: values[<key>][<name>], or person[<name>] on the person's own page
  def gk_gui_stuff_value_name(row, value, scope: :values)
    scope == :values ? "values[#{row.key}][#{value.name}]" : "#{scope}[#{value.name}]"
  end

  # One value under its setting: its label, its field and its help. disabled: a setting that cannot be chosen here,
  # so its fields are not sent
  def gk_gui_stuff_value_field(row, value, current, disabled: false, scope: :values)
    name = gk_gui_stuff_value_name(row, value, scope: scope)
    id = "gk-gui-stuff-av-#{row.key.tr('._', '--')}-#{value.name.tr('_', '-')}"
    field = case value.kind
            when 'number'
              number_field_tag(name, current, min: value.min, max: value.max, step: value.step, id: id, disabled: disabled)
            when 'flag'
              hidden_field_tag(name, '0', id: nil, disabled: disabled) + check_box_tag(name, '1', current ? true : false, id: id, disabled: disabled)
            when 'text'
              placeholder = value.respond_to?(:placeholder_text) ? value.placeholder_text.presence : nil
              text_field_tag(name, current.to_s, size: 50, maxlength: value.max, id: id, disabled: disabled, placeholder: placeholder)
            when 'select'
              select_tag(name, options_for_select(value.choice_list, current.to_s), id: id, disabled: disabled)
            when 'choice'
              return gk_gui_stuff_value_choices(name, value, current, disabled)
            when 'table'
              return gk_gui_stuff_value_table(row, value, current, name, disabled)
            when 'list'
              return render(partial: 'gk_gui_stuff_appearance/kinds/list', locals: { name: name, id: id, value: value, current: current, disabled: disabled })
            when 'action'
              return render(partial: 'gk_gui_stuff_appearance/kinds/action', locals: { row: row, value: value, disabled: disabled })
            end
    help = value.help.present? ? content_tag(:span, value.help, class: 'gk-gui-stuff-form-page-quiet') : nil
    parts = value.kind == 'flag' ? [field, label_tag(id, value.label), help] : [label_tag(id, value.label), field, help]
    # the quiet help text under the value, as core's forms write theirs
    info = value.info.present? ? content_tag(:em, value.info, class: 'info') : nil
    content_tag(:div, safe_join([safe_join(parts.compact, ' '), info].compact), class: 'gk-gui-stuff-form-page-value')
  end

  # An action value's own form: hidden, after the page's form (forms never nest), its button and reason pointing at it
  # with HTML's form attribute
  def gk_gui_stuff_action_form_id(row, value) = "gk-gui-stuff-action-#{row.key.tr('._', '--')}-#{value.name.tr('_', '-')}"

  # Where an action posts: its route helper, nil when the route is missing (then the button is not drawn)
  def gk_gui_stuff_action_url(value) = value.url && respond_to?(value.url) ? public_send(value.url) : nil

  # The action forms the rows asked for while they were drawn: [[form id, url]]
  def gk_gui_stuff_action_forms = Array(@gk_gui_stuff_actions).uniq

  # A row's warning in the current locale, the sharper one when sharp; '' when the row has none (or records is older)
  def gk_gui_stuff_row_warning(row, sharp = false) = row.respond_to?(:warning) ? row.warning(sharp) : ''

  # Whether the instance's values put the row in its sharp state
  def gk_gui_stuff_row_sharp?(row) = @register.respond_to?(:sharp?) && @register.sharp?(row.key) ? true : false

  # The bar's lowest reason on the page: Optional while some row needs a reason in its sharp state, else the place's own
  def gk_gui_stuff_appearance_floor(groups)
    groups.any? { |_, rows| rows.any? { |r| r.respond_to?(:reason_when_sharp) && r.reason_when_sharp } } ? 'optional' : nil
  end

  # A value of a few choices: core's radio buttons in a row, its label first
  def gk_gui_stuff_value_choices(name, value, current, disabled)
    radios = value.choice_list.map do |c|
      text, v = c.is_a?(Array) ? c : [c, c]
      content_tag(:label, safe_join([radio_button_tag(name, v, v.to_s == current.to_s, id: nil, disabled: disabled), text], ' '), class: 'inline')
    end
    content_tag(:div, safe_join([content_tag(:span, "#{value.label}:", class: 'gk-gui-stuff-form-page-value-label')] + radios, ' '),
                class: 'gk-gui-stuff-form-page-value', role: 'radiogroup', 'aria-label': value.label)
  end

  # A value that is a table: a fold with its summary, closed from the start (the script opens it when something in it
  # changes); the partial under gk_gui_stuff_appearance/values draws the table
  def gk_gui_stuff_value_table(row, value, current, name, disabled)
    h = current.is_a?(Hash) ? current : {}
    body = render(partial: "gk_gui_stuff_appearance/values/#{value.choices}", locals: { name: name, value: h, row: row, disabled: disabled, person: !name.start_with?("values[#{row.key}]") })
    summary = content_tag(:summary, safe_join([value.label, content_tag(:span, gk_gui_stuff_table_summary(value.choices, h),
                                                                         class: 'gk-gui-stuff-form-page-quiet')], ' '))
    content_tag(:details, summary + content_tag(:div, body, class: 'gk-gui-stuff-form-page-details-body'), class: 'gk-gui-stuff-form-page-details')
  end

  # The summary of a table value: how many of its rows are set, or for the placements how many stand out and in the menu
  def gk_gui_stuff_table_summary(kind, h)
    case kind.to_s
    when 'placements'
      rows = GkGuiStuff::Menu.all.values
      out = rows.count { |r| GkGuiStuff::Menu::OUT.include?(h[r.key].to_s.presence || r.placement) }
      l(:text_gk_gui_stuff_placements_summary, out: out, menu: rows.size - out)
    when 'flag_icons'
      all = GkGuiStuff::FlagIcons::PARTS
      l(:text_gk_gui_stuff_of_count, on: all.count { |k| h[k].present? }, count: all.size)
    when 'declutter'
      all = GkGuiStuff::Declutter::TARGETS.keys
      l(:text_gk_gui_stuff_of_count, on: all.count { |k| h[k].to_s == '1' }, count: all.size)
    when 'quick_done_status'
      all = Tracker.sorted.to_a
      l(:text_gk_gui_stuff_of_count, on: all.count { |t| h[t.id.to_s].to_s.match?(/\A\d+\z/) }, count: all.size)
    when 'help_link'
      kind = %w[core url wiki].include?(h['kind'].to_s) ? h['kind'].to_s : 'core'
      l(:"label_gk_gui_stuff_help_kind_#{kind}")
    when 'admin_rows'
      all = GkGuiStuff::AdminGroups.items
      l(:text_gk_gui_stuff_of_count, on: all.count { |i| h[i.name.to_s].is_a?(Hash) && h[i.name.to_s].values.any?(&:present?) }, count: all.size)
    else ''
    end
  rescue StandardError
    ''
  end

  # A setting the style guide draws: its name and description, then Av (Redmine's own) and På, each drawn by the style
  # guide's helpers (no named fields, so the form is not touched), as an example that says so, with both pictures inert
  # (gk_gui_stuff_sg_compare, where mid_line: and the other choices are told); the style guide's script once for its
  # Prova links and its answer on an inert part, and its stylesheet for the comparison
  def gk_gui_stuff_appearance_preview(row, off:, on:, mid_line: false, stack: false, try_off: nil, try_on: nil, note: nil, side_data: {})
    unless @gk_gui_stuff_sg_script
      @gk_gui_stuff_sg_script = true
      content_for(:header_tags, javascript_include_tag('gk_gui_stuff_styleguide', plugin: 'gk_gui_stuff'))
    end
    gk_gui_stuff_preview_stylesheet('gk_gui_stuff_styleguide')
    parts = [content_tag(:strong, row.label)]
    parts << content_tag(:p, row.help) if row.help.present?
    parts << gk_gui_stuff_sg_compare(off: off, on: on, mid_line: mid_line, stack: stack, try_off: try_off, try_on: try_on, note: note, side_data: side_data)
    safe_join(parts)
  end

  # A stylesheet a preview needs, put in the page's head once: a module's own sheet, which the page has only while the
  # module is on. Its rules leave alone what stands in .gk-gui-stuff-sg-still, so that Av is drawn as Redmine's own
  def gk_gui_stuff_preview_stylesheet(name, plugin: 'gk_gui_stuff')
    @gk_gui_stuff_preview_sheets ||= {}
    return if @gk_gui_stuff_preview_sheets[name]

    @gk_gui_stuff_preview_sheets[name] = true
    content_for(:header_tags, stylesheet_link_tag(name, plugin: plugin))
    nil
  end

  # A setting the running Redmine has built in, over the three columns: core's quiet help text, ending in the link to
  # Redmine's own setting where there is one (link: [the words of its path, the path])
  def gk_gui_stuff_in_core(link)
    help = link ? safe_join([l(:text_gk_gui_stuff_in_core_link), link_to(link[0], link[1])], ' ') : l(:text_gk_gui_stuff_in_core)
    content_tag(:em, help, class: 'info')
  end

  # "Ingår i Redmine 7.0.2" as an element of its own after the setting's name: a fact about the setting, not a mark on
  # the name, so it takes its room in the text and a screen reader reads it there. It stands outside the name, whose
  # text the page's script reads
  def gk_gui_stuff_in_core_flag
    gk_gui_stuff_flag(gk_gui_stuff_in_core_word, inline: true, role: :info, html: { class: 'gk-gui-stuff-form-page-in-core-flag' })
  end

  # "Ingår i Redmine 7.0.2": the running release, shown only; GK Compat says it where it is installed
  def gk_gui_stuff_in_core_word
    version = defined?(::GkCompat) ? ::GkCompat.release : [::Redmine::VERSION::MAJOR, ::Redmine::VERSION::MINOR, ::Redmine::VERSION::TINY].join('.')
    l(:label_gk_gui_stuff_in_core, version: version)
  end

  # The steps of a setting that is not shown as a picture, or its description when it has none
  def gk_gui_stuff_appearance_show(row)
    return render(partial: row.preview, locals: { row: row }) if row.preview.present?

    steps = Array(row.steps).map { |k| content_tag(:li, l(k)) }
    parts = [content_tag(:strong, row.label)]
    parts << content_tag(:p, row.help) if row.help.present?
    parts << safe_join([content_tag(:p, l(:text_gk_gui_stuff_no_picture)), content_tag(:ol, safe_join(steps), class: 'gk-gui-stuff-form-page-steps')]) if steps.any?
    if GkGuiStuff.styleguide?
      parts << content_tag(:p, safe_join([l(:label_gk_gui_stuff_try_real), link_to(l(:label_gk_gui_stuff_styleguide), gk_gui_stuff_styleguide_path)], ' '))
    end
    safe_join(parts)
  end
end
