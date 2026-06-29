import {css} from 'lit';

export const VIEW_DEFAULT = 'default';
export const VIEW_RETURN = 'return';
export const VIEW_SELECT = 'select';
export const VIEW_CREATE = 'create';

/**
 * Parses the pathname of a URL into its individual parts.
 *
 * @param {URL} url - The URL object to parse.
 * @returns {string[]} An array of decoded pathname segments.
 */
function parseUrlParts(url) {
    return url.pathname
        .split('/')
        .filter((element) => element !== '')
        .map((element) => decodeURIComponent(element));
}

/**
 * Extract the view from the given routing URL.
 *
 * @param {string} routingUrl - The URL to parse.
 * @returns {string} The view.
 */
export function parseViewRoutingUrl(routingUrl) {
    let url = new URL(routingUrl ?? '', window.location.origin);
    let parts = parseUrlParts(url);
    // test if it starts with any of the valid views via an in array cehck
    if (parts.length > 0 && [VIEW_CREATE, VIEW_SELECT, VIEW_RETURN].includes(parts[0])) {
        return parts[0];
    }
    if (parts.length === 0) {
        return VIEW_DEFAULT;
    }
    throw new Error('Invalid view');
}

/**
 * Parses a "select" routing URL to extract the routing ID.
 *
 * @param {string} routingUrl - The URL to parse.
 * @returns {string|null} The routing ID if found, otherwise null.
 */
export function parseSelectRoutingUrl(routingUrl) {
    let url = new URL(routingUrl ?? '', window.location.origin);
    let parts = parseUrlParts(url);
    if (parts.length < 2 || parts[0] !== VIEW_SELECT) {
        throw new Error('Invalid select URL');
    }
    return parts[1];
}

/**
 * Parses the given routing URL and extracts parameters if the URL path starts
 * with 'create'.
 *
 * @param {string} routingUrl - The routing URL to parse.
 * @returns {object} An object containing the extracted parameters:
 *   - {string} type - The type parameter from the URL.
 *   - {string} data - The data parameter from the URL.
 *   - {string|null} clientIp - The client IP parameter from the URL.
 *   - {string|null} returnUrl - The return URL parameter from the URL.
 *   - {string|null} notifyUrl - The notify URL parameter from the URL.
 *   - {string|null} localIdentifier - The local identifier parameter from the
 *     URL.
 *   - {boolean} authRequired - Indicates if authentication is required.
 */
export function parseCreateRoutingUrl(routingUrl) {
    let url = new URL(routingUrl ?? '', window.location.origin);
    let parts = parseUrlParts(url);
    if (parts.length >= 1 && parts[0] === VIEW_CREATE) {
        let params = url.searchParams;
        return {
            type: params.get('type') ?? '',
            data: params.get('data') ?? '',
            clientIp: params.get('clientIp'),
            returnUrl: params.get('returnUrl'),
            notifyUrl: params.get('notifyUrl'),
            localIdentifier: params.get('localIdentifier'),
            authRequired: !!params.get('authRequired'),
        };
    }
    throw new Error('Invalid create URL');
}

/**
 * Returns the PSP data from the given routing URL starting with 'return'.
 *
 * @param {string} routingUrl - The URL to be parsed.
 * @returns {string} The parsed PSP data.
 */
export function parseReturnRoutingUrl(routingUrl) {
    let url = new URL(routingUrl ?? '', window.location.origin);
    let parts = parseUrlParts(url);
    if (parts.length < 1 || parts[0] !== VIEW_RETURN) {
        throw new Error('Invalid return URL');
    }
    // we just forward everything after the initial "return/"
    return routingUrl.split('/').slice(1).join('/');
}

export function getModalDialogCSS() {
    // language=css
    return css`
        /**************************\\
          Modal Styles
        \\**************************/

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }

        .modal-overlay::before {
            content: '';
            width: 100%;
            height: 100%;
            position: absolute;
            left: 0;
            background-color: var(--dbp-content-surface);
            opacity: 0.6;
        }

        .modal-container {
            background-color: var(--dbp-background);
            max-width: 600px;
            max-height: 100vh;
            min-width: 60%;
            min-height: 50%;
            overflow-y: auto;
            box-sizing: border-box;
            display: grid;
            height: 70%;
            width: 70%;
            position: relative;
            border-radius: var(--dbp-border-radius);
        }

        .modal-close {
            background: transparent;
            border: none;
            font-size: 1.5rem;
            color: var(--dbp-accent);
            cursor: pointer;
            padding: 0px;
            position: relative;
            z-index: 9;
        }

        .modal-close .close-icon svg,
        .close-icon {
            pointer-events: none;
        }

        button.modal-close:focus {
            outline: none;
        }

        .modal-title {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
        }

        .modal-title-icon {
            color: var(--dbp-accent);
            margin-top: -5px;
            font-size: 1.3em;
        }

        .modal-title h2 {
            margin: 0;
            font-weight: 600;
        }

        #filter-modal-box p {
            margin: 0;
            text-align: left;
            padding-left: 20px;
        }

        /**************************\\
          Modal Animation Style
        \\**************************/
        @keyframes mmfadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @keyframes mmfadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }

        @keyframes mmslideIn {
            from {
                transform: translateY(15%);
            }
            to {
                transform: translateY(0);
            }
        }

        @keyframes mmslideOut {
            from {
                transform: translateY(0);
            }
            to {
                transform: translateY(-10%);
            }
        }

        .micromodal-slide {
            display: none;
        }

        .micromodal-slide.is-open {
            display: block;
        }

        .micromodal-slide[aria-hidden='false'] .modal-overlay {
            animation: mmfadeIn 0.3s cubic-bezier(0, 0, 0.2, 1);
        }

        .micromodal-slide[aria-hidden='false'] .modal-container {
            animation: mmslideIn 0.3s cubic-bezier(0, 0, 0.2, 1);
        }

        .micromodal-slide[aria-hidden='true'] .modal-overlay {
            animation: mmfadeOut 0.3s cubic-bezier(0, 0, 0.2, 1);
        }

        .micromodal-slide[aria-hidden='true'] .modal-container {
            animation: mmslideOut 0.3s cubic-bezier(0, 0, 0.2, 1);
        }

        .micromodal-slide .modal-container,
        .micromodal-slide .modal-overlay {
            will-change: transform;
        }

        @media only screen and (orientation: landscape) and (max-width: 768px) {
            .modal-container {
                width: 100%;
                height: 100%;
                max-width: 100%;
            }

            .micromodal-slide .modal-container {
                height: 100%;
                width: 100%;
            }
        }

        @media only screen and (max-width: 768px) {
            .modal-close {
                width: 40px;
                height: 40px;
            }
        }
    `;
}
