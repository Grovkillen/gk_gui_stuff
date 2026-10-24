# frozen_string_literal: true

module GkGuiStuff
  # The row menu: a GK list's row actions in a "..." button at the row's end and a menu on a right click, as core's
  # issue list (gk_gui_stuff_row_menu.js has the markup contract; README "Row menu"). Not a module: it is the list's own
  # behaviour. A view marks its table and actions and calls <%= gk_gui_stuff_row_menu %> once; the helper gives the
  # script, its stylesheet and the kit (core's actions button with the 3-bullets icon and core's delete icon, core's
  # words). A plugin without gui_stuff asks respond_to?(:gk_gui_stuff_row_menu); its actions stay in the row.
  module RowMenuHelper
    def gk_gui_stuff_row_menu
      return ''.html_safe if @gk_gui_stuff_row_menu

      @gk_gui_stuff_row_menu = true
      button = link_to(sprite_icon('3-bullets', l(:button_actions), icon_only: true), '#', title: l(:button_actions), role: 'button',
                                                                                         class: 'icon-only icon-actions gk-gui-stuff-rowmenu-btn',
                                                                                         'aria-haspopup': 'menu', 'aria-expanded': 'false', data: { kit: 'button' })
      del = content_tag(:span, sprite_icon('del'), data: { kit: 'del' })
      safe_join([stylesheet_link_tag('gk_gui_stuff_row_menu', plugin: 'gk_gui_stuff'),
                 content_tag(:template, safe_join([button, del]), id: 'gk-gui-stuff-rowmenu-kit'),
                 javascript_include_tag('gk_gui_stuff_row_menu', plugin: 'gk_gui_stuff')], "\n")
    end
  end
end
