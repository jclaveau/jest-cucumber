"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendingMachineSteps = void 0;
// eslint-disable-next-line import/no-extraneous-dependencies
var vitest_1 = require("vitest");
var src_1 = require("../../../../../src");
var vending_machine_1 = require("../../../src/vending-machine");
var vendingMachineSteps = function (_a) {
    var given = _a.given, and = _a.and, when = _a.when, then = _a.then, context = _a.context;
    given(/^the vending machine has "(.*)" in stock$/, function (itemName) {
        context.vendingMachine = new vending_machine_1.VendingMachine();
        context.vendingMachine.stockItem(itemName, 1);
    });
    and('I have inserted the correct amount of money', function () {
        context.vendingMachine.insertMoney(0.5);
    });
    when(/^I purchase "(.*)"$/, function (itemName) {
        context.vendingMachine.dispenseItem(itemName);
    });
    then(/^my "(.*)" should be dispensed$/, function (itemName) {
        var inventoryAmount = context.vendingMachine.items[itemName];
        (0, vitest_1.expect)(inventoryAmount).toBe(0);
    });
};
exports.vendingMachineSteps = vendingMachineSteps;
var features = (0, src_1.loadFeature)('./examples/typescript/specs/features/auto-binding/snack-vending-machine.feature');
(0, src_1.autoBindSteps)(features, [exports.vendingMachineSteps]);
//# sourceMappingURL=auto-step-binding-snack-vending-use-context.steps.js.map