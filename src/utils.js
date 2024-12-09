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
    return url.pathname.split('/').filter(element => element !== '').map(element => decodeURIComponent(element));
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
    // default to create view for now
    if (parts.length === 0) {
        return VIEW_CREATE;
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
    if (parts.length === 0 || (parts.length >= 1 && parts[0] === VIEW_CREATE)) {
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
    return routingUrl.split("/").slice(1).join("/");
}