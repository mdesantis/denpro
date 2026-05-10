# syntax=docker/dockerfile:1
# check=error=true
# hadolint global ignore=DL3008

# This Dockerfile is designed for production, not development. Use with Kamal or build'n'run by hand:
# docker build -t denpro .
# docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name denpro denpro

# For a containerized dev environment, see Dev Containers: https://guides.rubyonrails.org/getting_started_with_devcontainer.html

# Ruby version is determined by ssr-deno-base image (see .ruby-version for local dev)
ARG NODE_VERSION=24.14.1

# hadolint ignore=DL3007
FROM ssr-deno-base:latest AS base

# Rails app lives here
WORKDIR /workdir

# Install base packages
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl libjemalloc2 libvips postgresql-client tzdata && \
    ln -s /usr/lib/"$(uname -m)"-linux-gnu/libjemalloc.so.2 /usr/local/lib/libjemalloc.so && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Set production environment variables and enable jemalloc for reduced memory usage and latency.
ENV BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development" \
    LD_PRELOAD="/usr/local/lib/libjemalloc.so" \
    NODE_ENV="production" \
    RACK_ENV="production" \
    RAILS_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build gems
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev pkg-config libyaml-dev xz-utils && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Download and install Node.js from official binary distribution
ARG NODE_VERSION
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 && \
    npm install -g npm@latest

# Install application gems
COPY vendor/* ./vendor/
COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

# Install npm packages (cached separately from app code)
COPY package.json package-lock.json ./
RUN npm ci

# Copy application code and build Vite assets (client + SSR)
COPY . .
RUN npx vite build && \
    npx vite build --ssr && \
    rm -rf node_modules

# Precompile bootsnap code for faster boot times.
RUN bundle exec bootsnap precompile app/ lib/

# TODO: Post-SSR-migration — verify assets:precompile also builds SSR bundle
# (npx vite build --ssr). rails_vite may or may not hook this automatically.
# Test with: docker build . && check dist/server/ssr.js exists.
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
COPY --chown=runner:runner --from=build /workdir /workdir

# Entrypoint prepares the database.
ENTRYPOINT ["/workdir/bin/docker-entrypoint"]

# Start server via Thruster by default, this can be overwritten at runtime
EXPOSE 80
CMD ["./bin/thrust", "./bin/rails", "server"]
