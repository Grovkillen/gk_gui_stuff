# frozen_string_literal: true

module GkGuiStuff
  # The row editor: rows a person adds, removes and moves in a form, with no limit on their number
  # (gk_gui_stuff_rows.js has the markup contract; README "Row editor"). Not a module: it is the form's own behaviour.
  # A view marks its rows with data attributes and calls <%= gk_gui_stuff_row_editor %> once; the helper gives the
  # script, its stylesheet and the kit the script takes core's handle, delete and add links from (core's sprite
  # icons and words, so nothing is drawn of our own). A plugin without gui_stuff asks
  # respond_to?(:gk_gui_stuff_row_editor) and renders its rows as plain fields.
  module RowEditorHelper
    def gk_gui_stuff_row_editor
      return ''.html_safe if @gk_gui_stuff_row_editor

      @gk_gui_stuff_row_editor = true
      handle = content_tag(:span, sprite_icon('reorder', ''), class: 'icon-only icon-sort-handle sort-handle gk-gui-stuff-row-handle', role: 'button', tabindex: 0,
                                                              title: l(:button_sort), 'aria-label': l(:text_gk_gui_stuff_rows_move), data: { kit: 'handle' })
      remove = link_to(sprite_icon('del', l(:button_delete), icon_only: true), '#', class: 'icon-only icon-del gk-gui-stuff-row-remove', role: 'button',
                                                                                    title: l(:button_delete), data: { kit: 'remove' })
      add = link_to(sprite_icon('add', l(:label_gk_gui_stuff_rows_add)), '#', class: 'icon icon-add gk-gui-stuff-rows-add-link', role: 'button', data: { kit: 'add' })
      safe_join([stylesheet_link_tag('gk_gui_stuff_rows', plugin: 'gk_gui_stuff'),
                 content_tag(:template, safe_join([handle, remove, add]), id: 'gk-gui-stuff-rows-kit'),
                 javascript_include_tag('gk_gui_stuff_rows', plugin: 'gk_gui_stuff')], "\n")
    end
  end
end
