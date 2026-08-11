"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesSteps = void 0;
var src_1 = require("../../../../src");
var online_sales_1 = require("../../src/online-sales");
var salesSteps = function (_a) {
    var given = _a.given, when = _a.when, then = _a.then;
    var onlineSales;
    var salesPrice;
    beforeEach(function () {
        onlineSales = new online_sales_1.OnlineSales();
    });
    given(/^I have a\(n\) (.+)$/, function (item) {
        onlineSales.listItem(item);
    });
    when(/^I sell the (.+)$/, function (item) {
        salesPrice = onlineSales.sellItem(item);
    });
    then(/^I should get \$(\d+)$/, function (expectedSalesPrice) {
        expect(salesPrice).toBe(parseInt(expectedSalesPrice, 10));
    });
};
exports.salesSteps = salesSteps;
var feature = (0, src_1.loadFeature)('./examples/typescript/specs/features/scenario-outlines.feature');
(0, src_1.autoBindSteps)([feature], [exports.salesSteps]);
//# sourceMappingURL=auto-step-binding-outline.steps.js.map