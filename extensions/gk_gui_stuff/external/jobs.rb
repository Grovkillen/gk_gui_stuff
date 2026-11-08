# frozen_string_literal: true

# The two jobs of the preview of external links in GK Ops: the fetch (every minute, the queue) and the forget
# (every night, the cards nobody has shown and the pictures no card names). Without GK Ops the reader's request
# starts one fetch at a time and the thinning runs at most once a day (Queue.kick_inline!).
module GkGuiStuff
  module External
    module Jobs
      module_function

      def register!
        return unless defined?(::GkOps::Scheduler)

        s = ::GkOps::Scheduler
        unless s.registry.key?(Queue::JOB_KEY)
          s.register(Queue::JOB_KEY, name: :label_gk_gui_stuff_job_link_preview_fetch, plugin: :gk_gui_stuff, every: 1,
                                     **described(s, :text_gk_gui_stuff_job_link_preview_fetch)) { |run| Queue.run_job(run) }
        end
        unless s.registry.key?(Cleanup::FORGET_KEY)
          s.register(Cleanup::FORGET_KEY, name: :label_gk_gui_stuff_job_link_preview_forget, plugin: :gk_gui_stuff, at: '03:40',
                                          **described(s, :text_gk_gui_stuff_job_link_preview_forget)) { |run| Cleanup.forget!(run) }
        end
      rescue StandardError => e
        ::Rails.logger.warn("[gk_gui_stuff] link preview jobs not registered: #{e.class} #{e.message}")
      end

      # The one-line description where ops takes one
      def described(scheduler, key)
        scheduler.method(:register).parameters.any? { |_t, n| n == :description } ? { description: key } : {}
      end
    end
  end
end
