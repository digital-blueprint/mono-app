import path from 'path';
import url from 'url';
import {globSync} from 'glob';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import urlPlugin from '@rollup/plugin-url';
import license from 'rollup-plugin-license';
import del from 'rollup-plugin-delete';
import emitEJS from 'rollup-plugin-emit-ejs';
import appConfig from './app.config.js';
import {getBabelOutputPlugin} from '@rollup/plugin-babel';
import {
    getPackagePath,
    getBuildInfo,
    generateTLSConfig,
    getDistPath,
} from './vendor/toolkit/rollup.utils.js';

let appName = 'dbp-mono';
const pkg = require('./package.json');
const appEnv = typeof process.env.APP_ENV !== 'undefined' ? process.env.APP_ENV : 'local';
const watch = process.env.ROLLUP_WATCH === 'true';
const prodBuild = (!watch && appEnv !== 'test') || process.env.FORCE_FULL !== undefined;
let httpHost =
    process.env.ROLLUP_WATCH_HOST !== undefined ? process.env.ROLLUP_WATCH_HOST : '127.0.0.1';
let httpPort =
    process.env.ROLLUP_WATCH_PORT !== undefined ? parseInt(process.env.ROLLUP_WATCH_PORT) : 8001;

let config;
if (appEnv in appConfig) {
    config = appConfig[appEnv];
} else {
    console.error(`Unknown build environment: '${appEnv}', use one of '${Object.keys(appConfig)}'`);
    process.exit(1);
}

if (watch) {
    config.basePath = '/dist/';
}

function getOrigin(url) {
    if (url) return new URL(url).origin;
    return '';
}

config.CSP = `default-src 'self' 'unsafe-eval' 'unsafe-inline' \
    ${getOrigin(config.matomoUrl)} ${getOrigin(config.keyCloakBaseURL)} ${getOrigin(
    config.entryPointURL
)};\
    img-src * blob: data:`;

config.FP = `payment *`;

export default (async () => {
    let privatePath = await getDistPath(pkg.name);
    return {
        input:
            appEnv != 'test'
                ? ['src/' + appName + '.js', 'src/dbp-mono-processpayment.js']
                : globSync('test/**/*.js'),
        output: {
            dir: 'dist',
            entryFileNames: '[name].js',
            chunkFileNames: 'shared/[name].[hash].[format].js',
            format: 'esm',
            sourcemap: true,
        },
        treeshake: prodBuild,
        preserveEntrySignatures: false,
        onwarn: function (warning, warn) {
            // ignore chai warnings
            if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('chai')) {
                return;
            }
            // keycloak bundled code uses eval
            if (warning.code === 'EVAL' && warning.id.includes('sha256.js')) {
                return;
            }

            warn(warning);
        },
        plugins: [
            del({
                targets: 'dist/*',
            }),
            emitEJS({
                src: 'assets',
                include: ['**/*.ejs', '**/.*.ejs'],
                data: {
                    getUrl: (p) => {
                        return url.resolve(config.basePath, p);
                    },
                    getPrivateUrl: (p) => {
                        return url.resolve(`${config.basePath}${privatePath}/`, p);
                    },
                    name: appName,
                    entryPointURL: config.entryPointURL,
                    basePath: config.basePath,
                    keyCloakBaseURL: config.keyCloakBaseURL,
                    keyCloakRealm: config.keyCloakRealm,
                    keyCloakClientId: config.keyCloakClientId,
                    CSP: config.CSP,
                    FP: config.FP,
                    matomoUrl: config.matomoUrl,
                    matomoSiteId: config.matomoSiteId,
                    buildInfo: getBuildInfo(appEnv),
                },
            }),
            resolve({
                browser: true,
                preferBuiltins: true,
                exportConditions: !prodBuild ? ['development'] : [],
            }),
            prodBuild &&
                license({
                    banner: {
                        commentStyle: 'ignored',
                        content: `
    License: <%= pkg.license %>
    Dependencies:
    <% _.forEach(dependencies, function (dependency) { if (dependency.name) { %>
    <%= dependency.name %>: <%= dependency.version %> (<%= dependency.license %>)<% }}) %>
    `,
                    },
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
                include: ['node_modules/suggestions/**/*.css', 'node_modules/select2/**/*.css'],
                emitFiles: true,
                fileName: 'shared/[name].[hash][extname]',
            }),
            copy({
                targets: [
                    {src: 'assets/silent-check-sso.html', dest: 'dist'},
                    {src: 'assets/htaccess-shared', dest: 'dist/shared/', rename: '.htaccess'},
                    {src: 'assets/*.css', dest: 'dist/' + (await getDistPath(pkg.name))},
                    {src: 'assets/*.svg', dest: 'dist/' + (await getDistPath(pkg.name))},
                    {src: 'assets/icon/*', dest: 'dist/' + (await getDistPath(pkg.name, 'icon'))},
                    {src: 'assets/site.webmanifest', dest: 'dist', rename: pkg.internalName + '.webmanifest'},
                    {
                        src: await getPackagePath('@tugraz/font-source-sans-pro', 'files/*'),
                        dest: 'dist/' + (await getDistPath(pkg.name, 'fonts/source-sans-pro')),
                    },
                    {
                        src: await getPackagePath('@dbp-toolkit/common', 'src/spinner.js'),
                        dest: 'dist/' + (await getDistPath(pkg.name)),
                    },
                    {
                        src: await getPackagePath('@tugraz/web-components', 'src/spinner.js'),
                        dest: 'dist/' + (await getDistPath(pkg.name)),
                    },
                    {
                        src: await getPackagePath('@dbp-toolkit/common', 'misc/browser-check.js'),
                        dest: 'dist/' + (await getDistPath(pkg.name)),
                    },
                    {src: 'src/*.metadata.json', dest: 'dist'},
                    {
                        src: await getPackagePath('@dbp-toolkit/common', 'assets/icons/*.svg'),
                        dest: 'dist/' + (await getDistPath('@dbp-toolkit/common', 'icons')),
                    },
                ],
            }),
            prodBuild &&
                getBabelOutputPlugin({
                    compact: false,
                    presets: [
                        [
                            '@babel/preset-env',
                            {
                                loose: true,
                                modules: false,
                                shippedProposals: true,
                                bugfixes: true,
                                targets: {
                                    esmodules: true,
                                },
                            },
                        ],
                    ],
                }),
            prodBuild ? terser() : false,
            watch
                ? serve({
                      contentBase: '.',
                      host: httpHost,
                      port: httpPort,
                      historyApiFallback: config.basePath + appName + '.html',
                      https: await generateTLSConfig(),
                      headers: {
                          'Content-Security-Policy': config.CSP,
                          'Feature-Policy': config.FP,
                      },
                  })
                : false,
        ],
    };
})();
