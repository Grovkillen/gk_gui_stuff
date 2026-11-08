# frozen_string_literal: true

# The limits of one fetch: the bytes read, one deadline for the whole fetch (page and picture together) and the
# number of redirects. Plain Ruby, no Rails, so that the unit tests can load it alone.
module GkGuiStuff
  module External
    module Limits
      class TooLarge < StandardError; end
      class TimedOut < StandardError; end
      class TooManyRedirects < StandardError; end

      # Counts bytes as they are read; raises TooLarge past max_bytes (exactly max_bytes passes)
      class Budget
        attr_reader :bytes

        def initialize(max_bytes)
          @max = max_bytes.to_i
          @bytes = 0
        end

        def add(chunk)
          s = chunk.to_s
          @bytes += s.bytesize
          raise TooLarge, "more than #{@max} bytes" if @bytes > @max

          s
        end
      end

      # A wall clock deadline for the whole fetch; remaining is what is left for the next timeout
      class Deadline
        def initialize(seconds, clock: -> { Process.clock_gettime(Process::CLOCK_MONOTONIC) })
          @clock = clock
          @until = clock.call + seconds.to_f
        end

        def remaining = [@until - @clock.call, 0.0].max

        def check!
          raise TimedOut, 'deadline passed' if remaining <= 0

          true
        end
      end

      # At most max redirects; raises TooManyRedirects on the next
      class Redirects
        attr_reader :count

        def initialize(max = 3)
          @max = max.to_i
          @count = 0
        end

        def follow!
          raise TooManyRedirects, "more than #{@max} redirects" if @count >= @max

          @count += 1
        end
      end
    end
  end
end
