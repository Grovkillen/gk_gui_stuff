# frozen_string_literal: true

# A user's own choices in gui_stuff (core-like experience, modules on or off where the administrator allows it)
class GkGuiStuffUserSetting < ApplicationRecord
  self.table_name = 'gk_gui_stuff_user_settings'

  belongs_to :user

  def self.for(user)
    return new(settings: '{}') unless user&.logged?

    find_by(user_id: user.id) || new(user_id: user.id, settings: '{}')
  end

  def data
    h = JSON.parse(settings.presence || '{}')
    h.is_a?(Hash) ? h : {}
  rescue JSON::ParserError
    {}
  end

  def data=(hash)
    self.settings = hash.to_json
  end
end
