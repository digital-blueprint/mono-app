import {css, html} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import {send} from '@dbp-toolkit/common/notification';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon, LoadingButton, Button, InlineNotification} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import metadata from './dbp-mono-processpayment.metadata.json';
import {Activity} from './activity.js';
import DBPMonoLitElement from './dbp-mono-lit-element';
import MicroModal from './vendor/micromodal.es';

const VIEW_RETURN = 'return';
const VIEW_SELECT = 'select';
const VIEW_CREATE = 'create';

class DbpMonoProcessPayment extends ScopedElementsMixin(DBPMonoLitElement) {
    constructor() {
        super();
        this.metadata = metadata;
        this.activity = new Activity(metadata);

        this.wrongPageCall = false; //TODO;

        this.loading = false;
        this.fullSizeLoading = false;

        // create
        let params = new URL(document.location).searchParams;
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
        this.alternateName = null;

        // not found
        this.showNotFound = false;

        // restart
        this.showRestart = false;
        this.restart = false;
        this.modalIsVisible = false;
        this.showPending = false;

        // select
        this.identifier = null;

        this.showPaymentMethods = false;
        this.paymentMethods = [];
        this.selectedPaymentMethod = '';

        this.isPaymentMethodSelected = false;

        this.consent = false;

        this.showTransactionSpinner = false;

        // select (widget)
        this.widgetUrl = 'about:blank';

        // complete
        this.paymentStatus = null;

        // completed (confirmation)
        this.showCompleteConfirmation = false;

        this.popUp = null;

        // view
        let view = this.getView();
        switch (view) {
            case VIEW_SELECT: {
                this.fullSizeLoading = false;
                this.view = view;
                let activityPath = this.getActivityPath(1);
                let activityPathItems = activityPath.split('/');
                this.identifier = activityPathItems[1] ?? null;
                break;
            }
            case VIEW_RETURN: {
                this.fullSizeLoading = true;
                this.view = view;
                break;
            }
            default:
                this.view = VIEW_CREATE;
                this.fullSizeLoading = false;
                break;
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('lang')) {
            if (this._loginStatus === 'logged-in' && this.view === VIEW_SELECT) {
                this.getPayment();
            }
        }
        super.updated(changedProperties);
    }

    static get scopedElements() {
        return {
            'dbp-button': Button,
            'dbp-loading-button': LoadingButton,
            'dbp-icon': Icon,
            'dbp-inline-notification': InlineNotification,
            // 'dbp-info-tooltip': InfoTooltip,
        };
    }

    static get properties() {
        return {
            ...super.properties,

            wrongPageCall: {type: Boolean, attribute: false},

            loading: {type: Boolean, attribute: false},
            fullSizeLoading: {type: Boolean, attribute: false},

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

            // not found
            showNotFound: {type: Boolean, attribute: false},

            // restart
            showRestart: {type: Boolean, attribute: false},
            restart: {type: Boolean, attribute: false},
            modalIsVisible: {type: Boolean, attribute: false},
            showPending: {type: Boolean, attribute: false},

            // select
            identifier: {type: String},

            showPaymentMethods: {type: Boolean, attribute: false},
            paymentMethods: {type: Array, attribute: false},
            selectedPaymentMethod: {type: String, attribute: false},
            isPaymentMethodSelected: {type: Boolean, attribute: false},

            consent: {type: Boolean, attribute: false},

            showTransactionSpinner: {type: Boolean, attribute: false},

            // select (widget)
            widgetUrl: {type: String, attribute: false},

            // complete (confirmation)
            paymentStatus: {type: String, attribute: false},
            showCompleteConfirmation: {type: Boolean, attribute: false},
        };
    }

    _updateAuth() {
        super._updateAuth();

        if (this._loginStatus === 'logged-in' || this._loginStatus === 'logged-out') {
            switch (this.view) {
                case VIEW_CREATE:
                    if (this._loginStatus === 'logged-out' && this.authRequired) {
                        this.sendSetPropertyEvent('requested-login-status', 'logged-in');
                    } else {
                        this.createPayment();
                    }
                    break;
                case VIEW_SELECT:
                    this.getPayment();
                    break;
                case VIEW_RETURN:
                    this.completePayment();
                    break;
            }
        }
    }

