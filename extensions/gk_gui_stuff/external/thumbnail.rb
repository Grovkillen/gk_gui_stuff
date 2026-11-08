# frozen_string_literal: true

require 'fileutils'
require 'open3'
require 'tempfile'

# The card's picture as a small JPEG, made once with the ImageMagick Redmine uses for its own thumbnails. The
# reader is chosen by the picture's first bytes (the type the fetcher found), never by a name; no shell, an
# argument list; memory, disk and picture size limited; stopped when it runs past Redmine's thumbnail timeout. Without ImageMagick: nil,
# and the card has no picture.
module GkGuiStuff
  module External
    module Thumbnail
      TYPES = %w[jpeg png gif webp ico].freeze
      # a page's picture fills the card's width; a site's icon is shown small beside the title
      PICTURE_SIZE = '640x400>'
      ICON_SIZE = '64x64>'
      DEFAULT_TIMEOUT = 10

      module_function

      def available?
        ::Redmine::Thumbnail.convert_available? ? true : false
      rescue StandardError
        false
      end

      def convert_bin = ::Redmine::Thumbnail::CONVERT_BIN

      def timeout
        v = ::Redmine::Configuration['thumbnails_generation_timeout']
        v.to_i.positive? ? v.to_i : DEFAULT_TIMEOUT
      end

      def tmp_dir = File.join(::Rails.root.to_s, 'tmp', 'gk_gui_stuff')

      # -> String (JPEG bytes) or nil. icon: the site's icon, made small
      def make(bytes, type, icon: false)
        return nil unless available? && TYPES.include?(type.to_s) && bytes.to_s.bytesize.positive?

        FileUtils.mkdir_p(tmp_dir)
        src = Tempfile.new(['gk_gui_stuff_link_preview', '.img'], tmp_dir, binmode: true)
        src.write(bytes)
        src.close
        out = run(arguments(src.path, type.to_s, icon ? ICON_SIZE : PICTURE_SIZE, frame: type.to_s == 'ico' ? ico_frame(bytes) : 0))
        out && out.b.start_with?("\xFF\xD8".b) ? out : nil
      rescue StandardError => e
        log("thumbnail not made: #{e.class}")
        nil
      ensure
        src&.close!
      end

      # The largest picture in an icon file (its directory: the count at bytes 4-5, then 16 bytes per picture with the
      # width and height first, where 0 means 256); the first when the directory cannot be read
      def ico_frame(bytes)
        b = bytes.to_s.b
        return 0 if b.bytesize < 6

        count = b[4, 2].unpack1('v').to_i
        best = 0
        best_size = -1
        [count, 64].min.times do |i|
          entry = b[6 + (i * 16), 16]
          break if entry.nil? || entry.bytesize < 16

          w = entry.getbyte(0).zero? ? 256 : entry.getbyte(0)
          h = entry.getbyte(1).zero? ? 256 : entry.getbyte(1)
          if w * h > best_size
            best = i
            best_size = w * h
          end
        end
        best
      end

      def arguments(path, type, size = PICTURE_SIZE, frame: 0)
        [convert_bin, '-limit', 'memory', '128MiB', '-limit', 'map', '256MiB', '-limit', 'disk', '256MiB',
         '-limit', 'area', '64MP', '-limit', 'width', '16KP', '-limit', 'height', '16KP',
         "#{type}:#{path}[#{frame.to_i}]", '-auto-orient',
         '-thumbnail', size, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-strip',
         '-quality', '82', 'jpeg:-']
      end

      # Standard output, or nil when the program fails or runs past the timeout (then it is stopped)
      def run(args)
        Open3.popen3(*args) do |stdin, stdout, stderr, wait|
          stdin.close
          stdout.binmode
          out = Thread.new { stdout.read }
          err = Thread.new { stderr.read }
          # a stopped program closes the pipes under the readers; that is expected, not worth a warning
          [out, err].each { |t| t.report_on_exception = false }
          unless wait.join(timeout)
            stop(wait.pid)
            log('thumbnail stopped: ran past the timeout')
            return nil
          end
          bytes = out.value
          err.value
          wait.value.success? ? bytes : nil
        end
      end

      def stop(pid)
        Process.kill(Gem.win_platform? ? 'KILL' : 'TERM', pid)
      rescue StandardError
        nil
      end

      def log(text)
        ::Rails.logger.warn("[gk_gui_stuff] link preview #{text}") if defined?(::Rails) && ::Rails.respond_to?(:logger) && ::Rails.logger
      end
    end
  end
end
