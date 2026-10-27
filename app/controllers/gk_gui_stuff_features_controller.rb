# frozen_string_literal: true

# Administration > Funktioner: every function the plugins have declared in gk_records' register, per plugin, with its
# explanation and on or off; every one is off until it is switched on. Switching is for the administrator, with a
# reason, and every switch is an event in records. Nothing is deleted when a function is switched off. Without
# gk_records there is no register: the page lists no function and every one is off. gui_stuff's own modules have their
# page under the plugin's settings and are linked from here.
class GkGuiStuffFeaturesController < ApplicationController
  layout 'admin'
  self.main_menu = false
  before_action :require_admin
  before_action :find_register
  accept_api_auth :index, :update

  def index
    @groups = @register ? @register.by_plugin : []
    respond_to do |format|
      format.html
      format.json { render json: { features: @register ? @register.declared.values.map { |f| feature_json(f) } : [] } }
    end
  end

  # One function on or off: key, enabled (1 or 0), reason
  def update
    f = @register&.find(params[:key])
    return render_404 unless f

    # The place gui_stuff.feature_switch in gk_records decides whether the reason is required (optional by default)
    check = GkRecords::Reasons.check('gui_stuff.feature_switch', params[:reason])
    unless check.ok
      return respond_to do |format|
        format.html { flash[:error] = check.error; redirect_to gk_gui_stuff_features_path(anchor: "f-#{f.key.tr('.', '-')}") }
        format.json { render json: { errors: [check.error] }, status: 422 }
      end
    end

    @register.set!(f.key, %w[1 true on].include?(params[:enabled].to_s), reason: check.text)
    respond_to do |format|
      format.html { flash[:notice] = l(:notice_successful_update); redirect_to gk_gui_stuff_features_path(anchor: "f-#{f.key.tr('.', '-')}") }
      format.json { render json: { feature: feature_json(f) } }
    end
  end

  private

  def find_register = (@register = GkGuiStuff.features)

  # default stays in the answer for the API's readers: no function is on from the start
  def feature_json(f)
    { key: f.key, plugin: f.plugin, name: f.label, help: f.help, default: false, enabled: @register.on?(f.key) }
  end
end
