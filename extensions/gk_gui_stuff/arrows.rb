# frozen_string_literal: true

require 'erb'

module GkGuiStuff
  # arrows: <-->, --> and <-- written in a formatted text become real arrows (left right, right, left) as the reader
  # reads the page. A text processor in GK Core Stuff's formatting_processors (registered in patches.rb): the pass hands
  # every run of text outside pre, code, textarea, script and style, also a link's text but never its address, and the
  # processor answers the run with the arrows in it, escaped, or nil to leave it. Nothing in the browser searches the
  # rendered page for them. Without GK Core Stuff the text stays as written.
  # Only on a page the reader opens (a view with a request in HTML or a script answer), as the arrows were before: not in
  # mail, a PDF, a feed or an export.
  module Arrows
    PATTERN = /<-->|-->|<--/
    MAP = { '<-->' => "↔", '-->' => "→", '<--' => "←" }.freeze
    # Formats that are not a page the reader reads in the browser
    EXPORTS = %i[pdf atom rss xml json csv text api].freeze

    module_function

    # Whether GK Core Stuff's pass is there and takes text processors: the module is only listed and switched where it
    # can do something (Registry needs:), and the processor is only registered then (patches.rb)
    def available?
      return false unless defined?(::GkCoreStuff::FormattingProcessors)

      ::GkCoreStuff::FormattingProcessors.method(:register).parameters.any? { |_type, name| name == :text }
    rescue StandardError
      false
    end

    # The run of text with its arrows, escaped as HTML; nil when it has none
    def replace(text)
      s = text.to_s
      return nil unless s.match?(PATTERN)

      ERB::Util.html_escape(s.gsub(PATTERN, MAP))
    end

    def page?(request)
      return false unless request

      f = request.respond_to?(:format) ? request.format : nil
      sym = f.respond_to?(:symbol) ? f.symbol : nil
      !EXPORTS.include?(sym)
    rescue StandardError
      false
    end

    module Processor
      module_function

      def active?(context)
        return false unless Arrows.page?(context.respond_to?(:request) ? context.request : nil)

        m = Registry.find('arrows')
        m && Switches.on_for?(m) ? true : false
      end

      def call(run, _context) = Arrows.replace(run.text)
    end
  end
end
