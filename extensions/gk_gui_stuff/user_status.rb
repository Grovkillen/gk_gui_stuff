# frozen_string_literal: true

module GkGuiStuff
  # user_status: the dot after a person's name that says whether she can be reached now (readup's lamp, plugins/readup
  # ### availability). gui_stuff draws it; the data is the owner's. A source registers a JSON url (GET url?ids=1,2
  # answering { users: { "1": { state:, label:, seen: } } }) and whether it is on for the person looking. The first
  # source that is on is used. States and their colours: active, idle, away, absent, busy; anything else is drawn as
  # away.
  module UserStatus
    STATES = %w[active idle away absent busy].freeze

    module_function

    def sources = (@sources ||= {})

    # data: ->(viewer, ids) { { id => { state:, label:, seen: } } }, so that the first answer comes with the page
    # (PageData) and the refresh with the pulse; a source without it is asked at its url as before
    def register(key, url:, enabled:, plugin:, data: nil)
      sources[key.to_s] = { url: url.to_s, enabled: enabled, plugin: plugin.to_s, data: data }
    end

    def source_for(user)
      sources.values.detect do |s|
        s[:enabled].call(user)
      rescue StandardError => e
        Rails.logger.warn("[gk_gui_stuff] user_status source failed: #{e.class} #{e.message}")
        false
      end
    end

    # What the page's script needs: the source's url, or nothing (the module then draws nothing and asks nothing)
    def options(user = ::User.current)
      src = source_for(user)
      src ? { url: Redmine::Utils.relative_url_root.to_s + src[:url], refresh: 60, pulse: !src[:data].nil? } : {}
    end

    def on_for?(user)
      m = Registry.find('user_status')
      m && user.logged? && Switches.active.include?(m)
    end

    # The dots for these ids from the source's data, or nil when the source gives none this way
    def data_for(user, ids)
      src = on_for?(user) && source_for(user)
      return nil unless src && src[:data] && ids.any?

      src[:data].call(user, ids).transform_keys(&:to_s)
    end
  end
end
