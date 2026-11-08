# frozen_string_literal: true

require 'uri'

module GkGuiStuff
  # The wiki macro {{gk_link_preview(url)}}: a plain link to another website, marked so that the text pass
  # (ExternalText::Links in GK Core Stuff's pass, which runs after the macros) lets the preview be asked for when the external link preview
  # is on and the domain is in its list. Core takes a macro out of the text before formatting and puts its output
  # back after the sanitizer, so the address is checked strictly here and written only through link_to. The macro
  # never asks the server for anything.
  module ExternalMacro
    MAX = 2000
    TEXT_MAX = 80

    module_function

    def register!
      Redmine::WikiFormatting::Macros.register do
        desc "A link to another website with a preview, when the external link preview is on and the domain is in " \
             "its list:\n\n  {{gk_link_preview(https://example.com/page)}}\n  " \
             "A comma in the address needs quotes: {{gk_link_preview(\"https://example.com/?a=1,2\")}}"
        macro :gk_link_preview do |obj, args|
          GkGuiStuff::ExternalMacro.render(self, obj, args)
        end
      end
    end

    def render(view, _obj, args)
      url = address(args)
      view.link_to(text(url), url, class: 'external', rel: 'noopener noreferrer', data: { gk_gui_ext_macro: '1' })
    end

    # The one argument as a checked http or https address; raises the macro's error text otherwise (core shows it)
    def address(args)
      list = Array(args)
      bad! unless list.size == 1

      s = list.first.to_s.strip
      bad! if s.empty? || s.length > MAX || s.match?(/\s/)
      u = URI.parse(s)
      bad! unless %w[http https].include?(u.scheme.to_s.downcase) && !u.host.to_s.empty? && u.userinfo.nil?
      s
    rescue URI::Error
      bad!
    end

    # The address without its scheme and trailing slash, cut to TEXT_MAX characters
    def text(url)
      t = url.sub(%r{\Ahttps?://}i, '').chomp('/')
      t.length > TEXT_MAX ? "#{t[0, TEXT_MAX - 1]}…" : t
    end

    def bad! = raise(::I18n.t(:error_gk_gui_stuff_lpe_macro_url))
  end
end
