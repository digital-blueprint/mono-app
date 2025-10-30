import url from 'node:url';
import process from 'node:process';
import {globSync} from 'glob';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import license from 'rollup-plugin-license';
import del from 'rollup-plugin-delete';
import emitEJS from 'rollup-plugin-emit-ejs';
import {getBabelOutputPlugin} from '@rollup/plugin-babel';
import {
    getPackagePath,
    getBuildInfo,
    generateTLSConfig,
    getDistPath,
    assetPlugin,
} from '@dbp-toolkit/dev-utils';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
let appName = 'dbp-mono';
const pkg = require('./package.json');
const appEnv = typeof process.env.APP_ENV !== 'undefined' ? process.env.APP_ENV : 'local';
const watch = process.env.ROLLUP_WATCH === 'true';
const prodBuild = (!watch && appEnv !== 'test') || process.env.FORCE_FULL !== undefined;
let httpHost =
    process.env.ROLLUP_WATCH_HOST !== undefined ? process.env.ROLLUP_WATCH_HOST : '127.0.0.1';
let httpPort =
    process.env.ROLLUP_WATCH_PORT !== undefined ? parseInt(process.env.ROLLUP_WATCH_PORT) : 8001;
let isRolldown = process.argv.some((arg) => arg.includes('rolldown'));

// if true, app assets and configs are whitelabel
let whitelabel;
// path to non whitelabel assets and configs
let customAssetsPath;
// development path
let devPath = 'assets_custom/dbp-mono/assets/';
// deployment path
let deploymentPath = '../assets/';

// set whitelabel bool according to used environment
if (
    (appEnv.length > 6 && appEnv.substring(appEnv.length - 6) == 'Custom') ||
    appEnv == 'production'
) {
    whitelabel = false;
} else {
    whitelabel = true;
}

// load devconfig for local development if present
let devConfig = require('./app.config.json');
try {
    console.log('Loading ' + './' + devPath + 'app.config.json ...');
    devConfig = require('./' + devPath + 'app.config.json');
    customAssetsPath = devPath;
} catch (e) {
    if (e.code == 'MODULE_NOT_FOUND') {
        console.warn('no dev-config found, try deployment config instead ...');

        // load devconfig for deployment if present
        try {
            console.log('Loading ' + './' + deploymentPath + 'app.config.json ...');
            devConfig = require('./' + deploymentPath + 'app.config.json');
            customAssetsPath = deploymentPath;
        } catch (e) {
            if (e.code == 'MODULE_NOT_FOUND') {
                console.warn('no dev-config found, use default whitelabel config instead ...');
                devConfig = require('./app.config.json');
                customAssetsPath = devPath;
            } else {
                throw e;
            }
        }
    } else {
        throw e;
    }
}

let config;
if (devConfig != undefined && appEnv in devConfig) {
    // choose devConfig if available
    config = devConfig[appEnv];
} else {
    console.error(`Unknown build environment: '${appEnv}', use one of '${Object.keys(devConfig)}'`);
    process.exit(1);
}

if (watch) {
    config.basePath = '/dist/';
}

function getOrigin(url) {
    if (url) return new URL(url).origin;
    return '';
}

config.CSP = `default-src 'self' 'unsafe-inline' \
    ${getOrigin(config.matomoUrl)} ${getOrigin(config.keyCloakBaseURL)} ${getOrigin(
        config.entryPointURL,
    )};\
    img-src * blob: data:`;

config.FP = `payment *`;

