import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {createInstance} from './i18n';

export default class DBPMonoLitElement extends DBPLitElement {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.auth = {};
        this.entryPointUrl = null;
        this.routingUrl = null;
        this.routingBaseUrl = null;
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            auth: {type: Object},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            routingUrl: {type: String, attribute: 'routing-url'},
            routingBaseUrl: {type: String, attribute: 'routing-base-url'},
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this._loginStatus = '';
        this._requestHeaders = {
            'Accept-Language': this.lang,
        };
    }

    getRoutingBaseUrl() {
        if (this.routingBaseUrl === null) {
            throw new Error('routing-base-url not set');
        }
        return this.routingBaseUrl;
    }

    _updateAuth() {
        this._loginStatus = this.auth['login-status'];
        this._requestHeaders = {
            'Content-Type': 'application/ld+json',
            'Accept-Language': this.lang,
        };

        if (this._loginStatus === 'logged-in') {
            this._requestHeaders.Authorization = 'Bearer ' + this.auth.token;
        }
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
                    this._requestHeaders['Accept-Language'] = this.lang;
                    break;
                case 'auth':
                    this._updateAuth();
                    break;
            }
        });

        super.update(changedProperties);
    }

    isLoggedIn() {
        return this.auth.person !== undefined && this.auth.person !== null;
    }

    isLoading() {
        if (this._loginStatus === 'logged-out') return false;
        return !this.isLoggedIn() && this.auth.token !== undefined;
    }
}
