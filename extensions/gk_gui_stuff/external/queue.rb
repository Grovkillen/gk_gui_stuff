# frozen_string_literal: true

require 'uri'

# The queue of the preview of external links. A reader's request never fetches: it answers with the card kept, or
# puts the address in the queue and answers "not yet". The fetch job in GK Ops takes the queue every minute; without
# GK Ops a request starts at most one fetch in a thread of its own after the answer. Rows are claimed atomically, at
# most max_parallel at a time, at most one per domain every domain_interval_seconds. A person's first ask of an
# address answers "not yet" also when a card is kept (Asks), so the answer never tells what others have linked. The
# count of a person's new addresses an hour is kept in Rails.cache, so it is not counted when the cache keeps nothing
# (null_store); the cap on every row the table may hold applies all the same.
module GkGuiStuff
  module External
    module Queue
      JOB_KEY = 'gk_gui_stuff.link_preview_fetch'
      Result = Struct.new(:state, :row, :why, keyword_init: true)
      SEEN_EVERY = 3600
      CANDIDATES = 20
      # a ready row's error: the page names no picture of its own (the card says so); never a failure
      NO_PICTURE = 'no_picture'
      JOB_SECONDS = 50
      JOIN_SPARE = 15
      IDLE_WAIT = 1
      @inline_lock = Mutex.new
      @step_lock = Mutex.new
      @claim_lock = Mutex.new

      module_function

      def model = ::GkGuiStuffLinkPreview

      # ops takes the queue: GK Ops is there, its scheduler runs in this process and the job is not switched off
      def ops?
        return false unless defined?(::GkOps::Scheduler) && ::GkOps::Scheduler.handles?(JOB_KEY)

        job = defined?(::GkOpsJob) ? ::GkOpsJob.find_by(key: JOB_KEY) : nil
        job.nil? || job.enabled ? true : false
      rescue StandardError
        false
      end

      # The address as the queue keeps it (the fetcher's first step), or nil
      def normalize(url) = Fetcher.normalize(url)&.to_s

      def request(url, user)
        return none(:off) unless External.on_for?(user)

        norm = normalize(url)
        return none(:bad_url) if norm.nil? || norm.length > Fetcher::MAX_URL

        host = URI.parse(norm).host
        return none(:not_allowed) unless External.allowed_host?(host)

        now = Time.current
        digest = model.digest(norm)
        row = model.find_by(url_digest: digest)
        row ? known(row, now, user) : create_row(norm, digest, host, now, user)
      rescue StandardError => e
        log("request not handled: #{e.class}")
        none(:failed)
      end

      # A row that is there, asked for by this person before or not
      def known(row, now, user)
        Asks.asked?(user, row.url_digest) ? existing(row, now) : first_ask(row, now, user)
      end

      # The person's first ask of an address that already has a row: answered as a new address is, within the same
      # caps and with the same steps, so that nobody can tell from the answer that someone else has linked it; the
      # next ask gives the card
      def first_ask(row, now, user)
        return none(:full) unless room? && Policy.new_row?(model.count, int('queue_max'))

        key = Policy.person_hour_key(user&.id, now)
        return none(:full) unless Policy.new_by_person?(added_by(key))

        existing(row, now) # seen, and renewed when stale, as for any ask
        added!(key)
        Asks.record!(user, row.url_digest, now)
        Result.new(state: :queued, row: row)
      end

      # A row that is there: a card is shown (renewed in the background when stale), otherwise "not yet" or nothing
      def existing(row, now)
        seen!(row, now)
        if row.card?
          requeue!(row, now) if renew?(row, now) && room?
          return Result.new(state: :ready, row: row)
        end
        return Result.new(state: :queued, row: row) if %w[queued working].include?(row.state)
        return none(:failed) unless Policy.retry_failed?(row.attempted_at, now, int('refresh_days'))
        return none(:full) unless room?

        requeue!(row, now)
        Result.new(state: :queued, row: row)
      end

      def renew?(row, now)
        case row.state
        when 'ready' then Policy.stale?(row.fetched_at, now, int('refresh_days'))
        when 'failed' then Policy.retry_failed?(row.attempted_at, now, int('refresh_days'))
        else false
        end
      end

      def room? = Policy.enqueue?(model.queued.count, int('queue_max'))

      # A new address gets a row only within the hard caps: the queue's room, every row the table may hold, and the
      # person's new addresses this hour. A refused address answers like a full queue.
      def create_row(norm, digest, host, now, user)
        return none(:full) unless room? && Policy.new_row?(model.count, int('queue_max'))

        key = Policy.person_hour_key(user&.id, now)
        return none(:full) unless Policy.new_by_person?(added_by(key))

        row = model.create!(url: norm, url_digest: digest, domain: host, state: 'queued', queued_at: now, seen_at: now)
        added!(key)
        Asks.record!(user, digest, now)
        Result.new(state: :queued, row: row)
      rescue ActiveRecord::RecordNotUnique
        row = model.find_by(url_digest: digest)
        row ? known(row, now, user) : none(:failed)
      end

      # The person's new addresses this hour, from Rails.cache; 0 when the cache cannot be read
      def added_by(key)
        ::Rails.cache.read(key).to_i
      rescue StandardError
        0
      end

      def added!(key)
        ::Rails.cache.write(key, added_by(key) + 1, expires_in: 2 * Policy::HOUR)
      rescue StandardError => e
        log("new address not counted: #{e.class}")
      end

      def seen!(row, now)
        return unless row.seen_at.nil? || now - row.seen_at > SEEN_EVERY

        row.update_columns(seen_at: now)
      end

      # Back in the queue; the card kept meanwhile stays and is shown
      def requeue!(row, now)
        n = model.where(id: row.id).where.not(state: %w[queued working]).update_all(state: 'queued', queued_at: now, updated_at: now)
        row.state = 'queued' if n.positive?
      end

      # The card's JSON for the reader (the endpoint's answer). icon: the picture is the site's icon, shown small.
      # no_picture: the card says that the website gives no preview picture, with its icon (icon) or without (none),
      # only when the page named none (kept as the ready row's error NO_PICTURE); a picture that was named and refused,
      # too large or removed at the cap says nothing, and nor does a card when the instance makes no pictures at all
      # (no ImageMagick)
      def card(row, user)
        img = image_path(row)
        icon = img ? Storage.icon?(row.image_path) : false
        no_picture = if row.error.to_s != NO_PICTURE || (img && !icon) then nil
                     elsif icon then 'icon'
                     elsif Thumbnail.available? then 'none'
                     end
        {
          state: 'ready', url: row.url, domain: row.domain, title: row.title.presence || row.domain,
          text: row.description.to_s, image: img, icon: icon, no_picture: no_picture, fetched: fetched_text(row, user)
        }
      end

      def image_path(row)
        return nil unless Storage.readable?(row.image_path)

        h = ::Rails.application.routes.url_helpers
        return nil unless h.respond_to?(:gk_gui_stuff_external_preview_image_path)

        root = ::Redmine::Utils.relative_url_root.to_s
        # k: the kind of file, so that a picture replaced by an icon (or the reverse) is never taken from the browser's cache
        "#{root}#{h.gk_gui_stuff_external_preview_image_path(row.id, v: External.image_key(row.url_digest),
                                                              k: Storage.icon?(row.image_path) ? 'i' : 'p', script_name: '')}"
      end

      # The date in the person's zone and Redmine's date format, its parts bound with hard spaces
      def fetched_text(row, user)
        at = row.fetched_at || Time.current
        date = dates.format_date(user.time_to_date(at)).to_s.strip.tr(' ', " ")
        ::I18n.t(:text_gk_gui_stuff_lpe_fetched, date: date)
      end

      def dates = (@dates ||= Object.new.extend(::Redmine::I18n))

      # The next row to fetch, claimed for this process, or nil. Rows stuck in working (their process is gone) go
      # back to the queue first. The threads of one process claim one at a time, so that the free slot and the
      # domain's interval are read and taken together; the domain's interval is also part of the claiming UPDATE
      # itself, so that a row is never taken while another row of its domain was attempted within the interval.
      def claim(now = Time.current)
        @claim_lock.synchronize do
          model.connection_pool.with_connection { claim_now(now) }
        end
      end

      def claim_now(now)
        timeout = int('timeout_seconds')
        working = model.working.to_a
        stuck = working.select { |r| Policy.stuck?(r.attempted_at, now, timeout) }
        model.where(id: stuck.map(&:id), state: 'working').update_all(state: 'queued', updated_at: now) if stuck.any?
        return nil unless Policy.slot_free?(working.size - stuck.size, int('max_parallel'))

        interval = int('domain_interval_seconds')
        model.queued.order(:queued_at, :id).limit(CANDIDATES).each do |row|
          last = model.where(domain: row.domain).maximum(:attempted_at)
          next unless Policy.domain_free?(last, now, interval)

          n = model.where(id: row.id, state: 'queued').where(domain_busy(row.domain, now, interval).not)
                   .update_all(state: 'working', attempted_at: now, attempts: row.attempts.to_i + 1, updated_at: now)
          return model.find_by(id: row.id) if n.positive?
        end
        nil
      end

      # EXISTS: a row of the domain attempted within the interval
      def domain_busy(domain, now, interval)
        t = model.arel_table
        model.where(domain: domain).where(t[:attempted_at].gt(now - interval)).arel.exists
      end

      # One fetch: :ready, :failed, or nil when nothing could be claimed
      def work_one = work_one_row&.last

      # One fetch with its row: [row, :ready | :failed], or nil. A database connection is held only while the row is
      # claimed and stored, never during the fetch, so that the web requests keep theirs.
      def work_one_row
        row = claim or return nil
        limits = { page_max_kb: int('page_max_kb'), image_max_kb: int('image_max_kb'), timeout_seconds: int('timeout_seconds') }
        res = Fetcher.call(row.url, limits)
        result = model.connection_pool.with_connection { res.ok ? store(row, res) : fail!(row, res.error) }
        [row, result]
      rescue StandardError => e
        log("#{row&.id}: #{e.class}")
        model.connection_pool.with_connection { fail!(row, 'network') } if row
        row ? [row, :failed] : nil
      end

      # The card's fields and its picture; the earlier picture removed when it is replaced or gone
      def store(row, res)
        now = Time.current
        prev = row.image_path
        path = nil
        bytes = nil
        icon = res.image_kind == 'icon'
        jpeg = res.image_bytes ? Thumbnail.make(res.image_bytes, res.image_type, icon: icon) : nil
        if jpeg
          path = Storage.write(row.url_digest, jpeg, icon: icon)
          bytes = jpeg.bytesize
        end
        log("#{row.id}: #{res.error} (#{row.domain})") if res.error
        saved = row.update_columns(title: res.title.to_s[0, 300].presence, description: res.description, image_path: path,
                                   image_bytes: bytes, fetched_at: now, state: 'ready', error: res.no_picture ? NO_PICTURE : nil,
                                   updated_at: now)
        Storage.delete(path) if path && !saved # the row was removed meanwhile (emptied)
        Storage.delete(prev) if prev.present? && prev != path
        Cleanup.over_cap!(keep: row.id) if path && saved
        :ready
      end

      def fail!(row, code)
        now = Time.current
        log("#{row.id}: #{code} (#{row.domain})")
        row.update_columns(state: 'failed', error: code.to_s[0, 40], updated_at: now)
        :failed
      end

      # The fetch job's body: up to max_parallel workers for at most JOB_SECONDS, each fetching until nothing is left.
      # The first worker is the calling thread itself, which already runs inside the Rails executor; the others are
      # threads of their own, and the wait for them ends with the job's time and JOIN_SPARE, never later, so that a
      # thread kept waiting for the executor never holds up the caller.
      def run_job(ops_run)
        return ::I18n.t(:text_gk_gui_stuff_job_link_preview_off) unless External.on?

        counts = Hash.new(0)
        lock = Mutex.new
        stop_at = clock + JOB_SECONDS
        extra = Array.new(threads - 1) do
          Thread.new { in_rails { work_until(stop_at, ops_run, counts, lock) } }
        end
        work_until(stop_at, ops_run, counts, lock)
        extra.each { |t| t.join([stop_at + JOIN_SPARE - clock, 0].max) }
        ::I18n.t(:text_gk_gui_stuff_job_link_preview_fetch_done, done: counts[:ready], failed: counts[:failed],
                                                                 left: model.queued.count)
      end

      # One worker of the job: fetches until stop_at or until nothing is left
      def work_until(stop_at, ops_run, counts, lock)
        while clock < stop_at
          done = work_one_row
          unless done
            # nothing could be taken now: when rows wait for their domain's interval or a free slot, try
            # again in a moment, so that links to one website are not fetched one per run
            break unless model.connection_pool.with_connection { model.queued.exists? }

            sleep(IDLE_WAIT)
            next
          end
          row, result = done
          lock.synchronize { counts[result] += 1 }
          step(ops_run, "#{row.domain}: #{result == :ready ? 'ready' : model.where(id: row.id).pick(:error) || 'failed'}")
        end
      rescue StandardError => e
        log("fetch worker stopped: #{e.class}")
      end

      def step(ops_run, text)
        return unless ops_run.respond_to?(:step)

        @step_lock.synchronize { ops_run.step(text) }
      rescue StandardError => e
        log("job step not written: #{e.class}")
      end

      # Without ops: one fetch in a thread of its own, at most one such thread per process; also the daily thinning
      def kick_inline!
        @inline_lock.synchronize do
          return false if @inline&.alive?

          @inline = Thread.new do
            in_rails do
              work_one
              Cleanup.daily_if_due
            end
          end
        end
        true
      end

      # max_parallel, but never so many that the web requests run short of database connections
      def threads
        room = model.connection_pool.size - 2
        [[int('max_parallel'), room].min, 1].max
      end

      # The Rails executor only: each query takes a connection from the pool and gives it back, so none is held
      # through a fetch
      def in_rails(&block)
        ::Rails.application.executor.wrap(&block)
      rescue StandardError => e
        log("fetch thread stopped: #{e.class}")
        nil
      end

      # A number of the setting, its default when nothing usable is stored
      def int(name)
        v = External.setting(name).to_i
        v.positive? ? v : External::VALUES.dig(name.to_s, :default).to_i
      end

      def none(why) = Result.new(state: :none, why: why)
      def clock = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      def log(text) = ::Rails.logger.warn("[gk_gui_stuff] link preview #{text}")
    end
  end
end
