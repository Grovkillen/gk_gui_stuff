# frozen_string_literal: true

# Meningsvy och Klassisk vy, the person's side: the segment on a page saves the view chosen for its page type
# (the page loads again with the same address), and Mitt konto's "Återställ mina val" takes every choice away. Each
# change is an event on the person (GkGuiStuff::Choices).
class GkGuiStuffMeaningController < ApplicationController
  include GkGuiStuff::Gate::Controller # core's 404 without GK Compat (gate.rb)
  before_action :require_login

  def choose
    key = params[:key].to_s
    view = params[:view].to_s
    unless GkGuiStuff::Meaning.find(key) && GkGuiStuff::Meaning.choosable?(key) && GkGuiStuff::Meaning::VIEWS.include?(view)
      return render json: { ok: false, message: l(:text_gk_gui_stuff_meaning_not_chosen) }, status: :unprocessable_entity
    end

    GkGuiStuff::Meaning.choose!(User.current, key, view)
    render json: { ok: true }
  end

  def reset
    GkGuiStuff::Meaning.reset!(User.current)
    flash[:notice] = l(:text_gk_gui_stuff_meaning_reset_done)
    redirect_to my_account_path
  end
end
