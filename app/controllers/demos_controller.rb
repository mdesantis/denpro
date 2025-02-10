class DemosController < ApplicationController
  def index
  end

  def sendfile_demo
    send_file Rails.root.join('vendor', '.keep')
  end
end
