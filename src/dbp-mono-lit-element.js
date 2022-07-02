import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {createInstance} from "./i18n";

export default class DBPMonoLitElement extends DBPLitElement {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.auth = {};
        this.entryPointUrl = null;
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            auth: {type: Object},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this._loginStatus = '';
        this._requestHeaders = {};
    }

    _updateAuth() {
        this._loginStatus = this.auth['login-status'];
        this._requestHeaders = {
            'Content-Type': 'application/ld+json',
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
                    break;
                case 'auth':
                    this._updateAuth();
                    break;
            }
        });

        super.update(changedProperties);
    }
}
