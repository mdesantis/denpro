module ReactComponentHelper
  class ComponentNotFound < StandardError; end

  def react_component(name, props: {}, ssr: false, bundle: nil)
    ssr = false if turbo_drive?
    content = nil

    if ssr
      result = perform_ssr(name, props, bundle:)

      if result
        content = result[:content]&.html_safe
        if result[:emotion_styles]
          content_for(:ssr_emotion_styles, result[:emotion_styles].html_safe)
        end
      end
    end

    data = { react_component_name: name, react_component_props: props }
    data[:react_component_ssr] = true if ssr

    content_tag :div, content, class: 'react-component-root', data: data
  end

  private

  def perform_ssr(name, props, bundle: nil)
    logger.info "  Starting SSR request for React component #{name.inspect}"
    logger.info "    Props: #{props.inspect}" if props.present?

    body = { name: name, props: props }
    nonce = content_security_policy_nonce
    body[:nonce] = nonce if nonce.present?

    result = ssr_render(body, bundle: bundle.presence || :application)

    return unless result.is_a?(Hash)

    if result['error']
      handle_ssr_error(result['error'], name)
      return
    end

    {
      content: result['content'],
      emotion_styles: result['emotionStyles']
    }
  rescue JSON::ParserError => error
    if Rails.env.production?
      logger.error "  SSR response parse error: #{error.message}"
      return
    end
    raise error
  end

  def handle_ssr_error(error_message, name)
    case error_message
    when /component.*not found/i
      if Rails.env.production?
        logger.error "  Could not perform SSR: Component \"#{name}\" not found"
        return
      end
      raise ComponentNotFound, "Component \"#{name}\" not found"
    else
      if Rails.env.production?
        logger.error "  SSR render error: #{error_message}"
        return
      end
      raise StandardError, "SSR render error: #{error_message}"
    end
  end

  def turbo_drive?
    request.headers.include?('x-turbo-request-id')
  end
end
