# frozen_string_literal: true

# The preview of external links: the card for one address as JSON, the card's picture from the instance (the reader
# never contacts the external website), and the administrator's emptying of every kept card. show never fetches in
# the request: an address not yet fetched is put in the queue and answered 202; without GK Ops one fetch starts in a
# thread of its own and the answer goes out at once. Everything is a 404 when the module is off for the person.
class GkGuiStuffExternalPreviewController < ApplicationController
  include GkGuiStuff::Gate::Controller # core's 404 without GK Compat (gate.rb)
  PLACE = 'gui_stuff.appearance'
  ROW_KEY = 'gui_stuff.link_preview_external'

  before_action :require_login, only: %i[show image]
  before_action :require_admin, only: :clear
  before_action :require_module, only: %i[show image]

  # GET ?url=&sig= -> ready (the card), queued (202) or none. sig is the mark the text pass wrote on the link; an
  # address without it is never queued. The mark is no authorization: the queue's caps on new addresses answer none
  # (like a full queue) once reached. A person's first ask of an address is queued also when a card is kept, so the
  # answer never tells what others have linked; the script asks once more and then gets the card
  def show
    return render(json: { state: 'none' }) unless GkGuiStuff::External.signed?(params[:url].to_s, params[:sig])

    res = queue.request(params[:url].to_s, User.current)
    case res.state
    when :ready
      # a stale card is shown while it is fetched again
      kick if res.row.respond_to?(:state) && res.row.state == 'queued'
      render json: queue.card(res.row, User.current)
    when :queued
      kick
      render json: { state: 'queued' }, status: :accepted
    when :failed
      # the card says "Kunde inte hämtas"; the reason only to an administrator
      render json: queue.failed_card(res.row, User.current)
    else
      return head(:not_found) if res.why == :off

      render json: { state: 'none' }
    end
  end

  # GET :id/image?v= -> the kept JPEG of a card. v is the picture's key, keyed by the instance's secret, which only
  # the card carries, and the picture is served only to a person who has asked for the address before (the card
  # endpoint's first ask answers "not yet"), so that neither the ids nor the key tell which addresses have a card
  def image
    row = ::GkGuiStuffLinkPreview.find_by(id: params[:id].to_i)
    return head(:not_found) unless row&.card? && GkGuiStuff::External.allowed_host?(row.domain)
    return head(:not_found) unless key_matches?(row) && GkGuiStuff::External::Asks.asked?(User.current, row.url_digest)
    return head(:not_found) unless GkGuiStuff::External::Storage.readable?(row.image_path)

    response.headers['Cache-Control'] = 'private, max-age=86400'
    send_file row.image_path, type: 'image/jpeg', disposition: 'inline'
  end

  # POST reason -> every card and picture removed, with the form's reason. Off is off everywhere: the place's own
  # check answers no text while the place gui_stuff.appearance is off, whatever was sent, so no reason is kept then
  # (the box on Utseende draws no field then either); in the other modes it answers what was written
  def clear
    back = gk_gui_stuff_appearance_path(anchor: row_anchor)
    return redirect_to(back) unless defined?(GkGuiStuff::External::Cleanup)

    text = nil
    if defined?(::GkRecords::Reasons)
      check = ::GkRecords::Reasons.check(PLACE, params[:reason])
      unless check.ok
        flash[:error] = check.error
        return redirect_to(back)
      end
      text = check.text
    end
    n = GkGuiStuff::External::Cleanup.clear!(cause: 'button', reason: text, user: User.current)
    flash[:notice] = l(:text_gk_gui_stuff_lpe_cleared, count: n.to_i)
    redirect_to back
  end

  private

  def queue = GkGuiStuff::External::Queue

  def key_matches?(row)
    v = params[:v].to_s
    want = GkGuiStuff::External.image_key(row.url_digest)
    v.length == want.length && ActiveSupport::SecurityUtils.secure_compare(v, want)
  end

  def require_module
    ok = defined?(GkGuiStuff::External::Queue) && defined?(::GkGuiStuffLinkPreview) && GkGuiStuff::External.on_for?(User.current)
    head(:not_found) unless ok
  end

  # Without GK Ops the queue is worked here: one fetch in a thread of its own, never in this request
  def kick
    queue.kick_inline! unless queue.ops?
  rescue StandardError => e
    Rails.logger.warn("[gk_gui_stuff] link preview not started: #{e.message}")
  end

  # The row's anchor on the Appearance page, as the form page draws it
  def row_anchor
    h = helpers
    h.respond_to?(:gk_gui_stuff_form_page_anchor) ? h.gk_gui_stuff_form_page_anchor(ROW_KEY) : "a-#{ROW_KEY.tr('._', '--')}"
  end
end
