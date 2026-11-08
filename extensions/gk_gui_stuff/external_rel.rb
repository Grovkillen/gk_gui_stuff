# frozen_string_literal: true

module GkGuiStuff
  # Links to another host drawn outside formatted text get rel="noopener noreferrer", always, whatever the external
  # look or any other setting; formatted text has its own pass (ExternalText). A link to the instance's own host is
  # left as it is (ExternalText.own_hosts and host_of decide, the same rule as in formatted text). Three places, none
  # of which reads HTML core has finished:
  # * link_to with an address as a string (HelperPatch#link_to): the project's homepage (link_to_if), the footer's
  #   Redmine link, the help item of the top menu, the avatar's edit link, the plugins' addresses under
  #   Administration and every plugin's own link_to with a written address; an existing rel is kept and completed.
  # * the formatted value of a custom field (Values): core's link format and the address pattern of the other formats
  #   build the link with link_to and then sanitize it, which keeps rel but drops a class or a data attribute. GK Core
  #   Stuff's formatting_processors hands each link of the formatted value to this plugin's link processor
  #   (ExternalText::Links, with the context's origin :custom_value), which writes rel and the look there.
  # * the wiki syntax help (HelpPatch): static pages whose external links are written in core's templates, in every
  #   language, with no hook. Instead of writing rel into the drawn page, the help's answers carry the header
  #   Referrer-Policy: no-referrer, so that no link on them sends the page's address (what noreferrer does per link);
  #   none of those links opens a new window, so noopener has nothing to do there. Nothing in the page is read.
  # Links a script builds in the browser are not reached here.
  #
  # Some of these links are content, and they also get the external look of formatted text (class gk-link-external,
  # the domain in the tooltip, and the place in data-gk-link-place, which the stylesheet draws) when the look
  # (core_stuff.external_links) is on for the reader and the administrator has the place on. The places are values
  # under the look's row on the page Appearance, all on until switched off. GK Core Stuff owns the row and declares
  # them; this plugin only reads them (Places), and a place GK Core Stuff does not declare counts as on:
  # * field_link: a custom field of the format link; url_pattern: the address pattern of the other formats;
  # * project_homepage: the project's homepage on the project's overview;
  # * people and icons: links those plugins mark themselves with data-gk-link-place, so that they need nothing of
  #   this plugin; without it the attribute does nothing.
  # The frame, the menu, Administration, the avatar and the help are never marked.
  # A link with the look also opens in a new tab when the reader has chosen that (gui_stuff.external_new_tab), with the
  # hidden text and the tooltip of formatted text. On a custom value it is written by the pass, after core's sanitize,
  # so that nothing takes it away. A link whose html options already name a target is left with it. Mail, a PDF and a
  # feed get no new tab, as in formatted text.
  module ExternalRel
    ABSOLUTE = %r{\A\s*(?:(?:https?|ftps?):)?//}i
    REFERRER_POLICY = 'no-referrer'
    PLACES = %w[field_link url_pattern project_homepage people icons].freeze
    PLACE_ATTR = 'data-gk-link-place'
    MARK = 'gk-link-external'
    NEW_TAB_EFFECT = 'external_new_tab'

    module_function

    # The rel value with noopener and noreferrer added to what is there (a string, a list or nothing)
    def merged_rel(value)
      list = Array(value).flat_map { |v| v.to_s.split }
      (list + ExternalText::REL).uniq.join(' ')
    end

    # The host when the address leads to another host than the instance's, else nil; the hosts are asked for only for
    # an absolute address
    def external_host(url)
      return nil unless url.is_a?(String) && url.match?(ABSOLUTE)

      ExternalText.external?(url, yield)
    end

    def external_url?(url, &block) = external_host(url, &block) ? true : false

    # link_to's arguments, with rel in the html options when the address is a string to another host; otherwise the
    # arguments as they came. With a block the address is the first argument and the html options the second. place:
    # the page's place for the link (the homepage), or a lambda giving it, asked only for a link to another host whose
    # html options name none; marked: a lambda saying whether a place gets the look for this reader; new_tab: a lambda
    # saying whether this reader has a new tab; hidden: a lambda giving the link's text with the hidden text after it
    # (with a block the caller does that, new_tab_opened? says when).
    def link_args(args, block, place: nil, marked: nil, new_tab: nil, hidden: nil)
      i = block ? 0 : 1
      host = external_host(args[i]) { yield }
      return args unless host

      opts = args[i + 1]
      return args unless opts.nil? || opts.is_a?(Hash)

      opts = opts ? opts.dup : {}
      had = [opts.delete(:rel), opts.delete('rel')].compact
      opts[:rel] = merged_rel(had)
      named = place_in(opts)
      given = named ? nil : (place.respond_to?(:call) ? place.call : place).to_s
      where = named || (PLACES.include?(given) ? given : nil)
      out = args.dup
      if where && marked&.call(where)
        mark_opts!(opts, host, named ? nil : where)
        out[0] = hidden.call(args[0] || args[1]) if new_tab&.call && new_tab_opts!(opts) && !block && hidden
      end
      out[i + 1] = opts
      out
    end

    # The new tab in html options, unless they name a target already: false then. opts has the look's tooltip
    def new_tab_opts!(opts)
      return false if opts[:target] || opts['target']

      opts[:target] = '_blank'
      opts[Effect::ATTRIBUTE] = (opts[Effect::ATTRIBUTE].to_s.split | [NEW_TAB_EFFECT]).join(' ')
      title = opts[:title].to_s
      opts[:title] = if title.empty?
                       ::I18n.t(:text_gk_gui_stuff_new_tab_foot)
                     else
                       ::I18n.t(:text_gk_gui_stuff_external_title_new_tab, title: title)
                     end
      true
    end

    # Whether link_args gave these html options a new tab
    def new_tab_opened?(opts)
      opts.is_a?(Hash) && opts[Effect::ATTRIBUTE].to_s.split.include?(NEW_TAB_EFFECT)
    end

    # The reader's choice of a new tab, on a page drawn for the browser only
    def new_tab_on?(user, request)
      reg = GkGuiStuff.appearance_settings
      reg && ExternalText.page_request?(request) && reg.on_for?(ExternalText::NEW_TAB, user) ? true : false
    rescue StandardError
      false
    end

    # The place an html options hash names (data: { gk_link_place: } or data-gk-link-place), one of PLACES, else nil
    def place_in(opts)
      data = opts[:data] || opts['data']
      v = if data.is_a?(Hash)
            data[:gk_link_place] || data['gk_link_place'] || data[:'gk-link-place'] || data['gk-link-place']
          end
      v ||= opts[PLACE_ATTR] || opts[PLACE_ATTR.to_sym]
      PLACES.include?(v.to_s) ? v.to_s : nil
    end

    # The look in html options: the class added to what is there, the domain in the tooltip (after a tooltip that is
    # there), and the place when it is not named already
    def mark_opts!(opts, host, place)
      cls = [opts.delete(:class), opts.delete('class')].compact.flat_map { |c| Array(c).flat_map { |x| x.to_s.split } }
      opts[:class] = (cls | [MARK]).join(' ')
      title = [opts.delete(:title), opts.delete('title')].compact.first.to_s.strip
      opts[:title] = look_title(title, host)
      opts[PLACE_ATTR] = place if place
      opts
    end

    # The tooltip of the look, the same words as in formatted text
    def look_title(title, host)
      d = host.to_s.delete_prefix('www.')
      if title.empty?
        ::I18n.t(:text_gk_gui_stuff_external_title, domain: d)
      else
        ::I18n.t(:text_gk_gui_stuff_external_title_with, title: title, domain: d)
      end
    end

    # The place of a formatted custom value: field_link for the format link, url_pattern for another format with an
    # address pattern, else nil
    def place_of_value(object)
      cf = object.respond_to?(:custom_field) ? object.custom_field : nil
      return nil unless cf
      return 'field_link' if cf.respond_to?(:field_format) && cf.field_format.to_s == 'link'

      cf.respond_to?(:url_pattern) && !cf.url_pattern.to_s.strip.empty? ? 'url_pattern' : nil
    rescue StandardError
      nil
    end

    # The look on a link of the pass (formatting_processors' Link); false when it was there already
    def mark_node(a, host, place)
      return false unless ExternalText.add_class(a, MARK)

      a['title'] = look_title(a['title'].to_s.strip, host)
      a[PLACE_ATTR] = place
      true
    end

    # A link of a custom value's formatted value, as GK Core Stuff's pass hands it (the context's origin is
    # :custom_value, its object the custom value): rel on a link to another host, and the look with the place when
    # the place is marked for the reader, and then the new tab when the reader has chosen it. A link to the instance's
    # own host is left. own: the instance's hosts; marked: a lambda saying whether a place gets the look; new_tab: the
    # reader's choice. True when something was written.
    def mark_value(link, place:, own:, marked:, new_tab: false)
      host = ExternalText.external?(link.url, own)
      return false unless host

      changed = ExternalText.add_rel(link)
      if place && marked&.call(place)
        changed = true if mark_node(link, host, place)
        changed = true if new_tab && ExternalText.new_tab(link, link['title'].to_s.strip)
      end
      changed
    end

    # The links of custom values in GK Core Stuff's formatting_processors (ExternalText::Links hands them here): the
    # place from the custom field, the hosts and the places' flags once per view when the view has this plugin's helper
    module Values
      module_function

      def call(link, context)
        view = context.view
        own = if view.respond_to?(:gk_gui_stuff_rel_own_hosts)
                view.gk_gui_stuff_rel_own_hosts
              else
                context.memo(:gk_gui_stuff_own) { ExternalText.own_hosts(context.request) }
              end
        marked = view.respond_to?(:gk_gui_stuff_link_marked) ? view.gk_gui_stuff_link_marked : ->(p) { Places.marked?(p, ::User.current) }
        place = context.memo(:gk_gui_stuff_value_place) { ExternalRel.place_of_value(context.object) }
        new_tab = context.memo(:gk_gui_stuff_value_new_tab) { ExternalRel.new_tab_on?(::User.current, context.request) }
        ExternalRel.mark_value(link, place: place, own: own, marked: marked, new_tab: new_tab)
      end
    end

    # The instance's hosts for a view; a view without a request (mail) has only Setting.host_name
    def own_hosts_of(view) = ExternalText.own_hosts(request_of(view))

    def request_of(view)
      view.respond_to?(:request) ? view.request : nil
    rescue StandardError
      nil
    end

    # Whether a place gets the look for a reader, read from the flags GK Core Stuff declares under the look's row
    # (place_<place>); nothing is added to that row here
    module Places
      module_function

      def value_name(place) = "place_#{place}"

      # The look is on for the person and the administrator has not switched the place off. A GK Core Stuff that does
      # not declare the flag gives nil, and the place is then on, as the flag's default is
      def marked?(place, user)
        r = GkGuiStuff.appearance_settings
        return false unless r && PLACES.include?(place.to_s) && r.on_for?(ExternalText::LOOK, user)

        r.value(ExternalText::LOOK, value_name(place)) != false
      rescue StandardError
        false
      end
    end

    # Prepended on ApplicationHelper, in every view and mail view
    module HelperPatch
      def link_to(*args, &block)
        out = GkGuiStuff::ExternalRel.link_args(args, block, place: -> { gk_gui_stuff_link_place(args, block) },
                                                             marked: gk_gui_stuff_link_marked,
                                                             new_tab: gk_gui_stuff_link_new_tab,
                                                             hidden: ->(name) { gk_gui_stuff_new_tab_text(name) }) { gk_gui_stuff_rel_own_hosts }
        return super(*out, &block) unless block && GkGuiStuff::ExternalRel.new_tab_opened?(out[1])

        super(*out) { |*a| gk_gui_stuff_new_tab_text(capture(*a, &block)) }
      end

      # The text of a link that opens in a new tab: what the screen reader says stands after it, in the same span as in
      # formatted text; the link's text is escaped as link_to escapes it
      def gk_gui_stuff_new_tab_text(name)
        safe_join([name, content_tag(:span, ::I18n.t(:text_gk_gui_stuff_new_tab_hidden), class: 'hidden-for-sighted')])
      end

      # Whether the person has chosen a new tab, asked once per view
      def gk_gui_stuff_link_new_tab
        @gk_gui_stuff_link_new_tab ||= begin
          on = nil
          lambda do
            on = GkGuiStuff::ExternalRel.new_tab_on?(::User.current, GkGuiStuff::ExternalRel.request_of(self)) if on.nil?
            on
          end
        end
      end

      # The instance's hosts, once per view (also for the links of custom values, Values)
      def gk_gui_stuff_rel_own_hosts
        @gk_gui_stuff_rel_own_hosts ||= GkGuiStuff::ExternalRel.own_hosts_of(self)
      end

      # The project's homepage on the project's overview (core's link_to_if with the address as the text)
      def gk_gui_stuff_link_place(args, block)
        url = args[block ? 0 : 1]
        return nil unless url.is_a?(String) && defined?(::ProjectsController) && instance_variable_defined?(:@project)

        project = @project
        ctrl = respond_to?(:controller) ? controller : nil
        return nil unless ctrl.is_a?(::ProjectsController) && ctrl.action_name == 'show'

        project.respond_to?(:homepage) && url == project.homepage.to_s ? 'project_homepage' : nil
      rescue StandardError
        nil
      end

      # Whether a place gets the look for the person, asked once per place and view
      def gk_gui_stuff_link_marked
        @gk_gui_stuff_link_marked ||= begin
          seen = {}
          ->(place) { seen.key?(place) ? seen[place] : (seen[place] = GkGuiStuff::ExternalRel::Places.marked?(place, ::User.current)) }
        end
      end
    end

    # Included in HelpController: every answer of the wiki syntax help carries Referrer-Policy: no-referrer; the page
    # itself is never read or changed
    module HelpPatch
      def self.included(base)
        base.before_action :gk_gui_stuff_referrer_policy
      end

      private

      def gk_gui_stuff_referrer_policy
        response.headers['Referrer-Policy'] = GkGuiStuff::ExternalRel::REFERRER_POLICY
      end
    end
  end
end
