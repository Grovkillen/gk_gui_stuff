# frozen_string_literal: true

# A function the administrator has switched on or off. The declaration (name, help, default) is in code,
# GkGuiStuff::Features; this row only says what the administrator chose. Never deleted: switching back writes the
# row again, and records keeps every switch.
class GkGuiStuffFeature < ApplicationRecord
  self.table_name = 'gk_gui_stuff_features'

  belongs_to :updated_by, class_name: 'User', optional: true

  validates :key, presence: true, uniqueness: true, length: { maximum: 120 }

  def name = GkGuiStuff::Features.find(key)&.label || key
end
