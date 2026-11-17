# frozen_string_literal: true

module GkGuiStuff
  # The style guide's register: each section of the page is a partial in one of two parts, Redmine (core's
  # own elements, drawn by core's real partials with records made up in memory) and GK (the primitives). Only
  # gui_stuff registers now; when the page moves to theme_engine the register goes with it and the plugins
  # register their composite examples there. Required from init.rb, not autoloaded, so that it survives a reload.
  #   GkGuiStuff::Styleguide.register('pill', plugin: :gk_gui_stuff, label: :label_gk_gui_stuff_sg_pill, group: :data)
  # part: :core or :gk; group: the side menu's group, by what the element does (GROUPS; Redmine's own forms are the
  # group core, always last); wide: every state of the element takes the whole row (the line, the forms, the table,
  # the dialog); counterpart: for a Redmine form, the key of the GK section that does the same (nil: GK uses
  # Redmine's own); partial: 'gk_gui_stuff_styleguide/<part>/<key>' by default; condition: a lambda that says whether
  # the section is drawn for the viewer. "Används för" and "Inte för" are the locale keys text_gk_gui_stuff_sg_use_<key>
  # and text_gk_gui_stuff_sg_not_<key>. A section that fails is drawn as core's warning with its key, and logged.
  module Styleguide
    PARTS = %w[core gk].freeze
    # the side menu's groups in their order; label_gk_gui_stuff_sg_menu_<group>
    GROUPS = %w[base buttons data input flow surfaces core].freeze
    # What a tile's example does, the closed set every tile carries one of as its badge (label_gk_gui_stuff_sg_mode_<mode>,
    # explained by text_gk_gui_stuff_sg_mode_<mode>): still, only a picture, nothing in it reacts to the pointer, the
    # keyboard or a click; graphic, it can be hovered over and tabbed to, so that one sees how it reacts, but a click
    # leads nowhere and nothing is sent; nosave, reacts in the page and saves nothing; server, asks the guide's own
    # address, which stores nothing; live, a still picture of what only shows live and Prova for the real one. A tile
    # that says nothing is still
    MODES = %w[still graphic nosave server live].freeze
    DEFAULT_MODE = 'still'
    # the modes whose links, buttons and fields only say that the example leads nowhere (the guide's script and the
    # pointer's rule in its stylesheet name the same two)
    NOWHERE_MODES = %w[still graphic].freeze
    # the badge's role, so that the five are told apart also by their tone
    MODE_ROLES = { 'still' => :muted, 'graphic' => :choice, 'nosave' => :notice, 'server' => :info, 'live' => :tip }.freeze

    # The object of core's form in the part Redmine (labelled_form_for), in memory only; its fields are named sg_demo[…]
    class Demo
      include ActiveModel::Model

      attr_accessor :subject, :kind, :done, :start_date, :description, :level

      def self.model_name = ActiveModel::Name.new(self, nil, 'sg_demo')
      # its error messages in the page's language, as core's records: core's locale files keep the messages under
      # activerecord (an ActiveModel object looks under activemodel, finds nothing and falls back to English), and the
      # field's name is the label the form shows
      def self.i18n_scope = :activerecord
      def self.human_attribute_name(attr, _options = {}) = ::I18n.t(:"label_gk_gui_stuff_sg_example_#{attr}", default: [:"field_#{attr}", attr.to_s.humanize])
      def persisted? = false
    end
    Section = Struct.new(:key, :plugin, :label_key, :group, :part, :order, :partial, :condition, :wide, :counterpart, keyword_init: true) do
      def label = ::I18n.t(label_key)
      def anchor = "sg-#{key.tr('_.', '--')}"
      # the plugin's human name, as the plugin registers it with Redmine (GK GUI Stuff)
      def plugin_name = (p = Redmine::Plugin.registered_plugins[plugin.to_sym]) ? p.name.to_s : plugin
      def uses = ::I18n.t(:"text_gk_gui_stuff_sg_use_#{key}", default: '')
      def not_for = ::I18n.t(:"text_gk_gui_stuff_sg_not_#{key}", default: '')
    end

    module_function

    def all = (@all ||= {})

    def register(key, plugin:, label:, group:, part: :gk, order: 100, partial: nil, condition: nil, wide: false, counterpart: nil)
      raise ArgumentError, "unknown style guide part #{part}" unless PARTS.include?(part.to_s)
      raise ArgumentError, "unknown style guide group #{group}" unless GROUPS.include?(group.to_s)

      k = key.to_s
      all[k] = Section.new(key: k, plugin: plugin.to_s, label_key: label, group: group.to_s, part: part.to_s, order: order,
                           partial: partial || "gk_gui_stuff_styleguide/#{part}/#{k}", condition: condition, wide: wide ? true : false,
                           counterpart: counterpart&.to_s)
    end

    # The sections for the viewer, group by group in the menu's order (Redmine's forms last), each group in its order
    def sections(user = User.current)
      all.values.select { |s| s.condition.nil? || s.condition.call(user) }.sort_by { |s| [GROUPS.index(s.group), s.order, s.key] }
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] style guide sections: #{e.class} #{e.message}")
      []
    end

    # The side menu: one entry per group that has sections, { key:, title:, sections: [...] }
    def menu(list)
      GROUPS.filter_map do |g|
        items = list.select { |s| s.group == g }
        items.any? ? { key: g, title: ::I18n.t(:"label_gk_gui_stuff_sg_menu_#{g}"), sections: items } : nil
      end
    end

    # A tile's mode: the one the tile gives, else its element's (the partial's own), else still; never none, so false
    # and an unknown word are refused
    def mode_for(given, fallback = nil)
      m = given.nil? ? fallback : given
      m = DEFAULT_MODE if m.nil?
      raise ArgumentError, "unknown style guide mode #{m.inspect}" unless (m.is_a?(String) || m.is_a?(Symbol)) && MODES.include?(m.to_s)

      m.to_s
    end

    # The modes of an element's tiles counted, in MODES' order: [[mode, n], ...], the modes it has
    def mode_counts(modes)
      counts = Array(modes).map(&:to_s).tally
      MODES.filter_map { |m| counts[m] ? [m, counts[m]] : nil }
    end

    # The rows of a table of contents (gk_gui_stuff_toc), the same groups as the menu
    def toc(list) = menu(list).map { |m| { title: m[:title], items: m[:sections].map { |s| [s.label, s.anchor] } } }

    # gui_stuff's own sections: the primitives by what they do, then Redmine's own forms, each with its GK counterpart
    def register_own!
      OWN_GK.each do |group, keys|
        keys.each_with_index do |key, i|
          label = { 'count' => :label_gk_gui_stuff_sg_count_h, 'quiet' => :label_gk_gui_stuff_sg_quiet_h,
                    'meaning' => :label_gk_gui_stuff_sg_meaning_switch }.fetch(key, :"label_gk_gui_stuff_sg_#{key}")
          register(key, plugin: :gk_gui_stuff, label: label, group: group, part: :gk, order: (i + 1) * 10, wide: WIDE.include?(key))
        end
      end
      OWN_CORE.each_with_index do |(key, counterpart), i|
        register("core_#{key}", plugin: :gk_gui_stuff, label: :"label_gk_gui_stuff_sg_core_#{key}", group: :core, part: :core, order: (i + 1) * 10,
                                partial: "gk_gui_stuff_styleguide/core/#{key}", wide: WIDE.include?("core_#{key}"), counterpart: counterpart)
      end
    end

    # gui_stuff's GK sections by group, in the menu's order
    OWN_GK = { 'base' => %w[roles icon_button words admin], 'buttons' => %w[reason_buttons popover mount rail card button_row],
               'data' => %w[pill flag marker count bars group disclosure changelog lists quiet entry values thing reason_shown pre table summary], 'input' => %w[ss category_picker form choice_list only_choice compose], 'flow' => %w[line sentence meaning],
               'surfaces' => %w[layer elements messages copy top_band ribbon show_where] }.freeze
    # Redmine's forms and the GK section that does the same (nil: GK uses Redmine's own)
    OWN_CORE = [%w[forms form], %w[buttons reason_buttons], %w[tables lists], ['journals', nil], ['tabs', nil], %w[flash messages],
                ['pagination', nil], %w[toolbar icon_button], %w[context_menu lists], %w[tooltip copy], %w[badges pill], %w[dialog elements]].freeze
    # the elements whose every state takes the whole row; in the library form their panel stands under the grid over
    # the whole width (the marker's rows with the label's words after them)
    WIDE = %w[line sentence meaning lists form marker top_band entry table core_forms core_tables core_context_menu core_journals core_dialog core_flash core_toolbar core_tabs core_pagination].freeze
  end
end
