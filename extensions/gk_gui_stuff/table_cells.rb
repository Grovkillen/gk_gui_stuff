# frozen_string_literal: true

module GkGuiStuff
  # The words of the table values' cells, as the page Utseende draws them: one book per table value, given to GK
  # Records' register at the registration (cells:), so that the event log, its CSV and its search say a cell by its
  # name on the page and its value in the page's words, and drawn by the tables' own partials, so that a select's text
  # and the log's word are the same. A book is { cell => entry }, an entry { label:, choices:, words:, empty:, text:,
  # parts: }: label the cell's name; choices what the page offers; words every value that has a word (more than the
  # choices: a status taken out of a tracker's workflow, an archived project); empty the page's word for the empty
  # choice, without the value it gives just now; text a value said as it is; parts the cells inside it. Plain Ruby: the
  # tests stand in for Redmine's models.
  module TableCells
    # What counts as empty in a cell of every table of this plugin: nothing, and a box not ticked
    BLANK = ['', '0'].freeze
    KINDS = %w[placements help_link quick_done_status declutter admin_rows flag_icons].freeze
    HELP_KINDS = %w[core url wiki].freeze

    module_function

    def t(key, **o) = ::I18n.t(key, **o)

    # The registration's lambda for a table value (cells:); person: the words of a person's own row
    def cells(kind) = ->(person: false) { book(kind, person: person) }

    # The registration's options for a table value: what counts as empty and the words of its cells
    def options(kind) = { blank: BLANK, cells: cells(kind) }

    # The book of one table value, nil for a kind this plugin does not draw
    def book(kind, person: false)
      return nil unless KINDS.include?(kind.to_s)

      public_send(kind.to_s, person)
    end

    # The word for an empty cell where the page has no word of its own (an address, a name): GK Records owns it, so that
    # the box of Spara and the event log say it alike. A GK Records without it (one that does not read the cells' words
    # either, so its log says core's "(ingen)") gives core's word here too
    def empty_word
      r = defined?(::GkRecords::AppearanceSettings) ? ::GkRecords::AppearanceSettings : nil
      r.respond_to?(:empty_word) ? r.empty_word.to_s : t(:label_none)
    end

    # The empty choice follows a default: on the instance's row the plugin's that owns the button, or Redmine's own for
    # core's buttons, which no plugin owns; the system's setting (the administrator's row) on a person's
    def placements(person = false)
      menu = Menu
      empty = t(person ? :label_gk_gui_stuff_placement_by_system : :label_gk_gui_stuff_placement_by_plugin)
      core_empty = person ? empty : t(:label_gk_gui_stuff_placement_by_core)
      word = ->(list) { list.to_h { |p| [p, t(:"label_gk_gui_stuff_placement_#{p}")] } }
      out = {}
      menu.all.each_value do |r|
        out[r.key.to_s] = { label: button_label(r), choices: menu::PLACEMENTS, words: word.call(menu::PLACEMENTS), empty: empty }
      end
      menu::CORE_BUTTONS.each do |b|
        out[b.key.to_s] = { label: menu.core_label(b), choices: menu::CORE_PLACEMENTS, words: word.call(menu::CORE_PLACEMENTS), empty: core_empty }
      end
      out
    end

    # A plugin's button as the administrator's list names it
    def button_label(r)
      return t(r.name) if r.name
      return r.key.to_s if r.label.respond_to?(:call)

      t(r.label, count: 'N', project: '')
    end

    def help_link(_person = false)
      projects = ::Project.order(:name).pluck(:identifier, :name).to_h
      { 'kind' => { label: t(:label_gk_gui_stuff_help_kind), choices: HELP_KINDS, words: HELP_KINDS.to_h { |k| [k, t(:"label_gk_gui_stuff_help_kind_#{k}")] },
                    empty: t(:label_gk_gui_stuff_help_kind_core) },
        'url' => { label: t(:label_gk_gui_stuff_help_url), text: true, empty: empty_word },
        'wiki_project' => { label: t(:label_gk_gui_stuff_help_wiki_project), choices: ::Project.active.has_module(:wiki).order(:name).pluck(:identifier),
                            words: projects, empty: empty_word },
        'wiki_page' => { label: t(:label_gk_gui_stuff_help_wiki_page), text: true, empty: t(:label_gk_gui_stuff_help_wiki_start) } }
    end

    # Each tracker's statuses as the page offers them; every status has its word, a closed one with core's word for
    # closed after it, as in the select
    def quick_done_status(_person = false)
      closed = t(:label_closed_issues)
      statuses = ::IssueStatus.sorted.to_a
      words = statuses.to_h { |s| [s.id.to_s, s.is_closed? ? "#{s.name} (#{closed})" : s.name.to_s] }
      empty = t(:label_gk_gui_stuff_quick_done_no_status)
      ::Tracker.sorted.to_a.to_h do |tr|
        [tr.id.to_s, { label: tr.name.to_s, choices: tr.issue_statuses.map { |s| s.id.to_s }, words: words, empty: empty }]
      end
    end

    def declutter(_person = false)
      Declutter::TARGETS.keys.to_h { |k| [k, { label: t(:"label_gk_gui_stuff_dc_#{k}"), words: { '1' => t(:general_text_Yes) }, empty: t(:general_text_No) }] }
    end

    # Each administration row by core's word, its own group name and its own word in each language, the language's
    # name after it
    def admin_rows(_person = false)
      ag = AdminGroups
      empty = empty_word
      name = t(:label_gk_gui_stuff_ag_caption)
      langs = ::I18n.available_locales.map(&:to_s)
      captions = langs.to_h { |l| [l, { label: "#{name} (#{::I18n.t(:general_lang_name, locale: l.to_sym, default: l)})", text: true, empty: empty }] }
      ag.items.to_h do |item|
        [item.name.to_s, { label: ag.core_caption(item).to_s,
                           parts: { 'tags' => { label: t(:label_gk_gui_stuff_ag_tags), text: true, empty: empty },
                                    'caption' => { label: '', parts: captions } } }]
      end
    end

    def flag_icons(_person = false)
      empty = empty_word
      FlagIcons::PARTS.to_h { |p| [p, { label: t(:"label_gk_gui_stuff_flag_icon_#{p}"), text: true, empty: empty }] }
    end

    # The field's own marks for the box of Spara: the cell's name on the page and the word for its empty choice, from
    # the same book as the event log's. path: the cell's keys, an inner cell's after its row's ("admin", "tags"), the
    # labels joined as the log joins them
    def marks(book, *path)
      names = []
      level = book
      e = nil
      path.each do |k|
        e = level.is_a?(Hash) ? level[k.to_s] : nil
        names << (e ? e[:label].to_s : k.to_s)
        level = e && e[:parts]
      end
      { gk_gui_cell_label: names.reject(&:empty?).join(' › '), gk_gui_cell_empty: e ? e[:empty].to_s : '' }
    end

    # The words of a value the page no longer offers, for the option that keeps it chosen: its word, else the value
    # followed by GK Records' words that it no longer exists (the value as it is with an older GK Records)
    def kept_word(entry, value)
      w = (entry || {})[:words]
      word = w.is_a?(Hash) ? w[value.to_s] : nil
      return word.to_s if word

      r = defined?(::GkRecords::AppearanceSettings) ? ::GkRecords::AppearanceSettings : nil
      r.respond_to?(:gone_word) ? r.gone_word(value) : value.to_s
    end

    # A select's options from the book: the empty choice first (its text as the page writes it), the choices, and a
    # stored value the page no longer offers kept as chosen, so that a save leaves it as it stood
    def options_for(entry, value, empty_text)
      e = entry || {}
      words = e[:words].is_a?(Hash) ? e[:words] : {}
      list = [[empty_text, '']] + Array(e[:choices]).map { |c| [(words[c.to_s] || c).to_s, c.to_s] }
      v = value.to_s
      list << [kept_word(e, v), v] unless v.empty? || list.any? { |_, c| c == v }
      list
    end
  end
end
