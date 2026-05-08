Rails.application.configure do
  vite_dev = Rails.env.development?

  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data, *([ 'http://127.0.0.1:5173' ] if vite_dev)
    policy.img_src     :self, :https, :data
    policy.object_src  :none
    policy.script_src  :self, :https, *([ :unsafe_inline ] if vite_dev)
    policy.style_src   :self, :https, *([ :unsafe_inline ] if vite_dev)
    policy.connect_src :self, :https, *([ 'ws://127.0.0.1:5173' ] if vite_dev)
  end

  config.content_security_policy_nonce_generator = ->(request) { SecureRandom.base64(32) }
  config.content_security_policy_nonce_directives = vite_dev ? [] : [ 'script-src', 'style-src' ]

  config.content_security_policy_nonce_auto = true
end
