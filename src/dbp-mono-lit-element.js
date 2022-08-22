import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {createInstance} from "./i18n";

export default class DBPMonoLitElement extends DBPLitElement {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.auth = {};
        this.metadata = {};
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
        this._requestHeaders = {
            'Accept-Language': this.lang
        };
    }

    _updateAuth() {
        this._loginStatus = this.auth['login-status'];
        this._requestHeaders = {
            'Content-Type': 'application/ld+json',
            'Accept-Language': this.lang
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

    // get base url (everything before activity)
    getBaseUrl() {
        let that = this;
        let url = new URL(document.location);
        let pathname = url.pathname;
        let pathnameItems = pathname.split('/');
        let baseUrl = [];
        let reached = false;
        pathnameItems.forEach(pathnameItem => {
            if (pathnameItem === that.metadata['routing_name']) {
                reached = true;
            }
            if (!reached) {
                baseUrl.push(pathnameItem);
            }
        });
        url.pathname = baseUrl.join('/');
        url.search = '';
        url.hash = '';
        return url.toString();
    }

    // get everything after base url without leading and trailing slash
    getActivityPath(skipPathItems) {
        let url = new URL(document.location);
        let baseUrl = new URL(this.getBaseUrl());
        let pattern = '^' + baseUrl.pathname;
        let regexp = new RegExp(pattern);
        let activityPath = url.pathname.replace(regexp, '');
        activityPath = activityPath.replace(/^\//, '');
        activityPath = activityPath.replace(/\/$/, '');
        let activityPathItems = activityPath.split('/');
        if (skipPathItems) {
            activityPathItems.splice(0, skipPathItems);
        }
        activityPath = activityPathItems.join('/');
        return activityPath;
    }

    // activity only
    getActivity() {
        return this.metadata['routing_name'];
    }

    // view only
    getView() {
        let activityPath = this.getActivityPath(1);
        let activityPathItems = activityPath.split('/');
        return activityPathItems[0] ?? null;
    }

    isLoggedIn() {
        return this.auth.person !== undefined && this.auth.person !== null;
    }

    isLoading() {
        if (this._loginStatus === 'logged-out') return false;
        return !this.isLoggedIn() && this.auth.token !== undefined;
    }
}
