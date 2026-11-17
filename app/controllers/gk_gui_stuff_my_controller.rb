# frozen_string_literal: true

# My account > Appearance: the appearance settings that are optional in the instance, in the groups of Administration >
# Utseende, and Like Redmine for me first. Each row saves at once by its rail and needs no reason; every change is an
# event on the person's own row in gk_records. Refused when the setting is not optional now.
class GkGuiStuffMyController < ApplicationController
  include GkGuiStuff::Gate::Controller # core's 404 without GK Compat (gate.rb)
  # a page of the person's own, as core's My account: no project menu (core's MyController does the same)
  self.main_menu = false
  before_action :require_login
  before_action :find_register
  helper :gk_gui_stuff_appearance
  # Påverkar under each row (gk_gui_stuff_affects)
  helper :gk_gui_stuff_form_page

  def show
    # a core page type's view is chosen on the page itself and put back under My account, not here
    @rows = @register ? @register.optional.reject { |r| r.key.start_with?(GkGuiStuff::Meaning.row_key('')) } : []
    @groups = @register ? @register.by_group.filter_map { |g, rows| (list = rows & @rows).any? ? [g, list] : nil } : []
  end

  # One optional setting: on (1 or 0) from a switch; choice (off, or one of the person's value's choices) from a
  # segment; values { name => value } from a row with its own Spara
  def choose
    row = @register&.find(params[:key])
    return answer(false, l(:text_gk_gui_stuff_not_optional)) unless row && @register.mode(row.key) == 'optional' && @register.available?(row) &&
                                                                     !row.key.start_with?(GkGuiStuff::Meaning.row_key(''))

    on = nil
    values = params[:values]
    values = values.to_unsafe_h if values.respond_to?(:to_unsafe_h)
    values = values.is_a?(Hash) ? values.to_h : nil
    choice = nil
    if params.key?(:choice)
      choice = params[:choice].to_s
      if choice == 'off' && row.person_off
        on = false
      else
        # Off only where the row offers it (person_off); elsewhere off is a value like any other, and refused unless
        # it is one of the value's choices
        v = row.values.values.find(&:person)
        return answer(false, l(:text_gk_gui_stuff_not_optional)) unless v
        return answer(false, l(:text_gk_gui_stuff_not_saved)) if choice == 'off' && !v.choice_values.include?('off')

        on = true
        values = { v.name => choice }
      end
    elsif params.key?(:on)
      on = params[:on].to_s == '1'
    end
    @register.set_person!(User.current, row.key, on: on, values: values)
    # the saved choice in the answer, so that a script following the row knows which of its choices this answers
    answer(true, nil, choice ? { choice: choice } : {})
  rescue GkRecords::AppearanceSettings::Invalid, ArgumentError => e
    Rails.logger.info("[gk_gui_stuff] a person's appearance choice refused: #{e.message}")
    answer(false, l(:text_gk_gui_stuff_not_saved))
  end

  # Like Redmine for me, while the administrator allows it
  def redmine
    return answer(false, l(:text_gk_gui_stuff_not_optional)) unless @register&.redmine_granted?

    @register.set_redmine_for!(User.current, params[:on].to_s == '1')
    answer(true)
  end

  private

  def find_register = (@register = GkGuiStuff.appearance_settings)

  def answer(ok, message = nil, extra = {})
    render json: { ok: ok, message: message }.merge(extra), status: ok ? :ok : :unprocessable_entity
  end
end
