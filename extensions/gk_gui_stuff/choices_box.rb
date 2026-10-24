# frozen_string_literal: true

module GkGuiStuff
  # Val ovanför raderna. One box for choices, additions and mass actions above a list, made like core's Filter and
  # Alternativ: core's fieldset.collapsible, legend with core's arrow and toggleFieldset. Minimized by default, with a
  # title that says what it holds, open when the list is empty, and it remembers the person's own state in the browser.
  # Not a module: it is core's own look, always there. <%= gk_gui_stuff_choices_box('tags.my_marks', l(:label_x), open:
  # @rows.empty?) do %>... <% end %> A plugin without gui_stuff falls back to core's fieldset box
  # (respond_to?(:gk_gui_stuff_choices_box)).
  module ChoicesBoxHelper
    # hint: the legend's tooltip, saying what opens under it; without one the general "show or hide the choices" text
    def gk_gui_stuff_choices_box(key, title, open: false, hint: nil, &block)
      inner = capture(&block)
      legend = content_tag(:legend, safe_join([sprite_icon(open ? 'angle-down' : 'angle-right', rtl: !open), ' ', title]),
                           onclick: 'toggleFieldset(this);', class: "icon icon-#{open ? 'expanded' : 'collapsed'}",
                           title: hint.presence || ::I18n.t(:text_gk_gui_stuff_box_toggle))
      box = content_tag(:fieldset, legend + content_tag(:div, inner, style: open ? nil : 'display: none;'),
                        class: "collapsible gk-gui-stuff-box#{' collapsed' unless open}", data: { gk_gui_stuff_box: key, gk_gui_stuff_box_forced: (open ? '1' : nil) })
      box + gk_gui_stuff_choices_box_script
    end

    # once per page: the person's own state per box, kept in the browser; a box forced open (an empty list) is left open
    def gk_gui_stuff_choices_box_script
      return ''.html_safe if @gk_gui_stuff_box_script

      @gk_gui_stuff_box_script = true
      javascript_tag(<<~JS)
        (function () {
          function key(f) { return 'gkguistuff.box.' + f.getAttribute('data-gk-gui-stuff-box'); }
          function open(f) { return !f.classList.contains('collapsed'); }
          function read(f) { try { return window.localStorage.getItem(key(f)); } catch (e) { return null; } }
          function save(f) { try { window.localStorage.setItem(key(f), open(f) ? '1' : '0'); } catch (e) { /* no memory */ } }
          function start() {
            document.querySelectorAll('fieldset[data-gk-gui-stuff-box]').forEach(function (f) {
              var lg = f.querySelector(':scope > legend');
              if (!lg || f.dataset.gkGuiStuffBoxReady) return;
              f.dataset.gkGuiStuffBoxReady = '1';
              var want = read(f);
              if (!f.dataset.gkGuiStuffBoxForced && want !== null && (want === '1') !== open(f) && window.toggleFieldset) window.toggleFieldset(lg);
              lg.addEventListener('click', function () { setTimeout(function () { save(f); }, 0); });
            });
          }
          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
        })();
      JS
    end
  end
end
