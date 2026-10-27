# frozen_string_literal: true

module GkGuiStuff
  # overdue_mark (redmine.org #20812): core already gives an open issue past its due date the class overdue (on the
  # row and on the issue page) but draws nothing for it; the module's stylesheet draws it. The optional limit
  # "due within N days" (due_soon_days, 3 by default, 0 is off) adds gk-gui-stuff-due-soon to open issues due today or
  # within N days, for those who have the module on. Closed issues are never marked (core's overdue? already says so).
  # GK Theme Engine's palette reads the same days for its colour (one setting; the mark and the colour are switched
  # on apart).
  module Overdue
    module_function

    def soon_days = Switches.int('due_soon_days', 3, 0)

    def on_for?(user)
      m = Registry.find('overdue_mark')
      return false unless m

      memo = user.instance_variable_get(:@gk_gui_stuff_overdue_on)
      return memo unless memo.nil?

      user.instance_variable_set(:@gk_gui_stuff_overdue_on, Switches.on_for?(m, user))
    end

    def due_soon?(issue, user, days = soon_days)
      return false unless days.positive? && issue.due_date && !issue.closed?

      today = user.today
      issue.due_date >= today && issue.due_date <= today + days
    end

    # Issue#css_classes has one owner among the GK plugins, this patch: another plugin adds its classes to an issue
    # here, by a key of its own, instead of patching the method too (GK Theme Engine's palette). The block gets the
    # issue and the user and returns a list of classes; they come after core's classes and the mark above, in the
    # order the keys were first registered. A key registered again (a reload) keeps its place.
    def register_classes(key, &block)
      (@classes ||= {})[key.to_s] = block
    end

    def classes_for(issue, user) = (@classes || {}).values.flat_map { |b| Array(b.call(issue, user)) }

    # Core patch (Patches.apply!): core's css_classes(user = User.current) returns a string of classes, the same in
    # every supported series
    module IssuePatch
      def css_classes(user = User.current)
        s = super
        s = "#{s} gk-gui-stuff-due-soon" if Overdue.soon_days.positive? && Overdue.due_soon?(self, user) && Overdue.on_for?(user)
        extra = Overdue.classes_for(self, user)
        extra.empty? ? s : "#{s} #{extra.join(' ')}"
      end
    end
  end
end
