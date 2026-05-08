# frozen_string_literal: true

Rails.application.config.ssr_deno.bundles = {
  application: Rails.root.join('dist/server/ssr.js')
}

Rails.application.config.ssr_deno.node_builtins_enabled = true

Rails.application.config.ssr_deno.auto_reload = Rails.env.development?
