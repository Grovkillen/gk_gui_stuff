# frozen_string_literal: true

module GkGuiStuff
  # The wave's words for a form that is not a save. A form says it itself with data-gk-gui-stuff-wave-word, -done,
  # -level and -text (on the button or the form); a form that cannot (core's, or one rails-ujs makes for a link with
  # method post) is known here by its address. A plugin registers its own: GkGuiStuff::WaveForms.register(match:
  # '/gk_ops/jobs/[^/]+/run(\?|$)', word::label_x_running, done::label_x_done, level: 'running') word and done are
  # locale keys; level running waits in yellow; none: true gives no wave at all.
  module WaveForms
    module_function

    def all = (@all ||= [])

    def register(match:, word: nil, done: nil, level: nil, none: false)
      all << { match: match.to_s, word: word, done: done, level: level, none: none }
    end

    # For the page's script: the patterns with the words in the reader's language
    def for_page
      all.map do |f|
        { match: f[:match], word: f[:word] && ::I18n.t(f[:word]), done: f[:done] && ::I18n.t(f[:done]), level: f[:level], none: f[:none] || nil }.compact
      end
    end
  end
end

# Core's forms that are not a save
GkGuiStuff::WaveForms.register(match: '/login(\?|$)', word: :gk_gui_stuff_wave_logging_in, done: :gk_gui_stuff_wave_logged_in)
GkGuiStuff::WaveForms.register(match: '/account/(lost_password|register|activation_email)', word: :gk_gui_stuff_wave_sending, done: :gk_gui_stuff_wave_sent)
GkGuiStuff::WaveForms.register(match: '/admin/test_email', word: :gk_gui_stuff_wave_sending, done: :gk_gui_stuff_wave_sent)
GkGuiStuff::WaveForms.register(match: '/admin/default_configuration', word: :gk_gui_stuff_wave_reading_in, done: :gk_gui_stuff_wave_read_in)
GkGuiStuff::WaveForms.register(match: '/imports(/|$)', word: :gk_gui_stuff_wave_importing, done: :gk_gui_stuff_wave_imported)
# Deleting (a form with _method delete) says TAR BORT and BORTTAGET by itself; the rest of core's forms are saves
