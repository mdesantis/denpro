# Be sure to restart your server when you modify this file.

# Define an application-wide content security policy.
# See the Securing Rails Applications Guide for more information:
# https://guides.rubyonrails.org/security.html#content-security-policy-header

if Rails.env.production?
  Rails.application.configure do
    config.content_security_policy do |policy|
      policy.default_src :self, :https
      policy.font_src    :self, :https, :data
      policy.img_src     :self, :https, :data
      policy.object_src  :none
      policy.script_src  :self, :https
      policy.style_src   :self, :https
      policy.worker_src  :self, :blob
      policy.connect_src :self, :https
      policy.report_uri '/csp-violation-report-endpoint'
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
      policy.font_src    :self, :https, :data, 'http://127.0.0.1:5173'
      policy.img_src     :self, :https, :data
      policy.object_src  :none
      policy.script_src  :self, :https, :unsafe_inline, 'http://127.0.0.1:5173'
      policy.style_src   :self, :https, :unsafe_inline, 'http://127.0.0.1:5173'
      policy.worker_src  :self, :blob
      policy.connect_src :self, :https, 'ws://127.0.0.1:5173'
      policy.report_uri '/csp-violation-report-endpoint'
    end

    # Nonce omitted in dev — a nonce directive causes browsers to ignore unsafe-inline (per CSP spec)
    config.content_security_policy_nonce_directives = []
    config.content_security_policy_nonce_generator = ->(request) { SecureRandom.base64(32) }
    config.content_security_policy_nonce_auto = true
  end
end
