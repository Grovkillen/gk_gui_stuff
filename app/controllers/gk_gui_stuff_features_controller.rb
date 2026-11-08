# frozen_string_literal: true

# Administration > Funktioner: every function the plugins have declared in gk_records' register, per plugin, as one
# form like Administration > Utseende. Each function is a radio button under Av and På, the default marked quietly;
# nothing applies before Spara, one reason by the place gui_stuff.feature_switch goes with every switch, and every
# switch is an event in records. Every function is off until it is switched on, unless its registration says
# default: true. Nothing is deleted when a function is switched off. Without gk_records there is no register: the page
# lists no function and every one is off. Also as JSON through the API.
class GkGuiStuffFeaturesController < ApplicationController
  layout 'admin'
  self.main_menu = false
  before_action :require_admin
  before_action :find_register
  accept_api_auth :index, :update
  helper :gk_gui_stuff_form_page

  PLACE = 'gui_stuff.feature_switch'

  def index
    @groups = @register ? @register.by_plugin : []
    @last = @register ? @register.last_changes : {}
    respond_to do |format|
      format.html
      format.json { render json: { features: @register ? @register.declared.values.map { |f| feature_json(f) } : [] } }
    end
  end

  # features { key => 1|0 } and the form's one reason; only the functions whose state changes are switched
  def update
    return refuse(l(:text_gk_gui_stuff_features_no_register)) unless @register

    given = params[:features]
    given = given.to_unsafe_h if given.respond_to?(:to_unsafe_h)
    changes = (given.is_a?(Hash) ? given : {}).each_with_object({}) do |(key, v), out|
      f = @register.find(key)
      next unless f

      on = %w[1 true on].include?(v.to_s)
      out[f.key] = on if on != @register.on?(f.key)
    end
    if changes.empty?
      return respond_to do |format|
        format.html { flash[:notice] = l(:text_gk_gui_stuff_nothing_to_save); redirect_to gk_gui_stuff_features_path }
        format.json { render json: { changed: [] } }
      end
    end

    # The place gui_stuff.feature_switch in gk_records decides whether the reason is required; the page always offers
    # the pen, so what was written is kept in every mode
    check = GkRecords::Reasons.check(PLACE, params[:reason])
    return refuse(check.error) unless check.ok

    before = changes.keys.to_h { |k| [k, @register.on?(k)] }
    changed = @register.set_many!(changes, reason: GkGuiStuff::Primitives.written_reason(params[:reason]), reason_key: PLACE)
    # the next page this administrator sees marks what the switched functions add and take away (the marker, marker.rb)
    GkGuiStuff::Marker.note(session, User.current, from: 'features', changes: changed.to_h { |k| [k, [before[k], @register.on?(k)]] }) unless api_request?
    respond_to do |format|
      format.html { flash[:notice] = l(:notice_successful_update); redirect_to gk_gui_stuff_features_path }
      format.json { render json: { changed: changed, features: changed.map { |k| feature_json(@register.find(k)) } } }
    end
  end

  private

  def find_register = (@register = GkGuiStuff.features)

  def refuse(message)
    respond_to do |format|
      format.html { flash[:error] = message; redirect_to gk_gui_stuff_features_path }
      format.json { render json: { errors: [message] }, status: :unprocessable_entity }
    end
  end

  # default: what the registration says, on until switched off only where a decision says so
  def feature_json(f)
    last = (@last ||= @register.last_changes)[f.key]
    { key: f.key, plugin: f.plugin, name: f.label, help: f.help, default: f.default ? true : false, enabled: @register.on?(f.key),
      related: Array(f.related), requires: Array(f.requires),
      last_change: last && { at: last[:at], user: last[:user]&.login, reason: last[:reason], enabled: last[:enabled] } }
  end
end
