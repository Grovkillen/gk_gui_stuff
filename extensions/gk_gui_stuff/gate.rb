# frozen_string_literal: true

module GkGuiStuff
  # The gate to GK Compat, which gui_stuff requires. The plugin has two layers, and the gate closes one of them.
  #
  # Always, whatever the gate says (the protection; Patches.protect!):
  # * rel="noopener noreferrer" on links to another host: on link_to with a written address
  #   (ExternalRel::HelperPatch) and, where GK Core Stuff's pass over formatted text is there, in formatted text and
  #   in a custom value's formatted value (ExternalText::Links as this plugin's link processor);
  # * the header Referrer-Policy: no-referrer on the wiki syntax help (ExternalRel::HelpPatch).
  # None of it asks GK Compat itself or reads an appearance setting (only the instance's host name). With a closed
  # gate the two that write on a link write rel and nothing else: they ask the gate themselves before the look, the
  # new tab and the hidden text.
  #
  # Also whatever the gate says: the job that thins out the fetched previews of external links (External::Cleanup
  # .forget!, registered in GK Ops by External::Jobs.register_forget!), so that what was fetched is never kept past
  # its limits because the interface is closed. Closed, it cannot read its setting: it empties nothing as switched
  # off, drops no card for its domain, and holds the limits at their standard values. The fetch job is interface.
  #
  # Only with the gate open (the interface): the hooks, every other core patch (Patches.apply!), the menus, the
  # pages and the REST API, the stylesheets and scripts in the page's head, the modules, the wiki macro, the scenario
  # steps, everything registered in other plugins' registers, and on a link to another host the look, the place, the
  # new tab with its hidden text and the preview mark. gui_stuff registers no permission and no project module.
  #
  # An older GK Compat than the lowest base version does not open the gate. A
  # base version is a version without a candidate's suffix, so the candidates of one version are not told apart. The
  # settings page says the first thing that is not met in one line of core's own form (<p class="warning">) beside the
  # About box: GK Compat is missing, or it is too old, with the version that is required; the migrations run all the
  # same, so nothing is lost when GK Compat comes in. The extension files are still loaded, so another plugin that
  # asks defined?(::GkGuiStuff::X) finds the name; the primitives' helpers are in no view then (only the patches of
  # protect! are applied). The patch on link_to carries its own gk_gui_stuff_ methods into every view; with a closed
  # gate only the two that rel needs are used (gk_gui_stuff_rel_only? and gk_gui_stuff_rel_own_hosts), and the others
  # are not for anyone else to call. Another plugin asks GkGuiStuff.open? and GkGuiStuff.version_at_least?, never
  # whether a name is defined.

  # The lowest base version the gate opens for; IDENTITY.yml requires the same base and a test holds the two together
  COMPAT_MIN = '1.02.000'

  #   GkGuiStuff.base(version) -> the base version (Z.YY.XXX without a candidate's suffix) as a Gem::Version; nil when
  #   the string is not a version
  def self.base(version)
    b = version.to_s[/\A(\d+\.\d+\.\d+)(?:-.*)?\z/, 1]
    b && ::Gem::Version.new(b)
  end

  #   GkGuiStuff.compat_closed -> nil when GK Compat is there and its base version is COMPAT_MIN or later; otherwise
  #   the first thing that is not met: :missing or :old
  def self.compat_closed
    return :missing unless ::Redmine::Plugin.installed?(:gk_compat) && defined?(::GkCompat)

    have = base(::Redmine::Plugin.find(:gk_compat).version)
    have && have >= base(COMPAT_MIN) ? nil : :old
  rescue StandardError
    :missing
  end

  #   GkGuiStuff.compat? -> true when compat_closed has nothing to say
  #   GkGuiStuff.open?   -> the gate everything of gui_stuff asks, and the one question other plugins ask
  def self.compat? = compat_closed.nil?

  def self.open? = compat?

  #   GkGuiStuff.version_at_least?(minimum) -> true when this plugin's base version is the base of minimum or later;
  #   candidates of one base version are not told apart, and an empty minimum is true
  def self.version_at_least?(minimum)
    return true if minimum.to_s.strip.empty?

    need = base(minimum)
    have = base(::Redmine::Plugin.find(:gk_gui_stuff).version)
    need && have && have >= need ? true : false
  rescue StandardError
    false
  end

  module Gate
    # The hook methods a view or controller listener answers (view_*, controller_*, model_*). Redmine asks a listener
    # respond_to?(hook) once and keeps the answer (Redmine::Hook.hook_listeners), so a closed gate keeps every hook of
    # gui_stuff's listeners silent. A listener is registered as soon as its class is defined (Listener.inherited), so
    # the gate is in the listener and not only in init.rb.
    HOOK = /\A(view|controller|model)_/

    module Listener
      def respond_to?(name, include_all = false)
        return false if HOOK.match?(name.to_s) && !GkGuiStuff.open?

        super
      end
    end

    # Every gui_stuff controller (the pages and the REST API) is closed with a closed gate: core's 404. A plain
    # before_action, after the ones ApplicationController has (the session, the user, the language), so that the 404 is
    # drawn for the person and in the language of the request; before the controller's own (require_login and the like)
    module Controller
      def self.included(base)
        base.before_action :gk_gui_stuff_gate
      end

      private

      def gk_gui_stuff_gate
        render_404 unless GkGuiStuff.open?
      end
    end
  end
end
