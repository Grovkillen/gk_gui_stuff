# frozen_string_literal: true

require 'erb'
require 'set'
require 'uri'
require_relative 'footprints' # the effect mark on a link opened in a new tab

module GkGuiStuff
  # The links of formatted text: a link to another host than the instance's. Every such link gets
  # rel="noopener noreferrer", whatever the settings; by the reader's settings it also gets the external look's class
  # and tooltip (core_stuff.external_links), a new tab with a hidden text for screen readers
  # (gui_stuff.external_new_tab) and the mark that a preview may be asked for (gui_stuff.link_preview_external, only
  # for a domain in its list). A link to the instance's own host gets gk-link-own, so that it is drawn as an internal
  # link. In mail (no request), a PDF or a feed only rel and the look's tooltip are written.
  # The links come from GK Core Stuff's formatting_processors (Links, registered in patches.rb): the one pass over a
  # formatted text, which hands each link with its address and what core counts it as; this plugin never reads the
  # finished HTML of a text itself. Without GK Core Stuff, links in formatted text are not marked.
  module ExternalText
    REL = %w[noopener noreferrer].freeze
    SCHEMES = %w[http https ftp ftps].freeze
    # A scheme and every slash or backslash after it
    SCHEME_START = %r{\A([a-z][a-z0-9+.-]*):[/\\]*}i
    LOOK = 'core_stuff.external_links'
    NEW_TAB = 'gui_stuff.external_new_tab'

    module_function

    # The host names counted as the instance: the host of Setting.host_name (scheme, port and path dropped) and the
    # request's host when there is one; never empty
    def own_hosts(request)
      set = Set.new
      h = bare_host(::Setting.host_name.to_s)
      set << h unless h.empty?
      rh = request.respond_to?(:host) ? request.host.to_s : ''
      rh = normalize_host(rh)
      set << rh unless rh.empty?
      set << 'localhost' if set.empty?
      set
    rescue StandardError
      Set.new(['localhost'])
    end

    # "Host:port/path" or "scheme://host:port/path" as a lowercase host
    def bare_host(s)
      s = s.strip.sub(%r{\A[a-z][a-z0-9+.-]*://}i, '')
      s = s.split(%r{[/?#]}, 2).first.to_s
      s = s.sub(/\A[^@]*@/, '')
      s = s =~ /\A\[([^\]]+)\]/ ? Regexp.last_match(1) : s.sub(/:\d*\z/, '')
      normalize_host(s)
    end

    def normalize_host(h) = h.to_s.strip.downcase.chomp('.')

    # The host of an absolute address (http, https, ftp, ftps or protocol relative), else nil. Read as a browser reads
    # the address it opens, not as it is spelled: tabs and line breaks dropped, a backslash counts as a slash, the
    # slashes after the scheme may be missing or too many (https:host), the last @ ends the user part and an escaped
    # character of the host (%2e) counts as itself
    def host_of(href)
      s = href.to_s.delete("\t\n\r").gsub(/\A[\u0000- ]+|[\u0000- ]+\z/, '')
      return nil if s.empty?

      s = "http:#{s}" if s.match?(%r{\A[/\\]{2}})
      m = s.match(SCHEME_START)
      return nil unless m && SCHEMES.include?(m[1].downcase)

      auth = s[m[0].length..].split(%r{[/\\?#]}, 2).first.to_s.sub(/\A.*@/m, '')
      h = auth =~ /\A\[([^\]]*)\]/ ? Regexp.last_match(1) : auth.sub(/:\d*\z/, '')
      h = normalize_host(h.gsub(/%([0-7]\h)/) { Regexp.last_match(1).hex.chr })
      h.empty? || h.match?(/[\s<>"'`]/) ? nil : h
    end

    # The host when the address leads to another host than the instance's, else nil
    def external?(href, own)
      h = host_of(href)
      h && !own.include?(h) ? h : nil
    end

    # What the reader has on, read once per text
    def flags_for(user, request)
      reg = GkGuiStuff.appearance_settings
      look = reg ? reg.on_for?(LOOK, user) : false
      new_tab = request && reg ? reg.on_for?(NEW_TAB, user) : false
      { look: look ? true : false, new_tab: new_tab ? true : false }.merge(preview_flags(user, request))
    end

    # The preview's part; a failure there costs only the card, never the rest of the pass
    def preview_flags(user, request)
      ext = defined?(GkGuiStuff::External) ? GkGuiStuff::External : nil
      return { preview: false } unless request && ext && ext.on_for?(user)

      { preview: true, bare: ext.bare_links? ? true : false, domains: Array(ext.domains) }
    rescue StandardError => e
      ::Rails.logger.warn("[gk_gui_stuff] external link preview not read: #{e.message}") if defined?(::Rails)
      { preview: false }
    end

    # A page drawn for the browser: an HTML or script answer. A PDF or a feed also has a request, but its reader has no
    # stylesheet, so the hidden text of a new tab would show there; it is treated as mail (rel and tooltip only).
    def page_request?(req)
      return false if req.nil?

      f = req.format
      f.nil? || f.html? || f.js? ? true : false
    rescue StandardError
      false
    end

    # One link of formatted text (the pass's Link); true when something was written. A link already marked is left as
    # it is: core's collapse and include macros format their text with textilizable inside the outer call, so the outer
    # pass meets their links again
    def mark(a, flags, own)
      h = host_of(a.url)
      return false unless h
      return add_class(a, 'gk-link-own') if own.include?(h)

      changed = add_rel(a)
      title = a['title'].to_s.strip
      if flags[:look] && add_class(a, 'gk-link-external')
        d = h.delete_prefix('www.')
        title = if title.empty?
                  ::I18n.t(:text_gk_gui_stuff_external_title, domain: d)
                else
                  ::I18n.t(:text_gk_gui_stuff_external_title_with, title: title, domain: d)
                end
        a['title'] = title
        changed = true
      end
      changed = true if flags[:new_tab] && new_tab(a, title)
      changed = true if flags[:preview] && preview(a, h, flags)
      changed
    end

    # The class added to a link (the pass's Link); false when it was there
    def add_class(a, cls)
      list = a['class'].to_s.split
      return false if list.include?(cls)

      a['class'] = (list << cls).join(' ')
      true
    end

    # noopener and noreferrer added to a link's rel (the pass's Link); false when both were there
    def add_rel(a)
      list = a['rel'].to_s.split
      merged = (list + REL).uniq
      return false if merged == list

      a['rel'] = merged.join(' ')
      true
    end

    # The new tab, with its hidden text in this plugin's own span (class hidden-for-sighted), which an outer pass finds
    # again inside the link
    def new_tab(a, title)
      return false if a['target'] == '_blank' && a.contains_class?('hidden-for-sighted')

      a['target'] = '_blank'
      a[Effect::ATTRIBUTE] = (a[Effect::ATTRIBUTE].to_s.split | ['external_new_tab']).join(' ')
      a.append(%(<span class="hidden-for-sighted">#{ERB::Util.html_escape(::I18n.t(:text_gk_gui_stuff_new_tab_hidden))}</span>))
      a['title'] = if title.empty?
                     ::I18n.t(:text_gk_gui_stuff_new_tab_foot)
                   else
                     ::I18n.t(:text_gk_gui_stuff_external_title_new_tab, title: title)
                   end
      true
    end

    # The mark the script reads and sends back: the server's signature of the address; the domain list itself never
    # reaches the page
    def preview(a, host, flags)
      return false unless a['data-gk-gui-ext-macro'] || flags[:bare]
      return false unless GkGuiStuff::External::Domains.allowed?(host, flags[:domains])

      sig = GkGuiStuff::External.sign(a.url)
      return false unless sig && a['data-gk-gui-ext-preview'] != sig

      a['data-gk-gui-ext-preview'] = sig
      true
    end

    # The link processor in GK Core Stuff's formatting_processors: each link of a formatted text, with core's kind.
    # Only an address with a scheme or // (kind external) can lead to another host; a link in code is left. A view
    # without a request (mail), a PDF or a feed gets only rel and the look's tooltip. The links of a custom value's
    # formatted value (the context's origin :custom_value) go to ExternalRel::Values: rel, and the look by the place.
    # Active for every text: whether a text holds a link to another host is decided on each link the pass hands, never
    # on the text as written, which can spell the address in a way the formatter decodes (https:\/\/host,
    # https:&#47;&#47;host, https:host) and so has neither // nor www. in it.
    module Links
      module_function

      def custom_value?(context) = context.respond_to?(:custom_value?) && context.custom_value?

      def call(link, context)
        return if link.in_code? || link.kind != :external
        return ExternalRel::Values.call(link, context) if custom_value?(context)

        flags = context.memo(:gk_gui_stuff_external) do
          req = context.request
          ExternalText.flags_for(::User.current, ExternalText.page_request?(req)).merge(own: ExternalText.own_hosts(req))
        end
        ExternalText.mark(link, flags, flags[:own])
      end
    end
  end
end
