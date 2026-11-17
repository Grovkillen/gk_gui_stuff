# frozen_string_literal: true

module GkGuiStuff
  # A plugin's change log on its settings page, a helper of PrimitivesHelper like the others (the module is opened
  # again here, so it is included wherever the primitives are). Every GK plugin draws its log with it, so that the log
  # looks and folds the same everywhere: a box with the heading Ändringslogg, the note that the log is in English where
  # it is, and the log in the disclosure (gk_gui_stuff_disclosure). The settings frame (gk_gui_stuff_settings.js) knows
  # the box by data-gk-gui-stuff-changelog and folds it per version instead; without the frame the disclosure stays:
  # one fold, never two.
  module PrimitivesHelper
    # gk_gui_stuff_changelog(plugin, open: false) -> ActiveSupport::SafeBuffer
    #   plugin: Redmine::Plugin, or its id (:gk_records / 'gk_records')
    #   Reads CHANGELOG.<I18n.locale>.md, then CHANGELOG.md, in plugin.directory.
    #   Drops the introduction before the first "## " and draws the rest with common_mark (as the settings page did).
    #   No file (or no such plugin): '' (no box).
    #   open: true draws the disclosure open (the style guide's tile).
    def gk_gui_stuff_changelog(plugin, open: false)
      found = GkGuiStuff::Changelog.file_for(plugin, ::I18n.locale)
      return ''.html_safe unless found

      id, path, own_language = found
      gk_gui_stuff_changelog_box(id, File.read(path, encoding: 'UTF-8'), note: GkGuiStuff::Changelog.note?(own_language, ::I18n.locale), open: open)
    end

    # The box itself for a log given as Markdown, not read from a file: what gk_gui_stuff_changelog draws, and the style
    # guide's made-up log. id: the plugin's id (data-gk-gui-stuff-changelog); note: the line that the log is in English
    def gk_gui_stuff_changelog_box(id, markdown, note: false, open: false)
      text = GkGuiStuff::Changelog.versions(markdown)
      log = content_tag(:div, Redmine::WikiFormatting.to_html('common_mark', text).to_s.html_safe, class: 'wiki')
      line = note ? content_tag(:p, content_tag(:em, l(:text_gk_gui_stuff_changelog_english)), class: 'gk-gui-stuff-changelog-note') : nil
      fold = gk_gui_stuff_disclosure(texts: [l(:label_gk_gui_stuff_changelog_show), l(:label_gk_gui_stuff_changelog_hide)], open: open) { log }
      content_tag(:fieldset, safe_join([content_tag(:legend, l(:label_gk_gui_stuff_changelog)), line, fold].compact),
                  class: 'box gk-gui-stuff-changelog', data: { gk_gui_stuff_changelog: id.to_s })
    end
  end

  # What the change log's helper reads, apart from the view so that it can be tried without one
  module Changelog
    module_function

    # [plugin id, path, in the person's own language] of the first log found: CHANGELOG.<locale>.md, then CHANGELOG.md;
    # nil without a file or without the plugin
    def file_for(plugin, locale)
      p = plugin.respond_to?(:directory) ? plugin : Redmine::Plugin.find(plugin.to_s)
      dir = p.directory.to_s
      return nil if dir.empty?

      own = File.join(dir, "CHANGELOG.#{locale}.md")
      return [p.id.to_s, own, true] if File.file?(own)

      plain = File.join(dir, 'CHANGELOG.md')
      File.file?(plain) ? [p.id.to_s, plain, false] : nil
    rescue Redmine::PluginNotFound
      nil
    end

    # The log from its first version heading ("## "): the introduction before it is left out
    def versions(text) = text.to_s.sub(/\A.*?(?=^## )/m, '')

    # The note that the log is in English: only for CHANGELOG.md, and only when the page is not in English
    def note?(own_language, locale) = !own_language && !locale.to_s.start_with?('en')
  end
end
