# frozen_string_literal: true

require 'fileutils'
require 'set'
require_relative '../gk_folders'

# Where the cards' pictures are kept: the folder set under Appearance, else gk/gui_stuff/link_previews in the
# attachments folder. Each picture is <folder>/<two first characters of the digest>/<digest>.jpg (<digest>-icon.jpg
# for a site's icon). A byproduct: it
# never goes with an export, and a folder change applies to new pictures only. Never under public/, where anything
# is served to anyone. Only files named as ours are ever touched.
module GkGuiStuff
  module External
    module Storage
      DIGEST = /\A[0-9a-f]{64}\z/
      # <digest>.jpg is a page's picture, <digest>-icon.jpg the site's icon (shown small, with a line that the page
      # has no picture of its own)
      FILE = /\A[0-9a-f]{64}(?:-icon)?\.jpg\z/
      ICON = /-icon\.jpg\z/
      SHARD = /\A[0-9a-f]{2}\z/
      # A file newer than this may belong to a fetch whose row is not saved yet; the sweep leaves it alone
      SWEEP_GRACE = 3600

      module_function

      def default_dir = ::GkFolders.path('gui_stuff', 'link_previews')

      # The folder for new pictures (the default when the setting cannot be read)
      def dir
        raw = begin
          External.setting('link_previews_dir').to_s.strip
        rescue StandardError
          ''
        end
        d = File.expand_path(raw.empty? ? default_dir : raw)
        return d unless public?(d)

        log("folder under public/ refused, the default is used: #{d}")
        File.expand_path(default_dir)
      end

      def public?(path)
        pub = File.expand_path(File.join(::Rails.root.to_s, 'public')).downcase
        d = File.expand_path(path.to_s).downcase
        d == pub || d.start_with?("#{pub}/") || d.start_with?("#{pub}\\")
      end

      # -> the absolute path written; written to a temporary name first and then renamed, so that a reader never
      # gets half a picture
      def write(digest, jpeg, icon: false)
        raise ArgumentError, 'not a digest' unless digest.to_s.match?(DIGEST)

        path = File.join(dir, digest[0, 2], "#{digest}#{icon ? '-icon' : ''}.jpg")
        FileUtils.mkdir_p(File.dirname(path))
        tmp = "#{path}.#{Process.pid}.#{Thread.current.object_id}.tmp"
        begin
          File.binwrite(tmp, jpeg)
          File.rename(tmp, path)
        ensure
          FileUtils.rm_f(tmp)
        end
        path
      end

      # A path of ours that exists: a .jpg whose name is a 64 character digest, outside public/
      def readable?(path)
        return false unless path.is_a?(String) && path.end_with?('.jpg')
        return false unless File.basename(path).match?(FILE)

        File.file?(path) && !public?(path)
      rescue StandardError
        false
      end

      # Whether a kept file is a site's icon rather than a page's picture
      def icon?(path) = path.is_a?(String) && File.basename(path).match?(FILE) && path.match?(ICON)

      def delete(path)
        return false unless path.is_a?(String) && File.basename(path).match?(FILE)

        File.delete(path)
        true
      rescue Errno::ENOENT
        false
      rescue StandardError => e
        log("picture not removed: #{e.class}")
        false
      end

      # Our files in the folder that no row names (and that are older than SWEEP_GRACE); returns the count removed
      def sweep_orphans!(known_paths)
        known = Array(known_paths).compact.map { |p| key(p) }.to_set
        cutoff = Time.current - SWEEP_GRACE
        ours.count do |p|
          next false if known.include?(key(p))

          # a file removed meanwhile (an emptying, a new picture) is simply passed by
          mt = mtime(p)
          next false if mt.nil? || mt > cutoff

          delete(p)
        end
      end

      def mtime(path)
        File.mtime(path)
      rescue SystemCallError
        nil
      end

      # Every picture of ours in the folder and the shard folders left empty; never anything else
      def purge_all!
        n = ours.count { |p| delete(p) }
        shards.each do |s|
          Dir.rmdir(s) if Dir.empty?(s)
        rescue SystemCallError
          nil
        end
        n
      end

      def shards
        d = dir
        return [] unless File.directory?(d)

        Dir.children(d).select { |c| c.match?(SHARD) }.map { |c| File.join(d, c) }.select { |p| File.directory?(p) }
      end

      # Every <folder>/<shard>/<digest>.jpg
      def ours
        shards.flat_map do |s|
          Dir.children(s).select { |c| c.match?(FILE) && c.start_with?(File.basename(s)) }.map { |c| File.join(s, c) }
        end
      end

      def key(path)
        p = File.expand_path(path.to_s)
        Gem.win_platform? ? p.downcase : p
      end

      def log(text)
        ::Rails.logger.warn("[gk_gui_stuff] link preview #{text}") if defined?(::Rails) && ::Rails.logger
      end
    end
  end
end
