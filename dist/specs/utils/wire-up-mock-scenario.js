"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wireUpMockFeature = void 0;
var src_1 = require("../../src");
var feature_definition_creation_1 = require("../../src/feature-definition-creation");
var wireUpMockFeature = function (mockTestRunner, featureFile, mockStepDefinitions, options) {
    var defineMockFeature = (0, feature_definition_creation_1.createDefineFeature)();
    var mockFeature = (0, src_1.parseFeature)(featureFile, __assign(__assign({}, options), { runner: {
            describe: mockTestRunner.describe,
            test: mockTestRunner.test,
        } }));
    if (mockStepDefinitions) {
        mockStepDefinitions(mockFeature, defineMockFeature);
    }
};
exports.wireUpMockFeature = wireUpMockFeature;
//# sourceMappingURL=wire-up-mock-scenario.js.map