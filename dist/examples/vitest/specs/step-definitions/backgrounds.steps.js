"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line import/no-extraneous-dependencies
var vitest_1 = require("vitest");
var src_1 = require("../../../../src");
var arcade_machine_1 = require("../../src/arcade-machine");
var feature = (0, src_1.loadFeature)('./examples/typescript/specs/features/backgrounds.feature');
(0, src_1.defineFeature)(feature, function (test) {
    var arcadeMachine;
    (0, vitest_1.beforeEach)(function () {
        arcadeMachine = new arcade_machine_1.ArcadeMachine();
    });
    var givenMyMachineIsConfiguredToRequireCoins = function (given) {
        given('my machine is configured to require coins', function () {
            arcadeMachine.requireCoins = true;
        });
    };
    var givenMyMachineIsConfiguredToAcceptUsQuarters = function (given) {
        given('my machine is configured to accept US Quarters', function () {
            arcadeMachine.acceptedCoinType = arcade_machine_1.COIN_TYPES.USQuarter;
        });
    };
    test('Successfully inserting coins', function (_a) {
        var given = _a.given, when = _a.when, then = _a.then;
        givenMyMachineIsConfiguredToRequireCoins(given);
        given('I have not inserted any coins', function () {
            arcadeMachine.balance = 0;
        });
        when('I insert one US quarter', function () {
            arcadeMachine.insertCoin(arcade_machine_1.COIN_TYPES.USQuarter);
        });
        then(/^I should have a balance of (\d+) cents$/, function (balance) {
            arcadeMachine.balance = balance / 100;
        });
    });
    test('Inserting a Canadian coin', function (_a) {
        var given = _a.given, when = _a.when, then = _a.then;
        var coinStatus;
        givenMyMachineIsConfiguredToRequireCoins(given);
        givenMyMachineIsConfiguredToAcceptUsQuarters(given);
        when('I insert a Canadian Quarter', function () {
            coinStatus = arcadeMachine.insertCoin(arcade_machine_1.COIN_TYPES.CanadianQuarter);
        });
        then('my coin should be returned', function () {
            (0, vitest_1.expect)(coinStatus).toBe('CoinReturned');
        });
    });
    test('Inserting a badly damaged coin', function (_a) {
        var given = _a.given, when = _a.when, then = _a.then;
        var coinStatus;
        givenMyMachineIsConfiguredToRequireCoins(given);
        givenMyMachineIsConfiguredToAcceptUsQuarters(given);
        when('I insert a US Quarter that is badly damaged', function () {
            coinStatus = arcadeMachine.insertCoin(arcade_machine_1.COIN_TYPES.Unknown);
        });
        then('my coin should be returned', function () {
            (0, vitest_1.expect)(coinStatus).toBe('CoinReturned');
        });
    });
});
//# sourceMappingURL=backgrounds.steps.js.map