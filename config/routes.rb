# frozen_string_literal: true

get 'gk_gui_stuff/preview/:type/:id', to: 'gk_gui_stuff_preview#show', as: 'gk_gui_stuff_preview', constraints: { id: /\d+/ }
get 'gk_gui_stuff/my', to: 'gk_gui_stuff_my#show', as: 'gk_gui_stuff_my'
post 'gk_gui_stuff/my', to: 'gk_gui_stuff_my#update'
post 'gk_gui_stuff/view_state', to: 'gk_gui_stuff_api#view_state', as: 'gk_gui_stuff_view_state'
get 'gk_gui_stuff/beat', to: 'gk_gui_stuff_api#beat', as: 'gk_gui_stuff_beat'
post 'gk_gui_stuff/pulse', to: 'gk_gui_stuff_api#pulse', as: 'gk_gui_stuff_pulse'   # The shared pulse, with the session
get 'gk_gui_stuff/branch/:id', to: 'gk_gui_stuff_api#branch', as: 'gk_gui_stuff_branch'
# Administration > Funktioner
get 'admin/gk_gui_stuff/features', to: 'gk_gui_stuff_features#index', as: 'gk_gui_stuff_features'
patch 'admin/gk_gui_stuff/features/:key', to: 'gk_gui_stuff_features#update', as: 'gk_gui_stuff_feature', constraints: { key: /[a-z0-9_.]+/ }, format: false
