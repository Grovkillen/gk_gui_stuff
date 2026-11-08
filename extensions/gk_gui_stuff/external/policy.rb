# frozen_string_literal: true

# The queue's decisions, without a database: whether an address may enter, whether a domain or a slot is free, and
# when a card is renewed or forgotten. Times are Time objects, intervals in seconds or days. Plain Ruby, no Rails, so
# that the unit tests can load it alone.
module GkGuiStuff
  module External
    module Policy
      DAY = 86_400
      HOUR = 3600
      ROWS_PER_QUEUE = 10
      ROWS_FLOOR = 1000
      NEW_PER_HOUR = 60
      ASKS_MAX = 500

      module_function

      def enqueue?(queued_count, queue_max) = queued_count.to_i < queue_max.to_i

      # Every row the table may hold (ready, failed, queued and working together): ten queues, at least a thousand
      def rows_max(queue_max) = [queue_max.to_i * ROWS_PER_QUEUE, ROWS_FLOOR].max

      # A new address may get a row while the table holds fewer than rows_max
      def new_row?(row_count, queue_max) = row_count.to_i < rows_max(queue_max)

      # A person may add a new address while fewer than NEW_PER_HOUR were added by them this hour
      def new_by_person?(added_this_hour) = added_this_hour.to_i < NEW_PER_HOUR

      # The cache key that counts one person's new addresses within one clock hour
      def person_hour_key(user_id, now) = "gk_gui_stuff/link_preview_new/#{user_id.to_i}/#{now.to_i / HOUR}"

      # No earlier fetch from the domain, or the last one at least interval_seconds ago
      def domain_free?(last_attempt_at, now, interval_seconds)
        last_attempt_at.nil? || now - last_attempt_at >= interval_seconds.to_f
      end

      def slot_free?(working_count, max_parallel) = working_count.to_i < max_parallel.to_i

      # Never fetched, or fetched refresh_days ago or more
      def stale?(fetched_at, now, refresh_days)
        fetched_at.nil? || now - fetched_at >= refresh_days.to_f * DAY
      end

      # Not shown for forget_days or more (the caller passes created_at when it was never shown)
      def forget?(seen_at, now, forget_days)
        seen_at.nil? || now - seen_at >= forget_days.to_f * DAY
      end

      # A fetch that has worked longer than twice its timeout and a minute: its process is gone
      def stuck?(attempted_at, now, timeout_seconds)
        attempted_at ? now - attempted_at > timeout_seconds.to_f * 2 + 60 : false
      end

      # A failed address is tried again on the same rhythm as a card is renewed
      def retry_failed?(attempted_at, now, refresh_days) = stale?(attempted_at, now, refresh_days)

      # The clock hour of a time, as the person's record of asked addresses keeps it
      def hour_of(now) = now.to_i / HOUR

      # The asked addresses kept in a person's record ({mark => hour}): none asked forget_days ago or more, and at
      # most ASKS_MAX, the most recently asked kept
      def asks_kept(asks, now, forget_days)
        oldest = hour_of(now) - (forget_days.to_f * 24).ceil
        fresh = (asks.is_a?(Hash) ? asks : {}).select { |_m, h| h.is_a?(Integer) && h > oldest }
        fresh.sort_by { |m, h| [-h, m.to_s] }.first(ASKS_MAX).to_h
      end

      def cap_bytes(megabytes) = megabytes.to_i * 1024 * 1024

      # The cards whose pictures go when the pictures together are over the cap: the ones shown longest ago first
      # (never shown counts as longest ago; the caller passes created_at when a card was never shown), until the rest
      # fits. rows: [id, shown_at, picture bytes]; keep: the card just stored, whose picture never goes. -> the ids, in
      # the order chosen.
      def over_cap(rows, cap_bytes, keep: nil)
        total = rows.sum { |r| r[2].to_i }
        return [] if total <= cap_bytes.to_i

        chosen = []
        candidates = rows.reject { |r| r[0] == keep || r[2].to_i <= 0 }
        candidates.sort_by { |id, at, _b| [at ? at.to_f : -Float::INFINITY, id.to_i] }.each do |id, _at, bytes|
          break if total <= cap_bytes.to_i

          chosen << id
          total -= bytes.to_i
        end
        chosen
      end
    end
  end
end
