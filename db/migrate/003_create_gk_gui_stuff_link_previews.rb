# frozen_string_literal: true

# gui_stuff: the preview of external links. One row per address: its place in the queue and, once fetched, the
# card (title, description, the picture's file under the folder set under Appearance). No personal data: a card is
# shared by every reader, and seen_at is when anyone last saw it. No seed data.
class CreateGkGuiStuffLinkPreviews < ActiveRecord::Migration[6.1]
  def up
    create_table "gk_gui_stuff_link_previews" do |t|
      t.string "url", limit: 2000, null: false
      t.string "url_digest", limit: 64, null: false
      t.string "domain", limit: 255, null: false
      t.string "state", limit: 10, default: "queued", null: false
      t.string "title", limit: 300
      t.text "description"
      t.string "image_path", limit: 1000
      t.integer "image_bytes"
      t.string "error", limit: 40
      t.integer "attempts", default: 0, null: false
      t.timestamptz "queued_at", precision: 6
      t.timestamptz "attempted_at", precision: 6
      t.timestamptz "fetched_at", precision: 6
      t.timestamptz "seen_at", precision: 6
      t.timestamptz "created_at", null: false, precision: 6
      t.timestamptz "updated_at", null: false, precision: 6
      t.index ["url_digest"], name: "index_gk_gui_stuff_link_previews_on_digest", unique: true
      t.index ["state", "queued_at"], name: "index_gk_gui_stuff_link_previews_on_state"
      t.index ["domain", "attempted_at"], name: "index_gk_gui_stuff_link_previews_on_domain"
      t.index ["seen_at"], name: "index_gk_gui_stuff_link_previews_on_seen"
    end
  end

  # The pictures are a byproduct: they go with the table, from the folder set under Appearance when it can be read,
  # else the default folder. Only files named as the plugin's own are removed.
  def down
    drop_table "gk_gui_stuff_link_previews"
    return unless defined?(::GkGuiStuff::External::Storage)

    begin
      ::GkGuiStuff::External::Storage.purge_all!
    rescue StandardError => e
      say "gk_gui_stuff: link preview pictures not removed: #{e.class} #{e.message}"
    end
  end
end
