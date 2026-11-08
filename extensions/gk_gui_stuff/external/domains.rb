# frozen_string_literal: true

# The allow list of the preview of external links: one entry per line. "example.se" allows exactly that host,
# "*.example.se" every subdomain of it (not example.se itself), "*" every host name. Plain Ruby, no Rails, so that
# the unit tests can load it alone.
module GkGuiStuff
  module External
    module Domains
      # Case-insensitive in itself: an embedded pattern keeps its own flags, and the page checks entries as written
      LABEL = /[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?/i
      # The last label holds a letter, so that an address written as numbers ("192.0.2.1", "0x7f.1") is never a host
      # name; 127.0.0.1 is the one address an entry may name (a local development site, see AddressGuard.allowance)
      TOP = /(?=[a-z0-9-]*[a-z])#{LABEL}/i
      ENTRY = /\A(?:\*|(?:\*\.)?(?:#{LABEL}\.)+#{TOP}|127\.0\.0\.1)\z/i
      HOST = /\A(?:#{LABEL}\.)+#{TOP}\z/i
      LOCAL_IP = '127.0.0.1'

      module_function

      # Stripped, lowercased, one trailing dot dropped; '' for nil
      def normalize(s)
        v = s.to_s.strip.downcase
        v.end_with?('.') ? v[0..-2] : v
      end

      # One entry as the list takes it; the address 127.0.0.1 only with allow_ip, no other address
      def valid_entry?(s, allow_ip: false)
        v = normalize(s)
        return false unless ascii?(v) && v.match?(ENTRY)
        return allow_ip if v == LOCAL_IP

        true
      end

      # A list (Array or text with one entry per line) as normalized, valid, unique entries; the invalid ones dropped.
      # 127.0.0.1 is kept: it allows nothing unless the address guard admits it too.
      def parse(list)
        items = list.is_a?(Array) ? list : list.to_s.split(/\r?\n/)
        items.map { |s| normalize(s) }.select { |s| valid_entry?(s, allow_ip: true) }.uniq
      end

      def wildcard_all?(list) = parse(list).include?('*')

      # Whether the list allows the host. A host with characters outside ASCII is never allowed (write it as xn--);
      # an address as host only by the entry 127.0.0.1, never by "*".
      def allowed?(host, list)
        h = normalize(host)
        return false if h.empty? || !ascii?(h)

        entries = parse(list)
        return h == LOCAL_IP && entries.include?(LOCAL_IP) if ip_literal?(h)
        return false unless h.match?(HOST)

        entries.any? do |e|
          next true if e == '*'
          # "*.x.se" leaves ".x.se": a.x.se and a.b.x.se end with it, x.se does not
          next h.end_with?(e[1..]) if e.start_with?('*.')

          h == e
        end
      end

      def ascii?(s) = s.ascii_only?

      # An address written as a host: dotted numbers, or anything with a colon or a bracket (IPv6)
      def ip_literal?(h) = h.match?(/\A[\d.]+\z/) || h.include?(':') || h.start_with?('[')
    end
  end
end
