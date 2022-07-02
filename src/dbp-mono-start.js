import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {send} from '@dbp-toolkit/common/notification';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import metadata from './dbp-mono-start.metadata.json';
import {Activity} from './activity.js';
import DBPMonoLitElement from "./dbp-mono-lit-element";

class DbpMonoStart extends ScopedElementsMixin(DBPMonoLitElement) {
    constructor() {
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
            this.createPayment();
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

    async createPayment() {
        let responseData = await this.sendCreatePaymentRequest(
            this.type,
            this.data,
            this.clientIp,
            this.returnUrl,
            this.notifyUrl,
            this.localIdentifier
        );
        await this.createPaymentResponse(
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

    async sendCreatePaymentRequest(
        type,
        data,
        clientIp,
        returnUrl,
        notifyUrl,
        localIdentifier
    ) {
        let body = {
            type: type,
            data: data,
            clientIp: clientIp,
            returnUrl: returnUrl,
            notifyUrl: notifyUrl,
            localIdentifier: localIdentifier
        }

        const options = {
            method: 'POST',
            headers: this._requestHeaders,
            body: JSON.stringify(body),
        };

        return await this.httpGetAsync(this.entryPointUrl + '/mono/payment', options);
    }

    async createPaymentResponse(
        responseData
    ) {
        const i18n = this._i18n;

        let status = responseData.status;
        let data = await responseData.clone().json();

        switch (status) {
            case 201:
                window.location.href = '/dist/de/mono-paymentmethod?identifier=' + data.identifier;
                break;
            case 401:
                send({
                    summary: i18n.t('common.login-required-title'),
                    body: i18n.t('common.login-required-body'),
                    type: 'danger',
                    timeout: 5,
                });
        }
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

commonUtils.defineCustomElement('dbp-mono-start', DbpMonoStart);
