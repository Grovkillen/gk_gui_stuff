# frozen_string_literal: true

# Administration > Meningsvy och Klassisk vy (a row of its own under Administration):
# per registered page type the mode Meningsvy, Klassisk vy or Valbart and, for Valbart, the default; a row that sets
# the same mode on all pages (the key '*'). A row's segments save at once (the rail's answer {ok}); the row for all
# pages is three buttons with a reason, each its own form. The reason follows the place gui_stuff.meaning in GK Records
# (Valfritt by default) and goes with the change as an event in records; each row shows its latest change. The types
# of core's pages are appearance settings on the page Appearance instead, and are not here.
class GkGuiStuffMeaningAdminController < ApplicationController
  layout 'admin'
  self.main_menu = false
  before_action :require_admin
  helper :gk_gui_stuff_meaning_admin

  def index
    @types = GkGuiStuff::Meaning.own_types
    @latest = GkGuiStuff::Meaning.latest
  end

  # mode and/or default for one type, or for all ('*'), with the reason; answered as a rail's save, or for a form (the
  # row for all pages) by going back to the page with core's message
  def update
    key = params[:key].to_s
    mode = params[:mode].presence
    default = params[:default].presence
    ok = (key == GkGuiStuff::Meaning::ALL || (GkGuiStuff::Meaning.find(key) && !GkGuiStuff::Meaning.core?(key))) &&
         (mode.nil? || GkGuiStuff::Meaning::MODES.include?(mode)) && (default.nil? || GkGuiStuff::Meaning::VIEWS.include?(default)) && (mode || default)
    return refuse(l(:text_gk_gui_stuff_meaning_not_chosen)) unless ok

    reason = params[:reason]
    if defined?(::GkRecords::Reasons)
      check = ::GkRecords::Reasons.check('gui_stuff.meaning', reason)
      return refuse(check.error) unless check.ok

      reason = check.text
    end
    GkGuiStuff::Meaning.set!(key, mode: mode, default: default, reason: reason)
    respond_to do |format|
      format.html { flash[:notice] = l(:notice_successful_update); redirect_to gk_gui_stuff_meaning_admin_path }
      format.json do
        last = GkGuiStuff::Meaning.latest(limit: 20)[key]
        render json: { ok: true, modes: GkGuiStuff::Meaning.own_types.to_h { |t| [t.key, GkGuiStuff::Meaning.mode(t.key)] },
                       last: last ? helpers.gk_gui_stuff_meaning_last_text(last) : nil }
      end
    end
  end

  private

  def refuse(message)
    respond_to do |format|
      format.html { flash[:error] = message; redirect_to gk_gui_stuff_meaning_admin_path }
      format.json { render json: { ok: false, message: message }, status: :unprocessable_entity }
    end
  end
end
