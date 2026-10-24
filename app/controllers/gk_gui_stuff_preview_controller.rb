# frozen_string_literal: true

# link_preview: the card for one object as JSON, for the session's user. The renderer does the same visibility
# check as the object's own page; an object the user may not see is a 404, as is a type nobody registered.
class GkGuiStuffPreviewController < ApplicationController
  before_action :require_login

  def show
    mod = GkGuiStuff::Registry.find('link_preview')
    return head(:not_found) unless mod && GkGuiStuff::Switches.on_for?(mod)

    card = GkGuiStuff::Preview.card(params[:type], params[:id].to_i, view_context)
    return head(:not_found) unless card

    render json: card
  end
end
