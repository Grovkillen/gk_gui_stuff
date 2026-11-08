# frozen_string_literal: true

# What the preview of external links keeps, and when it goes: everything when the setting is switched off or the
# button empties it, the cards of a domain taken out of the list, and each night the cards nobody has shown for the
# set number of days, then the pictures of the cards shown longest ago while the pictures together are over their cap
# (also each time a picture is stored; the card stays with its title and text, and gets a picture again when it is
# renewed), then the pictures no card names. Each emptying that removed something is an event in GK
# Records on the setting's row, with the reason given. The thinning is always this plugin's own job: the pictures are
# a byproduct, never content for another plugin to keep or thin out.
module GkGuiStuff
  module External
    module Cleanup
      FORGET_KEY = 'gk_gui_stuff.link_preview_forget'
      DAY = 86_400
      @daily_lock = Mutex.new

      module_function

      def model = ::GkGuiStuffLinkPreview

      # Every row and every picture; -> the rows removed. cause: button, off or domains. files: false leaves the
      # pictures on disk, for a check inside a transaction that is rolled back (removed files would not come back).
      def clear!(cause:, reason: nil, user: ::User.current, files: true)
        remove_pictures(model.where.not(image_path: nil).pluck(:image_path)) if files
        n = model.delete_all
        Storage.purge_all! if files
        record(n, cause, [], reason, user) if n.positive?
        n
      end

      # The rows whose domain the list no longer allows; removed: the entries taken out of the list
      def forget_unallowed!(removed:, reason:, user:)
        refused = model.distinct.pluck(:domain).reject { |d| External.allowed_host?(d) }
        return 0 if refused.empty?

        scope = model.where(domain: refused)
        remove_pictures(scope.where.not(image_path: nil).pluck(:image_path))
        n = scope.delete_all
        record(n, 'domains', Array(removed), reason, user) if n.positive?
        n
      end

      # After a save under Appearance: everything goes when the setting went from on to off, else the cards of the
      # domains the new list no longer allows
      def settings_saved!(before_mode:, before_domains:, reason:, user:)
        if External.on?
          removed = Domains.parse(before_domains) - External.domains
          forget_unallowed!(removed: removed, reason: reason, user: user)
        elsif before_mode.to_s != 'off'
          clear!(cause: 'off', reason: reason, user: user)
        else
          0
        end
      rescue StandardError => e
        log("not emptied after the save: #{e.class}")
        0
      end

      # The forget job's body; -> the text of the run
      def forget!(_ops_run = nil)
        @last_forget = Time.current
        if External.on?
          n, pictures = thin_out!
        else
          n = model.exists? ? clear!(cause: 'off', reason: nil, user: nil) : 0
          pictures = 0
        end
        text = ::I18n.t(:text_gk_gui_stuff_job_link_preview_forget_done, count: n)
        pictures.positive? ? "#{text}, #{::I18n.t(:text_gk_gui_stuff_job_link_preview_pictures_done, count: pictures)}" : text
      end

      # The cards nobody has shown for forget_days, the cards of domains no longer allowed, the pictures over the cap,
      # the pictures no row names; -> [cards removed, pictures removed at the cap]
      def thin_out!
        now = Time.current
        days = External.setting('forget_days').to_i
        days = External::VALUES.dig('forget_days', :default) unless days.positive?
        old = model.pluck(:id, :seen_at, :created_at, :image_path).select { |_id, seen, made, _p| Policy.forget?(seen || made, now, days) }
        n = 0
        old.each_slice(500) do |slice|
          remove_pictures(slice.map(&:last).compact)
          n += model.where(id: slice.map(&:first)).delete_all
        end
        n += forget_unallowed!(removed: [], reason: nil, user: nil)
        pictures = over_cap!
        Storage.sweep_orphans!(model.where.not(image_path: nil).pluck(:image_path))
        [n, pictures]
      end

      # The cap on the pictures together (image_folder_max_mb): over it, the pictures of the cards shown longest ago
      # are removed until the rest fits; each card stays, with its title and text, as a card without a picture, and
      # the next renewal fetches the picture again. keep: the card just stored. Counted from the sizes the rows hold,
      # so it is cheap enough for every stored picture. -> the pictures removed
      def over_cap!(keep: nil)
        cap = Policy.cap_bytes(Queue.int('image_folder_max_mb'))
        rows = model.where.not(image_path: nil).pluck(:id, :seen_at, :created_at, :image_bytes, :image_path)
        ids = Policy.over_cap(rows.map { |id, seen, made, bytes, _p| [id, seen || made, bytes] }, cap, keep: keep)
        return 0 if ids.empty?

        gone = ids.to_set
        n = 0
        rows.select { |r| gone.include?(r[0]) }.each do |id, _seen, _made, _bytes, path|
          # only while the row is there and still names its picture: a row emptied meanwhile is passed by
          next unless model.where(id: id, image_path: path).update_all(image_path: nil, image_bytes: nil).positive?

          Storage.delete(path) if Storage.readable?(path)
          n += 1
        end
        log("#{n} pictures removed at the cap on the pictures") if n.positive?
        n
      rescue StandardError => e
        log("cap on the pictures not applied: #{e.class}")
        0
      end

      # Without ops: the forget job's work at most once a day in this process
      def daily_if_due
        @daily_lock.synchronize do
          return false if @last_forget && Time.current - @last_forget < DAY

          forget!
        end
        true
      rescue StandardError => e
        log("daily thinning not done: #{e.class}")
        false
      end

      def remove_pictures(paths) = paths.each { |p| Storage.delete(p) if Storage.readable?(p) }

      def record(count, cause, removed, reason, user)
        r = defined?(::GkRecords::AppearanceSettings) ? ::GkRecords::AppearanceSettings : nil
        return unless r.respond_to?(:record_on!)

        r.record_on!(Appearance.key(External::ROW), External::EVENT,
                     details: { 'cleared' => count, 'cause' => cause.to_s, 'domains' => removed },
                     reason: reason, reason_key: 'gui_stuff.appearance', user: user)
      rescue StandardError => e
        log("emptying not recorded: #{e.class} #{e.message}")
      end

      def log(text) = ::Rails.logger.warn("[gk_gui_stuff] link preview #{text}")
    end
  end
end
