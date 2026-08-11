"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var src_1 = require("../src");
describe('loadFeature', function () {
    it('should not throw an exception when loadFeature is called with loadRelativePath set to true in the global configuration', function () {
        (0, src_1.setJestCucumberConfiguration)({
            loadRelativePath: true,
        });
        var hasException = false;
        try {
            (0, src_1.loadFeature)('./features/auto-bind-steps.feature');
        }
        catch (e) {
            hasException = true;
        }
        expect(hasException).toBeFalsy();
    });
});
//# sourceMappingURL=parsed-feature-loading.test.js.map