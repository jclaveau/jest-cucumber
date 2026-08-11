"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var gherkin_1 = require("@cucumber/gherkin");
var uuid_1 = require("uuid");
/*
 * Probe for the "multiline table cells" proposal. No implementation yet: these fixtures only
 * measure, for each candidate syntax, the two properties that decide whether it is usable at all:
 *
 *   - highlighting: whether GitHub still colours the table
 *   - stock parse:  whether `@cucumber/gherkin` still parses the file without a pre-processor
 *
 * GitHub highlights Gherkin with `text.gherkin.feature` from cucumber/cucumber-tmbundle (archived
 * since 2020), vendored by github-linguist/linguist. Its whole notion of a table is one begin/end
 * rule, reproduced verbatim below from
 * https://github.com/cucumber/cucumber-tmbundle/blob/master/Syntaxes/Cucumber%20Plain%20Text%20Feature.tmLanguage
 *
 *     <key>table</key>
 *     <dict>
 *       <key>begin</key><string>^\s*\|</string>
 *       <key>end</key><string>\|\s*$</string>
 *       <key>name</key><string>keyword.control.cucumber.table</string>
 *     </dict>
 *
 * A line that does not match `begin` gets no table scope at all, and therefore renders as plain
 * uncoloured text on github.com. That is the whole of the highlighting question.
 *
 * `end` matters too, but differently: it does not decide whether a line is coloured, it decides
 * where the region stops. A line that matches `begin` but not `end` leaves the region open, so it
 * spans into the following lines until one of them ends on a pipe. Those lines stay coloured — the
 * cost is that a table whose last line never matches `end` bleeds its scope into the rest of the
 * file. `unterminatedTableLines` counts the region-spanning lines, not uncoloured ones.
 */
var TMBUNDLE_TABLE_BEGIN = /^\s*\|/;
var TMBUNDLE_TABLE_END = /\|\s*$/;
var FIXTURES_PATH = (0, path_1.resolve)(__dirname, 'fixtures');
var isTableLine = function (line) { return /^\s*[|+]/.test(line); };
/*
 * Deliberately the raw `@cucumber/gherkin` parser rather than this library's `parseFeature`: the
 * question these fixtures answer is what *stock* Gherkin makes of each notation, and `parseFeature`
 * now folds the separator and continuation-marker notations before parsing them.
 */
var parseWithStockGherkin = function (featureText) {
    var _a, _b, _c, _d, _e;
    var ast = new gherkin_1.Parser(new gherkin_1.AstBuilder(uuid_1.v4), new gherkin_1.GherkinClassicTokenMatcher()).parse(featureText);
    var rows = (_e = (_d = (_c = (_b = (_a = ast.feature) === null || _a === void 0 ? void 0 : _a.children[0]) === null || _b === void 0 ? void 0 : _b.scenario) === null || _c === void 0 ? void 0 : _c.steps[0]) === null || _d === void 0 ? void 0 : _d.dataTable) === null || _e === void 0 ? void 0 : _e.rows;
    if (!rows) {
        throw new Error('this fixture has no data table on its first step');
    }
    var headerRow = rows[0], bodyRows = rows.slice(1);
    var columns = headerRow.cells.map(function (cell) { return cell.value; });
    return bodyRows.map(function (row) { return Object.fromEntries(row.cells.map(function (cell, index) { return [columns[index], cell.value]; })); });
};
var probeFixture = function (fileName) {
    var featureText = (0, fs_1.readFileSync)((0, path_1.resolve)(FIXTURES_PATH, fileName), 'utf8');
    var tableLines = featureText.split('\n').filter(isTableLine);
    var parseError = null;
    var stockRows = [];
    try {
        stockRows = parseWithStockGherkin(featureText);
    }
    catch (err) {
        parseError = err.message;
    }
    return {
        tableLines: tableLines.length,
        highlightedTableLines: tableLines.filter(function (line) { return TMBUNDLE_TABLE_BEGIN.test(line); }).length,
        unterminatedTableLines: tableLines.filter(function (line) { return !TMBUNDLE_TABLE_END.test(line); }).length,
        parseError: parseError,
        stockRows: stockRows,
    };
};
var HEADER_COLUMNS = ['type', 'name', 'enrollment', 'split_by', 'schedule_segments'];
describe('multiline table cell candidate syntaxes', function () {
    it('has one fixture per candidate syntax, plus the stock Gherkin baseline', function () {
        expect((0, fs_1.readdirSync)(FIXTURES_PATH).sort()).toStrictEqual([
            '00-baseline.feature',
            'a-plus-starts-row.feature',
            'c-separator-row.feature',
            'e-trailing-plus-first-line.feature',
        ]);
    });
    it('baseline: stock Gherkin is fully highlighted and parses', function () {
        var probe = probeFixture('00-baseline.feature');
        expect(probe.tableLines).toBe(3);
        expect(probe.highlightedTableLines).toBe(probe.tableLines);
        expect(probe.unterminatedTableLines).toBe(0);
        expect(probe.parseError).toBeNull();
    });
    it('candidate A ("+" starts a row): every logical row loses its highlighting', function () {
        var probe = probeFixture('a-plus-starts-row.feature');
        // The 2 uncoloured lines are exactly the ones opening a logical row, so they are the lines
        // carrying that row's identifying values — the lines a reader scans for.
        expect(probe.tableLines).toBe(8);
        expect(probe.highlightedTableLines).toBe(6);
        expect(probe.parseError).toContain('expected: #EOF, #TableRow, #StepLine, #TagLine, #ExamplesLine');
    });
    it('candidate C (Markdown-style separator rows): fully highlighted, still stock Gherkin', function () {
        var probe = probeFixture('c-separator-row.feature');
        expect(probe.tableLines).toBe(12);
        expect(probe.highlightedTableLines).toBe(probe.tableLines);
        expect(probe.unterminatedTableLines).toBe(0);
        expect(probe.parseError).toBeNull();
        // Parsing is not the same as parsing usefully: the separator lines come back as rows of dashes.
        expect(Object.keys(probe.stockRows[0])).toStrictEqual(HEADER_COLUMNS);
        expect(probe.stockRows[0].type).toBe('-------');
    });
    it('candidate E (a trailing "+" opens a row): invisible to stock Gherkin', function () {
        var probe = probeFixture('e-trailing-plus-first-line.feature');
        expect(probe.tableLines).toBe(9);
        expect(probe.highlightedTableLines).toBe(probe.tableLines);
        // Every one of the 3 row-opening lines ends on "+" rather than on a pipe, so each one's table
        // region stays open until the following line closes it. Coloured, but spanning.
        expect(probe.unterminatedTableLines).toBe(3);
        // Gherkin drops everything after a row's final pipe, so the marker leaves no trace at all: the
        // columns are exactly the declared ones and no cell holds the "+".
        expect(probe.parseError).toBeNull();
        expect(Object.keys(probe.stockRows[0])).toStrictEqual(HEADER_COLUMNS);
        expect(Object.values(probe.stockRows[0])).not.toContain('+');
        expect(probe.stockRows[0]).toStrictEqual({
            type: 'major',
            name: 'Santé',
            enrollment: 'LSpS 1',
            split_by: 'semester',
            schedule_segments: '[',
        });
    });
});
//# sourceMappingURL=highlighting.test.js.map