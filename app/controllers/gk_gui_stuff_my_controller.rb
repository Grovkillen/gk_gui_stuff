# frozen_string_literal: true

# The person's own choices in gui_stuff: Core-like for me, and each module the administrator lets users switch
class GkGuiStuffMyController < ApplicationController
  # a page of the person's own, as core's My account: no project menu (core's MyController does the same)
  self.main_menu = false
  before_action :require_login

  def show
    @row = GkGuiStuffUserSetting.for(User.current)
  end

  def update
    row = GkGuiStuffUserSetting.for(User.current)
    before = row.data
    after = before.deep_dup
    changes = {}
    if GkGuiStuff::Switches.user_core_like_allowed?
      new = params[:core_like].to_s == '1' ? '1' : '0'
      changes['core_like'] = [before['core_like'].presence || '0', new] if (before['core_like'].presence || '0') != new
      after['core_like'] = new
    end
    # Own and shared apart in the counter at the name
    split = params[:count_split].to_s == '1' ? '1' : '0'
    changes['count_split'] = [before['count_split'].presence || '0', split] if (before['count_split'].presence || '0') != split
    after['count_split'] = split
    mode = GkGuiStuff::Personal::COUNT_MODES.include?(params[:count_mode].to_s) ? params[:count_mode].to_s : 'waiting'
    changes['count_mode'] = [before['count_mode'].presence || 'waiting', mode] if (before['count_mode'].presence || 'waiting') != mode
    after['count_mode'] = mode
    # Each row out or in the menu as the person chooses; empty follows the default
    if params[:placements].respond_to?(:to_unsafe_h) || params[:placements].is_a?(Hash)
      given = params[:placements].respond_to?(:to_unsafe_h) ? params[:placements].to_unsafe_h : params[:placements]
      own = {}
      GkGuiStuff::Menu.all.each_key do |k|
        v = given[k].to_s
        own[k] = v if GkGuiStuff::Menu::PLACEMENTS.include?(v)
      end
      # core's own buttons: out or icon only
      GkGuiStuff::Menu::CORE_BUTTONS.each do |b|
        v = given[b.key].to_s
        own[b.key] = v if GkGuiStuff::Menu::CORE_PLACEMENTS.include?(v)
      end
      changes['placements'] = [before['placements'] || {}, own] if (before['placements'] || {}) != own
      after['placements'] = own
    end
    # icons by area (the project tabs, the issue page, other pages); empty follows the default
    GkGuiStuff::Menu::ICON_AREAS.each do |area|
      name = "icons_#{area}"
      next unless params.key?(name)

      v = params[name].to_s
      v = '' unless GkGuiStuff::Menu::ICON_MODES.include?(v)
      changes[name] = [before[name].to_s, v] if before[name].to_s != v
      v.empty? ? after.delete(name) : after[name] = v
    end
    # the sidebar's place and the header's height; empty follows the default
    GkGuiStuff::Menu::LAYOUT.each do |key, values|
      name = "layout_#{key}"
      next unless params.key?(name)

      v = params[name].to_s
      v = '' unless values.include?(v)
      changes[name] = [before[name].to_s, v] if before[name].to_s != v
      v.empty? ? after.delete(name) : after[name] = v
    end
    after['modules'] = (before['modules'] || {}).dup
    # only the modules that are there: what was chosen for one that is not stays as it was
    GkGuiStuff::Registry.present.each_value do |m|
      next unless GkGuiStuff::Switches.user_choice?(m)

      new = (params[:modules] || {})[m.key].to_s == '1' ? '1' : '0'
      old = after['modules'][m.key].presence || '1'
      changes[m.key] = [old, new] if old != new
      after['modules'][m.key] = new
    end
    row.data = after
    row.save!
    GkGuiStuff::Choices.record(User.current, changes)
    flash[:notice] = l(:notice_successful_update)
    redirect_to action: 'show'
  end
end
