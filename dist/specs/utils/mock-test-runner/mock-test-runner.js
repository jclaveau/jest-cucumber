"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTestRunner = void 0;
var mock_describe_block_1 = require("./mock-describe-block");
var mock_test_1 = require("./mock-test");
var MockTestRunner = /** @class */ (function () {
    function MockTestRunner() {
        this.rootDescribeBlock = new mock_describe_block_1.MockDescribeBlock(null, false, false, false);
        this.currentDescribeBlock = this.rootDescribeBlock;
    }
    Object.defineProperty(MockTestRunner.prototype, "describe", {
        get: function () {
            var _this = this;
            var createDescribeFunc = function (skip, concurrent, only) {
                return function (description, func) {
                    var newDescribeBlock = new mock_describe_block_1.MockDescribeBlock(description, skip, concurrent, only);
                    _this.currentDescribeBlock.children.push(newDescribeBlock);
                    _this.currentDescribeBlock = newDescribeBlock;
                    func();
                };
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var describeFunc = createDescribeFunc(false, false, false);
            describeFunc.only = createDescribeFunc(false, false, true);
            describeFunc.skip = createDescribeFunc(true, false, false);
            describeFunc.concurrent = createDescribeFunc(false, true, false);
            describeFunc.each = function () {
                throw new Error('Not implemented');
            };
            return describeFunc;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(MockTestRunner.prototype, "test", {
        get: function () {
            var _this = this;
            var createTestFunc = function (skip, concurrent, only) {
                return function (description, func) {
                    _this.currentDescribeBlock.children.push(new mock_test_1.MockTest(description, func, skip, concurrent, only));
                };
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var testFunc = createTestFunc(false, false, false);
            testFunc.only = createTestFunc(false, false, true);
            testFunc.skip = createTestFunc(true, false, false);
            testFunc.concurrent = createTestFunc(false, true, false);
            testFunc.each = function () {
                throw new Error('Not implemented');
            };
            return testFunc;
        },
        enumerable: false,
        configurable: true
    });
    MockTestRunner.prototype.execute = function (describeBlock) {
        var _this = this;
        if (!describeBlock) {
            // eslint-disable-next-line no-param-reassign
            describeBlock = this.rootDescribeBlock;
        }
        var testOutputs = describeBlock.children.map(function (child) {
            if (child instanceof mock_test_1.MockTest) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                var cb = function () {
                    throw new Error('Callbacks not supported');
                };
                cb.fail = function () {
                    throw new Error('Callback failure (callbacks not supported)');
                };
                return child.executionFunc(cb);
            }
            if (child instanceof mock_describe_block_1.MockDescribeBlock) {
                return _this.execute(child);
            }
            return null;
        });
        var testPromises = testOutputs.filter(function (testOutput) {
            if (testOutput.then !== undefined) {
                return true;
            }
            return false;
        });
        if (!testPromises.length) {
            testPromises.push(Promise.resolve());
        }
        return Promise.all(testPromises);
    };
    return MockTestRunner;
}());
exports.MockTestRunner = MockTestRunner;
//# sourceMappingURL=mock-test-runner.js.map