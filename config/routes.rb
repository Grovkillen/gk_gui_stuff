# frozen_string_literal: true

get 'gk_gui_stuff/preview/:type/:id', to: 'gk_gui_stuff_preview#show', as: 'gk_gui_stuff_preview', constraints: { id: /\d+/ }
# The preview of external links: the card of one address as JSON (never fetched in the request), the card's picture
# from the instance, and the administrator's emptying of every kept card (with the reason of Appearance)
get 'gk_gui_stuff/external_preview', to: 'gk_gui_stuff_external_preview#show', as: 'gk_gui_stuff_external_preview'
get 'gk_gui_stuff/external_preview/:id/image', to: 'gk_gui_stuff_external_preview#image', as: 'gk_gui_stuff_external_preview_image', constraints: { id: /\d+/ }
post 'gk_gui_stuff/external_preview/clear', to: 'gk_gui_stuff_external_preview#clear', as: 'gk_gui_stuff_external_preview_clear'
# My account > Appearance: the person's own choices about the optional appearance settings, each saved at once by its
# rail, and Like Redmine for me
get 'gk_gui_stuff/my', to: 'gk_gui_stuff_my#show', as: 'gk_gui_stuff_my'
post 'gk_gui_stuff/my/redmine', to: 'gk_gui_stuff_my#redmine', as: 'gk_gui_stuff_my_redmine'
post 'gk_gui_stuff/my/appearance/:key', to: 'gk_gui_stuff_my#choose', as: 'gk_gui_stuff_my_appearance', constraints: { key: /[a-z0-9_.]+/ }, format: false
post 'gk_gui_stuff/view_state', to: 'gk_gui_stuff_api#view_state', as: 'gk_gui_stuff_view_state'
# The flags the person has seen (a new flag's key), kept per person
post 'gk_gui_stuff/flags/seen', to: 'gk_gui_stuff_api#flag_seen', as: 'gk_gui_stuff_flag_seen'
get 'gk_gui_stuff/beat', to: 'gk_gui_stuff_api#beat', as: 'gk_gui_stuff_beat'
post 'gk_gui_stuff/pulse', to: 'gk_gui_stuff_api#pulse', as: 'gk_gui_stuff_pulse'   # The shared pulse, with the session
get 'gk_gui_stuff/branch/:id', to: 'gk_gui_stuff_api#branch', as: 'gk_gui_stuff_branch'
# Administration > Funktioner, one form for every function, and Administration > Utseende, one form for every
# appearance setting; both also as JSON through the API
get 'admin/gk_gui_stuff/features', to: 'gk_gui_stuff_features#index', as: 'gk_gui_stuff_features'
patch 'admin/gk_gui_stuff/features', to: 'gk_gui_stuff_features#update'
get 'admin/gk_gui_stuff/appearance', to: 'gk_gui_stuff_appearance#index', as: 'gk_gui_stuff_appearance'
patch 'admin/gk_gui_stuff/appearance', to: 'gk_gui_stuff_appearance#update'
# The style guide: every primitive in all its states; its save address stores nothing
get 'gk_gui_stuff/styleguide', to: 'gk_gui_stuff_styleguide#show', as: 'gk_gui_stuff_styleguide'
# one element's tiles alone, for the guide's frame in a phone's width
get 'gk_gui_stuff/styleguide/frame/:key', to: 'gk_gui_stuff_styleguide#frame', as: 'gk_gui_stuff_styleguide_frame', constraints: { key: /[a-z0-9_]+/ }
match 'gk_gui_stuff/styleguide/save', to: 'gk_gui_stuff_styleguide#save', via: %i[post patch delete], as: 'gk_gui_stuff_styleguide_save'
# core's context menu for the guide's issues in memory (Prova)
match 'gk_gui_stuff/styleguide/context_menu', to: 'gk_gui_stuff_styleguide#context_menu', via: %i[get post], as: 'gk_gui_stuff_styleguide_context_menu'
# Meningsvy och Klassisk vy: the person's choice on a page and the reset on My account; the administrator's page
post 'gk_gui_stuff/meaning_reset', to: 'gk_gui_stuff_meaning#reset', as: 'gk_gui_stuff_meaning_reset'
post 'gk_gui_stuff/meaning/:key', to: 'gk_gui_stuff_meaning#choose', as: 'gk_gui_stuff_meaning_choose', constraints: { key: /[a-z0-9_.]+/ }, format: false
get 'admin/gk_gui_stuff/meaning', to: 'gk_gui_stuff_meaning_admin#index', as: 'gk_gui_stuff_meaning_admin'
patch 'admin/gk_gui_stuff/meaning/:key', to: 'gk_gui_stuff_meaning_admin#update', as: 'gk_gui_stuff_meaning_admin_type', constraints: { key: /[a-z0-9_.*]+/ }, format: false
