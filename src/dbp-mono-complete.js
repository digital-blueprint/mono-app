import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import metadata from './dbp-mono-complete.metadata.json';
import {Activity} from './activity.js';
import DBPMonoLitElement from "./dbp-mono-lit-element";

class DbpMonoComplete extends ScopedElementsMixin(DBPMonoLitElement) {
    constructor() {
        if (window.frameElement) {
            parent.location = self.location;
        }

        super();
        this.activity = new Activity(metadata);

        let params = (new URL(document.location)).searchParams;
        this.type = params.get('type') ?? '';
        this.data = params.get('data') ?? '';
        this.clientIp = params.get('clientIp');
        this.returnUrl = params.get('returnUrl');
        this.notifyUrl = params.get('notifyUrl');
        this.localIdentifier = params.get('localIdentifier');
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
        };
    }

    static get properties() {
        return {
            ...super.properties,

            type: {type: String},
            data: {type: String},
            clientIp: {type: String},
            returnUrl: {type: String},
            notifyUrl: {type: String},
            localIdentifier: {type: String},
        };
    }

    _updateAuth() {
        super._updateAuth();

        if (
            this._loginStatus === 'logged-in'
            || this._loginStatus === 'logged-out'
        ) {
            this.completePayment();
        }
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            css`
                .hidden {
                    display: none;
                }
            `,
        ];
    }

    async completePayment() {
        let baseUrl = new URL(document.location);
        baseUrl.pathname = '/dist/de/mono-complete/';
        baseUrl.hash = '';
        baseUrl.search = ''

        let regexp = new RegExp('^' + baseUrl.toString());
        let pspData = document.location.toString().replace(regexp, '');

        let responseData = await this.sendCompletePaymentRequest(
            pspData
        );
        await this.completePaymentResponse(
            responseData
        );
    }

    async httpGetAsync(url, options) {
        let response = await fetch(url, options)
            .then((result) => {
                if (!result.ok) throw result;
                return result;
            })
            .catch((error) => {
                return error;
            });

        return response;
    }

    async sendCompletePaymentRequest(
        pspData
    ) {
        let body = {
            routing: '',
            pspData: pspData,
        }

        const options = {
            method: 'POST',
            headers: this._requestHeaders,
            body: JSON.stringify(body),
        };

        return await this.httpGetAsync(this.entryPointUrl + '/mono/complete-pay-actions', options);
    }

    async completePaymentResponse(
        responseData
    ) {
        let status = responseData.status;
        let data = await responseData.clone().json();

        let returnUrl = data.returnUrl;

        window.location.href = returnUrl;
    }

    render() {
        let loggedIn = this.auth && this.auth.token;
        let i18n = this._i18n;

        return html`
            <h3>${this.activity.getName(this.lang)}</h3>
            <p>${this.activity.getDescription(this.lang)}</p>

            <div class="${loggedIn ? '' : 'hidden'}">
                <input type="button" value="${i18n.t('click-me')}" @click="${this.onClick}"></input>
                <p>${
                    this.name
                        ? html`
                              <dbp-icon name="world"></dbp-icon>
                              ${i18n.t('hello', {name: this.name})}
                          `
                        : ``
                }</p>
            </div>

            <div class="${!loggedIn ? '' : 'hidden'}">
                <p>${i18n.t('please-log-in')}</p>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-mono-complete', DbpMonoComplete);
