# frozen_string_literal: true

require 'json'
require 'openssl'

# Which addresses each person has asked the card endpoint for. The first ask of an address answers like a new
# address ("not yet") although a card is kept, so that nobody can tell from the endpoint what others have linked;
# the next ask gives the card, and the card's picture is only served to someone who has asked. Kept in the person's
# own row of gk_gui_stuff_user_settings, under one key, so that it holds also when Rails.cache keeps nothing: a mark
# per address (a keyed digest of the person and the address, which says nothing without the instance's secret) with
# the clock hour it was asked. At most Policy::ASKS_MAX marks, none older than forget_days. The write changes only
# that key, in one statement, so a person's other choices are never written over.
module GkGuiStuff
  module External
    module Asks
      KEY = 'link_preview_asked'
      TABLE = 'gk_gui_stuff_user_settings'

      module_function

      def mark(user, digest)
        OpenSSL::HMAC.hexdigest('SHA256', External.signing_key, "link_preview_asked:#{user.id.to_i}:#{digest}")[0, 16]
      end

      def asked?(user, digest)
        return false unless person?(user)

        marks(user).key?(mark(user, digest))
      end

      # -> true when the ask is kept
      def record!(user, digest, now = nil)
        return false unless person?(user)

        now ||= ::Time.current
        kept = Policy.asks_kept(marks(user).merge(mark(user, digest) => Policy.hour_of(now)), now, Queue.int('forget_days'))
        write(user.id.to_i, kept, now)
        true
      rescue StandardError => e
        ::Rails.logger.warn("[gk_gui_stuff] link preview ask not kept: #{e.class}")
        false
      end

      # Every mark of the person taken away (a scenario's check does it inside a transaction it rolls back)
      def forget!(user)
        return false unless person?(user)

        write(user.id.to_i, {}, ::Time.current)
        true
      end

      # The person's marks, {} when there are none or the row cannot be read
      def marks(user)
        raw = ::GkGuiStuffUserSetting.where(user_id: user.id).pick(:settings)
        data = raw.to_s.strip.empty? ? {} : JSON.parse(raw)
        v = data.is_a?(Hash) ? data[KEY] : nil
        v.is_a?(Hash) ? v : {}
      rescue JSON::ParserError
        {}
      end

      # Only the key, merged into the row (made when the person has none yet)
      def write(user_id, kept, now)
        json = { KEY => kept }.to_json
        sql = <<~SQL.squish
          INSERT INTO #{TABLE} (user_id, settings, created_at, updated_at) VALUES (:uid, :json, :now, :now)
          ON CONFLICT (user_id) DO UPDATE SET updated_at = :now,
          settings = CAST(CAST(COALESCE(NULLIF(#{TABLE}.settings, ''), '{}') AS jsonb) || CAST(:json AS jsonb) AS text)
        SQL
        conn = ::GkGuiStuffUserSetting.connection
        conn.exec_update(::GkGuiStuffUserSetting.sanitize_sql_array([sql, { uid: user_id, json: json, now: now }]))
        # exec_update leaves Rails' query cache as it was; a later read in the same request must see the write
        conn.clear_query_cache
      end

      def person?(user) = user.respond_to?(:logged?) && user.logged? && user.id.to_i.positive?
    end
  end
end
