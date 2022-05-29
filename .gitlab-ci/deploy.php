<?php

declare(strict_types=1);

namespace Deployer;

import('recipe/common.php');
import('contrib/rsync.php');

$PROJECT_ROOT = dirname(__DIR__);

$RSYNC_CONFIG = [
    'exclude' => [],
    'exclude-file' => false,
    'include' => [],
    'include-file' => false,
    'filter' => [],
    'filter-file' => false,
    'filter-perdir' => false,
    'flags' => 'rz',
    'options' => ['delete', 'links'],
    'timeout' => 60,
];

// Hosts
host('demo')
->set('labels', ['stage' => 'demo'])
    ->setHostname('mw@vpu01-demo.tugraz.at')
    ->set('rsync', $RSYNC_CONFIG)
    ->set('rsync_src', $PROJECT_ROOT.'/dist')
    ->set('deploy_path', '/home/mw/demo/deploy/apps/starter-app');

host('development')
    ->set('labels', ['stage' => 'development'])
    ->setHostname('mw@mw01-dev.tugraz.at')
    ->set('rsync', $RSYNC_CONFIG)
    ->set('rsync_src', $PROJECT_ROOT.'/dist')
    ->set('deploy_path', '/home/mw/dev/deploy/apps/starter-app');

task('build', function () use ($PROJECT_ROOT) {
    $options = ['cwd' => $PROJECT_ROOT];
    $stage = get('labels')['stage'];
    runLocally("yarn install", $options);
    runLocally("APP_ENV=$stage yarn run build", $options);
});

// Deploy task
task('deploy', [
    'deploy:info',
    'build',
    'deploy:setup',
    'deploy:lock',
    'deploy:release',
    'rsync',
    'deploy:shared',
    'deploy:symlink',
    'deploy:unlock',
    'deploy:cleanup',
    'deploy:success',
]);
after('deploy:failed', 'deploy:unlock');