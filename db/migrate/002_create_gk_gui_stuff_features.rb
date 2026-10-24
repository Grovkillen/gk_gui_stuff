# frozen_string_literal: true

# Merged at 1.00.000: the final state of gk_gui_stuff_features.
# The administrator's switches for the declared functions. No seed data.
class CreateGkGuiStuffFeatures < ActiveRecord::Migration[6.1]
  def change
    create_table "gk_gui_stuff_features" do |t|
      t.string "key", limit: 120, null: false
      t.boolean "enabled", null: false
      t.integer "updated_by_id"
      t.datetime "created_at", null: false, precision: 6
      t.datetime "updated_at", null: false, precision: 6
      t.index ["key"], name: "index_gk_gui_stuff_features_on_key", unique: true
    end
  end
end
