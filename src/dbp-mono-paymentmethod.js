import {css, html} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {send} from '@dbp-toolkit/common/notification';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Button,Icon,LoadingButton} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import metadata from './dbp-mono-paymentmethod.metadata.json';
import {Activity} from './activity.js';
import DBPMonoLitElement from "./dbp-mono-lit-element";

class DbpMonoPaymentmethod extends ScopedElementsMixin(DBPMonoLitElement) {
    constructor() {
        super();
        this.activity = new Activity(metadata);

        let params = (new URL(document.location)).searchParams;
        this.identifier = params.get('identifier');

        this.showPaymentMethods = false;
        this.paymentMethods = [];
        this.selectedPaymentMethod = {};

        this.consent = false;

        this.showWidget = false;
        this.widgetUrl = 'about:blank';
    }

    static get scopedElements() {
        return {
            'dbp-button': Button,
            'dbp-icon': Icon,
            'dbp-loading-button': LoadingButton,
        };
    }

    static get properties() {
        return {
            ...super.properties,

            identifier: {type: String},

            showPaymentMethods: {type: Boolean, attribute: false},
            paymentMethods: {type: Array, attribute: false},
            selectedPaymentMethod: {type: Object, attribute: false},

            consent: {type: Boolean, attribute: false},

            showWidget: {type: Boolean, attribute: false},
            widgetUrl: {type: String, attribute: false},
        };
    }

    _updateAuth() {
        super._updateAuth();

        if (
            this._loginStatus === 'logged-in'
            || this._loginStatus === 'logged-out'
        ) {
            this.getPayment();
        }
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            css`
                .hidden {
                    display: none;
                }
                .widget {
                    position: fixed;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background: #fff;
                    border: 0;
                }
            `,
        ];
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

    // get payment
    async getPayment() {
        let responseData = await this.sendGetPaymentRequest(this.identifier);
        await this.getPaymentResponse(
            responseData
        );
    }

    async sendGetPaymentRequest(
        identifier
    ) {
        const options = {
            method: 'GET',
            headers: this._requestHeaders,
        };

        return await this.httpGetAsync(this.entryPointUrl + '/mono/payment/' + identifier, options);
    }

    async getPaymentResponse(
        responseData
    ) {
        const i18n = this._i18n;

        let status = responseData.status;
        let data = await responseData.clone().json();

        switch (status) {
            case 200: {
                let paymentMethods = JSON.parse(data.paymentMethod);
                this.paymentMethods = paymentMethods;
                this.showPaymentMethods = true;
                break;
            }
            case 401:
                send({
                    summary: i18n.t('common.login-required-title'),
                    body: i18n.t('common.login-required-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
        }
    }

    // start pay action

    async startPayAction() {
        this.showPaymentMethods = false;
        let responseData = await this.sendPostStartPayActionRequest(
            this.identifier,
            this.selectedPaymentMethod,
            window.location.href,
            this.consent
        );
        await this.getStartPayActionResponse(
            responseData
        );
    }

    async sendPostStartPayActionRequest(
        identifier,
        paymentMethod,
        returnBaseUrl,
        consent
    )
    {
        let body = {
            identifier: identifier,
            paymentMethod: paymentMethod,
            returnBaseUrl: returnBaseUrl,
            consent: consent
        };

        const options = {
            method: 'POST',
            headers: this._requestHeaders,
            body: JSON.stringify(body),
        };

        return await this.httpGetAsync(this.entryPointUrl + '/mono/start-pay-actions', options);
    }

    async getStartPayActionResponse(responseData)
    {
        const i18n = this._i18n;

        let status = responseData.status;
        let data = await responseData.clone().json();

        let returnUrl = new URL(document.location);
        returnUrl.pathname = '/dist/de/mono-complete/' + this.identifier + '/';
        returnUrl.hash = '';
        returnUrl.search = '';

        let widgetUrl = new URL(data.widgetUrl);
        let params = widgetUrl.searchParams;
        params.set('returnUrl', returnUrl.toString());
        widgetUrl.search = params.toString();
        this.widgetUrl = widgetUrl.toString();
        this.showWidget = true;
    }

    render() {
        let loggedIn = this.auth && this.auth.token;
        let i18n = this._i18n;

        return html`
            <div class="${classMap({hidden: !this.showPaymentMethods})}">
                <h3>${i18n.t('select-payment-method')}</h3>
                <ul>
                    ${this.paymentMethods.map((paymentMethod) =>
                        html`<li>
                            <label>
                                ${paymentMethod.name}
                                <input type="radio"
                                       id="paymentMethod"
                                       name="paymentMethod"
                                       @click="${(event) => this.selectedPaymentMethod = paymentMethod.identifier}"
                                       .checked="${this.selectedPaymentMethod === paymentMethod.identifier}"
                                       />
                            </label>
                        </li>`
                    )}
                </ul>
                <p>
                    ${i18n.t('start-pay-action-info')}
                </p>
                <div class="btn-row-left">
                    <dbp-button class='button next-btn'
                                title='${i18n.t('start-pay-action-btn-title')}'
                                @click='${this.startPayAction}'
                                ?disabled='${!this.selectedPaymentMethod}'>
                        ${i18n.t('start-pay-action-btn-title')}
                        <dbp-icon name='chevron-right'></dbp-icon>
                    </dbp-button>
                </div>
            </div>

            <div class="${classMap({hidden: !this.showWidget})}">
                <iframe class="widget" .src="${this.widgetUrl}"></iframe>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-mono-paymentmethod', DbpMonoPaymentmethod);