export default (async () => {
    let privatePath = await getDistPath(pkg.name);
    return {
        input:
            appEnv != 'test'
                ? !whitelabel
                    ? [
                          'src/' + appName + '.js',
                          'src/dbp-mono-processpayment.js',
                          await getPackagePath('@tugraz/web-components', 'src/logo.js'),
                      ]
                    : ['src/' + appName + '.js', 'src/dbp-mono-processpayment.js']
                : globSync('test/**/*.js'),
        output: {
            dir: 'dist',
            entryFileNames: '[name].js',
            chunkFileNames: 'shared/[name].[hash].js',
            format: 'esm',
            sourcemap: true,
            ...(isRolldown ? {cleanDir: true} : {}),
        },
        treeshake: prodBuild,
        //preserveEntrySignatures: false,
        moduleTypes: {
            '.css': 'js', // work around rolldown handling the CSS import before the URL plugin can
        },
        plugins: [
            !isRolldown &&
                del({
                    targets: 'dist/*',
                }),
            whitelabel &&
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
                        shortName: config.shortName,
                        appDomain: config.appDomain,
                    },
                }),
            !whitelabel &&
                emitEJS({
                    src: customAssetsPath,
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
                        shortName: config.shortName,
                        appDomain: config.appDomain,
                    },
                }),
            !isRolldown &&
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
                        allow(dependency) {
                            let licenses = [
                                'LGPL-2.1-or-later',
                                'MIT',
                                'BSD-3-Clause',
                                'Apache-2.0',
                                'BSD',
                            ];
                            if (!licenses.includes(dependency.license)) {
                                throw new Error(
                                    `Unknown license for ${dependency.name}: ${dependency.license}`,
                                );
                            }
                            return true;
                        },
                    },
                }),
            !isRolldown &&
                commonjs({
                    include: 'node_modules/**',
                }),
            !isRolldown && json(),
            whitelabel &&
                (await assetPlugin(pkg.name, 'dist', {
                    copyTargets: [
                        {src: 'assets/silent-check-sso.html', dest: 'dist'},
                        {src: 'assets/htaccess-shared', dest: 'dist/shared/', rename: '.htaccess'},
                        {src: 'assets/*.css', dest: 'dist/' + (await getDistPath(pkg.name))},
                        {src: 'assets/*.svg', dest: 'dist/' + (await getDistPath(pkg.name))},
                        {
                            src: 'assets/icon/*',
                            dest: 'dist/' + (await getDistPath(pkg.name, 'icon')),
                        },
                        {
                            src: 'assets/site.webmanifest',
                            dest: 'dist',
                            rename: pkg.internalName + '.webmanifest',
                        },
                        {
                            src: await getPackagePath('@fontsource/nunito-sans', '*'),
                            dest: 'dist/' + (await getDistPath(pkg.name, 'fonts/nunito-sans')),
                        },
                        {
                            src: await getPackagePath('@dbp-toolkit/common', 'src/spinner.js'),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {
                            src: await getPackagePath('@dbp-toolkit/common', 'src/spinner.js'),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                            rename: 'org_spinner.js',
                        },
                        {
                            src: await getPackagePath(
                                '@dbp-toolkit/common',
                                'misc/browser-check.js',
                            ),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {src: 'src/*.metadata.json', dest: 'dist'},
                    ],
                })),
            !whitelabel &&
                (await assetPlugin(pkg.name, 'dist', {
                    copyTargets: [
                        {src: customAssetsPath + 'silent-check-sso.html', dest: 'dist'},
                        {
                            src: customAssetsPath + 'htaccess-shared',
                            dest: 'dist/shared/',
                            rename: '.htaccess',
                        },
                        {
                            src: customAssetsPath + '*.css',
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {
                            src: customAssetsPath + '*.svg',
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {
                            src: customAssetsPath + 'icon/*',
                            dest: 'dist/' + (await getDistPath(pkg.name, 'icon')),
                        },
                        {
                            src: customAssetsPath + 'site.webmanifest',
                            dest: 'dist',
                            rename: pkg.internalName + '.webmanifest',
                        },
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
                            src: await getPackagePath(
                                '@dbp-toolkit/common',
                                'misc/browser-check.js',
                            ),
                            dest: 'dist/' + (await getDistPath(pkg.name)),
                        },
                        {src: 'src/*.metadata.json', dest: 'dist'},
                    ],
                })),
            prodBuild &&
                getBabelOutputPlugin({
                    compact: false,
                    presets: [
                        [
                            '@babel/preset-env',
                            {
                                loose: false,
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
