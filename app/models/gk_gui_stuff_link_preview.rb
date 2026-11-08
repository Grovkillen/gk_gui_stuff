# frozen_string_literal: true

require 'digest'

# One address of the preview of external links: its place in the queue and, once fetched, the card (title,
# description, the picture's file). Shared by every reader; no personal data (seen_at is when anyone last saw it).
class GkGuiStuffLinkPreview < ApplicationRecord
  self.table_name = 'gk_gui_stuff_link_previews'

  STATES = %w[queued working ready failed].freeze

  # instants with their zone: written in UTC with the offset, also in update_all and in the claim's comparison
  GkGuiStuffInstant.attributes!(self, :queued_at, :attempted_at, :fetched_at, :seen_at, :created_at, :updated_at)

  validates :state, inclusion: { in: STATES }

  scope :queued, -> { where(state: 'queued') }
  scope :working, -> { where(state: 'working') }
  scope :ready, -> { where(state: 'ready') }

  # A card to show: the fetch found a title or a description (a later failed or queued fetch keeps it)
  def card? = title.present? || description.present?

  # SHA-256 hex of the normalized address
  def self.digest(url) = Digest::SHA256.hexdigest(url.to_s)
end
