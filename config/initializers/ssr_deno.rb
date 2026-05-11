# frozen_string_literal: true

Rails.application.config.ssr_deno.bundles = {
  app: Rails.root.join('dist/server/ssr-app.js'),
  demos: Rails.root.join('dist/server/ssr-demos.js')
}

Rails.application.config.ssr_deno.node_builtins_enabled = true

ActiveSupport::Notifications.subscribe('ssr_render.ssr_deno') do |_name, started, finished, _id, payload|
  duration = ((finished - started) * 1000).round(1)
  Rails.logger.info "  Completed SSR request (Duration: #{duration}ms | Bundle: #{payload[:bundle_name].inspect})"
end
