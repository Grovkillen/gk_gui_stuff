# frozen_string_literal: true

require 'net/http'
require 'openssl'
require 'timeout'
require 'uri'

# One fetch of an external page and its picture, for the card. Only hosts on the allow list, only public addresses
# (AddressGuard), the connection pinned to the address that was checked, one deadline for page and picture
# together, the size counted while reading, at most three redirects, each checked again. The request carries no
# cookie, no referrer and no credentials, only a fixed User-Agent; cookies in the answer are ignored. Nothing raises
# out of call: every failure is one of ERRORS.
module GkGuiStuff
  module External
    class Fetcher
      # image_kind: 'picture' (the page's own picture) or 'icon' (the site's icon, when the page names no picture or
      # its picture could not be had); nil without either
      # no_picture: the page names no picture of its own (no og:image or twitter:image); a picture that was named and
      # could not be had is not that
      Result = Struct.new(:ok, :error, :final_url, :title, :description, :image_bytes, :image_type, :image_kind, :no_picture,
                          keyword_init: true)
      ERRORS = %w[bad_url not_allowed refused_address refused_port timeout too_large not_html http redirects network
                  image_refused image_too_large image_type no_meta].freeze
      REDIRECT_CODES = [301, 302, 303, 307, 308].freeze
      PAGE_TYPES = %w[text/html application/xhtml+xml].freeze
      PAGE_ACCEPT = 'text/html,application/xhtml+xml;q=0.9'
      IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/x-icon,image/vnd.microsoft.icon'
      MAX_URL = 2000
      MIN_TIMEOUT = 0.5
      # A picture failure keeps the card; these are the codes it is logged with
      IMAGE_CODES = { 'not_allowed' => 'image_refused', 'refused_address' => 'image_refused',
                      'refused_port' => 'image_refused', 'bad_url' => 'image_refused',
                      'too_large' => 'image_too_large', 'not_html' => 'image_type' }.freeze

      # A failure with its code, inside one fetch
      class Failure < StandardError
        attr_reader :code

        def initialize(code)
          @code = code.to_s
          super(@code)
        end
      end

      # A redirect to follow, inside one fetch
      class Redirect < StandardError
        attr_reader :location

        def initialize(location)
          @location = location.to_s
          super('redirect')
        end
      end

      # limits: { page_max_kb:, image_max_kb:, timeout_seconds: }
      def self.call(url, limits) = new(limits).call(url)

      # The address as the queue keeps it: http or https with a host, lowercased host without a trailing dot, no
      # fragment, no user name, no white space, at most MAX_URL characters (the default port is left out when it is
      # written as a string). A URI or nil.
      def self.normalize(url)
        s = url.to_s.strip
        return nil if s.empty? || s.length > MAX_URL || s.match?(/[[:space:]]/)

        uri = URI.parse(s)
        return nil unless uri.is_a?(URI::HTTP) && %w[http https].include?(uri.scheme.to_s.downcase)
        return nil if uri.userinfo || uri.host.to_s.empty?

        uri.scheme = uri.scheme.downcase
        uri.host = uri.host.downcase.chomp('.')
        return nil if uri.host.empty?

        uri.fragment = nil
        uri.path = '/' if uri.path.to_s.empty?
        uri
      rescue URI::Error, ArgumentError
        nil
      end

      def initialize(limits)
        @page_max = limits[:page_max_kb].to_i * 1024
        @image_max = limits[:image_max_kb].to_i * 1024
        @deadline = Limits::Deadline.new(limits[:timeout_seconds].to_f)
      end

      def call(url)
        uri = self.class.normalize(url) or return failed('bad_url')
        body, final, charset = get(uri, @page_max, :page)
        meta = PageMeta.parse(body, final, charset: charset)
        return failed('no_meta', final) if meta[:title].nil? && meta[:description].nil?

        res = Result.new(ok: true, final_url: final.to_s, title: meta[:title], description: meta[:description], no_picture: meta[:image].nil?)
        picture(meta[:image], res) if meta[:image]
        site_icon(meta[:icon], final, res) unless res.image_bytes
        res
      rescue StandardError, Timeout::Error => e
        failed(code_for(e))
      end

      private

      def failed(code, final = nil) = Result.new(ok: false, error: code.to_s, final_url: final&.to_s)

      # The picture: same rules, its own size limit, its host on the list too; a failure leaves the card without it
      def picture(src, res)
        uri = self.class.normalize(src.to_s) or raise Failure.new('bad_url')
        bytes, = get(uri, @image_max, :image)
        type = image_type(bytes) or raise Failure.new('image_type')
        type == 'ico' and raise Failure.new('image_type') # an icon file is not a page's picture
        res.image_bytes = bytes
        res.image_type = type
        res.image_kind = 'picture'
      rescue StandardError, Timeout::Error => e
        code = code_for(e)
        res.error = IMAGE_CODES.fetch(code, code)
      end

      # The site's icon, when the card has no picture: the one the page names, else /favicon.ico on the page's own
      # host. The same rules as the picture (the allow list, the guard, the size limit, the one deadline); nothing
      # is said when there is none, and an earlier picture failure stays the card's logged error.
      def site_icon(named, page_uri, res)
        candidates = [named, URI.join(page_uri.to_s, '/favicon.ico')].compact.map(&:to_s).uniq
        candidates.each do |src|
          return unless @deadline.remaining.positive? # the one deadline holds for the icon too
          uri = self.class.normalize(src) or next
          begin
            bytes, = get(uri, @image_max, :image)
          rescue StandardError, Timeout::Error
            next
          end
          type = image_type(bytes) or next
          res.image_bytes = bytes
          res.image_type = type
          res.image_kind = 'icon'
          return
        end
      rescue StandardError, Timeout::Error
        nil
      end

      # The picture's type by its first bytes only: jpeg, png, gif, webp, ico (a Windows icon file) or nil
      def image_type(bytes)
        b = bytes.to_s.b
        return 'jpeg' if b.start_with?("\xFF\xD8\xFF".b)
        return 'png' if b.start_with?("\x89PNG".b)
        return 'gif' if b.start_with?('GIF8'.b)
        return 'webp' if b.bytesize >= 12 && b[0, 4] == 'RIFF'.b && b[8, 4] == 'WEBP'.b
        return 'ico' if b.bytesize >= 6 && b[0, 4] == "\x00\x00\x01\x00".b

        nil
      end

      # Follows at most three redirects, each through the allow list and the guard again. [body, final URI, charset]
      def get(uri, max, kind)
        redirects = Limits::Redirects.new(3)
        loop do
          # no lookup starts after the deadline (the picture, the icon, a redirect)
          @deadline.check!
          raise Failure.new('not_allowed') unless External.allowed_host?(uri.host)

          ips = AddressGuard.check!(uri)
          begin
            return fetch_once(uri, ips, max, kind)
          rescue Redirect => r
            begin
              redirects.follow!
            rescue Limits::TooManyRedirects
              raise Failure.new('redirects')
            end
            uri = self.class.normalize(URI.join(uri.to_s, r.location).to_s) or raise Failure.new('bad_url')
          end
        end
      end

      # The read timeouts of net/http count per read, not for the whole answer: a server that drips the status line,
      # the headers or the TLS handshake a byte at a time would hold the thread for ever, and net/http has no limit
      # on the size of the headers. The whole connection and answer therefore run under the one deadline, with a
      # little room for the timeouts inside to fire first.
      def fetch_once(uri, ips, max, kind)
        http = nil
        ::Timeout.timeout(@deadline.remaining + 0.5, Limits::TimedOut) do
          http = connect(uri, ips)
          read(http, uri, max, kind)
        end
      ensure
        finish(http)
      end

      def finish(http)
        http.finish if http&.started?
      rescue IOError, SystemCallError
        nil
      end

      # The first of the checked addresses that answers; the host name stays for SNI and the certificate check
      def connect(uri, ips)
        last = nil
        ips.each do |ip|
          @deadline.check!
          http = Net::HTTP.new(uri.host, uri.port, nil) # nil: never a proxy, the connection goes to the checked address
          http.ipaddr = ip.to_s
          if uri.scheme == 'https'
            http.use_ssl = true
            http.verify_mode = OpenSSL::SSL::VERIFY_PEER
          end
          timeouts(http)
          begin
            http.start
            return http
          rescue SystemCallError, SocketError, Net::OpenTimeout, IOError => e
            last = e
          end
        end
        raise last || Failure.new('network')
      end

      def timeouts(http)
        t = [@deadline.remaining, MIN_TIMEOUT].max
        http.open_timeout = t
        http.read_timeout = t
        http.write_timeout = t if http.respond_to?(:write_timeout=)
        http.keep_alive_timeout = 1 if http.respond_to?(:keep_alive_timeout=)
        http.max_retries = 0 if http.respond_to?(:max_retries=) # a retry would run past the deadline
      end

      def headers(kind)
        h = { 'User-Agent' => External::USER_AGENT, 'Accept' => kind == :image ? IMAGE_ACCEPT : PAGE_ACCEPT,
              'Accept-Encoding' => 'identity' }
        lang = language
        h['Accept-Language'] = lang if lang
        h
      end

      def language
        v = ::Setting.default_language.to_s
        v.match?(/\A[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*\z/) ? v : nil
      rescue StandardError
        nil
      end

      def read(http, uri, max, kind)
        timeouts(http)
        req = Net::HTTP::Get.new(uri.request_uri, headers(kind))
        out = nil
        http.request(req) do |res|
          code = res.code.to_i
          raise Redirect.new(res['location']) if REDIRECT_CODES.include?(code) && res['location'].to_s != ''
          raise Failure.new('http') unless code == 200

          type = res.content_type.to_s.downcase
          raise Failure.new('not_html') if kind == :page && !PAGE_TYPES.include?(type)

          length = res['content-length'].to_s
          raise Failure.new('too_large') if length.match?(/\A\d+\z/) && length.to_i > max

          out = [body(http, res, max), uri, res.type_params['charset']]
        end
        out or raise Failure.new('network')
      end

      # The body, counted while it is read, the deadline checked between chunks and the read timeout shortened to it
      def body(http, res, max)
        budget = Limits::Budget.new(max)
        buf = +''.b
        res.read_body do |chunk|
          @deadline.check!
          buf << budget.add(chunk).b
          http.read_timeout = [@deadline.remaining, MIN_TIMEOUT].max
        end
        buf
      end

      def code_for(e)
        case e
        when Failure then e.code
        when AddressGuard::Refused then guard_code(e.why)
        when Limits::TooLarge then 'too_large'
        when Limits::TimedOut, Timeout::Error then 'timeout'
        when Limits::TooManyRedirects then 'redirects'
        else timeout_class?(e) ? 'timeout' : 'network'
        end
      end

      def guard_code(why)
        case why
        when :port then 'refused_port'
        when :address then 'refused_address'
        when :scheme, :userinfo then 'bad_url'
        else 'network'
        end
      end

      def timeout_class?(e) = (defined?(Net::WriteTimeout) && e.is_a?(Net::WriteTimeout)) || e.is_a?(Net::ReadTimeout)
    end
  end
end
