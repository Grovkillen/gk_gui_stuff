# frozen_string_literal: true

# Administration > Utseende: every appearance setting the plugins have declared in gk_records' register, ordered by
# where it shows, as one form. Each setting's level is a radio button under Av, Valfritt and Tvingat, its values stand
# under it while it is not off, and the shared values come last. Nothing applies before Spara; one reason, by the place
# gui_stuff.appearance, goes with every change (none is offered and none is kept while that place is off, except
# for a row that always asks in its sharp state: its reason is offered, required and kept for that row alone), and each
# changed setting is an event in records. Without gk_records
# there is no register: the page lists nothing and every setting is off. Also as JSON through the API. The preview of
# external links is checked against the shared value of a closed network before the save, and after it the cards its
# new state no longer allows are removed.
class GkGuiStuffAppearanceController < ApplicationController
  include GkGuiStuff::Gate::Controller # core's 404 without GK Compat (gate.rb)
  layout 'admin'
  self.main_menu = false
  before_action :require_admin
  before_action :find_register
  accept_api_auth :index, :update
  helper :gk_gui_stuff_form_page
  helper :gk_gui_stuff_appearance
  # the previews under Visa are drawn with the style guide's helpers
  helper :gk_gui_stuff_styleguide

  PLACE = 'gui_stuff.appearance'
  # The preview of external links and the shared value of the network it reads
  EXTERNAL = 'gui_stuff.link_preview_external'
  NETWORK = 'gui_stuff.network'

  def index
    @groups = @register ? @register.by_group : []
    @last = @register ? @register.last_changes : {}
    respond_to do |format|
      format.html
      format.json { render json: { appearance_settings: @register ? @register.declared.values.map { |r| setting_json(r) } : [] } }
    end
  end

  # modes { key => off|optional|forced }, values { key => { name => value } } (shared values too) and the form's one
  # reason; only what differs from what holds is saved
  def update
    return refuse(l(:text_gk_gui_stuff_appearance_no_register)) unless @register

    modes, values = pending
    if modes.empty? && values.empty?
      return respond_to do |format|
        format.html { flash[:notice] = l(:text_gk_gui_stuff_nothing_to_save); redirect_to gk_gui_stuff_appearance_path }
        format.json { render json: { changed: [] } }
      end
    end

    check = GkRecords::Reasons.check(PLACE, params[:reason])
    return refuse(check.error) unless check.ok

    ext = @register.find(EXTERNAL)
    before_mode = @register.mode(EXTERNAL)
    before_domains = Array(@register.value(EXTERNAL, 'domains'))
    closed = closed_refusal(ext, modes, values)
    return refuse(closed) if closed

    # Off is off everywhere: the place's own check answers no text while the place gui_stuff.appearance is off,
    # whatever was sent, so no reason is kept then; in the other modes it answers what was written
    text = check.text
    # A sharp row always asks: while the place is off, a row this save leaves on and sharp is saved with what was
    # written, which the register requires of it; every other row of the same save keeps no reason
    sharp = GkRecords::Reasons.off?(PLACE) ? sharp_asking(modes, values) : []
    sharp_text = sharp.any? ? GkGuiStuff::Primitives.written_reason(params[:reason]) : nil
    before =(modes.keys | values.keys).to_h { |k| [k, on_now?(k)] }
    changed = save_with(modes, values, text, sharp, sharp_text)
    # the next page this administrator sees marks where the saved settings show (the marker, marker.rb)
    GkGuiStuff::Marker.note(session, User.current, from: 'appearance', changes: changed.to_h { |k| [k, [before[k], on_now?(k)]] }) unless api_request?
    if ext && changed.include?(EXTERNAL) && defined?(GkGuiStuff::External)
      GkGuiStuff::External.settings_saved!(before_mode: before_mode, before_domains: before_domains,
                                           reason: sharp.include?(EXTERNAL) ? sharp_text : text, user: User.current)
    end
    respond_to do |format|
      format.html { flash[:notice] = l(:notice_successful_update); redirect_to gk_gui_stuff_appearance_path }
      format.json { render json: { changed: changed } }
    end
  rescue *reason_needed => e
    refuse(e.key == EXTERNAL ? l(:error_gk_gui_stuff_lpe_reason_all) : invalid_text(e))
  rescue GkRecords::AppearanceSettings::Invalid => e
    refuse(invalid_text(e))
  end

  private

  # The register's refusal for a missing reason, which an older register lacks (it is a kind of Invalid, so it is
  # rescued first)
  def reason_needed
    r = GkRecords::AppearanceSettings
    r.const_defined?(:ReasonNeeded) ? [r::ReasonNeeded] : []
  end

  # The rows of this save that always ask: declared with a reason in their sharp state, changed here, and left on and
  # sharp by it (the register's own rule, GkRecords::AppearanceSettings#check_sharp_reason!, which still decides)
  def sharp_asking(modes, values)
    (modes.keys | values.keys).select do |key|
      row = @register.find(key)
      next false unless row.respond_to?(:reason_when_sharp) && row.reason_when_sharp && row.respond_to?(:sharp?)

      final_mode(row, modes) != 'off' && row.sharp?(final_values(row, values))
    end
  end

  # The save. While the place is off and a sharp row asks, the sharp rows go first with what was written (a blank
  # reason is refused by the register and nothing is saved), then the rest with no reason, all or nothing
  def save_with(modes, values, text, sharp, sharp_text)
    return @register.save!(modes: modes, values: values, reason: text, reason_key: PLACE) if sharp.empty?

    ActiveRecord::Base.transaction do
      first = @register.save!(modes: modes.slice(*sharp), values: values.slice(*sharp), reason: sharp_text, reason_key: PLACE)
      first | @register.save!(modes: modes.except(*sharp), values: values.except(*sharp), reason: nil, reason_key: PLACE)
    end
  end

  # A row's values as they will stand after the save: the stored ones with the form's changes on top
  def final_values(row, values)
    row.values.each_value.reject { |v| v.kind == 'action' }.to_h { |v| [v.name, @register.value(row.key, v.name)] }
       .merge(values[row.key] || {})
  end

  def final_mode(row, modes) = modes[row.key] || @register.mode(row.key)

  # In a closed network the preview cannot be switched on without domains in the list, and "*" cannot be chosen
  def closed_refusal(ext, modes, values)
    net = @register.find(NETWORK)
    return nil unless ext && net && net.value('closed_network')
    return nil unless final_values(net, values)['closed_network']

    domains = Array(final_values(ext, values)['domains'])
    return l(:error_gk_gui_stuff_lpe_closed_all) if domains.include?('*')

    final_mode(ext, modes) != 'off' && domains.empty? ? l(:error_gk_gui_stuff_lpe_closed_empty) : nil
  end

  def find_register = (@register = GkGuiStuff.appearance_settings)

  # Whether the setting shows now: a level other than Av; a shared value has no level and counts as shown
  def on_now?(key)
    row = @register.find(key)
    row&.shared? ? true : @register.on?(key)
  end

  def plain(h)
    h = h.to_unsafe_h if h.respond_to?(:to_unsafe_h)
    h.is_a?(Hash) ? h.to_h.deep_stringify_keys : {}
  end

  # What the form changes: the levels that differ from the stored ones, and the values that differ from what holds. A
  # setting nobody declared, or one that cannot be chosen here (Redmine has it, or its plugin is missing), is passed
  # over; a level the setting does not have, or a wrong value, raises Invalid
  def pending
    modes = plain(params[:modes]).each_with_object({}) do |(key, mode), out|
      row = @register.find(key)
      next unless row && !row.shared? && @register.available?(row)
      raise GkRecords::AppearanceSettings::Invalid.new(key, 'mode') unless row.modes.include?(mode.to_s)

      out[row.key] = mode.to_s if mode.to_s != @register.mode(row.key)
    end
    values = plain(params[:values]).each_with_object({}) do |(key, given), out|
      row = @register.find(key)
      next unless row && given.is_a?(Hash) && (row.shared? || @register.available?(row))

      changed = given.each_with_object({}) do |(name, raw), h|
        v = row.value(name)
        # an action keeps no value: its button posts a form of its own
        next if v.nil? || v.kind == 'action'

        now = @register.value(row.key, v.name)
        if v.kind == 'table'
          wanted = compact(raw, v)
          # a cell the page does not draw (a button that is gone) stays as it stood, as records keeps it
          wanted = @register.keep_gone(v, now, wanted) if @register.respond_to?(:keep_gone)
          h[v.name] = wanted unless wanted == compact(now, v)
        else
          c = @register.coerce(v, raw)
          raise GkRecords::AppearanceSettings::Invalid.new(row.key, v.name) if c.nil?

          h[v.name] = c unless c == now
        end
      end
      out[row.key] = changed if changed.any?
    end
    [modes, values]
  end

  # A table value without its empty parts: a part left blank, or a box not ticked, is the same as none. records'
  # table_compact is the one rule, with what the value counts as empty; the same rule here with an older records
  def compact(h, v = nil)
    return @register.table_compact(v, h) if v && @register.respond_to?(:table_compact)

    h = h.to_unsafe_h if h.respond_to?(:to_unsafe_h)
    return {} unless h.is_a?(Hash)

    h.to_h.each_with_object({}) do |(k, v), out|
      v = compact(v) if v.is_a?(Hash) || v.respond_to?(:to_unsafe_h)
      out[k.to_s] = v unless v.nil? || v == '' || v == '0' || v == {}
    end
  end

  def invalid_text(error)
    row = @register&.find(error.key)
    name = row ? row.label : error.key
    what = error.name == 'mode' ? l(:label_gk_gui_stuff_appearance_level) : (row&.value(error.name)&.label || error.name)
    l(:error_gk_gui_stuff_appearance_invalid, name: name, value: what)
  end

  def refuse(message)
    respond_to do |format|
      format.html { flash[:error] = message; redirect_to gk_gui_stuff_appearance_path }
      format.json { render json: { errors: [message] }, status: :unprocessable_entity }
    end
  end

  def setting_json(row)
    last = @last[row.key]
    out = { key: row.key, plugin: row.plugin, group: row.group, name: row.label, help: row.help,
            values: row.values.each_value.reject { |v| v.kind == 'action' }.to_h { |v| [v.name, @register.value(row.key, v.name)] } }
    unless row.shared?
      out.merge!(modes: row.modes, mode: @register.mode(row.key), default: row.default, proposal: row.proposal,
                 in_core: @register.in_core?(row), present: @register.present?(row))
    end
    warning = row.respond_to?(:warning) ? row.warning(@register.respond_to?(:sharp?) && @register.sharp?(row.key)) : ''
    out[:warning] = warning if warning.present?
    out[:last_change] = last && { at: last[:at], user: last[:user]&.login, reason: last[:reason], mode: last[:mode] }
    out
  end
end
