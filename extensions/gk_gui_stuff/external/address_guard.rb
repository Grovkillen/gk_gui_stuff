# frozen_string_literal: true

require 'ipaddr'
require 'socket'
require 'resolv'
require 'timeout'
require 'uri'

# The guard against internal addresses, the same in every Redmine series: only http and https on their own ports, no
# user name in the address, and every address the host resolves to must be public and not the instance's own. The
# addresses it returns are the ones the fetcher connects to (the connection is pinned to them, so a second lookup
# cannot lead elsewhere). Plain Ruby, no Rails, so that the unit tests can load it alone.
module GkGuiStuff
  module External
    module AddressGuard
      class Refused < StandardError
        attr_reader :why # :scheme, :port, :userinfo, :resolve, :address

        def initialize(why, message = nil)
          @why = why
          super(message || why.to_s)
        end
      end

      BLOCKED = %w[0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24
                   192.0.2.0/24 192.88.99.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24
                   224.0.0.0/4 240.0.0.0/4 ::/128 ::1/128 64:ff9b:1::/48 100::/64 fc00::/7 fe80::/10 fec0::/10
                   ff00::/8 2001:db8::/32].map { |c| IPAddr.new(c) }.freeze
      # IPv6 ranges that carry an IPv4 address inside: NAT64 and IPv4-translated (the last 32 bits) and 6to4 (bits 16
      # to 47). The local NAT64 range is refused whole above, whatever it carries.
      NAT64 = IPAddr.new('64:ff9b::/96')
      IPV4_TRANSLATED = IPAddr.new('::ffff:0:0:0/96')
      SIX_TO_FOUR = IPAddr.new('2002::/16')
      PORTS = { 'http' => 80, 'https' => 443 }.freeze
      LOOKUP_SECONDS = 2
      OWN_SECONDS = 300
      ALLOW = /\A127\.0\.0\.1:(\d{1,5})\z/
      UNSET = Object.new.freeze
      @allowance = UNSET

      module_function

      # Tests set a lookup of their own: ->(host) { ['93.184.216.34'] }; nil restores the real one
      def resolver=(callable)
        @resolver = callable
      end

      # The host's addresses as IPAddr; Refused(:resolve) when there are none or the lookup fails
      def resolve(host)
        h = host.to_s.delete_prefix('[').delete_suffix(']')
        raise Refused.new(:resolve) if h.empty?

        list = begin
          literal = ip_or_nil(h)
          if literal then [literal]
          elsif @resolver then Array(@resolver.call(h))
          else
            Timeout.timeout(LOOKUP_SECONDS) { Addrinfo.getaddrinfo(h, nil, nil, :STREAM).map(&:ip_address) }
          end
        rescue Refused
          raise
        rescue StandardError, Timeout::Error
          raise Refused.new(:resolve)
        end
        ips = list.map { |a| a.is_a?(IPAddr) ? a : ip_or_nil(a.to_s) }.compact.uniq
        raise Refused.new(:resolve) if ips.empty?

        ips
      end

      # The instance's own addresses: those of the machine and those its own host names resolve to, kept 300 s
      def own_addresses
        return @own_fixed if @own_fixed

        now = clock
        return @own if @own && @own_at && now - @own_at < OWN_SECONDS

        @own_at = now
        @own = (machine_addresses + own_host_addresses).uniq
      end

      # Tests set the instance's own addresses (strings or IPAddr); nil goes back to reading them
      def own_addresses=(list)
        @own_fixed = list.nil? ? nil : Array(list).map { |a| a.is_a?(IPAddr) ? a : IPAddr.new(a.to_s) }
        @own = nil
      end

      def blocked_ip?(ip)
        ip = ip.is_a?(IPAddr) ? ip : IPAddr.new(ip.to_s)
        return true if in_blocked?(ip)

        inner = embedded_ipv4(ip)
        return true if inner && in_blocked?(inner)

        own = own_addresses
        own.any? { |o| same?(o, ip) || (inner && same?(o, inner)) }
      rescue IPAddr::Error
        true
      end

      # The one exception: in a development instance the address 127.0.0.1 with the port in GK_LINK_PREVIEW_ALLOW,
      # so that a local test site can be fetched; never outside development. [ip, port] or nil.
      def allowance
        return @allowance unless @allowance.equal?(UNSET)
        return nil unless defined?(::Rails) && ::Rails.respond_to?(:env) && ::Rails.env.development?

        m = ENV['GK_LINK_PREVIEW_ALLOW'].to_s.match(ALLOW)
        return nil unless m

        port = m[1].to_i
        port.between?(1, 65_535) ? ['127.0.0.1', port] : nil
      end

      # Tests set the allowance ([ip, port] or nil); reset_allowance! goes back to reading the environment
      def allowance=(value)
        @allowance = value
      end

      def reset_allowance!
        @allowance = UNSET
      end

      # The addresses to connect to for the address, or Refused
      def check!(uri)
        uri = URI.parse(uri.to_s) unless uri.respond_to?(:scheme)
        scheme = uri.scheme.to_s.downcase
        raise Refused.new(:scheme) unless PORTS.key?(scheme)
        raise Refused.new(:userinfo) if uri.userinfo
        raise Refused.new(:resolve) if uri.host.to_s.empty?

        host = uri.host.to_s.downcase
        allow = allowance
        if allow && scheme == 'http' && host == allow[0] && uri.port == allow[1]
          return [IPAddr.new(allow[0])]
        end
        raise Refused.new(:port) unless uri.port == PORTS[scheme]

        ips = resolve(host)
        raise Refused.new(:address) if ips.any? { |ip| blocked_ip?(ip) }

        ips
      end

      def in_blocked?(ip) = BLOCKED.any? { |net| net.family == ip.family && net.include?(ip) }

      # The IPv4 address inside an IPv6 one (mapped ::ffff:a.b.c.d, compatible ::a.b.c.d, NAT64, 6to4), else nil
      def embedded_ipv4(ip)
        return nil unless ip.ipv6?

        n = ip.to_i
        return ip.native if ip.ipv4_mapped?
        return IPAddr.new(n, Socket::AF_INET) if n.positive? && n < 2**32
        return IPAddr.new(n & 0xffff_ffff, Socket::AF_INET) if NAT64.include?(ip) || IPV4_TRANSLATED.include?(ip)
        return IPAddr.new((n >> 80) & 0xffff_ffff, Socket::AF_INET) if SIX_TO_FOUR.include?(ip)

        nil
      end

      def same?(a, b) = a.family == b.family && a.to_i == b.to_i

      def ip_or_nil(s)
        IPAddr.new(s.to_s.sub(/%.*\z/, ''))
      rescue IPAddr::Error, ArgumentError
        nil
      end

      def machine_addresses
        Socket.ip_address_list.map { |a| ip_or_nil(a.ip_address) }.compact
      rescue StandardError
        []
      end

      def own_host_addresses
        return [] unless defined?(::GkGuiStuff::ExternalText) && ::GkGuiStuff::ExternalText.respond_to?(:own_hosts)

        Array(::GkGuiStuff::ExternalText.own_hosts(nil)).flat_map do |h|
          resolve(h)
        rescue Refused
          []
        end
      rescue StandardError
        []
      end

      def clock = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    end
  end
end
