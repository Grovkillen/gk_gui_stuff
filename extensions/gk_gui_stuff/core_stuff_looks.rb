# frozen_string_literal: true

module GkGuiStuff
  # The modules of core_stuff that change how core's pages look: the done ratio as text, a no-break space before AM and
  # PM, Redmine's version in the footer, and core_stuff's looks (GkCoreStuff::Looks: the fixes of badges, check boxes,
  # margins, widths, heights, words and orders that moved there from gui_stuff). They stay in
  # core_stuff, where they are written as proposals to core; gui_stuff's settings and Administration > Funktioner list
  # them under their own heading, with their state and a link to where they are switched (core_stuff's Configure, its
  # search filled in). Nothing is shown when core_stuff is not installed.
  module CoreStuffLooks
    KEYS = %w[done_ratio_text time_ampm_nbsp footer_version].freeze

    module_function

    def installed? = Redmine::Plugin.installed?(:gk_core_stuff)

    # [{ key:, label:, on:, in_core: }]: the three above, then the looks in core_stuff's order
    def items
      return [] unless installed?

      stored = Setting.plugin_gk_core_stuff
      stored = stored.is_a?(Hash) ? stored.to_h.transform_keys(&:to_s) : {}
      defaults = defined?(::GkCoreStuff) ? ::GkCoreStuff.defaults.to_h.transform_keys(&:to_s) : {}
      s = defaults.merge(stored)
      list = KEYS.map do |k|
        { key: k, label: ::I18n.t(:"label_gk_core_stuff_#{k}", default: k), on: s[k].to_s == '1', in_core: in_core?(k) }
      end
      list + looks
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] core_stuff's modules not listed: #{e.class} #{e.message}")
      []
    end

    def looks
      return [] unless defined?(::GkCoreStuff::Looks)

      ::GkCoreStuff::Looks.all.each_value.map do |l|
        { key: l.key, label: ::I18n.t(:"label_gk_core_stuff_#{l.key}", default: l.key), on: ::GkCoreStuff::Looks.mode(l.key) != 'off',
          in_core: in_core?(l.key) }
      end
    end

    def in_core?(key)
      defined?(::GkCoreStuff) ? ::GkCoreStuff.in_core?(key.to_sym) : false
    rescue StandardError
      false
    end
  end
end
