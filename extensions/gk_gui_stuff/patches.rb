# frozen_string_literal: true

module GkGuiStuff
  # Core patches, all applied from here; the modules stay beside the code they serve. Each says what it assumes of
  # core:
  # * Issue#css_classes (Overdue::IssuePatch, overdue.rb): core's css_classes(user = User.current) returns a string of
  #   classes; the mark gk-gui-stuff-due-soon is added, and then the classes other plugins register with
  #   Overdue.register_classes. The one patch on the method among the GK plugins.
  # * ApplicationController (Personal::ForgetAfterChange, personal.rb): an after_action; a request that is not a GET
  #   or HEAD forgets the person's counts on the own pages.
  # * ApplicationHelper#link_to_principal (PageData::PrincipalLinkPatch, page_data.rb): core's link to a person
  #   (link_to_user and the mentions go through it); the person is noted on the view for the page's data.
  # * ChoicesBoxHelper, RowEditorHelper and RowMenuHelper in ActionView::Base: every view class inherits from it, so
  #   gk_gui_stuff_choices_box, gk_gui_stuff_row_editor and gk_gui_stuff_row_menu answer in every view; every name
  #   in the modules carries the gk_gui_stuff_ prefix.
  # Applied directly from init.rb, which Redmine runs inside to_prepare at start and again after every reload in
  # development mode; every prepend and include is guarded, so a reload never adds a module twice.
  module Patches
    module_function

    def apply!
      ::Issue.prepend(Overdue::IssuePatch) unless ::Issue < Overdue::IssuePatch
      ::ApplicationController.prepend(Personal::ForgetAfterChange) unless ::ApplicationController < Personal::ForgetAfterChange
      ::ApplicationHelper.prepend(PageData::PrincipalLinkPatch) unless ::ApplicationHelper < PageData::PrincipalLinkPatch
      # the GK plugins' top menu entries under the installation's own word (TopMenu)
      ::Redmine::MenuManager::MenuHelper.prepend(TopMenu::MenuHelperPatch) unless ::Redmine::MenuManager::MenuHelper < TopMenu::MenuHelperPatch
      [ChoicesBoxHelper, RowEditorHelper, RowMenuHelper].each { |m| ActionView::Base.include(m) unless ActionView::Base.include?(m) }
    end
  end
end
