module ReactComponentHelper
  class ComponentNotFound < StandardError; end

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
    logger.info "  Starting SSR request for React component #{name.inspect}"
    logger.info "    Props: #{props.inspect}" if props.present?

    starting = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    response = make_ssr_request name, props

    ending = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    elapsed_milliseconds = (ending - starting).in_milliseconds.round(1)

    if response.error
      handle_ssr_response_error(response, name, elapsed_milliseconds)
      return
    end

    logger.info "  Completed SSR request #{response.status} in #{elapsed_milliseconds}ms"

    begin
      JSON.parse(response.body)
    rescue JSON::ParserError => error
      logger.error "  SSR response parse error. Response body: #{response.body}"
      raise error unless Rails.env.production?
    end
  end

  def handle_ssr_response_error(response, name, elapsed_milliseconds)
    if response.respond_to? :status
      if response.status == 404
        parsed_body = {}

        begin
          parsed_body = JSON.parse(response.body, symbolize_names: true)
        rescue JSON::ParserError
        end

        case parsed_body
        in { error: { type: 'component_not_found' } }
          if Rails.env.production?
            logger.error "  Could not perform SSR: Component \"#{name}\" not found"
            return
          end

          logger.error "  Could not perform SSR: Component \"#{name}\" not found"

          raise ComponentNotFound, "Component \"#{name}\" not found"
        end
      end
    else
      if Rails.env.production?
        Rails.logger.error "  Could not perform SSR: #{response.error}"
        return
      end
    end

    raise response.error

    status = response.respond_to?(:status) ? response.status : nil

    logger.info "  Completed SSR request with error#{status ? " #{status}" : ''} in #{elapsed_milliseconds}ms"
  end

  def turbo_drive?
    request.headers.include?('x-turbo-request-id')
  end

  private

  def make_ssr_request(name, props)
    host = ENV.fetch('DENPRO_SSR_HOST', '0.0.0.0')
    port = ENV.fetch('DENPRO_SSR_PORT', '5173')
    timeout = ENV.fetch('DENPRO_SSR_TIMEOUT', '0.25').to_f

    HTTPX.post(
      "http://#{host}:#{port}/ssr",
      headers: { 'Content-Type' => 'application/json', 'X-Request-ID' => request.uuid },
      body: { name: name, props: props }.to_json,
      timeout: {
        connect_timeout: timeout,
        operation_timeout: timeout,
        read_timeout: timeout,
        request_timeout: timeout,
        settings_timeout: timeout,
        write_timeout: timeout
      }
    )
  end
end
