# frozen_string_literal: true

# Merged at 1.00.000: the final state of gk_gui_stuff_user_settings.
# A user's own choices. No seed data.
# gui_stuff: a user's own choices, one row per user, kept on the server so they follow the person between
# computers.
# The first migration's down runs last at redmine:plugins:migrate NAME=gk_gui_stuff VERSION=0: it also takes away
# what the plugin kept in core's tables, its row in settings and the gk_gui_stuff_ keys in each
# person's preferences (the calendar's view).
class CreateGkGuiStuffUserSettings < ActiveRecord::Migration[6.1]
  def up
    create_table "gk_gui_stuff_user_settings" do |t|
      t.integer "user_id", null: false
      t.text "settings"
      t.datetime "created_at", null: false, precision: 6
      t.datetime "updated_at", null: false, precision: 6
      t.index ["user_id"], name: "index_gk_gui_stuff_user_settings_on_user_id", unique: true
    end
  end

  def down
    drop_table "gk_gui_stuff_user_settings"
    Setting.where(name: 'plugin_gk_gui_stuff').delete_all
    UserPreference.find_each do |pref|
      next unless pref.others.is_a?(Hash) && pref.others.keys.any? { |k| k.to_s.start_with?('gk_gui_stuff_') }

      pref.others = pref.others.reject { |k, _| k.to_s.start_with?('gk_gui_stuff_') }
      pref.save(validate: false)
    end
  end
end
