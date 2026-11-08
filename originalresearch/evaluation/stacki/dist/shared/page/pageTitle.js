"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.layoutPageTitle = layoutPageTitle;
// Display names come from the page's layout, while route names remain file identities.
const assert_1 = require("../core/assert");
const limits_1 = require("../core/limits");
const htmlText_1 = require("./htmlText");
function layoutPageTitle(nodes, inheritedTitle) {
    (0, assert_1.assert)(nodes.length <= limits_1.LIMITS.treeNodesMax, 'Page title: node count is bounded');
    const layout = nodes.find((node) => node.id === 'layout');
    if (layout?.kind !== 'component') {
        return undefined;
    }
    const title = layout.props?.['title'];
    if (title === undefined) {
        return inheritedTitle;
    }
    if (title?.type !== 'string') {
        // Runtime expressions cannot supply a stable page label without executing site code.
        return undefined;
    }
    (0, assert_1.assert)(title.value.length <= limits_1.LIMITS.attrCharsMax, 'Page title: attribute is bounded');
    const value = (0, htmlText_1.decodeEntities)(title.value).trim();
    return value.length > 0 ? value : undefined;
}
