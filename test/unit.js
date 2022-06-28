import {assert} from 'chai';

import '../src/dbp-template-activity';
import '../src/dbp-mono.js';

suite('dbp-template-activity basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-template-activity');
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
