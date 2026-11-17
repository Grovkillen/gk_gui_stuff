# frozen_string_literal: true

module GkGuiStuff
  # The tone of the surface that is drawn: light or dark. The colour roles have light values (the root block of
  # gk_gui_stuff_primitives.css) and dark values (gk_gui_stuff_roles_dark.css), and which of them apply follows the
  # tone of the surface, not the device's setting. A theme that draws the page says the tone of its surface in the
  # attribute ATTRIBUTE on html, with one of VALUES. Without the attribute the tone is dark while GK Core Stuff's dark
  # mode class is on html, and light otherwise; with the attribute it is what the attribute says, also under that
  # class. The dark sheet is linked on every page and its selector alone decides, so a theme that says the dark tone
  # gets the dark values also where GK Core Stuff's dark mode is not there. GK GUI Stuff owns the name and sets the
  # attribute nowhere; other plugins read the name here and never write it out themselves. Plain Ruby, no Rails, so
  # that a test can require the file alone.
  module Tone
    ATTRIBUTE = 'data-gk-tone'
    LIGHT = 'light'
    DARK = 'dark'
    VALUES = [LIGHT, DARK].freeze
    # The class of GK Core Stuff's dark mode that the dark sheet's selector is written for
    DARK_CLASS = 'dark-mode'
    # The sheet with the roles' dark values
    DARK_SHEET = 'gk_gui_stuff_roles_dark'

    module_function

    # GK Core Stuff's dark mode is there and its class is the one the dark sheet is written for. With another class
    # the sheet would never apply by the class, so the style guide has no dark choice then and a renamed class shows
    # at once. The sheet's link does not ask this
    def core_dark?
      defined?(::GkCoreStuff::DarkMode) && ::GkCoreStuff::DarkMode.const_defined?(:CLASS) && ::GkCoreStuff::DarkMode::CLASS == DARK_CLASS ? true : false
    end

    # The class that makes the page dark without a theme, nil without GK Core Stuff's dark mode
    def dark_class = core_dark? ? DARK_CLASS : nil
  end
end
