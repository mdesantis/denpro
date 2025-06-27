module ReactComponentConcern
  extend ActiveSupport::Concern
  include ActionView::Helpers::TagHelper

  class ComponentNotFound < StandardError; end

  included do
    helper_method :react_component
  end

  private

  def react_component(name, props: {}, ssr: false)
    ssr = false if turbo_drive?
    content = nil

    if ssr
      response = perform_ssr(name, props)

      if response
        content = response.delete('content')&.html_safe
        content_for :ssr_emotion_styles, ''
        response.each do |key, value|
          pp [key.underscore, value]
          # content_for :"ssr_emotion_styles", ''
          # content_for(:"ssr_#{key.underscore}", value.to_s.html_safe)
        end
      end
    end

    data = { react_component_name: name, react_component_props: props }
    data[:react_component_ssr] = true if ssr

    content_tag :div, content, class: 'react-component-root', data: data
  end

  def perform_ssr(name, props)
    host = ENV.fetch('VITE_SSR_SERVER_HOST', '0.0.0.0')
    port = ENV.fetch('VITE_SSR_SERVER_PORT', '5173')
    response = HTTPX.post(
      "http://#{host}:#{port}/ssr",
      headers: { 'Content-Type' => 'application/json' },
      body: { name: name, props: props }.to_json
    )

    if response.error
      if Rails.env.production?
        Rails.logger.error "Cannot perform SSR: #{response.error}"
        return
      end

      parsed_body = nil

      if response.status == 404
          begin
            parsed_body = JSON.parse(response.body)
          rescue JSON::ParserError
          end

        raise ComponentNotFound, "Component \"#{name}\" not found" if parsed_body['message'] == 'Component not found'
      end

      raise response.error
    end

    begin
      JSON.parse(response.body)
    rescue JSON::ParserError => error
      raise error unless Rails.env.production?
    end
  end

  def turbo_drive?
    request.headers.include?('x-turbo-request-id')
  end
end
