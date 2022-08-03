import {AppShell} from '@dbp-toolkit/app-shell';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Logo} from '@tugraz/web-components';
import {Translated} from '@dbp-toolkit/common/src/translated';

commonUtils.defineCustomElement('dbp-mono', AppShell);
commonUtils.defineCustomElement('tug-logo', Logo);
commonUtils.defineCustomElement('dbp-translated', Translated);