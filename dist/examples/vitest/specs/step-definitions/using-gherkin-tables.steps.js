"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line import/no-extraneous-dependencies
var vitest_1 = require("vitest");
var src_1 = require("../../../../src");
var todo_list_1 = require("../../src/todo-list");
var feature = (0, src_1.loadFeature)('./examples/typescript/specs/features/using-gherkin-tables.feature');
(0, src_1.defineFeature)(feature, function (test) {
    var todoList;
    (0, vitest_1.beforeEach)(function () {
        todoList = new todo_list_1.TodoList();
    });
    test('Adding an item to my todo list', function (_a) {
        var given = _a.given, when = _a.when, then = _a.then;
        given('my todo list currently looks as follows:', function (table) {
            table.forEach(function (row) {
                todoList.add({
                    name: row.TaskName,
                    priority: row.Priority,
                });
            });
        });
        when('I add the following task:', function (table) {
            todoList.add({
                name: table[0].TaskName,
                priority: table[0].Priority,
            });
        });
        then('I should see the following todo list:', function (table) {
            (0, vitest_1.expect)(todoList.items).toHaveLength(table.length);
            table.forEach(function (_, index) {
                (0, vitest_1.expect)(todoList.items[index].name).toBe(table[index].TaskName);
                (0, vitest_1.expect)(todoList.items[index].priority).toBe(table[index].Priority);
            });
        });
    });
});
//# sourceMappingURL=using-gherkin-tables.steps.js.map