# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy.
# See the Securing Rails Applications Guide for more information:
# https://guides.rubyonrails.org/security.html#content-security-policy-header

require 'digest'
require 'base64'

def style_hash(css)
  "'sha256-#{Base64.strict_encode64(Digest::SHA256.digest(css))}'"
end

# Load styles injected directly via document.createElement('style') from their
# source definitions so the CSP whitelists them by hash automatically.

MUI_DISABLE_CSS_TRANSITION = begin
  File
    .read(Rails.root.join('node_modules/@mui/system/cssVars/createCssVarsProvider.mjs'))
    .lines
    .grep(/DISABLE_CSS_TRANSITION/)
    .first
    .match(/'(.*)'/)
    &.captures&.first
rescue Errno::ENOENT
  Rails.logger.warn '[CSP] node_modules/@mui/system/cssVars/createCssVarsProvider.mjs not found — using hardcoded DISABLE_CSS_TRANSITION fallback'
  '*{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'
end

if Rails.env.production?
  Rails.application.configure do
    config.content_security_policy do |policy|
      policy.default_src   :self, :https
      policy.font_src      :self, :https, :data
      policy.img_src       :self, :https, :data
      policy.object_src    :none
      policy.script_src    :self, :https
      # style-src-attr: React/MUI use inline style attributes (e.g. --Paper-shadow).
      # Nonces only apply to <style> elements, not style attributes.
      policy.style_src_attr :unsafe_inline
      # style-src: hashes whitelist known raw <style> injections (bypass Emotion
      # cache so no nonce). Nonces cover Emotion-generated <style> elements.
      policy.style_src     :self, :https, :report_sample, style_hash(MUI_DISABLE_CSS_TRANSITION)
      policy.worker_src    :self, :blob
      policy.connect_src   :self, :https
      policy.report_uri    '/csp-violation-reports'
    end

    config.content_security_policy_nonce_generator = ->(request) { SecureRandom.base64(32) }
    config.content_security_policy_nonce_directives = %w[script-src style-src]
    config.content_security_policy_nonce_auto = true
  end
else
  # Development / non-production: Vite dev server injects nonce-less tags for HMR.
  # unsafe-inline is required because Vite's HMR runtime cannot carry a nonce.
  Rails.application.configure do
    config.content_security_policy do |policy|
      policy.default_src :self, :https
      vite_host = Rails.application.config.x.vite.dev_host
      policy.font_src    :self, :https, :data, "http://#{vite_host}:5173"
      policy.img_src     :self, :https, :data
      policy.object_src  :none
      policy.script_src  :self, :https, :unsafe_inline, "http://#{vite_host}:5173"
      policy.style_src_attr :unsafe_inline
      policy.style_src   :self, :https, :unsafe_inline, "http://#{vite_host}:5173"
      policy.worker_src  :self, :blob
      policy.connect_src :self, :https, "ws://#{vite_host}:5173"
      policy.report_uri '/csp-violation-reports'
    end

    # Nonce omitted in dev — a nonce directive causes browsers to ignore unsafe-inline (per CSP spec)
    config.content_security_policy_nonce_directives = []
    config.content_security_policy_nonce_generator = ->(request) { SecureRandom.base64(32) }
    config.content_security_policy_nonce_auto = true
  end
end
