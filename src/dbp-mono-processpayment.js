import {css, html} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {send} from '@dbp-toolkit/common/notification';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, LoadingButton, InlineNotification,} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import metadata from './dbp-mono-processpayment.metadata.json';
import {Activity} from './activity.js';
import DBPMonoLitElement from "./dbp-mono-lit-element";
import MicroModal from './micromodal.es';

class DbpMonoProcessPayment extends ScopedElementsMixin(DBPMonoLitElement) {
    constructor() {
        super();
        this.metadata = metadata;
        this.activity = new Activity(metadata);

        this.wrongPageCall = false; //TODO;

        // create
        let params = (new URL(document.location)).searchParams;
        this.type = params.get('type') ?? '';
        this.data = params.get('data') ?? '';
        this.clientIp = params.get('clientIp');
        this.returnUrl = params.get('returnUrl');
        this.notifyUrl = params.get('notifyUrl');
        this.localIdentifier = params.get('localIdentifier');
        this.authRequired = !!params.get('authRequired');

        // get
        this.paymentReference = null;
        this.amount = null;
        this.currency = null;
        this.honoricPrefix = null;
        this.givenName = null;
        this.familyName = null;
        this.companyName = null;
        this.honoricSuffix = null;
        this.recipient = null;
        this.dataProtectionDeclarationUrl = null;

        // restart
        this.showRestart = false;
        this.restart = false;

        // select
        this.identifier = null;

        this.showPaymentMethods = false;
        this.paymentMethods = [];
        this.selectedPaymentMethod = '';

        this.isPaymentMethodSelected = false;

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
            'dbp-loading-button': LoadingButton,
            'dbp-icon': Icon,
            'dbp-inline-notification': InlineNotification,
        };
    }

    static get properties() {
        return {
            ...super.properties,

            wrongPageCall: {type: Boolean, attribute: false},

            // create
            type: {type: String},
            data: {type: String},
            clientIp: {type: String},
            returnUrl: {type: String},
            notifyUrl: {type: String},
            localIdentifier: {type: String},
            authRequired: {type: Boolean},

            // get
            paymentReference: {type: String, attribute: false},
            amount: {type: String, attribute: false},
            currency: {type: String, attribute: false},
            honoricPrefix: {type: String, attribute: false},
            givenName: {type: String, attribute: false},
            familyName: {type: String, attribute: false},
            companyName: {type: String, attribute: false},
            honoricSuffix: {type: String, attribute: false},
            recipient: {type: String, attribute: false},
            dataProtectionDeclarationUrl: {type: String, attribute: false},

            // restart
            showRestart: {type: Boolean, attribute: false},
            restart: {type: Boolean, attribute: false},

            // select
            identifier: {type: String},

            showPaymentMethods: {type: Boolean, attribute: false},
            paymentMethods: {type: Array, attribute: false},
            selectedPaymentMethod: {type: String, attribute: false},
            isPaymentMethodSelected: {type: Boolean, attribute: false},

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
                break;
            default:
                send({
                    summary: i18n.t('common.other-error-title'),
                    body: i18n.t('common.other-error-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
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
                this.paymentReference = data.paymentReference;
                this.amount = data.amount;
                this.currency = data.currency;
                this.honoricPrefix = data.honoricPrefix;
                this.givenName = data.givenName;
                this.familyName = data.familyName;
                this.companyName = data.companyName;
                this.honoricSuffix = data.honoricSuffix;
                this.recipient = data.recipient;
                let paymentMethods = JSON.parse(data.paymentMethod);
                this.paymentMethods = paymentMethods;
                this.dataProtectionDeclarationUrl = data.dataProtectionDeclarationUrl;
                if (data.paymentStatus === 'prepared') {
                    this.showRestart = false;
                    this.showPaymentMethods = true;
                } else {
                    this.showRestart = true;
                    this.showPaymentMethods = false;
                }
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
            case 403:
                send({
                    summary: i18n.t('common.client-ip-not-allowed-title'),
                    body: i18n.t('common.client-ip-not-allowed-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            case 410:
                send({
                    summary: i18n.t('common.timeout-exceeded-title'),
                    body: i18n.t('common.timeout-exceeded-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            case 429:
                send({
                    summary: i18n.t('get.too-many-requests-title'),
                    body: i18n.t('get.too-many-requests-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            default:
                send({
                    summary: i18n.t('common.other-error-title'),
                    body: i18n.t('common.other-error-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
        }
    }

    // start pay action

    openModal() {
        const modal = this._('#payment-modal');
        if (modal) {
            MicroModal.show(modal, {
                onClose: (modal, trigger) => {
                    location.reload();
                },
                disableScroll: true,
                disableFocus: false,
            });
        }
    }

    closeModal() {
        const modal = this._('#payment-modal');
        if (modal) {
            MicroModal.close(modal);
        }
    }

    restartPayAction() {
        this.showRestart = false;
        this.showPaymentMethods = true;
        this.restart = true;
    }

    async startPayAction() {
        this.showPaymentMethods = false;
        let returnUrl = this.getBaseUrl() + '/' + this.getActivity() + '/complete/' + this.identifier + '/';
        let responseData = await this.sendPostStartPayActionRequest(
            this.identifier,
            this.selectedPaymentMethod,
            returnUrl,
            this.consent,
            this.restart
        );
        await this.getStartPayActionResponse(
            responseData
        );
    }

    async sendPostStartPayActionRequest(
        identifier,
        paymentMethod,
        pspReturnUrl,
        consent,
        restart
    )
    {
        let body = {
            identifier: identifier,
            paymentMethod: paymentMethod,
            pspReturnUrl: pspReturnUrl,
            consent: consent,
            restart: restart
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

        switch (status) {
            case 201: {
                let widgetUrl = new URL(data.widgetUrl);
                this.widgetUrl = widgetUrl.toString();
                this.showWidget = true;
                this.openModal();
                break;
            }
            case 400:
                send({
                    summary: i18n.t('common.psp-return-url-not-allowed-title'),
                    body: i18n.t('common.psp-return-url-not-allowed-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            case 401:
                send({
                    summary: i18n.t('common.login-required-title'),
                    body: i18n.t('common.login-required-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            case 403:
                send({
                    summary: i18n.t('common.client-ip-not-allowed-title'),
                    body: i18n.t('common.client-ip-not-allowed-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            case 410:
                send({
                    summary: i18n.t('common.timeout-exceeded-title'),
                    body: i18n.t('common.timeout-exceeded-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            case 429:
                send({
                    summary: i18n.t('start.too-many-requests-title'),
                    body: i18n.t('start.too-many-requests-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            case 500:
                send({
                    summary: i18n.t('common.backend-error-title'),
                    body: i18n.t('common.backend-error-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            default:
                send({
                    summary: i18n.t('common.other-error-title'),
                    body: i18n.t('common.other-error-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
        }
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
        const i18n = this._i18n;

        let status = responseData.status;
        let data = await responseData.clone().json();

        switch (status) {
            case 201:
                this.returnUrl = data.returnUrl;
                break;
            case 500:
                send({
                    summary: i18n.t('common.backend-error-title'),
                    body: i18n.t('common.backend-error-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            default:
                send({
                    summary: i18n.t('common.other-error-title'),
                    body: i18n.t('common.other-error-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
        }
    }

    async getCompletePaymentResponse(
        responseData
    ) {
        const i18n = this._i18n;

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
                this.isPaymentMethodSelected = false;
                break;
            }
            default:
                send({
                    summary: i18n.t('common.other-error-title'),
                    body: i18n.t('common.other-error-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
        }
    }

    clickOnPaymentMethod(paymentMethod) {
        this.selectedPaymentMethod = paymentMethod.identifier;
        if (this.selectedPaymentMethod) {
            this.isPaymentMethodSelected = true;
        } else {
            this.isPaymentMethodSelected = false;
        }
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(false),
            commonStyles.getModalDialogCSS(),
            commonStyles.getButtonCSS(),
            commonStyles.getNotificationCSS(),
            commonStyles.getRadioAndCheckboxCss(),
            commonStyles.getActivityCSS(), 

            css`

                .hidden {
                    display: none;
                }
                .details {
                    padding: 15px;
                    /* border: 1px solid lightgray; */
                    background: var(--dbp-override-primary);
                    color: var(--dbp-override-on-secondary-surface);
                }
                .details p {
                    margin: 0;
                }
                .details p + p{
                    margin-top: 15px;
                }
                /* .details strong {
                    color: darkgray;
                } */
                .amount {
                    font-size: 2em;
                    font-weight: bold;
                }
                .amount small {
                    color: darkgray;
                }
                .form-check-label {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .form-check-label span {
                    display: block;
                    padding-top: 7px;
                    padding-bottom: 7px;
                }
                .form-check-label img {
                    max-height: 30px;
                    max-width: 30px;
                }
                .modal-container {
                    display: flex;
                    flex-direction: column;
                }
                .modal-header {
                    text-align: right;
                }
                .modal-content {
                    height: 100%;
                }
                .widget {
                    width: 100%;
                    height: 100%;
                    background: #fff;
                    border: 0;
                }
                @media only screen and (min-width: 768px) {
                    .row {
                        display: flex;
                        margin-left: -15px;
                        margin-right: -15px;
                    }
                    .col {
                        flex: 1 0 0%;
                        padding: 15px;
                    }
                    .col:first-child {
                        width: 25%;
                        flex: 0 0 auto;
                    }
                }
            `,
        ];
    }

    render() {
        const i18n = this._i18n;

        return html`

            <div class="notification is-warning ${classMap({ hidden: this.isLoggedIn() || this.isLoading() || this.wrongPageCall })}">
                ${i18n.t('error-login-message')}
            </div>

            <dbp-inline-notification class="${classMap({ hidden: this.isLoading() || !this.wrongPageCall })}" 
                            summary="${i18n.t('error-title')}"
                            type="danger"
                            body="${i18n.t('error-message')}">
            </dbp-inline-notification>

            <div class="control ${classMap({hidden: this.isLoggedIn() || !this.isLoading()})}">
                <span class="loading">
                    <dbp-mini-spinner text=${i18n.t('loading-message')}></dbp-mini-spinner>
                </span>
            </div>

        <div class="${classMap({ hidden: !this.isLoggedIn() || this.isLoading() || (this.paymentStatus === 'completed')})}">
            <h2>${this.activity.getName(this.lang)}</h2>
            <p class="subheadline">
                <slot name="description">${this.activity.getDescription(this.lang)}</slot>
            </p>
            <!-- <div>
                <slot name="additional-information">
                    <p>${i18n.t('common.additional-information')}</p>
                </slot>
            </div> -->

            <div class="${classMap({hidden: !this.showRestart})}">
                <!-- <div class="notification is-warning">
                    <div slot="body">
                        ${i18n.t('restart.info')}
                    </div>
                </div> -->
                <dbp-inline-notification
                        type="warning"
                        body="${i18n.t('restart.info')}">
                </dbp-inline-notification>
                <br/>
                <dbp-loading-button
                        @click='${this.restartPayAction}'
                        title="${i18n.t('restart.restart-payment')}">
                    ${i18n.t('restart.restart-payment')}
                </dbp-loading-button>
            </div>

            <div class="${classMap({hidden: !this.showPaymentMethods})}">
            
                <div class="row">
                    <div class="col">
                        <div class="details">
                            <p class="amount">
                                ${i18n.t('{{val, currency}}',
                                    {
                                        val: this.amount,
                                        formatParams: {
                                            val: {
                                                currency: this.currency
                                            }
                                        }
                                    }
                                )}
                                ${this.paymentReference ? html`<br/><small>${this.paymentReference}</small>` : ''}
                            </p>
                            <p class="sender">
                                <strong>${i18n.t('select.sender')}</strong><br/>
                                ${this.honoricPrefix} ${this.givenName} ${this.familyName} ${this.honoricSuffix}
                                ${this.companyName ? html`<br/>${this.companyName}` : ''}
                            </p>
                            ${this.recipient ? html`
                                <p class="recipient">
                                    <strong>${i18n.t('select.recipient')}</strong><br/>
                                    ${this.recipient}
                                </p>
                            ` : ''}
                        </div>
                    </div>
                    <div class="col">
                        <h3>${i18n.t('select.payment-method')}</h3>
                        ${this.paymentMethods.map((paymentMethod) =>
                            html`
                                <div class="form-check">
                                    <label class="form-check-label">
                                        <span>
                                            <input class="form-check-input" 
                                                   type="radio"
                                                   name="paymentMethod"
                                                   @click="${(event) => this.clickOnPaymentMethod(paymentMethod)}"
                                                   .checked="${this.selectedPaymentMethod === paymentMethod.identifier}"
                                                   />
                                            ${paymentMethod.name}
                                        </span>
                                        ${paymentMethod.image ? html`<img src="${paymentMethod.image}" alt="${paymentMethod.name}"/>` : ''} 
                                    </label>
                                </div>
                            `
                        )}
                    </div>
                </div>
                <p>
                    ${i18n.t('select.start-pay-action-info')}
                </p>
                <div class="btn-row-left">
                    <dbp-loading-button type='is-primary'
                                @click='${this.startPayAction}'
                                ?disabled='${!this.isPaymentMethodSelected}'
                                title="${i18n.t('select.start-pay-action-btn-title')}">
                                ${i18n.t('select.start-pay-action-btn-title')}
                    </dbp-loading-button>
                </div>
            </div>
        </div>
        <div class="${classMap({hidden: !this.showCompleteConfirmation || !this.isLoggedIn() || !this.isLoading()})}">
            <div class="${classMap({hidden: !(this.paymentStatus === 'completed')})}">
                <dbp-inline-notification
                        type="success"
                        body="${i18n.t('complete.payment-status-completed')}">
                </dbp-inline-notification>
            </div>
        </div>
        
        <div class="modal micromodal-slide" id="payment-modal" aria-hidden="true">
            <div class="modal-overlay" tabindex="-2" data-micromodal-close>
                <div
                    class="modal-container"
                    id="payment-modal-box"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="submission-modal-title">
                    <header class="modal-header">
                        <button
                            title="${i18n.t('payment-method.close-modal')}"
                            class="modal-close"
                            aria-label="Close modal"
                            @click='${this.closeModal}'>
                            <dbp-icon
                                title="${i18n.t('payment-mMethod.close-modal')}"
                                name="close"
                                class="close-icon"></dbp-icon>
                        </button>
                    </header>
                    <main class="modal-content" id="payment-modal-content">
                        <iframe class="widget" .src="${this.widgetUrl}"></iframe>
                    </main>
                </div>
            </div>
        </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-mono-processpayment', DbpMonoProcessPayment);
