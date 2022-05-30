import {createInstance} from './i18n.js';
import {css, html} from 'lit';
import {ScopedElementsMixin} from '@open-wc/scoped-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Icon} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import metadata from './dbp-template-activity.metadata.json';
import {Activity} from './activity.js';

class StarterActivity extends ScopedElementsMixin(DBPLitElement) {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.activity = new Activity(metadata);
        this.auth = null;
        this.name = null;
        this.entryPointUrl = null;
    }

    static get scopedElements() {
        return {
            'dbp-icon': Icon,
        };
    }

    static get properties() {
        return {
            lang: {type: String},
            auth: {type: Object},
            name: {type: String},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
        };
    }

    connectedCallback() {
        super.connectedCallback();
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'lang':
                    this._i18n.changeLanguage(this.lang);
                    break;
            }
        });

        super.update(changedProperties);
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

    async onClick(event) {
        let response = await fetch(this.entryPointUrl + '/base/people/' + this.auth['user-id'], {
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
        });
        if (!response.ok) {
            throw new Error(response);
        }

        let data = await response.json();
        this.name = `${data['givenName']} ${data['familyName']}`;
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

commonUtils.defineCustomElement('dbp-template-activity', StarterActivity);
