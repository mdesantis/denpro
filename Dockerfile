# syntax=docker/dockerfile:1
# check=error=true
# hadolint global ignore=DL3008

# This Dockerfile is designed for production, not development. Use with Kamal or build'n'run by hand:
# docker build -t denpro .
# docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name denpro denpro

# For a containerized dev environment, see Dev Containers: https://guides.rubyonrails.org/getting_started_with_devcontainer.html

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=4.0.1
ARG NVM_VERSION=0.40.3
ARG NODE_VERSION=24.11.0

FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base

# Rails app lives here
WORKDIR /workdir

# Install base packages
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl libjemalloc2 libvips postgresql-client && \
    ln -s /usr/lib/"$(uname -m)"-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Set production environment
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development" \
    LD_PRELOAD="/usr/local/lib/libjemalloc.so" \
    NVM_DIR="/usr/local/nvm" \
    VITE_RUBY_SSR_BUILD_ENABLED="true"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build gems
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev pkg-config libyaml-dev && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Create a script file sourced by both interactive and non-interactive bash shells
ENV BASH_ENV=/root/.bash_env
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
# hadolint ignore=SC2016
RUN touch "${BASH_ENV}" && \
    echo '. "${BASH_ENV}"' >> ~/.bashrc

# Download and install nvm
ARG NVM_VERSION
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN mkdir "${NVM_DIR}" && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v"${NVM_VERSION}"/install.sh | PROFILE="${BASH_ENV}" bash

ARG NODE_VERSION
SHELL ["/bin/bash", "-c"]
RUN nvm install "${NODE_VERSION}" --default --save && \
    nvm install-latest-npm

# Install application gems
COPY vendor/* ./vendor/
COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

# Copy application code
COPY . .

# Precompile bootsnap code for faster boot times.
RUN bundle exec bootsnap precompile app/ lib/

# Precompiling assets for production without requiring secret RAILS_MASTER_KEY
# hadolint ignore=DL3059
RUN SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile


# Final stage for app image
FROM base

ARG GID=10001
ARG UID=10001
RUN groupadd --system --gid "${GID}" runner && \
    useradd runner --uid "${UID}" --gid "${GID}" --create-home --shell /bin/bash
USER runner:runner

# Copy built artifacts: gems, application
COPY --chown=runner:runner --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build "${NVM_DIR}" "${NVM_DIR}"
COPY --chown=runner:runner --from=build /workdir /workdir

# Entrypoint prepares the database.
ENTRYPOINT ["/workdir/bin/docker-entrypoint-rls"]

# Start server via Thruster by default, this can be overwritten at runtime
EXPOSE 80
CMD ["./bin/thrust", "./bin/rails", "server"]
