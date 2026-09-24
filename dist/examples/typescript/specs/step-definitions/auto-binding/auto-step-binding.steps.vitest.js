"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendingMachineSteps = void 0;
var vitest_1 = require("vitest");
var src_1 = require("../../../../../src");
var vending_machine_1 = require("../../../src/vending-machine");
var vendingMachineSteps = function (_a) {
    var given = _a.given, and = _a.and, when = _a.when, then = _a.then;
    var vendingMachine;
    given(/^the vending machine has "(.*)" in stock$/, function (itemName) {
        vendingMachine = new vending_machine_1.VendingMachine();
        vendingMachine.stockItem(itemName, 1);
    });
    and('I have inserted the correct amount of money', function () {
        vendingMachine.insertMoney(0.5);
    });
    when(/^I purchase "(.*)"$/, function (itemName) {
        vendingMachine.dispenseItem(itemName);
    });
    then(/^my "(.*)" should be dispensed$/, function (itemName) {
        var inventoryAmount = vendingMachine.items[itemName];
        (0, vitest_1.expect)(inventoryAmount).toBe(0);
    });
};
exports.vendingMachineSteps = vendingMachineSteps;
var features = (0, src_1.loadFeatures)('./examples/typescript/specs/features/auto-binding/**/*.feature');
(0, src_1.autoBindSteps)(features, [exports.vendingMachineSteps]);
//# sourceMappingURL=auto-step-binding.steps.vitest.js.map