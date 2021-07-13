import path from 'path';
import url from 'url';
import glob from 'glob';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import {terser} from "rollup-plugin-terser";
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import urlPlugin from "@rollup/plugin-url";
import consts from 'rollup-plugin-consts';
import license from 'rollup-plugin-license';
import del from 'rollup-plugin-delete';
import emitEJS from 'rollup-plugin-emit-ejs';
import {getBabelOutputPlugin} from '@rollup/plugin-babel';
import {getPackagePath, getBuildInfo, generateTLSConfig} from './vendor/toolkit/rollup.utils.js';

// -------------------------------

// Some new web APIs are only available when HTTPS is active.
// Note that this only works with a Non-HTTPS API endpoint with Chrome,
// Firefox will emit CORS errors, see https://bugzilla.mozilla.org/show_bug.cgi?id=1488740
const USE_HTTPS = true;

// -------------------------------

const pkg = require('./package.json');
const build = (typeof process.env.BUILD !== 'undefined') ? process.env.BUILD : 'local';
const watch = process.env.ROLLUP_WATCH === 'true';
const buildFull = (!watch && build !== 'test') || (process.env.FORCE_FULL !== undefined);
const matomoUrl = 'https://analytics.tugraz.at/';

console.log("build: " + build);
let basePath = '';
let entryPointURL = '';
let keyCloakServer = '';
let keyCloakBaseURL = '';
let keyCloakClientId = '';
let matomoSiteId = 131;
let useTerser = buildFull;
let useBabel = buildFull;
let checkLicenses = buildFull;

switch (build) {
  case 'local':
    basePath = '/dist/';
    entryPointURL = 'http://127.0.0.1:8000';
    keyCloakServer = 'auth-dev.tugraz.at';
    keyCloakBaseURL = 'https://' + keyCloakServer + '/auth';
    keyCloakClientId = 'auth-dev-mw-frontend-local';
    break;
  case 'bs':
    basePath = '/dist/';
    entryPointURL = 'https://bs-local.com:8000';
    keyCloakServer = 'auth-dev.tugraz.at';
    keyCloakBaseURL = 'https://' + keyCloakServer + '/auth';
    keyCloakClientId = 'auth-dev-mw-frontend-local';
    break;
  case 'test':
    break;
  default:
    console.error('Unknown build environment: ' + build);
    process.exit(1);
}

export default (async () => {
    return {
        input: (build != 'test') ? glob.sync('src/*.js') : glob.sync('test/**/*.js'),
        output: {
        dir: 'dist',
        entryFileNames: '[name].js',
        chunkFileNames: 'shared/[name].[hash].[format].js',
        format: 'esm',
        sourcemap: true
        },
        preserveEntrySignatures: false,
        // external: ['zlib', 'http', 'fs', 'https', 'url'],
        onwarn: function (warning, warn) {
            // ignore "suggestions" warning re "use strict"
            if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
                return;
            }
            // ignore chai warnings
            if (warning.code === 'CIRCULAR_DEPENDENCY') {
            return;
            }
            // keycloak bundled code uses eval
            if (warning.code === 'EVAL') {
            return;
            }
            warn(warning);
        },
        plugins: [
            del({
            targets: 'dist/*'
            }),
            consts({
            environment: build,
            buildinfo: getBuildInfo(build),
            }),
            emitEJS({
            src: 'assets',
            include: ['**/*.ejs', '**/.*.ejs'],
            data: {
                getUrl: (p) => {
                return url.resolve(basePath, p);
                },
                getPrivateUrl: (p) => {
                    return url.resolve(`${basePath}local/${pkg.name}/`, p);
                },
                name: pkg.name,
                entryPointURL: entryPointURL,
                basePath: basePath,
                keyCloakServer: keyCloakServer,
                keyCloakBaseURL: keyCloakBaseURL,
                keyCloakClientId: keyCloakClientId,
                environment: build,
                matomoUrl: matomoUrl,
                matomoSiteId: matomoSiteId,
                buildInfo: getBuildInfo(build)
            }
            }),
            resolve({
                // ignore node_modules from vendored packages
                moduleDirectories: [path.join(process.cwd(), 'node_modules')],
                browser: true,
                preferBuiltins: true
            }),
            checkLicenses && license({
                banner: {
                    commentStyle: 'ignored',
                    content: `
    License: <%= pkg.license %>
    Dependencies:
    <% _.forEach(dependencies, function (dependency) { if (dependency.name) { %>
    <%= dependency.name %>: <%= dependency.license %><% }}) %>
    `},
            thirdParty: {
                allow: {
                test: '(MIT OR BSD-3-Clause OR Apache-2.0 OR LGPL-2.1-or-later OR 0BSD)',
                failOnUnlicensed: true,
                failOnViolation: true,
                },
            },
            }),
            commonjs({
                include: 'node_modules/**',
            }),
            json(),
            urlPlugin({
            limit: 0,
            include: [
                "node_modules/suggestions/**/*.css",
                "node_modules/select2/**/*.css",
            ],
            emitFiles: true,
            fileName: 'shared/[name].[hash][extname]'
            }),
            copy({
                targets: [
                    {src: 'assets/silent-check-sso.html', dest:'dist'},
                    {src: 'assets/htaccess-shared', dest: 'dist/shared/', rename: '.htaccess'},
                    {src: 'assets/*.css', dest: 'dist/local/' + pkg.name},
                    {src: 'assets/*.ico', dest: 'dist/local/' + pkg.name},
                    {src: 'assets/*.svg', dest: 'dist/local/' + pkg.name},
                    {src: 'assets/icon/*', dest: 'dist/local/'  + pkg.name + '/icon/'},
                    {src: await getPackagePath('@dbp-toolkit/font-source-sans-pro', 'files/*'), dest: 'dist/local/' + pkg.name + '/fonts/source-sans-pro'},
                    {src: await getPackagePath('@dbp-toolkit/common', 'src/spinner.js'), dest: 'dist/local/' + pkg.name, rename: 'spinner.js'},
                    {src: await getPackagePath('@dbp-toolkit/common', 'misc/browser-check.js'), dest: 'dist/local/' + pkg.name, rename: 'browser-check.js'},
                    {src: 'assets/icon-*.png', dest: 'dist/local/' + pkg.name},
                    {src: 'assets/*-placeholder.png', dest: 'dist/local/' + pkg.name},
                    {src: 'assets/manifest.json', dest: 'dist', rename: pkg.name + '.manifest.json'},
                    {src: 'assets/*.metadata.json', dest: 'dist'},
                    {src: await getPackagePath('@dbp-toolkit/common', 'assets/icons/*.svg'), dest: 'dist/local/@dbp-toolkit/common/icons'},
                ],
            }),
            useBabel && getBabelOutputPlugin({
                compact: false,
                presets: [[
                  '@babel/preset-env', {
                    loose: true,
                    modules: false,
                    shippedProposals: true,
                    bugfixes: true,
                    targets: {
                      esmodules: true
                    }
                  }
                ]],
            }),
            useTerser ? terser() : false,
            watch ? serve({
            contentBase: '.',
            host: '127.0.0.1',
            port: 8001,
            historyApiFallback: basePath + pkg.name + '.html',
            https: USE_HTTPS ? await generateTLSConfig() : false,
                headers: {
                    'Content-Security-Policy': `default-src 'self' 'unsafe-eval' 'unsafe-inline' analytics.tugraz.at eid.egiz.gv.at ${keyCloakServer} ${entryPointURL} httpbin.org ; img-src * blob: data:`
                },
            }) : false
        ]
    };
})();
