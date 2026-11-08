# frozen_string_literal: true

require_relative 'domains'
require_relative 'address_guard'
require_relative 'limits'
require_relative 'policy'
require_relative 'page_meta'
require_relative 'fetcher'
require_relative 'thumbnail'
require_relative 'storage'
require_relative 'asks'
require_relative 'queue'
require_relative 'cleanup'
require_relative 'jobs'

module GkGuiStuff
  # The preview of external links: a card for a link to another website, fetched by the server in the background,
  # only from the domains in the list, with the protections of AddressGuard and Fetcher. Its appearance setting
  # (gui_stuff.link_preview_external) holds the list, the limits, the picture folder and its cap, and the emptying; the shared
  # value gui_stuff.network says whether the instance is in a closed network (then "*" counts for nothing).
  module External
    ROW = 'link_preview_external'
    USER_AGENT = 'GK GUI Stuff link preview'
    EVENT = 'link_previews_cleared'
    VALUES = {
      'domains' => { kind: :list, default: [], max: 200 },
      'bare_links' => { kind: :flag, default: false },
      'max_parallel' => { kind: :number, default: 2, min: 1, max: 4, step: 1 },
      'domain_interval_seconds' => { kind: :number, default: 10, min: 1, max: 3600, step: 1 },
      'page_max_kb' => { kind: :number, default: 1024, min: 64, max: 4096, step: 64 },
      'image_max_kb' => { kind: :number, default: 2048, min: 64, max: 8192, step: 64 },
      'timeout_seconds' => { kind: :number, default: 5, min: 1, max: 30, step: 1 },
      'queue_max' => { kind: :number, default: 100, min: 10, max: 1000, step: 10 },
      'refresh_days' => { kind: :number, default: 7, min: 1, max: 365, step: 1 },
      'forget_days' => { kind: :number, default: 90, min: 7, max: 3650, step: 1 },
      'link_previews_dir' => { kind: :text, default: '', max: 500 },
      'image_folder_max_mb' => { kind: :number, default: 200, min: 10, max: 100_000, step: 10 }
    }.freeze

    module_function

    def mod = Registry.find(ROW)

    # The instance's level is not off
    def on? = Appearance.on?(ROW)

    # The module is on for the person
    def on_for?(user = ::User.current) = (m = mod) ? Switches.on_for?(m, user) : false

    # The administrator's value, the default without records
    def setting(name) = Switches.value(ROW, name.to_s, VALUES.dig(name.to_s, :default))

    def closed_network? = Switches.value('network', 'closed_network', false) ? true : false

    # The allow list, normalized; "*" never while the instance is in a closed network
    def domains
      list = Domains.parse(setting('domains'))
      closed_network? ? list - ['*'] : list
    end

    def allowed_host?(host) = Domains.allowed?(host, domains)

    def bare_links? = setting('bare_links') ? true : false

    # The mark the text pass writes on a link that may have a card: a signature of the address as the queue keeps it,
    # so that a bare address typed into the card endpoint is not taken. It is no authorization: anyone who may render
    # text can get a mark for any allowed address, so the queue's hard caps bound what new addresses cost.
    # nil for an address the queue would not take.
    def sign(url)
      norm = Fetcher.normalize(url)&.to_s
      return nil if norm.nil? || norm.length > Fetcher::MAX_URL

      OpenSSL::HMAC.hexdigest('SHA256', signing_key, "link_preview:#{norm}")[0, 32]
    end

    def signed?(url, sig)
      want = sign(url)
      given = sig.to_s
      want && given.length == want.length ? ActiveSupport::SecurityUtils.secure_compare(given, want) : false
    end

    def signing_key = ::Rails.application.secret_key_base.to_s

    # The key a picture's address carries: keyed by the instance's secret, so that nobody can work it out from an
    # address and count through the pictures to learn which addresses have a card
    def image_key(digest) = OpenSSL::HMAC.hexdigest('SHA256', signing_key, "link_preview_image:#{digest}")[0, 16]

    # The event of an emptying, on the setting's own row in GK Records
    def register_records!
      return unless defined?(::GkRecords::Kinds) && defined?(::GkRecords::Targets)
      return unless ::GkRecords::Targets.find('appearance_setting')

      ::GkRecords::Kinds.register_event(EVENT, plugin: :gk_gui_stuff, label_key: 'label_gk_gui_stuff_event_link_previews_cleared',
                                               target: 'appearance_setting')
    rescue StandardError => e
      ::Rails.logger.warn("[gk_gui_stuff] link preview event not registered: #{e.class} #{e.message}")
    end

    # After a save under Appearance (the page calls it once the save went through)
    def settings_saved!(before_mode:, before_domains:, reason:, user:)
      Cleanup.settings_saved!(before_mode: before_mode, before_domains: before_domains, reason: reason, user: user)
    end
  end
end
