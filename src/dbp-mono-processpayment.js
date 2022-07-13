import {css, html} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {send} from '@dbp-toolkit/common/notification';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Button,Icon,LoadingButton} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import metadata from './dbp-mono-processpayment.metadata.json';
import {Activity} from './activity.js';
import DBPMonoLitElement from "./dbp-mono-lit-element";

class DbpMonoProcesspayment extends ScopedElementsMixin(DBPMonoLitElement) {
    constructor() {
        super();
        this.metadata = metadata;
        this.activity = new Activity(metadata);

        // create
        let params = (new URL(document.location)).searchParams;
        this.type = params.get('type') ?? '';
        this.data = params.get('data') ?? '';
        this.clientIp = params.get('clientIp');
        this.returnUrl = params.get('returnUrl');
        this.notifyUrl = params.get('notifyUrl');
        this.localIdentifier = params.get('localIdentifier');
        this.authRequired = !!params.get('authRequired');

        // select
        this.identifier = null;

        this.showPaymentMethods = false;
        this.paymentMethods = [];
        this.selectedPaymentMethod = {};

        this.consent = false;

        // select (widget)
        this.showWidget = false;
        this.widgetUrl = 'about:blank';

        // complete (confirmation)
        this.paymentStatus = null;
        this.showCompleteConfirmation = false;

        // view
        let view = this.getView();
        switch (view) {
            case 'select': {
                this.view = view;
                let activityPath = this.getActivityPath(1);
                let activityPathItems = activityPath.split('/');
                this.identifier = activityPathItems[1] ?? null;
                break;
            }
            case 'complete': {
                if (window.frameElement) {
                    parent.location = self.location;
                }
                this.view = view;
                let activityPath = this.getActivityPath(1);
                let activityPathItems = activityPath.split('/');
                this.identifier = activityPathItems[1] ?? null;
                break;
            }
            default:
                this.view = 'create';
                break;
        }
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

            // create
            type: {type: String},
            data: {type: String},
            clientIp: {type: String},
            returnUrl: {type: String},
            notifyUrl: {type: String},
            localIdentifier: {type: String},
            authRequired: {type: Boolean},

            // select
            identifier: {type: String},

            showPaymentMethods: {type: Boolean, attribute: false},
            paymentMethods: {type: Array, attribute: false},
            selectedPaymentMethod: {type: Object, attribute: false},

            consent: {type: Boolean, attribute: false},

            // select (widget)
            showWidget: {type: Boolean, attribute: false},
            widgetUrl: {type: String, attribute: false},

            // complete (confirmation)
            paymentStatus: {type: String, attribute: false},
            showCompleteConfirmation: {type: Boolean, attribute: false}
        };
    }

    _updateAuth() {
        super._updateAuth();

        if (
            this._loginStatus === 'logged-in'
            || this._loginStatus === 'logged-out'
        ) {
            switch (this.view) {
                case 'create':
                    if (this._loginStatus === 'logged-out' && this.authRequired) {
                        this.sendSetPropertyEvent('requested-login-status', 'logged-in');
                    } else {
                        this.createPayment();
                    }
                    break;
                case 'select':
                    this.getPayment();
                    break;
                case 'complete':
                    this.completePayment();
                    break;
            }
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

    // create payment
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
        };

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
                window.location.href = this.getBaseUrl() + '/' + this.getActivity() + '/select/' + data.identifier;
                break;
            case 401:
                if (this._loginStatus === 'logged-out') {
                    this.sendSetPropertyEvent('requested-login-status', 'logged-in');
                } else {
                    send({
                        summary: i18n.t('common.login-required-title'),
                        body: i18n.t('common.login-required-body'),
                        type: 'danger',
                        timeout: 5,
                    });
                }
        }
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

        let returnUrl = this.getBaseUrl() + '/' + this.getActivity() + '/complete/' + this.identifier + '/';

        let widgetUrl = new URL(data.widgetUrl);
        let params = widgetUrl.searchParams;
        params.set('returnUrl', returnUrl.toString());
        widgetUrl.search = params.toString();
        this.widgetUrl = widgetUrl.toString();
        this.showWidget = true;
    }

    // complete

    async completePayment() {
        let regexp = new RegExp('^' + this.getBaseUrl() + '/' + this.getActivity() + '/complete/');
        let pspData = document.location.toString().replace(regexp, '');

        let responseData = await this.sendCompletePaymentRequest(
            pspData
        );

        await this.completePaymentResponse(
            responseData
        );

        responseData = await this.sendGetPaymentRequest(this.identifier);
        await this.getCompletePaymentResponse(
            responseData
        );
    }

    async sendCompletePaymentRequest(
        pspData
    ) {
        let body = {
            routing: '',
            pspData: pspData,
        };

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

        this.returnUrl = data.returnUrl;
    }

    async getCompletePaymentResponse(
        responseData
    ) {
        let status = responseData.status;
        let data = await responseData.clone().json();

        switch (status) {
            case 200: {
                let paymentStatus = data.paymentStatus;
                this.paymentStatus = paymentStatus;

                if (this.returnUrl) {
                    let that = this;
                    setTimeout(() => {
                        window.location.href = that.returnUrl;
                    }, 5000);
                }

                this.showCompleteConfirmation = true;
            }
        }
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

            <div class="${classMap({hidden: !this.showCompleteConfirmation})}">
                <div class="${classMap({hidden: !(this.paymentStatus === 'completed')})}">
                    <p>
                        ${i18n.t('complete.payment-status-completed')}
                    </p>
                </div>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-mono-processpayment', DbpMonoProcesspayment);
