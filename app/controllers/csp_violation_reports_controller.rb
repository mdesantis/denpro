class CSPViolationReportsController < ApplicationController
  skip_before_action :verify_authenticity_token

  def create
    report = JSON.parse(request.body.read)
    csp = report['csp-report']

    if csp
      Rails.logger.warn "[CSP] violated-directive=#{csp['violated-directive']} blocked-uri=#{csp['blocked-uri']} sample=#{csp['sample']&.dump}"
      Rails.logger.warn "[CSP] full-report=#{report.to_json}"
    else
      Rails.logger.warn "[CSP] raw=#{report.to_json}"
    end

    head :ok
  rescue JSON::ParserError
    Rails.logger.warn "[CSP] parse-error body=#{request.body.read.force_encoding('UTF-8')[0..500]}"
    head :ok
  end
end
