# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy.
# See the Securing Rails Applications Guide for more information:
# https://guides.rubyonrails.org/security.html#content-security-policy-header

Rails.application.configure do
  # In development, Vite serves assets over HTTP and injects CSS as nonce-less <style> tags.
  # The extra sources and unsafe-inline are scoped here to avoid loosening production policy.
  vite_dev = Rails.env.development?

  vite_srcs = vite_dev ? %w[http://127.0.0.1:5173].freeze : [].freeze
  vite_ws_srcs = vite_dev ? %w[ws://127.0.0.1:5173].freeze : [].freeze

  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data, *vite_srcs
    policy.img_src     :self, :https, :data
    policy.object_src  :none
    # In development, Vite injects inline scripts for HMR (e.g., React Refresh runtime).
    # These scripts cannot carry a nonce, so unsafe-inline is required.
    policy.script_src  :self, :https, *([ :unsafe_inline ] if vite_dev), *vite_srcs
    policy.style_src   :self, :https, *([ :unsafe_inline ] if vite_dev), *vite_srcs
    policy.worker_src  :self, :blob
    policy.connect_src :self, :https, *vite_ws_srcs
    policy.report_uri '/csp-violation-report-endpoint'
  end

  # Use SecureRandom to generate nonces: session.id may be nil on the first request before a session cookie is
  # established, which would produce an invalid 'nonce-' entry in the CSP header.
  config.content_security_policy_nonce_generator = ->(request) { SecureRandom.base64(32) }
  # Omit script-src and style-src from nonce directives in development: a nonce presence causes browsers to ignore
  # unsafe-inline (per CSP spec), which would break Vite's dynamic script and style injection.
  config.content_security_policy_nonce_directives = vite_dev ? [] : [ 'script-src', 'style-src' ]

  # Automatically add `nonce` to `javascript_tag`, `javascript_include_tag`, and `stylesheet_link_tag`
  # if the corresponding directives are specified in `content_security_policy_nonce_directives`.
  config.content_security_policy_nonce_auto = true

  # Report violations without enforcing the policy.
  # config.content_security_policy_report_only = true
end
