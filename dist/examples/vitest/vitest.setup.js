"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line import/no-extraneous-dependencies
var vitest_1 = require("vitest");
var src_1 = require("../../src");
(0, src_1.setJestCucumberConfiguration)({
    runner: {
        describe: vitest_1.describe,
        test: vitest_1.test,
    },
});
//# sourceMappingURL=vitest.setup.js.map