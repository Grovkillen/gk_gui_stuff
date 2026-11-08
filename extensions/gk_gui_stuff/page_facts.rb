# frozen_string_literal: true

module GkGuiStuff
  # What gui_stuff's own scripts read from the page's data (PageData, window.gkGuiStuffPage.data), so that no script
  # looks for it in core's rendered page. Each is given only when its module is on for the reader, and each is only
  # what core shows that reader on the same page; so all three are given to one not logged in too (anonymous: true).
  # * page_title (recent_pages, gk_gui_stuff_history.js): the page's name as core's html_title was given it, the parts
  #   joined with " - " as core joins them, without the instance's name (Setting.app_title) at the end.
  # * issue_parent (parent_link, gk_gui_stuff_issue.js): the issue's nearest parent the reader may see, as core links
  #   it above the subject (render_issue_subject_with_tree, link_to_issue): its address, its link text ("Tracker #12"),
  #   core's classes for it (Issue#css_classes) and its subject.
  # * calendar_issues (calendar_compact, gk_gui_stuff_calendar_compact.js): the issues core drew on the calendar page,
  #   by id: tracker and subject.
  # Every value is plain text in JSON; the page package escapes it for the script (json_escape) and the scripts put it
  # in as text, never as HTML.
  module PageFacts
    SEPARATOR = ' - '

    module_function

    def on?(key, user = ::User.current)
      m = Registry.find(key)
      m && Switches.on_for?(m, user) ? true : false
    end

    def page?(controller, name, action)
      controller.respond_to?(:controller_name) && controller.controller_name == name && controller.action_name == action
    end

    # The parts of the page's name: what core's html_title was given on the page (the view's @html_title) and the
    # project's name, which core adds, without the instance's name. Core's html_title without arguments (the layout's
    # <title>) appends the project's name and the instance's name to that same list, so whatever already stands at its
    # end of those two is taken off first and the project's name put back once.
    def title_parts(parts, project_name, app_title)
      list = Array(parts).map { |p| p.to_s.strip }
      project = project_name.to_s.strip
      ends = [app_title.to_s.strip, project].reject(&:empty?)
      list.pop while list.any? && (list.last.empty? || ends.include?(list.last))
      list << project unless project.empty?
      list.reject(&:empty?)
    end

    def page_title(view, controller)
      return nil unless view
      return nil unless on?('recent_pages')

      project = controller&.instance_variable_get(:@project)
      name = project.respond_to?(:name) ? project.name : nil
      text = title_parts(view.instance_variable_get(:@html_title), name, ::Setting.app_title).join(SEPARATOR)
      text.empty? ? nil : text
    end

    # The issue's nearest parent the reader may see, as core chooses it above the subject (the last of the visible
    # ancestors)
    def issue_parent(view, controller, user = ::User.current)
      return nil unless page?(controller, 'issues', 'show') && on?('parent_link', user)

      issue = controller.instance_variable_get(:@issue)
      return nil unless issue.is_a?(::Issue) && issue.persisted? && !issue.root?

      parent = issue.ancestors.visible(user).to_a.last
      parent && parent_data(parent, view, user)
    end

    def parent_data(parent, view, user = ::User.current)
      url = view.respond_to?(:issue_path) ? view.issue_path(parent) : "#{::Redmine::Utils.relative_url_root}/issues/#{parent.id}"
      { url: url.to_s, text: "#{parent.tracker} ##{parent.id}", classes: parent.css_classes(user).to_s, subject: parent.subject.to_s }
    end

    # The issues core drew on the calendar page: the events core's calendar was given (versions are left out)
    def calendar_issues(controller)
      return nil unless page?(controller, 'calendars', 'show') && on?('calendar_compact')

      calendar = controller.instance_variable_get(:@calendar)
      events = calendar&.instance_variable_get(:@events)
      issues_by_id(events)
    end

    def issues_by_id(events)
      out = Array(events).select { |e| e.is_a?(::Issue) }.to_h { |i| [i.id.to_s, { tracker: i.tracker.to_s, subject: i.subject.to_s }] }
      out.empty? ? nil : out
    end

    def register!
      PageData.register('page_title', plugin: :gk_gui_stuff, anonymous: true) { |ctx| page_title(ctx[:view], ctx[:controller]) }
      PageData.register('issue_parent', plugin: :gk_gui_stuff, anonymous: true) { |ctx| issue_parent(ctx[:view], ctx[:controller]) }
      PageData.register('calendar_issues', plugin: :gk_gui_stuff, anonymous: true) { |ctx| calendar_issues(ctx[:controller]) }
    end
  end
end
