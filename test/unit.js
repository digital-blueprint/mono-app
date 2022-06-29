import {assert} from 'chai';

import '../src/dbp-mono-paymentmethod';
import '../src/dbp-mono.js';

suite('dbp-template-activity basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-mono-paymentmethod');
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
