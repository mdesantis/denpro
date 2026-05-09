Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get 'up' => 'rails/health#show', as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root "posts#index"

  # Vite's React plugin injects installHook.js — the browser then requests installHook.js.map which reaches Rails
  # instead of the Vite dev server. Making this unconditional avoids 404 source-map errors.
  empty_source_map = proc do
    [ 200, { 'Content-Type' => 'application/json' },
     [ '{"version":3,"sources":["installHook.js"],"mappings":""}' ] ]
  end

  get 'installHook.js.map', to: empty_source_map
  get '*path/installHook.js.map', to: empty_source_map

  constraints subdomain: 'demos' do
    get '/', to: 'demos#index'
    get '/page1', to: 'demos#page1'
    get '/page2', to: 'demos#page2'
    get '/mui_hello_world', to: 'demos#mui_hello_world'
    get '/mui_dashboard', to: 'demos#mui_dashboard'
  end

  constraints subdomain: 'app' do
    get '/', to: 'app/dashboards#show'
  end
end
