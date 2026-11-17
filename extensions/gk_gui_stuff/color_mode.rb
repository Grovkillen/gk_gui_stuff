# frozen_string_literal: true

module GkGuiStuff
  # The light, dark or automatic button in the top menu. The mode itself is GK Core Stuff's dark mode, an appearance
  # setting like the others (core_stuff.dark_mode: off, optional, forced) whose value is the choice: each person's own
  # under optional, chosen under My account > Appearance, the administrator's for everyone under forced, automatic for
  # whoever has not chosen. The sheets, the class and the attribute on html are GK Core Stuff's.
  # This is only the button, a shortcut to the same personal choice: an administrator's on or off of its own
  # (gui_stuff.color_mode, off and forced only, off from the start) that counts only while the mode is optional. Off,
  # the choice is still reached under My account. No button while the mode is off or forced, for someone not logged in,
  # or where GK Core Stuff's dark mode is not there or not on for the person (Like Redmine for me).
  # The button is GK GUI Stuff's cycle button (gk_gui_stuff_cycle_button): one press moves to the next mode in the order
  # light, dark, automatic and saves it at once, posting to the same address as the row under My account; there is no
  # box to choose in. Whoever has not chosen stands on automatic, so the first press gives light. The page changes mode
  # at once, the whisper at the button says the new mode, and a save that fails puts the button and the page back with
  # a notice. It stands where the account is: an item of core's account menu that the script replaces where the account
  # is a list, and before the account where it is a dropdown (compat's account_dropdown); there the item marks the place
  # it moves to while core's phone menu holds the account's list, where the button is a row with the mode in words. Its
  # icon is the mode that holds now: GK Icons' sun, moon and sun with a half circle, put in by the script; a sign
  # without GK Icons. A choice saved in the row under My account reaches the open page there too, with or without the
  # button.
  module ColorMode
    NAME = 'color_mode'
    KEY = "gui_stuff.#{NAME}"
    MODES = %w[light dark auto].freeze
    # GK Icons' own icons (config/icon_source.yml of GK Icons: sun, moon, brightness-half)
    ICONS = { 'light' => 'scheme-light', 'dark' => 'scheme-dark', 'auto' => 'scheme-auto' }.freeze
    # the button's sign where GK Icons is not there
    CHARS = { 'light' => "☀", 'dark' => "☾", 'auto' => "◐" }.freeze
    # the item of core's account menu that holds the button's place where the account is a list
    ITEM_CLASS = 'gk-gui-stuff-color-mode-item'
    # the button's id, also its anchor on the page Utseende (footprints.rb)
    ID = 'gk-gui-stuff-color-mode'
    SCRIPT = 'gk_gui_stuff_color_mode'
    STYLESHEET = 'gk_gui_stuff_color_mode'

    module_function

    # GK Core Stuff's dark mode with its row, its value and the person's choice; nil without it
    def core_dark
      d = defined?(::GkCoreStuff::DarkMode) ? ::GkCoreStuff::DarkMode : nil
      return nil unless d && d.respond_to?(:choice) && d.respond_to?(:on?)

      %i[ATTRIBUTE CHOICES ROW].all? { |c| d.const_defined?(c) } ? d : nil
    end

    # GK Core Stuff's dark mode is on for the person (its look, its gate)
    def available?(user)
      d = core_dark
      d ? d.on?(user) == true : false
    rescue StandardError
      false
    end

    def register = Appearance.register

    # The level of the mode, GK Core Stuff's row; off without the register or GK Core Stuff
    def mode
      r = register
      d = core_dark
      r && d ? r.mode(d::ROW) : 'off'
    end

    # The administrator's on or off for the button (off or forced on this plugin's row)
    def shown? = (r = register) ? r.mode(KEY) == 'forced' : false

    # The person's choice, GK Core Stuff's; nil while its dark mode is off for the person
    def choice(user)
      d = core_dark
      return nil unless d && available?(user)

      c = d.choice(user).to_s
      MODES.include?(c) ? c : nil
    rescue StandardError
      nil
    end

    # The button: for one logged in, while the mode is optional, the administrator shows the button, and GK Core
    # Stuff's dark mode is on for the person
    def button?(user)
      return false unless user.respond_to?(:logged?) && user.logged? && mode == 'optional' && shown?

      !choice(user).nil?
    end

    # The page follows the person's choice on an open page: logged in, the mode optional and GK Core Stuff's dark mode on
    # for the person, with or without the button
    def follows?(user)
      return false unless user.respond_to?(:logged?) && user.logged? && mode == 'optional'

      !choice(user).nil?
    end

    # The choice a row under My account shows pressed: GK Core Stuff's for its own row (the person's own, automatic
    # until chosen); nil for any other row
    def row_choice(key, user)
      d = core_dark
      d && key.to_s == d::ROW ? choice(user) : nil
    end

    # GK Core Stuff's own row, which gets the segment of its choices under My account although its plugin names no
    # control for it; no other row
    def segment_row?(key) = (d = core_dark) ? key.to_s == d::ROW : false

    # My account > Appearance, where the row of the same choice saves; the page follows it there also without the button
    def own_page?(view)
      view.controller_name.to_s == 'gk_gui_stuff_my'
    rescue StandardError
      false
    end

    # The account as a dropdown in core's user menu: compat knows (Personal.user_menu?)
    def dropdown? = Personal.user_menu?

    # The item in core's account menu: where the account is a list the button takes its place; where it is a dropdown
    # it marks the place the button moves to while core's phone menu holds the account's list
    def menu_item?(user) = button?(user)

    # GK Icons has the three icons; without them the button shows a sign
    def icons?
      defined?(::GkIcons) && ::GkIcons.respond_to?(:exists?) && ICONS.values.all? { |n| ::GkIcons.exists?(n) } ? true : false
    rescue StandardError
      false
    end

    # The words of a choice: its word ("Dark", the segment under My account and "Press for Dark"), what the button says
    # of it (the whisper, the row in core's phone menu and "Now: ..."; automatic says that it follows the device), and the
    # note the tooltip adds under automatic for what the device shows right now
    def word(choice) = ::I18n.t(:"label_gk_gui_stuff_color_mode_#{choice}")
    def said(choice) = choice.to_s == 'auto' ? ::I18n.t(:label_gk_gui_stuff_color_mode_auto_said) : word(choice)
    def device_words = { 'light' => ::I18n.t(:text_gk_gui_stuff_color_mode_device_light), 'dark' => ::I18n.t(:text_gk_gui_stuff_color_mode_device_dark) }
    def choices = MODES.map { |c| [word(c), c] }

    # The cycle button's modes in their order: light, dark, automatic, each with GK Icons' icon where it is there and
    # its sign
    def modes
      icons = icons?
      MODES.map { |m| { value: m, word: word(m), said: said(m), icon: icons ? ICONS[m] : nil, char: CHARS[m] } }
    end

    # What the script reads: the choice, the attribute GK Core Stuff names and what each choice puts on it, the words
    # for what the device shows under automatic, where the account is, and the address the choice is saved to (the
    # button and the row under My account both post there)
    def config(user, url = nil)
      c = choice(user)
      d = core_dark
      { mode: c, attribute: d::ATTRIBUTE, values: d::CHOICES, device: device_words, id: ID, item: ITEM_CLASS, dropdown: dropdown?, url: url }
    end

    # The button drawn by GK GUI Stuff's primitive, the cycle button, which saves the choice on GK Core Stuff's row as
    # the row under My account does. The script puts GK Icons' icon in the sign's place where GK Icons is there
    # (GkGui.icon); core's sprite has no sun or moon, so the server draws the sign
    def button(view, user)
      view.gk_gui_stuff_cycle_button('choice', modes, choice(user), url: view.gk_gui_stuff_my_appearance_path(key: core_dark::ROW),
                                                                    method: :post, label: ::I18n.t(:label_gk_gui_stuff_color_mode), html: { id: ID })
    end

    # At the end of the body: the script's data, the button in a template the script puts in its place, and the script.
    # On My account > Appearance the data and the script also without the button, so that a choice saved in the row
    # there reaches the open page. Nothing elsewhere where the person has no button
    def tags(view, user = ::User.current)
      return nil unless view

      shown = button?(user)
      return nil unless shown || (own_page?(view) && follows?(user))

      url = view.gk_gui_stuff_my_appearance_path(key: core_dark::ROW)
      json = view.content_tag('script', ERB::Util.json_escape(config(user, url).to_json).html_safe, type: 'application/json', id: "#{ID}-data")
      tpl = shown ? view.content_tag('template', button(view, user), id: "#{ID}-tpl") : nil
      view.safe_join([json, tpl, view.javascript_include_tag(SCRIPT, plugin: 'gk_gui_stuff', defer: true)].compact, "\n")
    rescue StandardError => e
      Rails.logger.warn("[gk_gui_stuff] the light and dark button left out: #{e.class}: #{e.message}") if defined?(Rails) && Rails.respond_to?(:logger) && Rails.logger
      nil
    end
  end
end
