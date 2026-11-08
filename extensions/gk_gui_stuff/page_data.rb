# frozen_string_literal: true

module GkGuiStuff
  # One request per page, not one per plugin. Two shared ways, for every plugin
  # * PageData: what a plugin's script needs when the page opens is given with the page. A plugin registers a block
  #   (PageData.register('people_name_links', plugin: :gk_people) { |ctx| ... }); at the end of the page the blocks
  #   run and the answers stand in window.gkGuiStuffPage.data. ctx has :controller, :request, :view and :users, the ids
  #   of the people core linked on the page while it was drawn (link_to_principal), so a block need not look at the
  #   HTML. A block answers nil to give nothing. A script reads its key and asks the server only for what was not given
  #   (content that came later).
  # * Pulse: what must be asked after the page has opened (a refresh, marks made while reading) goes in one request,
  #   POST /gk_gui_stuff/pulse, about every beat_seconds (30) while the tab is in view. A plugin registers a handler
  #   (Pulse.register('readup_read', plugin: :gk_readup) { |user, part| ... }) and its script a part
  #   (gkGuiStuffPulse.add('readup_read', { collect: fn, handle: fn })); a part with nothing to say is left out, and a pulse
  #   with nothing in it is not sent. What must go at once (a change in a form, a page being left) stays a request of
  #   its own.
  # Both are infrastructure, not a module: they work whatever is switched on, and without gui_stuff the plugins ask
  # as before.
  module PageData
    module_function

    def providers = (@providers ||= {})

    # anonymous: true lets the block answer for one not logged in too (a page of a public project); such a block gives
    # only what the page itself shows that reader, never anything of a person's own. Every other block is asked only
    # for one logged in.
    def register(key, plugin:, anonymous: false, &block)
      providers[key.to_s] = { plugin: plugin.to_s, block: block, anonymous: anonymous ? true : false }
    end

    # The blocks to ask: all for one logged in, only the anonymous ones otherwise
    def providers_for(logged) = logged ? providers : providers.select { |_k, p| p[:anonymous] }

    # The answers for this page: { key => data }, a block that fails or answers nil gives nothing
    def build(view, controller, logged: true)
      users = Array(view&.instance_variable_get(:@gk_gui_stuff_users)).uniq
      ctx = { view: view, controller: controller, request: controller&.request, users: users }
      providers_for(logged).each_with_object({}) do |(key, p), out|
        v = p[:block].call(ctx)
        out[key] = v unless v.nil?
      rescue StandardError => e
        Rails.logger.warn("[gk_gui_stuff] page data #{key} (#{p[:plugin]}) failed: #{e.class}: #{e.message}")
      end
    end

    # Core's link to a person (link_to_user and the mentions go through it): the person is noted on the view
    module PrincipalLinkPatch
      def link_to_principal(principal, options = {})
        (@gk_gui_stuff_users ||= []) << principal.id if principal.is_a?(::User) && principal.active?
        super
      end
    end
  end

  module Pulse
    module_function

    def handlers = (@handlers ||= {})

    def register(key, plugin:, &block)
      handlers[key.to_s] = { plugin: plugin.to_s, block: block }
    end

    def any? = handlers.any?

    # The parts asked for: { key => part } to { key => answer }; an unknown key or a handler that fails gives nothing.
    # A handler gets the user, its part and the controller (for a view helper); most need only the first two
    def answer(user, parts, controller = nil)
      parts.each_with_object({}) do |(key, part), out|
        h = handlers[key.to_s] or next
        v = h[:block].call(user, part, controller)
        out[key.to_s] = v unless v.nil?
      rescue StandardError => e
        Rails.logger.warn("[gk_gui_stuff] pulse #{key} (#{h && h[:plugin]}) failed: #{e.class}: #{e.message}")
      end
    end

    def seconds
      [Switches.value('beat', 'beat_seconds', 30), 10].max
    end
  end
end

# The corner's heartbeat (the issue page: what others changed since it was opened) as a part of the pulse
GkGuiStuff::Pulse.register('corner', plugin: :gk_gui_stuff) do |_user, part, controller|
  p = part.respond_to?(:to_h) ? part.to_h.stringify_keys : {}
  controller&.beat_for(p['kind'].to_s, p['id'], p['since'].to_s)
end

# user_status: the dots for the people on the page come with it, and the refresh with the pulse
GkGuiStuff::PageData.register('user_status', plugin: :gk_gui_stuff) do |ctx|
  users = GkGuiStuff::UserStatus.data_for(User.current, ctx[:users])
  # asked: every id the page was drawn with, so that one without a dot is not asked again
  users && { users: users, asked: ctx[:users].map(&:to_s) }
end
GkGuiStuff::Pulse.register('user_status', plugin: :gk_gui_stuff) do |user, part|
  p = part.respond_to?(:to_h) ? part.to_h.stringify_keys : {}
  ids = Array(p['ids']).map(&:to_i).reject(&:zero?).first(200)
  users = GkGuiStuff::UserStatus.data_for(user, ids)
  users && { users: users }
end
