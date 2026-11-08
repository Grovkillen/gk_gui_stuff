# frozen_string_literal: true

# Administration > Meningsvy och Klassisk vy: the latest change of a row, shown after it in the row's name cell as a
# quiet line, as the latest change stands on a row of Utseende: what it became, the date, who, and the reason cut to
# one line, with Historik when GK Records lists its events
module GkGuiStuffMeaningAdminHelper
  # The words of the line for a records event of the kind gui_meaning_changed
  def gk_gui_stuff_meaning_last_text(event)
    d = event.details_hash
    words = gk_gui_stuff_meaning_modes.to_h { |text, v| [v, text] }
    now = Array(d['mode']).last.presence || Array(d['default']).last.to_s
    who = event.user&.name || ::I18n.t(:label_user_anonymous)
    date = format_date(User.current.time_to_date(event.created_at))
    reason = event.reason_text.to_s.squish
    key = reason.present? ? :text_gk_gui_stuff_meaning_last_reason : :text_gk_gui_stuff_meaning_last
    ::I18n.t(key, mode: words[now] || now, date: date, user: who, reason: reason.truncate(80))
  end

  # The quiet line itself, with core's history icon and Historik; hidden without an event, with the same parts, so
  # that the first change on the row can fill in its text
  def gk_gui_stuff_meaning_last(event)
    history = respond_to?(:gk_records_events_path) ? link_to(::I18n.t(:label_history), gk_records_events_path(kind: GkGuiStuff::Meaning::KIND)) : nil
    text = event ? gk_gui_stuff_meaning_last_text(event) : ''
    content_tag(:span, safe_join([sprite_icon('history', nil, size: 12), content_tag(:span, text, class: 'gk-gui-stuff-meaning-last-text'),
                                  history].compact, ' '), class: 'gk-gui-stuff-meaning-last', hidden: event.nil?)
  end
end
