import {assert, expect} from 'chai';

import '../src/dbp-mono-processpayment';
import '../src/dbp-mono.js';
import {
    parseSelectRoutingUrl,
    parseCreateRoutingUrl,
    parseReturnRoutingUrl,
    parseViewRoutingUrl,
} from '../src/utils.js';

suite('dbp-template-activity basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-mono-processpayment');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    suiteTeardown(() => {
        node.remove();
    });

    test('should render', () => {
        assert(!!node.shadowRoot);
    });
});

suite('parseUrls', () => {
    test('parseSelectRoutingUrl', () => {
        const routingUrl = 'select/12345';
        const result = parseSelectRoutingUrl(routingUrl);
        expect(result).to.equal('12345');
    });

    test('parseSelectRoutingUrl with empty string', () => {
        const routingUrl = '';
        expect(() => parseSelectRoutingUrl(routingUrl)).to.throw();
    });

    test('parseCreateRoutingUrl', () => {
        const routingUrl = 'create?authRequired=1';
        const result = parseCreateRoutingUrl(routingUrl);
        expect(result).to.deep.equal({
            type: '',
            data: '',
            clientIp: null,
            returnUrl: null,
            notifyUrl: null,
            localIdentifier: null,
            authRequired: true,
        });
    });

    test('parseCreateRoutingUrl with empty string', () => {
        const routingUrl = '';
        expect(() => parseCreateRoutingUrl(routingUrl)).to.throw();
    });

    test('parseReturnRoutingUrl', () => {
        const routingUrl = 'return/something/completely/different';
        const result = parseReturnRoutingUrl(routingUrl);
        expect(result).to.equal('something/completely/different');
    });

    test('parseReturnRoutingUrl with empty string', () => {
        const routingUrl = '';
        expect(() => parseReturnRoutingUrl(routingUrl)).to.throw();
    });

    test('parseViewRoutingUrl', () => {
        const routingUrl = 'select/12345';
        const result = parseViewRoutingUrl(routingUrl);
        expect(result).to.equal('select');
    });

    test('parseViewRoutingUrl with empty string', () => {
        const routingUrl = '';
        const result = parseViewRoutingUrl(routingUrl);
        expect(result).to.equal('default');
    });
});
