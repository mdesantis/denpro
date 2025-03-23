class DemosController < ApplicationController
  def index
  end

  def sendfile_demo
    storage_file_path = Rails.root.join('storage').find do
      break it if FileTest.file?(it) && it.basename.to_s != '.keep'
    end

    send_file storage_file_path
  end
end
