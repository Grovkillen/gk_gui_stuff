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
  # * No patch on textilizable: the links of formatted text come from GK Core Stuff's formatting_processors, where
  #   ExternalText::Links is registered as this plugin's link processor (external_text.rb); links to another host get
  #   rel, and by the reader's settings the class, the tooltip, a new tab and the preview mark. A view without a request
  #   (mail) gets only rel and the tooltip. Without GK Core Stuff they are not marked. The same processor gets the
  #   links of a custom value's formatted value from the same pass (origin :custom_value, ExternalRel::Values): rel,
  #   and the look by the place; no patch on format_object.
  # * ApplicationHelper#link_to (ExternalRel::HelperPatch, external_rel.rb): core's link_to(name, options = nil,
  #   html_options = nil), with a block (options, html_options); an address given as a string to another host gets rel
  #   in the html options.
  # * HelpController (ExternalRel::HelpPatch, external_rel.rb): a before_action that sets the answer's header
  #   Referrer-Policy: no-referrer on the wiki syntax help (core's static templates, no hook); the page is not read.
  # * The runs of text of formatted text come from the same pass, where Arrows::Processor (arrows.rb) is this plugin's
  #   text processor: <-->, --> and <-- become arrows on a page the reader opens. Without GK Core Stuff they stay.
  # * ApplicationHelper#l (AdminGroups::RetitleHelperPatch, admin_groups.rb): Redmine::I18n#l(*args), which
  #   ApplicationHelper includes; with one key, on the page of a renamed administration row (core's current menu item
  #   in the layout admin), the row's key gives the row's own word, so core's heading and html_title carry it.
  # * ChoicesBoxHelper, RowEditorHelper, RowMenuHelper, PrimitivesHelper, LineHelper, SentenceHelper and MeaningHelper in
  #   ActionView::Base: every view class inherits from it, so gk_gui_stuff_choices_box, gk_gui_stuff_row_editor,
  #   gk_gui_stuff_row_menu and the primitives (gk_gui_stuff_pill and the rest, primitives.rb; gk_gui_stuff_line,
  #   line.rb; gk_gui_stuff_sentence, sentence.rb; gk_gui_stuff_meaning_switch, meaning.rb) answer in every view; every
  #   name in the modules carries the gk_gui_stuff_ prefix.
  # Applied directly from init.rb, which Redmine runs inside to_prepare at start and again after every reload in
  # development mode; every prepend and include is guarded, so a reload never adds a module twice.
  module Patches
    module_function

    def apply!
      ::Issue.prepend(Overdue::IssuePatch) unless ::Issue < Overdue::IssuePatch
      ::ApplicationController.prepend(Personal::ForgetAfterChange) unless ::ApplicationController < Personal::ForgetAfterChange
      ::ApplicationHelper.prepend(PageData::PrincipalLinkPatch) unless ::ApplicationHelper < PageData::PrincipalLinkPatch
      # links to other websites in formatted text and in custom values (ExternalText), and the module arrows in the
      # runs of text (Arrows), through GK Core Stuff's pass; again on a reload replaces
      if defined?(::GkCoreStuff::FormattingProcessors)
        processors = { link: ExternalText::Links }
        processors[:text] = Arrows::Processor if Arrows.available?
        ::GkCoreStuff::FormattingProcessors.register(:gk_gui_stuff, **processors)
      end
      # the heading and the window's title of a renamed administration row's page (AdminGroups::RetitleHelperPatch)
      ::ApplicationHelper.prepend(AdminGroups::RetitleHelperPatch) unless ::ApplicationHelper < AdminGroups::RetitleHelperPatch
      # links to other websites outside formatted text (ExternalRel)
      ::ApplicationHelper.prepend(ExternalRel::HelperPatch) unless ::ApplicationHelper < ExternalRel::HelperPatch
      ::HelpController.include(ExternalRel::HelpPatch) unless ::HelpController < ExternalRel::HelpPatch
      # the GK plugins' top menu entries under the installation's own word (TopMenu)
      ::Redmine::MenuManager::MenuHelper.prepend(TopMenu::MenuHelperPatch) unless ::Redmine::MenuManager::MenuHelper < TopMenu::MenuHelperPatch
      [ChoicesBoxHelper, RowEditorHelper, RowMenuHelper, PrimitivesHelper, LineHelper, SentenceHelper, MeaningHelper].each { |m| ActionView::Base.include(m) unless ActionView::Base.include?(m) }
    end
  end
end