    async httpGetAsync(url, options) {
        return await fetch(url, options)
            .then((result) => {
                if (!result.ok) throw result;
                return result;
            })
            .catch((error) => {
                return error;
            });
    }

    // create payment
    async createPayment() {
        this.loading = true;
        let responseData = await this.sendCreatePaymentRequest(
            this.type,
            this.data,
            this.clientIp,
            this.returnUrl,
            this.notifyUrl,
            this.localIdentifier,
        );
        await this.createPaymentResponse(responseData);
        this.loading = false;
    }

    async sendCreatePaymentRequest(type, data, clientIp, returnUrl, notifyUrl, localIdentifier) {
        let body = {
            type: type,
            data: data,
            clientIp: clientIp,
            returnUrl: returnUrl,
            notifyUrl: notifyUrl,
            localIdentifier: localIdentifier,
        };

        const options = {
            method: 'POST',
            headers: this._requestHeaders,
            body: JSON.stringify(body),
        };

        return await this.httpGetAsync(this.entryPointUrl + '/mono/payment', options);
    }

    async createPaymentResponse(responseData) {
        const i18n = this._i18n;

        let status = responseData.status;
        let data = '';
        try {
            data = await responseData.clone().json();
        } catch (e) {
            console.log(e);
        }
        this.fullSizeLoading = false;
        switch (status) {
            case 201:
                this.identifier = data.identifier;
                this.reloadSelect();
                this.wrongPageCall = false;
                break;
            case 401:
                if (this._loginStatus === 'logged-in') {
                    this.sendSetPropertyEvent('requested-login-status', 'logged-in');
                    send({
                        summary: i18n.t('common.other-error-title'),
                        body: i18n.t('error-message'),
                        type: 'danger',
                        timeout: 5,
                    });
                }
                this.authRequired = true;
                break;
            case 429:
                send({
                    summary: i18n.t('create.too-many-requests-title'),
                    body: i18n.t('create.too-many-requests-body'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
            default:
                this.wrongPageCall = true;
                break;
        }
    }

    // get payment
    async getPayment() {
        this.loading = this.amount === null;
        let responseData = await this.sendGetPaymentRequest(this.identifier);
        await this.getPaymentResponse(responseData);
        this.loading = false;
    }

    async sendGetPaymentRequest(identifier) {
        const options = {
            method: 'GET',
            headers: this._requestHeaders,
        };

        return await this.httpGetAsync(this.entryPointUrl + '/mono/payment/' + identifier, options);
    }

    async getPaymentResponse(responseData) {
        const i18n = this._i18n;

        let status = responseData.status;
        let data = await responseData.clone().json();

        this.showTransactionSpinner = false;

        switch (status) {
            case 200: {
                this.paymentStatus = data.paymentStatus;
                this.paymentReference = data.paymentReference;
                this.amount = data.amount;
                this.alternateName = data.alternateName;
                this.currency = data.currency;
                this.honoricPrefix = data.honoricPrefix;
                this.givenName = data.givenName;
                this.familyName = data.familyName;
                this.companyName = data.companyName;
                this.honoricSuffix = data.honoricSuffix;
                this.recipient = data.recipient;
                this.paymentMethods = JSON.parse(data.paymentMethod);
                this.dataProtectionDeclarationUrl = data.dataProtectionDeclarationUrl;
                this.returnUrl = data.returnUrl;
                switch (data.paymentStatus) {
                    case 'prepared':
                        this.showPending = false;
                        this.showRestart = false;
                        this.restart = true;
                        this.showPaymentMethods = true;
                        this.showCompleteConfirmation = false;
                        break;
                    case 'cancelled':
                    case 'failed':
                    case 'started':
                        this.showPending = false;
                        this.showRestart = true;
                        this.restart = true;
                        this.showPaymentMethods = true;
                        this.showCompleteConfirmation = false;
                        break;
                    case 'pending':
                        this.showPending = true;
                        this.showRestart = false;
                        this.restart = false;
                        this.showPaymentMethods = false;
                        this.showCompleteConfirmation = false;
                        break;
                    case 'completed':
                        this.showPending = false;
                        this.showRestart = false;
                        this.restart = false;
                        this.showPaymentMethods = false;
                        this.showCompleteConfirmation = true;
                        break;
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
            case 404:
                this.showNotFound = true;
                this.showRestart = false;
                this.showPaymentMethods = false;
                this.showCompleteConfirmation = false;
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
                this.wrongPageCall = true;
                send({
                    summary: i18n.t('common.other-error-title'),
                    body: i18n.t('error-message'),
                    type: 'danger',
                    timeout: 5,
                });
                break;
        }
    }

    reloadSelect() {
        window.location.replace(
            this.getBaseUrl() +
                '/' +
                this.getActivity() +
                '/' +
                VIEW_SELECT +
                '/' +
                this.identifier,
        );
    }

    openModal() {
        const modal = this._('#payment-modal');
        if (modal) {
            MicroModal.show(modal, {
                onClose: (modal, trigger) => {
                    if (this.popUp) this.popUp.close();
                    this.reloadSelect();
                },
                disableScroll: true,
                disableFocus: false,
            });
            this.modalIsVisible = true;
        }
    }

    closeModal() {
        this.modalIsVisible = false;
        const modal = this._('#payment-modal');
        if (modal) {
            MicroModal.close(modal);
        }
    }

    popupCenter({url, title, w, h}) {
        // Fixes dual-screen position                             Most browsers      Firefox
        const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
        const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

        const width = window.innerWidth
            ? window.innerWidth
            : document.documentElement.clientWidth
            ? document.documentElement.clientWidth
            : screen.width;
        const height = window.innerHeight
            ? window.innerHeight
            : document.documentElement.clientHeight
            ? document.documentElement.clientHeight
            : screen.height;

        const systemZoom = width / window.screen.availWidth;
        const left = (width - w) / 2 / systemZoom + dualScreenLeft;
        const top = (height - h) / 2 / systemZoom + dualScreenTop;
        return window.open(
            url,
            title,
            `
              toolbar=no,
              location=no,
              status=no,
              menubar=no,
              scrollbars=yes,
              width=${w / systemZoom}, 
              height=${h / systemZoom}, 
              top=${top}, 
              left=${left}
                `,
        );
    }

    // start pay action
    startPayAction() {
        const i18n = this._i18n;

        this.popUp = this.popupCenter({url: '', title: 'xtf', w: 500, h: 768});

        try {
            this.popUp.focus();
        } catch (e) {
            alert('Pop-up Blocker is enabled! Please disable your pop-up blocker.');
            return;
        }

        this.openModal();

        let returnUrl = this.getBaseUrl() + '/' + this.getActivity() + '/' + VIEW_RETURN + '/';

        this.sendPostStartPayActionRequest(
            this.identifier,
            this.selectedPaymentMethod,
            returnUrl,
            this.consent,
            this.restart,
        ).then((responseData) => {
            responseData
                .clone()
                .json()
                .then((data) => {
                    let status = responseData.status;

                    switch (status) {
                        case 201: {
                            let widgetUrl = new URL(data.widgetUrl);
                            this.widgetUrl = widgetUrl.toString();
                            this.popUp.location = this.widgetUrl;
                            let popupInterval = setInterval(() => {
                                if (this.popUp.closed) {
                                    clearInterval(popupInterval);
                                    this.reloadSelect();
                                }
                            }, 250);

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
                        case 404:
                            this.showNotFound = true;
                            this.showRestart = false;
                            this.showPaymentMethods = false;
                            this.showCompleteConfirmation = false;
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
                            this.showPaymentMethods = true;
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
                });
        });
    }

    async sendPostStartPayActionRequest(identifier, paymentMethod, pspReturnUrl, consent, restart) {
        let body = {
            identifier: identifier,
            paymentMethod: paymentMethod,
            pspReturnUrl: pspReturnUrl,
            consent: consent,
            restart: restart,
        };

        const options = {
            method: 'POST',
            headers: this._requestHeaders,
            body: JSON.stringify(body),
        };

        return await this.httpGetAsync(this.entryPointUrl + '/mono/start-pay-actions', options);
    }

    // complete
    async completePayment() {
        let regexp = new RegExp(
            '^' + this.getBaseUrl() + '/' + this.getActivity() + '/' + VIEW_RETURN + '/',
        );
        let pspData = document.location.toString().replace(regexp, '');
        let responseData = await this.sendCompletePaymentRequest(pspData);

        this.showTransactionSpinner = true;

        await this.completePaymentResponse(responseData);

        responseData = await this.sendGetPaymentRequest(this.identifier);
        await this.getCompletePaymentResponse(responseData);
    }

    async sendCompletePaymentRequest(pspData) {
        let body = {
            pspData: pspData,
        };

        const options = {
            method: 'POST',
            headers: this._requestHeaders,
            body: JSON.stringify(body),
        };

        return await this.httpGetAsync(this.entryPointUrl + '/mono/complete-pay-actions', options);
    }

    async completePaymentResponse(responseData) {
        const i18n = this._i18n;

        let status = responseData.status;
        let data = await responseData.clone().json();

        this.showTransactionSpinner = false;

        switch (status) {
            case 201:
                this.returnUrl = data.returnUrl;
                this.identifier = data.identifier;
                break;
            case 404:
                this.showNotFound = true;
                this.showRestart = false;
                this.showPaymentMethods = false;
                this.showCompleteConfirmation = false;
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

    async getCompletePaymentResponse(responseData) {
        const i18n = this._i18n;

        let status = responseData.status;
        let data = await responseData.clone().json();

        this.showTransactionSpinner = false;

        switch (status) {
            case 200: {
                this.paymentStatus = data.paymentStatus;

                let completedUrl =
                    this.getBaseUrl() +
                    '/' +
                    this.getActivity() +
                    '/' +
                    VIEW_SELECT +
                    '/' +
                    this.identifier +
                    '/';
                if (window.opener && !window.opener.closed) {
                    window.opener.location = completedUrl;
                    window.close();
                } else {
                    window.location = completedUrl;
                }

                this.showCompleteConfirmation = true;
                this.isPaymentMethodSelected = false;
                break;
            }
            case 404:
                this.showNotFound = true;
                this.showRestart = false;
                this.showPaymentMethods = false;
                this.showCompleteConfirmation = false;
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

    clickOnPaymentMethod(paymentMethod) {
        this.selectedPaymentMethod = paymentMethod.identifier;
        this.isPaymentMethodSelected = !!this.selectedPaymentMethod;
    }

    printSummary() {
        if (!this.shadowRoot || !this.shadowRoot.host || !this.shadowRoot.host.getRootNode()) {
            window.print();
            return;
        }
        const header = this.shadowRoot.host.getRootNode().querySelector('#root header');
        const footer = this.shadowRoot.host.getRootNode().querySelector('#root footer');
        const aside = this.shadowRoot.host.getRootNode().querySelector('#root aside');
        const main = this.shadowRoot.host.getRootNode().querySelector('#root main');

        if (header !== null && footer !== null && aside !== null && main !== null) {
            footer.classList.add('hidden');
            header.classList.add('hidden');
            aside.classList.add('hidden');
            main.style.position = 'absolute';
            main.style.width = '97vw';
            main.style.marginTop = '100px';
        }

        window.print();

        if (header !== null && footer !== null && aside !== null && main !== null) {
            footer.classList.remove('hidden');
            header.classList.remove('hidden');
            aside.classList.remove('hidden');
            main.style = null;
        }
    }

    getReturnButtonString() {
        const i18n = this._i18n;

        let str = this.returnUrl;
        if (!str) {
            return i18n.t('complete.return-button-text');
        }
        str = str.replace('https://', '');
        str = str.split('/');
        if (!str) return i18n.t('complete.return-button-text');

        return i18n.t('complete.return-button-text-name', {name: str[0]});
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
            commonStyles.getLinkCss(),

            css`
                .full-size-spinner {
                    background-color: white;
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    top: 0px;
                    left: 0px;
                    z-index: 100;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 30px;
                }

                .hidden {
                    display: none;
                }

                .subheadline {
                    margin-bottom: 2em;
                }

                .restart {
                    padding-bottom: 1.2em;
                }

                .col {
                    border: 1px solid var(--dbp-override-muted);
                    padding: 25px 15px 15px 20px;
                    flex: 1 0 0%;
                }

                .details {
                    padding: 15px 20px 15px 15px;
                    background: var(--dbp-override-primary);
                    color: var(--dbp-override-secondary-surface);
                    border: 1px solid var(--dbp-override-primary);
                    width: 300px;
                    margin-left: 15px;
                }

                .details .reference {
                    font-size: 2em;
                    font-weight: bold;
                    text-align: right;
                }

                .amount {
                    font-size: 2em;
                    font-weight: bold;
                    margin-top: 0;
                }

                .payment-methods {
                    padding-top: 1.5em;
                }

                .form-check {
                    padding-top: 5px;
                    padding-bottom: 5px;
                }

                .form-check-div {
                    display: grid;
                    grid-template-columns: 206px 100px;
                    column-gap: 0.5em;
                }

                .form-check-div img {
                    max-height: 30px;
                    place-self: center;
                }

                .modal-container {
                    display: flex;
                    flex-direction: column;
                }

                .modal-header {
                    text-align: center;
                }

                .modal-content {
                    height: 100%;
                }

                #payment-modal-box {
                    padding: 10px 20px;
                }

                .payment-hint {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    flex-direction: column;
                    text-align: center;
                    padding-bottom: 20px;
                    box-sizing: border-box;
                }

                .print-content-wrapper {
                    display: grid;
                    grid-template-columns: min-content auto;
                    grid-template-rows: auto;
                }

                .element-left.first,
                .element-right.first {
                    padding-top: 12px;
                }

                .element-right.first {
                    border-top: 1px solid var(--dbp-override-muted);
                }

                .element-right.last {
                    border-bottom: 1px solid var(--dbp-override-muted);
                }

                .element-left {
                    background-color: var(--dbp-primary-surface);
                    color: var(--dbp-on-primary-surface);
                    border-left: var(--dbp-border);
                    border-right: var(--dbp-border);
                    border-color: var(--dbp-primary-surface-border-color);
                    padding: 0px 20px 15px 40px;
                    text-align: right;
                    width: 300px;
                }

                .element-left.first {
                    border-top: var(--dbp-border);
                    border-color: var(--dbp-primary-surface-border-color);
                }

                .element-left.last {
                    border-bottom: var(--dbp-border);
                    border-color: var(--dbp-primary-surface-border-color);
                }

                .element-right {
                    text-align: left;
                    padding-left: 15px;
                    padding-right: 15px;
                    border-right: 1px solid var(--dbp-override-muted);
                }

                .print-title {
                    padding-bottom: 1em;
                }

                .print-title h2:first-child {
                    margin-top: 0;
                    margin-bottom: 0;
                }

                .data-declaration {
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    padding-right: 15px;
                }

                .print-warning {
                    display: flex;
                    justify-content: space-between;
                    padding-top: 0.5em;
                }

                .success {
                    color: var(--dbp-success);
                }

                @media only screen and (min-width: 768px) {
                    .row {
                        display: flex;
                        margin-left: -15px;
                    }

                    .col:first-child {
                        width: 25%;
                        flex: 0 0 auto;
                    }
                }

                @media only screen and (orientation: portrait) and (max-width: 768px) {
                    .details {
                        padding: 0;
                        width: 100%;
                        margin-left: 0;
                        border: none;
                    }

                    .details .reference {
                        padding: 20px 20px 20px 20px;
                        text-align: left;
                    }

                    .col > h3 {
                        padding-top: 1em;
                        overflow-wrap: break-word;
                        word-wrap: break-word;
                        -ms-word-break: break-all;
                        word-break: break-word;
                        -ms-hyphens: auto;
                        -moz-hyphens: auto;
                        -webkit-hyphens: auto;
                        hyphens: auto;
                    }

                    .button-description-text {
                        margin: 0;
                        padding: 1em 0 1.5em 0;
                        overflow-wrap: break-word;
                        word-wrap: break-word;
                        -ms-word-break: break-all;
                        word-break: break-word;
                        -ms-hyphens: auto;
                        -moz-hyphens: auto;
                        -webkit-hyphens: auto;
                        hyphens: auto;
                    }

                    .btn-row-left dbp-loading-button {
                        width: 100%;
                    }

                    dbp-loading-button {
                        width: 100%;
                    }

                    .form-check-div {
                        /* grid-template-columns: 150px 100px;
                        row-gap: 2em; */
                        display: flex;
                        flex-direction: row;
                        justify-content: space-between;
                        padding-top: 3px;
                    }

                    .form-check-div img {
                        margin-top: -6px;
                    }

                    .form-check {
                        padding: 0.8em 0 0.8em 0;
                    }

                    .print-content-wrapper {
                        grid-template-columns: auto;
                        border-bottom: 1px solid rgba(51, 51, 51, 0.2);
                    }

                    .element-left {
                        border-left: none;
                        border-right: none;
                    }

                    .element-left.first {
                        margin-top: 10px;
                        border-top: 0px;
                    }

                    .element-left.last {
                        border-bottom: none;
                        border-color: rgba(51, 51, 51, 0.2);
                    }

                    .element-right.first {
                        padding-top: 0px;
                        border-top: none;
                    }

                    .element-right.last {
                        border-bottom: none;
                    }

                    .element-right {
                        margin-left: 12px;
                        padding: 0px 0px 12px;
                        border-right: none;
                    }

                    .element-left {
                        text-align: left;
                        padding: 10px 5px;
                        background-color: inherit;
                        color: inherit;
                        font-weight: 400;
                        border-top: 1px solid rgba(51, 51, 51, 0.2);
                        border-color: rgba(51, 51, 51, 0.2);
                        width: unset;
                    }

                    #payment-modal-box {
                        width: 100%;
                        height: 100%;
                        padding: 0;
                    }

                    .print-warning {
                        padding-top: 1em;
                        flex-direction: column;
                        gap: 1em;
                    }

                    .data-declaration {
                        display: inline-grid;
                        gap: 2em;
                    }

                    .int-link-internal {
                        width: fit-content;
                    }

                    .complete-redirect-notice {
                        margin-top: 2em;
                    }
                }

                @media print {
                    #payment-modal,
                    dbp-inline-notification,
                    .control,
                    dbp-loading-button,
                    .subheadline,
                    .print-warning .warning-high,
                    .complete-redirect-notice {
                        display: none;
                    }

                    .element-left {
                        width: unset;
                    }
                }
            `,
        ];
    }

    render() {
        const i18n = this._i18n;
        return html`
            <div
                class="${classMap({
                    hidden:
                        (!this.isLoggedIn() && this.authRequired) ||
                        this.isLoading() ||
                        this.showNotFound ||
                        this.wrongPageCall ||
                        this.paymentStatus === 'completed' ||
                        this.loading,
                })}">
                <h2>${this.activity.getName(this.lang)}</h2>
                <p class="subheadline">
                    <slot name="description">${this.activity.getDescription(this.lang)}</slot>
                </p>
            </div>

            <dbp-inline-notification
                class=" ${classMap({
                    hidden:
                        (this.isLoggedIn() && this.authRequired) ||
                        this.isLoading() ||
                        !this.authRequired ||
                        this.wrongPageCall ||
                        this.loading,
                })}"
                type="warning"
                body="${i18n.t('error-login-message')}"></dbp-inline-notification>

            <dbp-inline-notification
                class="${classMap({
                    hidden: this.isLoading() || !this.wrongPageCall || this.loading,
                })}"
                type="danger"
                body="${i18n.t('error-message')}"></dbp-inline-notification>

            <dbp-inline-notification
                class="${classMap({hidden: !this.showNotFound || this.loading})}"
                type="danger"
                body="${i18n.t('not-found.info')}"></dbp-inline-notification>

            <div class="control ${classMap({hidden: !this.isLoading() && !this.loading})}">
                <span class="loading">
                    <dbp-mini-spinner text=${i18n.t('loading-message')}></dbp-mini-spinner>
                </span>
            </div>

            <div class="control full-size-spinner ${classMap({hidden: !this.fullSizeLoading})}">
                <span class="loading">
                    <dbp-mini-spinner text=${i18n.t('loading-message')}></dbp-mini-spinner>
                </span>
            </div>

            <div
                class="${classMap({
                    hidden:
                        this.loading ||
                        (!this.isLoggedIn() && this.authRequired) ||
                        this.isLoading() ||
                        this.showNotFound ||
                        this.wrongPageCall ||
                        this.paymentStatus === 'completed',
                })}">
                <div
                    class="restart ${classMap({hidden: !this.showRestart || this.modalIsVisible})}">
                    <dbp-inline-notification
                        type="warning"
                        body="${i18n.t('restart.info')}"></dbp-inline-notification>
                </div>

                <div class="${classMap({hidden: !this.showPending || this.modalIsVisible})}">
                    <dbp-inline-notification
                        type="info"
                        body="${i18n.t('pending.info')}"></dbp-inline-notification>
                </div>

                <div class="${classMap({hidden: !this.showPaymentMethods})}">
                    <div class="row">
                        <div class="details">
                            <div class="reference">
                                ${this.alternateName
                                    ? this.alternateName
                                    : i18n.t('select.default-reference')}
                            </div>
                        </div>
                        <div class="col">
                            <strong>${i18n.t('select.amount')}</strong>
                            <p class="amount">
                                ${i18n.t('select.amount-format', {
                                    val: this.amount,
                                    formatParams: {
                                        val: {
                                            currency: this.currency,
                                            locale: this.lang
                                        },
                                    },
                                })}
                                ${this.paymentReference
                                    ? html`
                                          <br />
                                          <small>${this.paymentReference}</small>
                                      `
                                    : ''}
                            </p>
                            <p class="sender">
                                <strong>${i18n.t('select.sender')}</strong>
                                <br />
                                ${this.honoricPrefix} ${this.givenName} ${this.familyName}
                                ${this.honoricSuffix}
                                ${this.companyName
                                    ? html`
                                          <br />
                                          ${this.companyName}
                                      `
                                    : ''}
                                ${!this.recipient
                                    ? html`
                                          <a
                                              href="${this.dataProtectionDeclarationUrl}"
                                              class="int-link-internal">
                                              ${i18n.t('data-protection')}
                                          </a>
                                      `
                                    : ``}
                            </p>
                            ${this.recipient
                                ? html`
                                      <p class="recipient">
                                          <strong>${i18n.t('select.recipient')}</strong>
                                          <br />
                                          <span class="data-declaration">
                                              ${this.recipient}
                                              <a
                                                  href="${this.dataProtectionDeclarationUrl}"
                                                  class="int-link-internal"
                                                  target="_blank">
                                                  ${i18n.t('data-protection')}
                                              </a>
                                          </span>
                                      </p>
                                  `
                                : ''}
                        </div>
                    </div>
                    <div class="payment-methods">
                        ${this.amount <= 0
                            ? html`
                                  <dbp-inline-notification
                                      type="danger"
                                      body="${i18n.t(
                                          'select.amount-too-low',
                                      )}"></dbp-inline-notification>
                              `
                            : html`
                                  <h3>${i18n.t('select.payment-method')}</h3>
                                  ${this.paymentMethods.map(
                                      (paymentMethod) => html`
                                          <div class="form-check">
                                              <label class="button-container">
                                                  <div class="form-check-div">
                                                      ${paymentMethod.name}
                                                      ${paymentMethod.image
                                                          ? html`
                                                                <img
                                                                    src="${paymentMethod.image}"
                                                                    alt="${paymentMethod.name}" />
                                                            `
                                                          : ''}
                                                  </div>
                                                  <input
                                                      type="radio"
                                                      name="paymentMethod"
                                                      @click="${() =>
                                                          this.clickOnPaymentMethod(paymentMethod)}"
                                                      .checked="${this.selectedPaymentMethod ===
                                                      paymentMethod.identifier}" />
                                                  <span class="radiobutton"></span>
                                              </label>
                                          </div>
                                      `,
                                  )}
                              `}
                    </div>
                    ${this.amount > 0
                        ? html`
                              <p class="button-description-text">
                                  ${i18n.t('select.start-pay-action-info')}
                              </p>
                              <div class="btn-row-left">
                                  <dbp-loading-button
                                      type="is-primary"
                                      @click="${this.startPayAction}"
                                      ?disabled="${!this.isPaymentMethodSelected}"
                                      title="${i18n.t('select.start-pay-action-btn-title')}">
                                      ${i18n.t('select.start-pay-action-btn-title')}
                                  </dbp-loading-button>
                              </div>
                          `
                        : html``}
                </div>
            </div>

            <div class="${classMap({hidden: !this.showTransactionSpinner})}">
                <span class="loading">
                    <dbp-mini-spinner text=${i18n.t('transaction-text')}></dbp-mini-spinner>
                </span>
            </div>
            <div
                class="${classMap({
                    hidden:
                        !this.showCompleteConfirmation ||
                        (!this.isLoggedIn() && this.authRequired) ||
                        this.isLoading(),
                })}">
                <div class="${classMap({hidden: !(this.paymentStatus === 'completed')})}">
                    <div class="print" id="print-view-wrapper">
                        <div class="print-title">
                            <h2>${i18n.t('complete.summary')}</h2>
                        </div>
                        <div class="print-content-wrapper">
                            <div class="element-left first">${i18n.t('complete.reference')}</div>
                            <div class="element-right first">
                                ${this.alternateName
                                    ? this.alternateName
                                    : i18n.t('select.default-reference')}
                            </div>
                            <div class="element-left">${i18n.t('complete.amount')}</div>
                            <div class="element-right">
                                ${i18n.t('complete.amount-format', {
                                    val: this.amount,
                                    formatParams: {
                                        val: {
                                            currency: this.currency,
                                            locale: this.lang
                                        },
                                    },
                                })}
                                ${this.paymentReference
                                    ? html`
                                          <br />
                                          <small>${this.paymentReference}</small>
                                      `
                                    : ''}
                            </div>

                            <div class="element-left">${i18n.t('complete.sender')}</div>
                            <div class="element-right">
                                ${this.honoricPrefix} ${this.givenName} ${this.familyName}
                                ${this.honoricSuffix}
                                ${this.companyName
                                    ? html`
                                          <br />
                                          ${this.companyName}
                                      `
                                    : ''}
                            </div>

                            ${this.recipient
                                ? html`
                                      <div class="element-left">
                                          ${i18n.t('complete.recipient')}
                                      </div>
                                      <div class="element-right">${this.recipient}</div>
                                  `
                                : ''}

                            <div class="element-left">${i18n.t('complete.payment-id')}</div>
                            <div class="element-right">${this.identifier}</div>
                            <div class="element-left last">${i18n.t('complete.status')}</div>
                            <div class="element-right last">
                                <span class="success">
                                    <strong>${i18n.t('complete.payed')}</strong>
                                </span>
                            </div>
                        </div>
                        <div class="print-warning">
                            <div>
                                <dbp-icon
                                    title="${i18n.t('warning')}"
                                    name="warning-high"
                                    class="warning-high"></dbp-icon>
                                <span>${i18n.t('warning-text')}</span>
                            </div>
                            <dbp-loading-button
                                @click="${this.printSummary}"
                                title="${i18n.t('complete.print-button-text')}">
                                ${i18n.t('complete.print-button-text')}
                            </dbp-loading-button>
                        </div>
                        <div class="complete-redirect-notice">
                            <p>
                                ${i18n.t('complete.close')}
                                <br />
                                ${this.returnUrl
                                    ? html`
                                          <a
                                              target="_self"
                                              rel="noopener"
                                              class="link"
                                              href="${this.returnUrl}">
                                              ${this.getReturnButtonString()}
                                          </a>
                                      `
                                    : html``}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal micromodal-slide" id="payment-modal" aria-hidden="true">
                <div class="modal-overlay" tabindex="-2">
                    <div
                        class="modal-container"
                        id="payment-modal-box"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="submission-modal-title">
                        <main class="modal-content" id="payment-modal-content">
                            <div class="payment-hint">
                                <h2>${i18n.t('payment-method.method-started')}</h2>
                                <p>${i18n.t('payment-method.method-started-text')}</p>
                                <p class="hint">
                                    <strong>${i18n.t('payment-method.method-started-hint')}</strong>
                                    <br />
                                    ${i18n.t('payment-method.method-started-hint-text')}
                                </p>
                            </div>
                        </main>
                        <header class="modal-header">
                            <dbp-button
                                title="${i18n.t('payment-method.cancel-payment-label')}"
                                @click="${this.closeModal}">
                                ${i18n.t('payment-method.cancel-payment-label')}
                            </dbp-button>
                        </header>
                    </div>
                </div>
            </div>
        `;
    }
}

commonUtils.defineCustomElement('dbp-mono-processpayment', DbpMonoProcessPayment);
