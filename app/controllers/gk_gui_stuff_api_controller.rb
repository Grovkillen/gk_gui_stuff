# frozen_string_literal: true

# gk_gui_stuff: the small endpoints the shared elements use. The session's user, the same visibility as the
# object's own page. view_state: remember a choice of view. beat: the heartbeat (what changed on the page one
# looks at since it was loaded; one call, shared by whoever needs it). branch: a project's branch of the tree.
class GkGuiStuffApiController < ApplicationController
  before_action :require_login
  helper :issues, :custom_fields
  include IssuesHelper
  include CustomFieldsHelper

  def view_state
    if GkGuiStuff::ViewStates.set(User.current, params[:key], params[:value])
      render json: { key: params[:key].to_s, value: params[:value].to_s }
    else
      head 422
    end
  end

  def beat
    out = beat_for(params[:kind].to_s, params[:id], params[:since].to_s)
    return head(:not_found) if out.nil?

    render json: out
  end

  # The pulse: every part the page asks in one request, answered by the plugin that registered it
  # (GkGuiStuff::Pulse); the corner's heartbeat is one of the parts
  def pulse
    return head(:unauthorized) unless User.current.logged?

    parts = params[:parts].respond_to?(:to_unsafe_h) ? params[:parts].to_unsafe_h : {}
    render json: GkGuiStuff::Pulse.answer(User.current, parts, self)
  end

  # What changed on an issue since a time, for the corner: nil when the issue is not to be seen
  def beat_for(kind, id, since_text)
    out = { at: Time.current.utc.iso8601(3), changes: [] }
    since = begin
      Time.iso8601(since_text)
    rescue ArgumentError
      nil
    end
    if kind == 'issue' && since && on?('corner')
      issue = Issue.visible.find_by(id: id)
      return nil unless issue

      journals = Journal.visible.where(journalized_type: 'Issue', journalized_id: issue.id).where('journals.created_on > ?', since)
                        .includes(:user, :details).order(:id).limit(50).to_a
      out[:changes] = journals.map { |j| change_line(j) }
      out[:mine] = journals.any? { |j| j.details.any? { |d| d.prop_key == 'assigned_to_id' && d.value.to_s == User.current.id.to_s } }
    end
    out
  end

  def branch
    return head(:not_found) unless on?('branch_jump')

    project = Project.visible.find_by(identifier: params[:id].to_s) || Project.visible.find_by(id: params[:id].to_i)
    return head(:not_found) unless project

    render json: GkGuiStuff::Branch.of(project, User.current, params[:tab].to_s)
  end

  private

  def on?(key)
    mod = GkGuiStuff::Registry.find(key)
    mod && GkGuiStuff::Switches.on_for?(mod)
  end

  # "Olle Kvarnby 12:04: Status ändrad från Ny till Pågår; anteckning"
  def change_line(journal)
    what = details_to_strings(journal.visible_details, true)
    what << l(:field_notes) if journal.notes.present?
    "#{journal.user&.name} #{format_time(journal.created_on, false)}: #{what.join('; ').presence || '-'}"
  end
end
