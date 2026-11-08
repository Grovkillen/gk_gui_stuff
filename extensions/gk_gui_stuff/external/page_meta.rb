# frozen_string_literal: true

require 'uri'

# The card's fields from a fetched page: title, description and picture from Open Graph, Twitter cards and the
# page's own title and description, and the site's icon from its link tags. Only the head's meta, link and title are
# read; scripts, styles and comments never.
module GkGuiStuff
  module External
    module PageMeta
      TITLE_MAX = 200
      TEXT_MAX = 300
      SNIFF_BYTES = 4096
      REPLACEMENT = "\uFFFD"

      module_function

      # -> { title:, description:, image: (URI or nil), icon: (URI or nil) }
      def parse(html_bytes, base_uri, charset: nil)
        require 'nokogiri' unless defined?(::Nokogiri)
        doc = ::Nokogiri::HTML(text(html_bytes, charset), nil, 'UTF-8') # gk-r17 P6: the fetched page of another website, read for its title and meta tags; not markup of Redmine
        doc.xpath('//script|//style|//noscript|//template|//comment()').each(&:remove)
        {
          title: cut(first_meta(doc, %w[og:title twitter:title]) || doc.at_xpath('//title')&.text, TITLE_MAX),
          description: cut(first_meta(doc, %w[og:description twitter:description description]), TEXT_MAX),
          image: image(first_meta(doc, %w[og:image:secure_url og:image twitter:image twitter:image:src]), base_uri),
          icon: image(first_icon(doc), base_uri)
        }
      end

      # The site's own icon, for a card whose page names no picture: the touch icon first (it is the largest), then
      # the icon. A drawing (SVG) or a mask is never taken: only the picture types the card can show.
      ICON_RELS = [%w[apple-touch-icon apple-touch-icon-precomposed], %w[icon]].freeze

      def first_icon(doc)
        links = doc.xpath('//link[@rel][@href]').map do |l|
          [l['rel'].to_s.downcase.split(/[[:space:]]+/), l['href'].to_s.strip, l['type'].to_s.downcase]
        end
        links.reject! { |_, href, type| href.empty? || type.include?('svg') || href.downcase.split(/[?#]/).first.to_s.end_with?('.svg') }
        ICON_RELS.each do |rels|
          hit = links.find { |r, _, _| r.intersect?(rels) }
          return hit[1] if hit
        end
        nil
      end

      # The bytes as UTF-8: the charset given, else the page's own meta, else UTF-8; invalid bytes replaced
      def text(bytes, charset)
        raw = bytes.to_s.b
        enc = find_encoding(charset) || find_encoding(sniff(raw)) || Encoding::UTF_8
        s = raw.dup.force_encoding(enc)
        s = s.encode(Encoding::UTF_8, invalid: :replace, undef: :replace, replace: REPLACEMENT) unless enc == Encoding::UTF_8
        s.scrub(REPLACEMENT)
      rescue StandardError
        raw.force_encoding(Encoding::UTF_8).scrub(REPLACEMENT)
      end

      def sniff(raw)
        head = raw[0, SNIFF_BYTES]
        m = head.match(/<meta[^>]+charset\s*=\s*["']?\s*([A-Za-z0-9._:-]+)/ni)
        m && m[1]
      end

      def find_encoding(name)
        return nil if name.to_s.strip.empty?

        Encoding.find(name.to_s.strip)
      rescue ArgumentError
        nil
      end

      # The first meta with content among the names, as property or name
      def first_meta(doc, names)
        names.each do |n|
          node = doc.at_xpath("//meta[translate(@property,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='#{n}' or " \
                              "translate(@name,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='#{n}'][@content]")
          v = squeeze(node && node['content'])
          return v unless v.nil? || v.empty?
        end
        nil
      end

      def squeeze(s) = s&.gsub(/[[:space:]]+/, ' ')&.strip

      def cut(s, max)
        v = squeeze(s)
        return nil if v.nil? || v.empty?

        v.length > max ? "#{v[0, max - 3].rstrip}..." : v
      end

      # The picture's address resolved against the page, http or https only
      def image(src, base_uri)
        return nil if src.nil? || src.empty?

        u = URI.join(base_uri.to_s, src.strip)
        %w[http https].include?(u.scheme.to_s.downcase) && u.host ? u : nil
      rescue URI::Error, ArgumentError
        nil
      end
    end
  end
end
