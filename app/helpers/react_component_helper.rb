module ReactComponentHelper
  def react_component(name, props: {}, ssr: false)
    ssr = false if turbo_drive?
    content = nil

    if ssr
      response = perform_ssr(name, props)

      if response
        content = response.delete('content')&.html_safe
        response.each do |key, value|
          # This is the only reason we have to have an helper rather than a concern or whatever else: if `content_for` is not called but an `Helper`, it raises `undefined method append`.
          content_for(:"ssr_#{key.underscore}", value&.html_safe)
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
