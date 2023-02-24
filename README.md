# Mono Application

[GitHub Repository](https://github.com/digital-blueprint/mono-app) |
[npmjs package](https://www.npmjs.com/package/@digital-blueprint/mono-app) |
[Unpkg CDN](https://unpkg.com/browse/@digital-blueprint/mono-app/) |
[Mono Bundle](https://github.com/digital-blueprint/relay-mono-bundle)

[![Build and Test](https://github.com/digital-blueprint/mono-app/actions/workflows/build-test-publish.yml/badge.svg)](https://github.com/digital-blueprint/mono-app/actions/workflows/build-test-publish.yml)

This is an application for allowing payments with various payment gateways.

## Prerequisites

- You need the [API server](https://gitlab.tugraz.at/dbp/relay/dbp-relay-server-template) running
- You need the [DBP Mono Bundle](https://gitlab.tugraz.at/dbp/dual-delivery/relay-mono-bundle)

## Local development

```bash
# get the source
git clone git@gitlab.tugraz.at:dbp//web-components/dbp-template-app.git
cd dbp-template-app
git submodule update --init

# install dependencies
yarn install

# constantly build dist/bundle.js and run a local web-server on port 8001 
yarn run watch

# same as watch, but with babel, terser, etc active -> very slow
yarn run watch-full

# run tests
yarn test

# build for deployment
yarn build
```

Jump to <https://localhost:8001>, and you should get a Single Sign On login page.
