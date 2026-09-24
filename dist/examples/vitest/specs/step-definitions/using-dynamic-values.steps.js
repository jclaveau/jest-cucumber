"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line import/no-extraneous-dependencies
var vitest_1 = require("vitest");
var src_1 = require("../../../../src");
var bank_account_1 = require("../../src/bank-account");
var feature = (0, src_1.loadFeature)('./examples/typescript/specs/features/using-dynamic-values.feature');
(0, src_1.defineFeature)(feature, function (test) {
    var myAccount;
    (0, vitest_1.beforeEach)(function () {
        myAccount = new bank_account_1.BankAccount();
    });
    test('Depositing a paycheck', function (_a) {
        var given = _a.given, when = _a.when, then = _a.then;
        given(/^my account balance is \$(\d+)$/, function (balance) {
            myAccount.deposit(parseInt(balance, 10));
        });
        when(/^I get paid \$(\d+) for writing some awesome code$/, function (paycheck) {
            myAccount.deposit(parseInt(paycheck, 10));
        });
        then(/^my account balance should be \$(\d+)$/, function (expectedBalance) {
            (0, vitest_1.expect)(myAccount.balance).toBe(parseInt(expectedBalance, 10));
        });
    });
});
//# sourceMappingURL=using-dynamic-values.steps.js.map