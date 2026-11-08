# frozen_string_literal: true

# The style guide: Redmine's own elements, drawn by core's real partials with records made up in memory,
# and every primitive of the design language in all its states, drawn by its own helper, so that
# the page shows what the plugins use. For administrators, stepped up or not (it is information). It is the
# function gui_stuff.styleguide in records' register, off from the start: off, or without records, the page
# and its addresses answer 404 and nothing links to it. The save address is the guide's own and stores nothing: it
# answers as a quick save does, and fails when asked to, so that the rail's states can be tried.
# The records made up are never saved: negative ids, so that what core reads for them (attachments, reactions, other
# plugins' rows) finds nothing, and nothing is written for them.
class GkGuiStuffStyleguideController < ApplicationController
  # A page of its own, as the icon library under Administration: core's page frame (layout base) without the
  # administration's side menu and without a project's main menu, so that both pages have the same width
  self.main_menu = false
  before_action -> { render_404 unless GkGuiStuff.styleguide? }
  before_action :require_login
  before_action :require_account_admin
  helper :gk_gui_stuff_styleguide
  # core's partials need their own helpers (Redmine draws with include_all_helpers off)
  helper :queries, :issues, :journals, :context_menus, :watchers, :custom_fields, :sort
  helper_method :demo

  # @on: the modules on for the viewer, since the shared elements, the whisper and the choosers load only with a
  # module that uses them; the page says so where a Prova would show nothing. @form: the page's form, Sida (page,
  # the side menu) unless the address asks for Bibliotek (form=library, the icon library's form)
  def show
    @form = params[:form].to_s == 'library' ? 'library' : 'page'
    page_state
  end

  # Telefon: one element's tiles on a page of their own, which the guide shows in a frame 375 px wide, so that every
  # rule for a narrow window applies as on a phone. Redmine's own page frame (layout base) with the page's own
  # parts hidden by the guide's stylesheet (core's body classes for the controller and the action)
  def frame
    @section = GkGuiStuff::Styleguide.sections.find { |s| s.key == params[:key].to_s }
    return render_404 unless @section

    page_state
    render layout: 'base'
  end

  # Stores nothing. fail=1 answers as a save that did not go through; quiet=1 (a script's post that reads no answer,
  # the line's panel state) answers as a script's; a page that posted a form goes back to where it was in the guide
  def save
    failed = params[:fail].to_s == '1'
    if request.xhr? || request.format.json? || params[:quiet].to_s == '1'
      return render json: { ok: false, message: l(:text_gk_gui_stuff_styleguide_failed) }, status: :unprocessable_entity if failed

      return render json: { ok: true }
    end
    flash[failed ? :error : :notice] = l(failed ? :text_gk_gui_stuff_styleguide_failed : :text_gk_gui_stuff_styleguide_saved)
    redirect_to back_in_guide
  end

  # Core's context menu for the made-up issues (Prova on the guide's issue list): core's own template
  # with the variables ContextMenus::IssuesController sets; its links lead nowhere, the guide's script stops them.
  # The menu is for the rows marked (ids from core's script) among both made-up lists; @issue only for one, as core
  def context_menu
    d = demo
    all = d[:issues] + d[:cm_issues]
    ids = Array(params[:ids]).map(&:to_i)
    @issues = all.select { |i| ids.include?(i.id) }
    @issues = d[:cm_issues] if @issues.empty?
    @issue = @issues.first if @issues.size == 1
    @issue_ids = @issues.map(&:id)
    @project = d[:project]
    @allowed_statuses = d[:statuses]
    @trackers = [d[:tracker]]
    @versions = []
    @priorities = d[:priorities]
    @assignables = d[:users]
    @can = { edit: true, log_time: false, copy: true, add_watchers: true, delete: true, add_subtask: false }
    @back = gk_gui_stuff_styleguide_path
    @columns = []
    @options_by_custom_field = {}
    @safe_attributes = %w[tracker_id status_id priority_id assigned_to_id done_ratio]
    @include_delete = true
    render template: 'context_menus/issues', layout: false
  rescue StandardError => e
    Rails.logger.warn("[gk_gui_stuff] style guide context menu: #{e.class} #{e.message}")
    render html: helpers.content_tag(:p, l(:text_gk_gui_stuff_sg_section_failed, key: 'context_menu'), class: 'warning'), layout: false
  end

  private

  def page_state
    @dark = dark_classes
    mods = GkGuiStuff::Switches.active
    @on = mods.map(&:key)
    @elements = mods.any?(&:elements)
    @kernel = mods.any?(&:kernel)
  end

  # theme_engine's dark classes for the page's root, only where its basic mode gives this viewer a dark mode (the head
  # hook writes the dark values then, and only then); with the engine on, the theme's own classes stand on the page and
  # the choice is not drawn, so that it never puts the basic mode's classes over a theme
  def dark_classes
    b = defined?(::GkThemeEngine::Basic) ? ::GkThemeEngine::Basic : nil
    return nil unless b && b.respond_to?(:on?) && b.respond_to?(:dark_classes)

    b.on?(User.current) ? b.dark_classes : nil
  rescue StandardError => e
    Rails.logger.warn("[gk_gui_stuff] style guide dark mode: #{e.class} #{e.message}")
    nil
  end

  def require_account_admin
    render_403 unless GkGuiStuff::Primitives.account_admin?
  end

  # Where a form posted from the guide goes back to: the guide's page or frame page it came from (the referer's path
  # and query only, and only an address of the guide's own pages; else the guide), at the element the guide's script
  # named (sg_key, a key of the register), so that the form chosen (?form=library) and the place stay
  def back_in_guide
    guide = gk_gui_stuff_styleguide_path
    from = begin
      URI.parse(request.referer.to_s)
    rescue URI::InvalidURIError
      nil
    end
    path = from&.path.to_s
    own = path == guide || path.start_with?("#{guide}/frame/")
    back = own ? [path, from.query.presence].compact.join('?') : guide
    section = GkGuiStuff::Styleguide.sections.find { |s| s.key == params[:sg_key].to_s }
    section ? "#{back}##{section.anchor}" : back
  end

  # The records made up for core's partials, in memory and never saved, every word from the locale files
  def demo
    @demo ||= begin
      t = ->(k) { l(:"label_gk_gui_stuff_sg_example_#{k}") }
      fake = ->(obj, id) { obj.id = id; obj }
      project = fake.call(Project.new(name: t.call(:project), identifier: 'gk-gui-stuff-styleguide'), -1)
      # a record not saved has no address of its own, and core's context menu asks for the project's
      project.define_singleton_method(:to_param) { identifier }
      # people: the three users and seven more, for core's dialog, whose list is a box of a fixed height; first and
      # last name apart, so that core's initials and the installation's name format work as for a real user
      people = (1..10).map do |i|
        fake.call(User.new(firstname: t.call("person_#{i}_first"), lastname: t.call("person_#{i}_last"), status: User::STATUS_ACTIVE), -i)
      end
      users = people.first(3)
      tracker = fake.call(Tracker.new(name: t.call(:tracker)), -1)
      statuses = [fake.call(IssueStatus.new(name: t.call(:value_open), is_closed: false), -1), fake.call(IssueStatus.new(name: t.call(:status_closed), is_closed: true), -2)]
      priorities = [fake.call(IssuePriority.new(name: t.call(:priority_normal)), -1), fake.call(IssuePriority.new(name: t.call(:priority_high)), -2)]
      rows = [[t.call(:issue_1), 0, 0, 3.5], [t.call(:issue_2), 0, 1, 2.0], [t.call(:issue_3), 1, 2, 1.0]]
      build = ->((subject, s, u, hours), i) do
        issue = Issue.new
        issue.project = project
        issue.tracker = tracker
        issue.status = statuses[s]
        issue.priority = priorities[i.zero? ? 1 : 0]
        issue.author = users[0]
        issue.assigned_to = users[u]
        issue.subject = subject
        issue.estimated_hours = hours
        issue.done_ratio = s == 1 ? 100 : 30
        issue.created_on = issue.updated_on = Time.current - ((i % 3) + 1).days
        fake.call(issue, -(i + 1))
      end
      issues = rows.each_with_index.map { |row, i| build.call(row, i) }
      # the context menu's own small list: two more issues (their own ids, so that no row's id is there twice)
      cm_issues = rows.first(2).each_with_index.map { |row, i| build.call(row, i + 3) }
      # core's history offers a quote on each note, whose address (quoted_issue) takes only digits as the issue's id;
      # the made-up issue keeps its negative id and gives the address 0, which no issue has
      issues.first.define_singleton_method(:to_param) { '0' }
      { project: project, users: users, people: people, tracker: tracker, statuses: statuses, priorities: priorities, issues: issues,
        query: demo_query(issues, statuses), cm_issues: cm_issues, cm_query: demo_query(cm_issues, statuses, grouped: false),
        journals: demo_journals(issues.first, users, t), form: demo_form(t) }
    end
  end

  # An issue list grouped by status with the sum of the estimated time; what the query would count in the database is
  # counted from the issues in memory; grouped: false gives a plain list without groups and sums
  def demo_query(issues, statuses, grouped: true)
    unless grouped
      q = IssueQuery.new(name: '_', column_names: %w[tracker status subject assigned_to])
      q.sort_criteria = [%w[subject asc]]
      return q
    end

    q = IssueQuery.new(name: '_', group_by: 'status', column_names: %w[tracker status subject assigned_to estimated_hours], totalable_names: %w[estimated_hours])
    q.sort_criteria = [%w[subject asc]]
    by = issues.group_by(&:status)
    q.define_singleton_method(:result_count_by_group) { statuses.to_h { |s| [s, Array(by[s]).size] } }
    q.define_singleton_method(:total_by_group_for) { |_c| statuses.to_h { |s| [s, Array(by[s]).sum(&:estimated_hours)] } }
    q.define_singleton_method(:total_for) { |_c| issues.sum(&:estimated_hours) }
    q
  end

  # Two changes in the history: one with a note, one with a changed attribute and a private note
  def demo_journals(issue, users, t)
    [[users[0], t.call(:note), false, 3], [users[1], t.call(:note_private), true, 1]].each_with_index.map do |(user, notes, priv, days), i|
      # updated_on as created_on: a change never edited, so that core shows no "edited" after it
      at = Time.current - days.days
      j = Journal.new(journalized: issue, user: user, notes: notes, private_notes: priv, created_on: at, updated_on: at)
      j.id = -(i + 1)
      j.indice = i + 1
      j.details.build(property: 'attr', prop_key: (i.zero? ? 'done_ratio' : 'subject'), old_value: (i.zero? ? '0' : issue.subject), value: (i.zero? ? '30' : t.call(:issue_1)))
      j
    end
  end

  def demo_form(t)
    f = GkGuiStuff::Styleguide::Demo.new(subject: '', kind: 'b', done: true, start_date: Date.today, description: t.call(:note), level: 'optional')
    f.errors.add(:subject, :blank)
    f
  end
end
