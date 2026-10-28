# frozen_string_literal: true

module GkGuiStuff
  # Personliga sidor efter version. No plugin puts rows in account_menu: a page that belongs to the person
  # (Filterblock, Mina märken, Mitt tema) is declared here once, GkGuiStuff::Personal.register('signoff.waiting',
  # plugin::gk_signoff, label::label_gk_signoff_mine, url: { controller: 'gk_signoff_requests', action: 'mine' }, icon:
  # 'checked', order: 20, if: ->(user) {... }, count: ->(user) { { own: 2, shared: 3 } or 5 }, waits: true) and
  # gui_stuff places it where core has room: in core's user menu where the account is a dropdown (compat's ability
  # account_dropdown), otherwise in the sidebar of Mitt konto under Mina sidor. A page may carry a count (an integer, or own and shared); the counts of the pages that wait
  # for the person are summed at the person's name (at the dropdown's button, or at Inloggad som where there is none), and the person may choose to see own and shared apart (2+3). The same pages and counts are a block on Min
  # sida. The counts go with the page (PageData) and are renewed by the pulse; each is kept per person for a short time
  # (personal_count_seconds, 60), and forgotten when anybody changes something.
  module Personal
    Page = Struct.new(:key, :plugin, :label_key, :url, :icon, :order, :cond, :counter, :waits, :css, keyword_init: true) do
      def label = ::I18n.t(label_key, default: key)
      def target = url.respond_to?(:call) ? url.call : url

      def path
        t = target
        t.is_a?(Hash) ? Rails.application.routes.url_helpers.url_for(t.merge(only_path: true)) : t.to_s
      end

      def visible?(user)
        return false unless user&.logged?

        cond.nil? || cond.call(user) ? true : false
      rescue StandardError => e
        Rails.logger.warn("[gk_gui_stuff] personal page #{key}: #{e.class}: #{e.message}")
        false
      end
    end

    module_function

    def all = (@all ||= {})

    # The keyword is if: as the menus have it
    # css: a class the owner's script looks for on the link (people opens Kliv upp in a surface)
    def register(key, plugin:, label:, url:, icon: nil, order: 50, count: nil, waits: false, css: nil, **opts)
      k = key.to_s
      all[k] = Page.new(key: k, plugin: plugin.to_s, label_key: label, url: url, icon: icon, order: order.to_i,
                        cond: opts[:if], counter: count, waits: waits ? true : false, css: css)
      menu!
      all[k]
    end

    def find(key) = all[key.to_s]
    def any? = all.any?
    # The account as a dropdown in core's user menu: compat knows; without compat the newest core's way
    def user_menu? = defined?(::GkCompat) ? ::GkCompat.can?(:account_dropdown) : true

    # Where the account is a dropdown: core's user menu (account_menu), before Mitt konto, in the pages' order; laid again at every
    # declaration, since the plugins declare in their load order; never there otherwise
    def menu!
      menu = Redmine::MenuManager.map(:account_menu)
      all.each_value { |p| n = menu_name(p); menu.delete(n) if menu.exists?(n) }
      all.values.sort_by { |p| [p.order, p.key] }.each do |page|
        menu.push(menu_name(page), page.target.is_a?(Hash) ? page.target : page.path,
                  caption: ->(_p) { page.label },
                  if: ->(_p) { Personal.user_menu? && page.visible?(User.current) },
                  before: :my_account,
                  html: { class: ["gk-gui-stuff-personal", ("icon icon-#{page.icon}" if page.icon), page.css].compact.join(" "), data: { gk_gui_stuff_personal_key: page.key } })
      end
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] personal pages not in the user menu: #{e.class}: #{e.message}")
    end

    def menu_name(page) = :"gk_gui_stuff_p_#{page.key.tr(".", "_")}"

    def pages(user) = all.values.select { |p| p.visible?(user) }.sort_by { |p| [p.order, p.label] }

    def seconds
      v = Switches.settings['personal_count_seconds'].to_s
      v.empty? ? 60 : [v.to_i, 0].max
    end

    # The count of one page for the person: { n:, own:, shared: } or nil; kept seconds long per person, until somebody
    # changes something
    def count(page, user)
      return nil unless page.counter

      key = "gk_gui_stuff_personal/#{user.id}/#{generation(user)}/#{page.key}"
      return normalize(page.counter.call(user)) if seconds.zero?

      Rails.cache.fetch(key, expires_in: seconds) { normalize(page.counter.call(user)) }
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] personal count #{page.key}: #{e.class}: #{e.message}")
      nil
    end

    def normalize(v)
      case v
      when Hash
        own = v[:own].to_i
        shared = v[:shared].to_i
        { n: own + shared, own: own, shared: shared }
      when Integer then { n: v, own: v, shared: 0 }
      end
    end

    # A change by anyone forgets the counts kept for everyone: a change often waits for somebody else (a decision on her
    # proposal, a request to sign), and the count at her name has to show it at her next page or pulse, not a minute later
    def generation(_user = nil) = Rails.cache.read(GENERATION) || 0
    def forget!(user = nil) = (user.nil? || user.logged?) && Rails.cache.write(GENERATION, Time.current.to_f)
    GENERATION = 'gk_gui_stuff_personal_gen'

    def split?(user) = GkGuiStuffUserSetting.for(user).data['count_split'].to_s == '1'

    # The person's own choice: waiting (the default: a count shows when it is more than 0), zero (also 0) or none (no
    # counters at all)
    COUNT_MODES = %w[waiting zero none].freeze

    def count_mode(user)
      m = GkGuiStuffUserSetting.for(user).data['count_mode'].to_s
      COUNT_MODES.include?(m) ? m : 'waiting'
    end

    # What the page and the pulse carry: the rows (label, address, count) and the sum of what waits
    def summary(user)
      rows = pages(user).map do |p|
        c = count(p, user)
        { key: p.key, label: p.label, path: p.path, icon: p.icon, css: p.css, waits: p.waits, n: c&.dig(:n), own: c&.dig(:own), shared: c&.dig(:shared) }
      end
      waiting = rows.select { |r| r[:waits] && r[:n] }
      { rows: rows, split: split?(user), mode: count_mode(user), menu: user_menu?,
        total: { n: waiting.sum { |r| r[:n] }, own: waiting.sum { |r| r[:own] }, shared: waiting.sum { |r| r[:shared] } } }
    end

    def register_page_data!
      PageData.register('personal', plugin: :gk_gui_stuff) { |_ctx| any? ? summary(User.current) : nil }
      Pulse.register('personal', plugin: :gk_gui_stuff) { |user, _part, _c| any? ? summary(user) : nil }
    end

    # After a request that changed something, everyone's counts are counted again
    module ForgetAfterChange
      def self.prepended(base)
        base.after_action :gk_gui_stuff_personal_forget
      end

      private

      def gk_gui_stuff_personal_forget
        Personal.forget!(User.current) unless request.get? || request.head? || controller_name == 'gk_gui_stuff_api'
      rescue StandardError
        nil
      end
    end
  end

  # Mina sidor where the account is no dropdown: drawn in the page's foot on Mitt konto (core's sidebar has no hook) and moved to the top of
  # the sidebar by the script; without the script it stands at the foot. The script and the counter at the name on every page.
  class PersonalHooks < Redmine::Hook::ViewListener
    def view_layouts_base_html_head(_context = {})
      return '' unless User.current.logged? && Personal.any?

      javascript_include_tag('gk_gui_stuff_personal', plugin: 'gk_gui_stuff', defer: true) +
        stylesheet_link_tag('gk_gui_stuff_personal', plugin: 'gk_gui_stuff') +
        javascript_tag("window.gkGuiStuffPersonalText = #{{ waits: ::I18n.t(:text_gk_gui_stuff_personal_waits), waits_split: ::I18n.t(:text_gk_gui_stuff_personal_waits_split) }.to_json};")
    end

    def view_layouts_base_body_bottom(context = {})
      c = context[:controller]
      return '' unless User.current.logged? && Personal.any? && !Personal.user_menu?
      return '' unless c.is_a?(::MyController) && c.action_name == 'account'

      context[:hook_caller].render(partial: 'gk_gui_stuff_personal/box', locals: { summary: Personal.summary(User.current) })
    end
  end
end
