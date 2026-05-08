module ReactComponentHelper
  class ComponentNotFound < StandardError; end

  def react_component(name, props: {}, ssr: false)
    ssr = false if turbo_drive?
    content = nil

    if ssr
      result = perform_ssr(name, props)

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

  def perform_ssr(name, props)
    logger.info "  Starting SSR request for React component #{name.inspect}"
    logger.info "    Props: #{props.inspect}" if props.present?

    starting = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    bundle = find_bundle(:application)

    unless bundle.is_a?(SSR::Deno::Bundle)
      logger.error '  SSR bundle not registered'
      return
    end

    body = { name: name, props: props }
    nonce = content_security_policy_nonce
    body[:nonce] = nonce if nonce.present?

    result = bundle.render(body)

    ending = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    elapsed_milliseconds = (ending - starting).in_milliseconds.round(1)

    logger.info "  Completed SSR request in #{elapsed_milliseconds}ms"

    if result['error']
      handle_ssr_error(result['error'], name)
      return
    end

    {
      content: result['content'],
      emotion_styles: result['emotionStyles']
    }
  rescue SSR::Deno::RenderError, SSR::Deno::JsRuntimeWorkerError,
         SSR::Deno::JsRuntimeOutOfMemoryError => error
    handle_ssr_runtime_error(error, name)
    nil
  rescue JSON::ParserError => error
    logger.error "  SSR response parse error: #{error.message}"
    raise error unless Rails.env.production?
    nil
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
      logger.error "  SSR render error: #{error_message}"
    end
  end

  def handle_ssr_runtime_error(error, name)
    if Rails.env.production?
      logger.error "  Could not perform SSR: #{error.message}"
      return
    end
    raise error
  end

  def turbo_drive?
    request.headers.include?('x-turbo-request-id')
  end

  def find_bundle(name)
    bundle = SSR::Deno::Bundle.registry[name]
    return bundle if bundle.is_a?(SSR::Deno::Bundle)

    if bundle.is_a?(Hash)
      SSR::Deno::Bundle.create_bundles!
      return SSR::Deno::Bundle.registry[name]
    end

    bundle_path = bundle_path_for(name)
    if bundle_path && File.exist?(bundle_path)
      logger.warn "  SSR bundle #{name.inspect} not registered at boot. Registering late."
      bundle = SSR::Deno::Bundle.new(bundle_path.to_s)
      SSR::Deno::Bundle.registry[name] = bundle
      return bundle
    end

    logger.error "  SSR bundle #{name.inspect} file not found at #{bundle_path}"
    nil
  end

  def bundle_path_for(name)
    config = Rails.application.config.ssr_deno.bundles[name] if Rails.application.config.try(:ssr_deno)&.bundles
    config || Rails.root.join('dist/server/ssr.js')
  end
end
