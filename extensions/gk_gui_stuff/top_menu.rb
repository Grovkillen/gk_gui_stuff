# frozen_string_literal: true

module GkGuiStuff
  # The GK plugins' entries in the top menu (beside Hem, Min sida and Projekt) under the installation's own name: a
  # plugin's entry has the plugin's own default word, and the administrator gives it another (CMDB becomes Artiklar)
  # in gui_stuff's settings, in the language at hand. The other languages are its translations on fields' page
  # Översättningar, as the administration rows' words (AdminGroups). Core's own entries keep core's words. The word is
  # put in where core draws the menu (MenuHelper#extract_node_details while render_menu draws :top_menu), so it is the
  # same wherever core shows the top menu, also in the mobile menu.
  module TopMenu
    module_function

    def stored
      h = Switches.settings['top_menu']
      h.is_a?(Hash) ? h : {}
    end

    # The GK plugins' entries in the top menu, in the order core draws them (also those a condition hides right now)
    def items
      root = ::Redmine::MenuManager.items(:top_menu)
      (root.respond_to?(:children) ? root.children.to_a : []).select { |i| i.name.to_s.start_with?('gk_') }
    end

    def item?(name) = name.to_s.start_with?('gk_') && items.any? { |i| i.name.to_s == name.to_s }

    # The entry's word in a language: the installation's own, else '' (the plugin's own word stands)
    def caption(name, lang = ::I18n.locale)
      own = stored.dig(name.to_s, 'caption')
      own.is_a?(Hash) ? own[lang.to_s].to_s.strip : ''
    rescue StandardError
      ''
    end

    def plugin_caption(node, lang = ::I18n.locale)
      ::I18n.with_locale(lang) { node.caption.to_s }
    rescue StandardError
      node.name.to_s.humanize
    end

    module MenuHelperPatch
      def render_menu(menu, project = nil)
        @gk_gui_stuff_menu = menu.to_sym
        super
      ensure
        @gk_gui_stuff_menu = nil
      end

      def extract_node_details(node, project = nil)
        caption, url, selected = super
        if @gk_gui_stuff_menu == :top_menu && node.name.to_s.start_with?('gk_')
          own = TopMenu.caption(node.name)
          caption = own unless own.empty?
        end
        [caption, url, selected]
      end
    end

    # fields' page Översättningar gets the entries' words as a source of its own: the word in the instance's language
    # is the text as written, the other languages are its translations. Saved here, in this plugin's settings.
    def register_texts!
      return unless defined?(::GkFields::Translations) && ::GkFields::Translations.respond_to?(:register_source)

      ::GkFields::Translations.register_source('gk_gui_stuff_top_menu', label: -> { ::I18n.t(:label_gk_gui_stuff_top_menu) }, entries: -> { entries })
    end

    def entries
      t = ::GkFields::Translations
      core_lang = t.core_language
      items.map do |i|
        name = i.name.to_s
        word = caption(name, core_lang).presence || plugin_caption(i, core_lang)
        others = t.languages.to_h { |l| [l.to_s, caption(name, l)] }.reject { |_l, v| v.empty? }
        t::Entry.new(key: "gk_gui_stuff_top_menu:#{name}:caption", thing: word, what: ::I18n.t(:label_gk_gui_stuff_top_menu_caption), core: word,
                     translations: others, history: nil, saver: ->(texts, _user, _origin) { save_captions(name, texts) })
      end
    end

    def save_captions(name, texts)
      s = Switches.settings.deep_dup
      rows = s['top_menu'].is_a?(Hash) ? s['top_menu'] : (s['top_menu'] = {})
      r = rows[name].is_a?(Hash) ? rows[name] : (rows[name] = {})
      before = r['caption'].is_a?(Hash) ? r['caption'] : {}
      after = before.merge(texts.to_h.transform_keys(&:to_s).transform_values { |v| v.to_s.strip }).reject { |_l, v| v.empty? }
      return false if after == before

      r['caption'] = after
      ::Setting.plugin_gk_gui_stuff = s
      true
    end
  end
end
