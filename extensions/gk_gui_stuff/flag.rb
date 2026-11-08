# frozen_string_literal: true

require 'time'

module GkGuiStuff
  # The flag, a primitive of its own file: a small pennant in full colour in its role and a word after it, laid on top
  # of a target the caller names by a steady anchor (an id, one of the target's own classes or a data attribute,
  # never text, style, place or structure). It says something about what it sits on and does nothing: it is not
  # the pill (data, clickable), not the button (an action), not Redmine's status badges and not a person's own mark.
  # It takes no room in the row, and nothing moves when it comes or goes. Placed and kept in place by
  # gk_gui_stuff_flag.js (GkGui.flag), styled by gk_gui_stuff_flag.css; both come with every page (Hooks#instance_head).
  # Its second form is an element of its own in the text's flow (inline: true), where a flag is explained or counted
  # (a legend, a label) and where a state stands in text (a column, a row of text); it never replaces the flag on a
  # target. Facts in a heading are a short legend, not a flagging: they stand in own elements after the heading, with
  # their words, and a heading has no flags on top; the flag on a target is for new, changed, gone and fixed states of
  # the element itself (disabled, missing, admin only).
  #
  # Fixed states have a solid pennant (a plugin, a number of states, active, disabled, missing, admin only). The
  # temporary kinds :new, :changed and :gone have a striped pennant and come and go by themselves: :new until the
  # person has seen it (seen is kept per person on the server, Flags.mark_seen) or for 14 days after since:,
  # :changed for as long as the caller draws it (the preview mode, or until one leaves the page) and with since: for
  # one day ("ändrat nyss"), :gone where something was. New takes the admin role by default, changed and gone the
  # role of the marker of a change (ui-effect).
  module Flags
    KINDS = %w[new changed gone].freeze
    # how long a new thing is new without being seen, and how long a change is recent
    NEW_FOR = 14 * 24 * 3600
    RECENT_FOR = 24 * 3600
    # the seen keys kept per person, the oldest dropped first
    MAX_SEEN = 500
    KEY = /\A[a-z0-9][a-z0-9_.:-]{0,99}\z/
    # A steady anchor: ids, classes and data attributes, one after the other on the same element; no
    # tag names, no descendants, no positions, no text
    ANCHOR = /\A(?:#[A-Za-z][\w-]*|\.[A-Za-z][\w-]*|\[data-[a-z0-9-]+(?:="[^"\\\]]*")?\])+\z/
    DEFAULT_ROLES = { nil => :tip, 'new' => :admin, 'changed' => :effect, 'gone' => :effect }.freeze

    module_function

    # nil for a fixed state, else one of KINDS; anything else is refused
    def kind(given)
      return nil if given.nil?

      k = given.to_s
      raise ArgumentError, "unknown flag kind #{given.inspect}" unless KINDS.include?(k)

      k
    end

    def anchor(on)
      a = on.to_s
      raise ArgumentError, "a flag sits on a steady anchor (an id, a class or a data attribute), not #{on.inspect}" unless ANCHOR.match?(a)

      a
    end

    def default_role(kind) = DEFAULT_ROLES.fetch(kind)

    # The word a temporary flag says when the caller gives none: nytt, ändrat (ändrat nyss with since:), borta
    def word_key(kind, since = nil)
      return :label_gk_gui_stuff_flag_changed_recently if kind == 'changed' && since

      :"label_gk_gui_stuff_flag_#{kind}"
    end

    # Whether a flag is drawn now: a fixed one always; new until seen and, with since:, for 14 days; changed with
    # since: for one day; changed without since: and gone for as long as the caller draws them
    def shown?(kind, since: nil, seen_at: nil, now: Time.now)
      case kind
      when 'new'
        return false if seen_at
        return true unless since

        now - time(since) < NEW_FOR
      when 'changed' then since ? now - time(since) < RECENT_FOR : true
      else true
      end
    end

    def time(value)
      case value
      when Time then value
      when Date then value.to_time
      else Time.parse(value.to_s)
      end
    end

    def key(given)
      k = given.to_s
      raise ArgumentError, "a flag's key is small letters, digits and _ . : - (#{given.inspect})" unless KEY.match?(k)

      k
    end

    # The sort a legend's row and the flags on targets share (data-gk-gui-flag-sort): small letters, digits and _ . : -
    def sort(given)
      s = given.to_s
      raise ArgumentError, "a flag's sort is small letters, digits and _ . : - (#{given.inspect})" unless KEY.match?(s)

      s
    end

    # The own element's word: the count first when there is one ("2 Går att prova")
    def counted(word, count)
      return word if count.nil?
      raise ArgumentError, "a flag's count is a whole number (#{count.inspect})" unless count.is_a?(Integer) && count >= 0

      "#{count} #{word}"
    end

    # ---- what a person has seen: { key => time }, in the person's own row of gui_stuff's choices
    # (GkGuiStuffUserSetting, under flags_seen), so that it follows the person between computers
    def seen(user)
      return {} unless defined?(::GkGuiStuffUserSetting) && user.respond_to?(:logged?) && user.logged?

      h = ::GkGuiStuffUserSetting.for(user).data['flags_seen']
      h.is_a?(Hash) ? h : {}
    rescue StandardError
      {}
    end

    # The keys the person has now seen, kept with the time; returns how many were new. Keys that are not keys are
    # passed by. Only flags_seen is written, merged into the row in the database in one statement (the row made when
    # the person has none yet), so that a choice saved at the same moment (a view, a meaning, the link preview's
    # asks) is kept and two tabs telling at once do not collide
    def mark_seen(user, keys, now: Time.now)
      return 0 unless defined?(::GkGuiStuffUserSetting) && user.respond_to?(:logged?) && user.logged? && user.id.to_i.positive?

      fresh = Array(keys).map(&:to_s).select { |k| KEY.match?(k) }.uniq.first(50)
      return 0 if fresh.empty?

      kept = seen(user)
      added = fresh.reject { |k| kept.key?(k) }
      return 0 if added.empty?

      stamped = added.to_h { |k| [k, now.utc.iso8601] }
      all = kept.merge(stamped)
      # over the cap the whole kept set is written, the oldest dropped; else only the new keys, merged in
      if all.size > MAX_SEEN
        write_seen(user.id.to_i, keep(all), now, replace: true)
      else
        write_seen(user.id.to_i, stamped, now, replace: false)
      end
      added.size
    rescue StandardError => e
      ::Rails.logger.warn("[gk_gui_stuff] flags seen not kept: #{e.class}") if defined?(::Rails) && ::Rails.respond_to?(:logger) && ::Rails.logger
      0
    end

    # flags_seen merged into the person's row: replace: true sets it to seen, else seen is merged into what is there
    def write_seen(user_id, seen, now, replace:)
      table = ::GkGuiStuffUserSetting.table_name
      json = { 'flags_seen' => seen }.to_json
      row = "CAST(COALESCE(NULLIF(#{table}.settings, ''), '{}') AS jsonb)"
      value = if replace
                "#{row} || CAST(:json AS jsonb)"
              else
                "#{row} || jsonb_build_object('flags_seen', CASE WHEN jsonb_typeof(#{row} -> 'flags_seen') = 'object' " \
                  "THEN #{row} -> 'flags_seen' ELSE CAST('{}' AS jsonb) END || (CAST(:json AS jsonb) -> 'flags_seen'))"
              end
      sql = "INSERT INTO #{table} (user_id, settings, created_at, updated_at) VALUES (:uid, :json, :now, :now) " \
            "ON CONFLICT (user_id) DO UPDATE SET updated_at = :now, settings = CAST(#{value} AS text)"
      conn = ::GkGuiStuffUserSetting.connection
      conn.exec_update(::GkGuiStuffUserSetting.sanitize_sql_array([sql, { uid: user_id, json: json, now: now }]))
      # exec_update leaves Rails' query cache as it was; a later read in the same request must see the write
      conn.clear_query_cache
    end

    # at most MAX_SEEN keys, the latest kept
    def keep(seen)
      return seen if seen.size <= MAX_SEEN

      seen.sort_by { |_k, t| t.to_s }.last(MAX_SEEN).to_h
    end
  end

  module PrimitivesHelper
    # Flagga, one primitive in two forms: on a target (on:), laid on top of it and taking no room, or as an element of
    # its own in the text's flow (inline: true), a word in a sentence, a legend, a label or a table cell.
    #   text   the word, short (aktiv, bara admin, GK GUI Stuff, 3 lägen); for a temporary kind it may be nil, the
    #          kind's own word (nytt, ändrat, ändrat nyss, borta)
    #   on:    the target's steady anchor: '#id', '.own-class' or '[data-x="y"]' (Flags::ANCHOR); the script lays the
    #          flag on the first target found that is not a still copy
    #   inline: true for the own element: the pennant before the word, the word fully visible in the role's colour
    #          and bold, the two together 2 px above the text's middle; drawn where the caller stands, never on a
    #          target, never a button and never in a pill. It never stands in for a flag on its target
    #   role:  a role as the pill's (a category, an alert level, admin, muted, choice, effect); by default tip for a
    #          fixed state, admin for :new, effect for :changed and :gone
    #   kind:  nil (a fixed state, solid pennant) or :new, :changed, :gone (striped)
    #   count: the own element only: a number put first in the word ("2 Går att prova"), as in a legend
    #   short: only the pennant. On hover and on a tap, in both forms, the pennant gets a tone in its role with a thin
    #          frame and the word shows in a small box just above it in the form of core's tooltip, laid on top so
    #          that nothing moves; a screen reader always hears the word. A finger reaches it on an invisible surface of
    #          24 x 24 px round the pennant. A flag on a target also takes this form by itself, while its word has no
    #          room after the pennant at the edge of the window or of a box that clips
    #   key:  for :new, what the person has seen, kept per person (small letters, digits and _ . : -); without it a
    #          new flag stands as long as the caller draws it (not for the own element)
    #   since: when it became new or was changed: new for 14 days, changed recently for one day
    #   said:  false when the caller already says the word to a screen reader beside the target; otherwise the
    #          script gives it with the target ("Spara, ändrat")
    #   title: a tooltip on the pennant, and on the whole of the own element, its word too (what the word means)
    #   sort:  the sort a legend's row frames on hover (gk_gui_stuff_flag_legend), on a target and on an own element
    # Draws nothing when the flag is no longer shown (seen, or its time is past)
    def gk_gui_stuff_flag(text = nil, on: nil, inline: false, role: nil, kind: nil, count: nil, short: false, key: nil, since: nil, said: true, title: nil,
                          sort: nil, html: {})
      kind = GkGuiStuff::Flags.kind(kind)
      if inline
        raise ArgumentError, 'the own element stands where it is drawn, on no target (on:)' unless on.nil?
        raise ArgumentError, 'the own element keeps nothing as seen (key:)' unless key.nil?
        raise ArgumentError, 'a fixed flag says its word (text)' if kind.nil? && text.to_s.strip.empty?

        word = text.to_s.strip.empty? ? ::I18n.t(GkGuiStuff::Flags.word_key(kind, since)) : text.to_s
        role = GkGuiStuff::Flags.default_role(kind) if role.nil?
        cls = ['gk-gui-stuff-flag-inline', GkGuiStuff::Primitives.role_class(role), kind ? 'gk-gui-stuff-flag-temp' : nil, short ? 'gk-gui-stuff-flag-short' : nil,
               html[:class]].compact.join(' ')
        parts = [content_tag(:span, '', class: 'gk-gui-stuff-flag-pennant', 'aria-hidden': 'true'),
                 content_tag(:span, GkGuiStuff::Flags.counted(word, count), class: 'gk-gui-stuff-flag-word')]
        data = { gk_gui_flag_inline: kind || 'fixed', gk_gui_flag_sort: sort.nil? ? nil : GkGuiStuff::Flags.sort(sort) }.compact
        return content_tag(:span, safe_join(parts), **html.except(:class, :data), class: cls, title: short ? nil : title, data: data.merge(html[:data] || {}))
      end
      raise ArgumentError, 'a count belongs to the own element (inline: true)' unless count.nil?

      anchor = GkGuiStuff::Flags.anchor(on)
      raise ArgumentError, 'a fixed flag says its word (text)' if kind.nil? && text.to_s.strip.empty?

      key = key.nil? ? nil : GkGuiStuff::Flags.key(key)
      raise ArgumentError, 'only a new flag has a key (what the person has seen)' if key && kind != 'new'

      seen_at = key ? gk_gui_stuff_flags_seen[key] : nil
      return ''.html_safe unless GkGuiStuff::Flags.shown?(kind, since: since, seen_at: seen_at)

      word = text.to_s.strip.empty? ? ::I18n.t(GkGuiStuff::Flags.word_key(kind, since)) : text.to_s
      role = GkGuiStuff::Flags.default_role(kind) if role.nil?
      seen_url = key && respond_to?(:gk_gui_stuff_flag_seen_path) ? gk_gui_stuff_flag_seen_path : nil
      cls = ['gk-gui-stuff-flag', GkGuiStuff::Primitives.role_class(role), kind ? 'gk-gui-stuff-flag-temp' : nil, short ? 'gk-gui-stuff-flag-short' : nil,
             html[:class]].compact.join(' ')
      data = { gk_gui_flag: kind || 'fixed', gk_gui_flag_on: anchor, gk_gui_flag_key: key, gk_gui_flag_seen: seen_url, gk_gui_flag_said: said ? nil : '0',
               gk_gui_flag_sort: sort.nil? ? nil : GkGuiStuff::Flags.sort(sort) }
      content_tag(:span, safe_join([content_tag(:span, '', class: 'gk-gui-stuff-flag-pennant', title: title), content_tag(:span, word, class: 'gk-gui-stuff-flag-word')]),
                  **html.except(:class, :data), class: cls, 'aria-hidden': 'true', data: data.compact.merge(html[:data] || {}))
    end

    # A target and its flags in one: the content (or the block) in tag with an id of its own, then each flag laid on
    # it. flags: [{ text:, role:, kind:, short:, key:, since:, said:, title: }, ...], stacked upwards in that order.
    # html: the target's own attributes (an id given there is used)
    def gk_gui_stuff_flagged(content = nil, flags = [], tag: :span, html: {}, &block)
      @gk_gui_stuff_flag_seq = (@gk_gui_stuff_flag_seq || 0) + 1
      id = html[:id] || "gk-gui-flagged-#{@gk_gui_stuff_flag_seq}"
      inner = block ? capture(&block) : content
      target = content_tag(tag, inner, **html.merge(id: id))
      drawn = Array(flags).map { |f| gk_gui_stuff_flag(f[:text], on: "##{id}", **f.except(:text)) }
      safe_join([target, *drawn])
    end

    # A legend of flags: a list of own elements, each with its count first in the word ("2 Går att prova"). The
    # pointer on a row draws the frame around every flag of that row's sort in the legend's area, on a target or as an
    # own element, and makes their words fully visible; a row without a sort is only text. A list for a screen reader;
    # not in the Tab order, and nothing happens on a click.
    #   items: [{ text:, role:, kind:, count:, sort:, title:, means: }, ...]; sort: the flags' sort
    #          (gk_gui_stuff_flag(..., sort:)); means: what the row means, read after it by a screen reader only
    #   area:  the steady anchor of the area whose flags the rows frame ('#id', '.own-class', '[data-x="y"]')
    #   label: the list's name for a screen reader
    def gk_gui_stuff_flag_legend(items, area:, label: nil, html: {})
      anchor = GkGuiStuff::Flags.anchor(area)
      rows = Array(items).map do |i|
        flag = gk_gui_stuff_flag(i[:text], inline: true, role: i[:role], kind: i[:kind], count: i[:count], title: i[:title])
        means = i[:means].to_s.strip.empty? ? nil : content_tag(:span, ": #{i[:means]}", class: 'gk-gui-stuff-sr-only')
        content_tag(:li, safe_join([flag, means].compact), data: { gk_gui_flag_legend_sort: i[:sort].nil? ? nil : GkGuiStuff::Flags.sort(i[:sort]) })
      end
      content_tag(:ul, safe_join(rows), **html.except(:class, :data), class: ['gk-gui-stuff-flag-legend', html[:class]].compact.join(' '), role: 'list',
                                        'aria-label': label, data: { gk_gui_flag_legend: anchor }.merge(html[:data] || {}))
    end

    # Kept as an alias of gk_gui_stuff_flag(text, inline: true, ...) until no plugin calls it. The word given is the
    # own element's word; without a word, the title is the word of the short form, and with neither the pennant
    # stands alone as before
    def gk_gui_stuff_flag_pennant(role: nil, kind: nil, word: nil, title: nil)
      return gk_gui_stuff_flag(word, inline: true, role: role, kind: kind, title: title) unless word.nil?
      return gk_gui_stuff_flag(title, inline: true, role: role, kind: kind, short: true) unless title.to_s.strip.empty? && kind.nil?

      cls = ['gk-gui-stuff-flag-inline', GkGuiStuff::Primitives.role_class(role.nil? ? GkGuiStuff::Flags.default_role(nil) : role)].join(' ')
      content_tag(:span, content_tag(:span, '', class: 'gk-gui-stuff-flag-pennant', 'aria-hidden': 'true'), class: cls, data: { gk_gui_flag_inline: 'fixed' })
    end

    # what the person has seen, read once per page
    def gk_gui_stuff_flags_seen
      @gk_gui_stuff_flags_seen ||= defined?(::User) && ::User.respond_to?(:current) ? GkGuiStuff::Flags.seen(::User.current) : {}
    end
  end
end
