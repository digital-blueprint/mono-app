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
git clone git@github.com:digital-blueprint/mono-app.git
cd mono-app
git submodule update --init

# install dependencies
npm install

# constantly build dist/bundle.js and run a local web-server on port 8001 
npm run watch

# same as watch, but with babel, terser, etc active -> very slow
npm run watch-full

# constantly build dist/bundle.js and run a local web-server on port 8001 using a custom assets directory assets_custom/
npm run watch-custom

# run tests
npm test

# build for deployment
npm build
```

Jump to <https://localhost:8001>, and you should get a Single Sign On login page.

By default, the application is built using the assets in `assets/`. However, custom assets can also be used to build the application. The custom assets can be added to the directory `assets_custom/dbp-mono/assets/`. This allows developers to easily develop and build the application for different environments.
