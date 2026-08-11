"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line import/no-extraneous-dependencies
var config_1 = require("vitest/config");
var path_1 = require("path");
// eslint-disable-next-line import/no-default-export
exports.default = (0, config_1.defineConfig)({
    test: {
        globals: false,
        setupFiles: (0, path_1.resolve)(__dirname, './vitest.setup.ts'),
        clearMocks: true,
        css: false,
        reporters: ['basic'],
        include: [(0, path_1.resolve)(__dirname, './specs/**/*.steps.ts')],
    },
});
//# sourceMappingURL=vitest.config.mjs.map