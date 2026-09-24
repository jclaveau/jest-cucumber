"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var src_1 = require("../src");
var generate_code_by_line_number_1 = require("../src/code-generation/generate-code-by-line-number");
var multiline_table_cells_1 = require("../src/multiline-table-cells");
var featureWith = function (steps) { return "Feature: Disciplines\n\n  Scenario: Enrolling\n    Given there are the following available disciplines\n".concat(steps, "    Then enrollment is open\n"); };
var rowsOfFirstStep = function (featureText) {
    return (0, src_1.parseFeature)(featureText).scenarios[0].steps[0].stepArgument;
};
var SEPARATOR_TABLE = featureWith("      | type  | enrollment | schedule_segments        |\n      |-------|------------|--------------------------|\n      | major | LSpS 1     | [                        |\n      |       | LSpS       |   {\"key\": \"semester_1\"}, |\n      |       | Bordeaux   |   {\"key\": \"semester_2\"}  |\n      |       |            | ]                        |\n      |-------|------------|--------------------------|\n      | minor | Terminale  | []                       |\n");
var COMPACT_TABLE = featureWith("      | type  | enrollment | schedule_segments        |\n      | major | LSpS 1     | [                        |+\n      |       | LSpS       |   {\"key\": \"semester_1\"}, |\n      |       | Bordeaux   |   {\"key\": \"semester_2\"}  |\n      |       |            | ]                        |\n      | minor | Terminale  | []                       |+\n");
var FOLDED_ROWS = [
    {
        type: 'major',
        enrollment: 'LSpS 1\nLSpS\nBordeaux',
        schedule_segments: '[\n  {"key": "semester_1"},\n  {"key": "semester_2"}\n]',
    },
    { type: 'minor', enrollment: 'Terminale', schedule_segments: '[]' },
];
describe('multiline table cells', function () {
    describe('separator notation', function () {
        it('gives one step argument row per logical row', function () {
            expect(rowsOfFirstStep(SEPARATOR_TABLE)).toStrictEqual(FOLDED_ROWS);
        });
        it('folds a cell into indented JSON that can be parsed back', function () {
            expect(JSON.parse(rowsOfFirstStep(SEPARATOR_TABLE)[0].schedule_segments)).toStrictEqual([
                { key: 'semester_1' },
                { key: 'semester_2' },
            ]);
        });
        it('does not need a separator between the header and the first row', function () {
            var rows = rowsOfFirstStep(featureWith("      | type  | enrollment |\n      | major | LSpS 1     |\n      |       | LSpS       |\n      |-------|------------|\n      | minor | Terminale  |\n"));
            expect(rows).toStrictEqual([
                { type: 'major', enrollment: 'LSpS 1\nLSpS' },
                { type: 'minor', enrollment: 'Terminale' },
            ]);
        });
        it('takes any number of dashes, as long as they touch the pipes', function () {
            var rows = rowsOfFirstStep(featureWith("      | type  | enrollment |\n      |-|-|\n      | major | LSpS 1     |\n      |       | LSpS       |\n      |------|------------|\n      | minor | Terminale  |\n"));
            expect(rows).toStrictEqual([
                { type: 'major', enrollment: 'LSpS 1\nLSpS' },
                { type: 'minor', enrollment: 'Terminale' },
            ]);
        });
        it('tolerates a trailing separator row', function () {
            var rows = rowsOfFirstStep(featureWith("      | type  | enrollment |\n      |-------|------------|\n      | major | LSpS 1     |\n      |-------|------------|\n"));
            expect(rows).toStrictEqual([{ type: 'major', enrollment: 'LSpS 1' }]);
        });
    });
    describe('compact notation', function () {
        it('gives the same rows as the separator notation', function () {
            expect(rowsOfFirstStep(COMPACT_TABLE)).toStrictEqual(FOLDED_ROWS);
            expect(rowsOfFirstStep(COMPACT_TABLE)).toStrictEqual(rowsOfFirstStep(SEPARATOR_TABLE));
        });
        it('marks a single-line row too, so it cannot read as a continuation', function () {
            expect(rowsOfFirstStep(COMPACT_TABLE)[1]).toStrictEqual({
                type: 'minor',
                enrollment: 'Terminale',
                schedule_segments: '[]',
            });
        });
        it('lets a logical row have an empty first cell, since the marker alone opens it', function () {
            var rows = rowsOfFirstStep(featureWith("      | type  | enrollment |\n      | major | LSpS 1     |+\n      |       | LSpS       |\n      |       | Terminale  |+\n"));
            expect(rows).toStrictEqual([
                { type: 'major', enrollment: 'LSpS 1\nLSpS' },
                { type: '', enrollment: 'Terminale' },
            ]);
        });
    });
    describe('a table using neither notation', function () {
        it('is left byte-identical', function () {
            var featureText = featureWith("      | type  | enrollment               | schedule_segments                              |\n      | major | LSpS 1 - LSpS - Bordeaux | [{\"key\": \"semester_1\"}, {\"key\": \"semester_2\"}] |\n      | minor | Terminale                | []                                             |\n");
            expect((0, multiline_table_cells_1.foldMultilineTableCells)(featureText)).toBe(featureText);
        });
        it('still trims its cells the way Gherkin always did', function () {
            var rows = rowsOfFirstStep(featureWith("      | type      | enrollment |\n      |   major   |   LSpS 1   |\n"));
            expect(rows).toStrictEqual([{ type: 'major', enrollment: 'LSpS 1' }]);
        });
    });
    describe('the rest of the feature file', function () {
        it('keeps the line numbers of everything after a folded table', function () {
            var separatorSteps = (0, src_1.parseFeature)(SEPARATOR_TABLE).scenarios[0].steps;
            var compactSteps = (0, src_1.parseFeature)(COMPACT_TABLE).scenarios[0].steps;
            // Both tables hold the same two logical rows, but the separator notation spends two extra
            // physical lines on its delimiters. Each "Then" sits on the line right after its own table,
            // which it only can if folding blanks the consumed lines instead of removing them.
            expect(separatorSteps[0].lineNumber).toBe(4);
            expect(separatorSteps[1].lineNumber).toBe(13);
            expect(compactSteps[0].lineNumber).toBe(4);
            expect(compactSteps[1].lineNumber).toBe(11);
        });
        it('leaves pipe lines inside a doc string alone', function () {
            var featureText = "Feature: Disciplines\n\n  Scenario: Enrolling\n    Given this payload\n      \"\"\"\n      | type  | enrollment |\n      |-------|------------|\n      | major | LSpS 1     |\n      \"\"\"\n";
            expect((0, multiline_table_cells_1.foldMultilineTableCells)(featureText)).toBe(featureText);
            expect((0, src_1.parseFeature)(featureText).scenarios[0].steps[0].stepArgument).toContain('|-------|');
        });
        it('does not let a nested delimiter close a doc string early', function () {
            var featureText = "Feature: Disciplines\n\n  Scenario: Enrolling\n    Given this payload\n      \"\"\"\n      ```\n      | type  | enrollment |\n      | major | LSpS 1     |+\n      ```\n      \"\"\"\n";
            expect((0, multiline_table_cells_1.foldMultilineTableCells)(featureText)).toBe(featureText);
        });
        it('folds an Examples table and substitutes the folded value', function () {
            var outline = (0, src_1.parseFeature)("Feature: Disciplines\n\n  Scenario Outline: Enrolling in <type>\n    Given the segments <segments>\n\n    Examples:\n      | type  | segments                 |\n      | major | [                        |+\n      |       |   {\"key\": \"semester_1\"}, |\n      |       |   {\"key\": \"semester_2\"}  |\n      |       | ]                        |\n").scenarioOutlines[0];
            expect(outline.scenarios).toHaveLength(1);
            expect(outline.scenarios[0].title).toBe('Enrolling in major');
            expect(outline.scenarios[0].steps[0].stepText).toBe('the segments [\n  {"key": "semester_1"},\n  {"key": "semester_2"}\n]');
        });
    });
    describe('the rest of the library', function () {
        // The two fixtures the highlighting probe measures are also the two notations that shipped, so
        // they double as the on-disk feature files this reads through the public `loadFeature`.
        it.each([
            ['separator notation', './specs/gherkin-highlighting/fixtures/c-separator-row.feature'],
            ['compact notation', './specs/gherkin-highlighting/fixtures/e-trailing-plus-first-line.feature'],
        ])('folds a %s table read off disk by loadFeature', function (_notation, featureFilePath) {
            var rows = (0, src_1.loadFeature)(featureFilePath, { loadRelativePath: false }).scenarios[0].steps[0]
                .stepArgument;
            expect(rows[0]).toStrictEqual({
                type: 'major',
                name: 'Santé',
                enrollment: 'LSpS 1\nLSpS\nBordeaux',
                split_by: 'semester',
                schedule_segments: '[\n  {"key": "semester_1"},\n  {"key": "semester_2"}\n]',
            });
        });
        it('folds a table written in another spoken language', function () {
            var step = (0, src_1.parseFeature)("# language: fr\nFonctionnalit\u00E9: Disciplines\n\n  Sc\u00E9nario: Inscription\n    Soit les disciplines suivantes\n      | type  | segments |\n      | major | [        |+\n      |       |   1,     |\n      |       | ]        |\n").scenarios[0].steps[0];
            expect(step.keyword).toBe('given');
            expect(step.stepArgument).toStrictEqual([{ type: 'major', segments: '[\n  1,\n]' }]);
        });
        it('generates step code for the line the folded table opens on', function () {
            // Code generation addresses steps by line number, so it only lands on the right step because
            // folding blanks the lines a logical row consumed instead of removing them.
            expect((0, generate_code_by_line_number_1.generateCodeFromFeature)((0, src_1.parseFeature)(COMPACT_TABLE), 4)).toBe("given('there are the following available disciplines', (table) => {\n\n});");
            expect((0, generate_code_by_line_number_1.generateCodeFromFeature)((0, src_1.parseFeature)(COMPACT_TABLE), 11)).toBe("then('enrollment is open', () => {\n\n});");
        });
    });
    describe('comments and blank lines between rows', function () {
        it('do not break a logical row they sit inside', function () {
            var rows = rowsOfFirstStep(featureWith("      | type  | enrollment |\n      | major | LSpS 1     |+\n      # the campus moved\n      |       | LSpS       |\n\n      |       | Bordeaux   |\n      | minor | Terminale  |+\n"));
            expect(rows).toStrictEqual([
                { type: 'major', enrollment: 'LSpS 1\nLSpS\nBordeaux' },
                { type: 'minor', enrollment: 'Terminale' },
            ]);
        });
        it('do not break a table delimited by separator rows', function () {
            var rows = rowsOfFirstStep(featureWith("      | type  | enrollment |\n      | major | LSpS 1     |\n      # the campus moved\n      |       | LSpS       |\n      |-------|------------|\n      | minor | Terminale  |\n"));
            expect(rows).toStrictEqual([
                { type: 'major', enrollment: 'LSpS 1\nLSpS' },
                { type: 'minor', enrollment: 'Terminale' },
            ]);
        });
        it('stay on their own line, so line numbers still hold', function () {
            var steps = (0, src_1.parseFeature)(featureWith("      | type  | enrollment |\n      | major | LSpS 1     |+\n      # the campus moved\n      |       | LSpS       |\n")).scenarios[0].steps;
            expect(steps[1].lineNumber).toBe(9);
        });
        it('leave a table using neither notation byte-identical', function () {
            var featureText = featureWith("      | type  | enrollment |\n      | major | LSpS 1     |\n      # the campus moved\n      | minor | Terminale  |\n");
            expect((0, multiline_table_cells_1.foldMultilineTableCells)(featureText)).toBe(featureText);
        });
        it('come out unchanged when they merely follow a table', function () {
            var featureText = "Feature: Disciplines\n\n  Scenario: Enrolling\n    Given there are the following available disciplines\n      | type  | enrollment |\n      | major | LSpS 1     |+\n      |       | LSpS       |\n\n    # about what comes next\n    Then enrollment is open\n";
            expect((0, multiline_table_cells_1.foldMultilineTableCells)(featureText).split('\n').slice(7)).toStrictEqual([
                '',
                '    # about what comes next',
                '    Then enrollment is open',
                '',
            ]);
        });
    });
    describe('cell contents', function () {
        it('keeps an escaped pipe and an escaped backslash', function () {
            var rows = rowsOfFirstStep(featureWith("      | type  | pattern   |\n      | major | a\\|b      |+\n      |       | c\\\\d      |\n"));
            expect(rows).toStrictEqual([{ type: 'major', pattern: 'a|b\nc\\d' }]);
        });
        it('escapes a trailing backslash when another fragment follows it', function () {
            // The "\n" joining two fragments opens with a backslash of its own, so an odd run at the end
            // of a fragment would pair with it and leave a bare "n" where the newline should be.
            expect(rowsOfFirstStep(featureWith("      | path     |\n      | C:\\dir\\  |+\n      | next     |\n"))).toStrictEqual([{ path: 'C:\\dir\\\nnext' }]);
        });
        it('leaves an already escaped trailing backslash alone', function () {
            expect(rowsOfFirstStep(featureWith("      | path      |\n      | C:\\dir\\\\  |+\n      | next      |\n"))).toStrictEqual([{ path: 'C:\\dir\\\nnext' }]);
        });
        it('keeps a blank fragment between two filled ones', function () {
            var rows = rowsOfFirstStep(featureWith("      | type  | notes |\n      | major | first |+\n      |       |       |\n      |       | third |\n"));
            expect(rows).toStrictEqual([{ type: 'major', notes: 'first\n\nthird' }]);
        });
        it('gives an empty string for a cell that is blank on every line', function () {
            var rows = rowsOfFirstStep(featureWith("      | type  | notes | enrollment |\n      | major |       | LSpS 1     |+\n      |       |       | LSpS       |\n"));
            expect(rows).toStrictEqual([{ type: 'major', notes: '', enrollment: 'LSpS 1\nLSpS' }]);
        });
    });
    describe('leaves alone what only looks like the notations', function () {
        it('treats a "-" placeholder row as data, not as a separator', function () {
            var featureText = featureWith("      | type  | enrollment |\n      | major | LSpS 1     |\n      | -     | -          |\n      | minor | Terminale  |\n");
            // Mistaking this row for a separator would drop it AND weld its neighbours into one row.
            expect((0, multiline_table_cells_1.foldMultilineTableCells)(featureText)).toBe(featureText);
            expect(rowsOfFirstStep(featureText)).toStrictEqual([
                { type: 'major', enrollment: 'LSpS 1' },
                { type: '-', enrollment: '-' },
                { type: 'minor', enrollment: 'Terminale' },
            ]);
        });
        it('treats a "-" cell in a single-column table as data', function () {
            expect(rowsOfFirstStep(featureWith("      | enrollment |\n      | LSpS 1     |\n      | -          |\n      | Terminale  |\n"))).toStrictEqual([{ enrollment: 'LSpS 1' }, { enrollment: '-' }, { enrollment: 'Terminale' }]);
        });
        it('keeps folding after an unpaired fence in a description', function () {
            // A Feature description is free-form text and may hold a line of backticks. Treating it as a
            // doc string that never closes used to switch folding off for the rest of the file.
            var outline = (0, src_1.parseFeature)("Feature: Disciplines\n  ```\n  not a doc string, just prose\n\n  Scenario: Enrolling\n    Given there are the following available disciplines\n      | type  | segments |\n      | major | [        |+\n      |       | ]        |\n");
            expect(outline.scenarios[0].steps[0].stepArgument).toStrictEqual([{ type: 'major', segments: '[\n]' }]);
        });
        it('tells a prose fence apart from the real doc string that follows it', function () {
            // A doc string is a step's argument, so it can only open after a step keyword. Pairing
            // delimiters off instead used to mispair the prose fence with the real opener.
            var steps = (0, src_1.parseFeature)("Feature: Disciplines\n  ```\n  prose in the description, not a doc string\n\n  Scenario: Enrolling\n    Given this payload\n      \"\"\"\n      | not | a | table |\n      \"\"\"\n    And there are the following available disciplines\n      | type  | segments |\n      | major | [        |+\n      |       | ]        |\n").scenarios[0].steps;
            expect(steps[0].stepArgument).toBe('| not | a | table |');
            expect(steps[1].stepArgument).toStrictEqual([{ type: 'major', segments: '[\n]' }]);
        });
        it('reads the step keywords of the declared spoken language', function () {
            var step = (0, src_1.parseFeature)("# language: fr\nFonctionnalit\u00E9: Disciplines\n  ```\n  de la prose\n\n  Sc\u00E9nario: Inscription\n    Soit les disciplines suivantes\n      | type  | segments |\n      | major | [        |+\n      |       | ]        |\n").scenarios[0].steps[0];
            expect(step.stepArgument).toStrictEqual([{ type: 'major', segments: '[\n]' }]);
        });
        it('leaves an unterminated doc string to the parser rather than mangling it', function () {
            var featureText = "Feature: Disciplines\n\n  Scenario: Enrolling\n    Given this payload\n      \"\"\"\n      | type  | segments |\n      | major | [        |+\n";
            expect((0, multiline_table_cells_1.foldMultilineTableCells)(featureText)).toBe(featureText);
            expect(function () { return (0, src_1.parseFeature)(featureText); }).toThrow('Error parsing feature Gherkin');
        });
        it('keeps a trailing backslash in the last fragment of a cell', function () {
            // Nothing is appended after the last fragment, so it is emitted exactly as written.
            expect(rowsOfFirstStep(featureWith("      | path      | segments |\n      | C:\\dir\\   | [        |+\n      |           | ]        |\n"))).toStrictEqual([{ path: 'C:\\dir\\', segments: '[\n]' }]);
        });
    });
    describe('rejects an ambiguous table', function () {
        var foldingError = function (steps) {
            try {
                (0, multiline_table_cells_1.foldMultilineTableCells)(featureWith(steps));
            }
            catch (err) {
                return err.message;
            }
            return null;
        };
        it('when it mixes both notations', function () {
            expect(foldingError("      | type  | enrollment |\n      |-------|------------|\n      | major | LSpS 1     |+\n      |       | LSpS       |\n")).toBe('Line 7: a table cannot mix separator rows and "|+" row markers');
        });
        it('when the first body row is not marked, so it continues the header', function () {
            expect(foldingError("      | type  | enrollment |\n      | major | LSpS 1     |\n      | minor | Terminale  |+\n")).toBe('Line 6: every row of this table opens with "|+", so this line reads as a continuation of the header');
        });
        it('when the header itself is marked', function () {
            expect(foldingError("      | type  | enrollment |+\n      |       | LSpS 1     |\n")).toBe('Line 5: a table header cannot be marked with "|+"');
        });
        it('when the table opens on a separator row', function () {
            expect(foldingError("      |-------|------------|\n      | major | LSpS 1     |\n")).toBe('Line 5: a table cannot open on a separator row');
        });
        it('when a continuation row has a different number of cells', function () {
            expect(foldingError("      | type  | enrollment |\n      | major | LSpS 1     |+\n      |       | LSpS       | Bordeaux |\n")).toBe('Line 7: expected 2 table cells to match the header, got 3');
        });
        it('when something other than the marker follows the last pipe', function () {
            expect(foldingError("      | type  | enrollment |\n      | major | LSpS 1     |++\n      |       | LSpS       |\n")).toBe('Line 6: expected "+" or nothing after a table row\'s last "|", got "++"');
        });
        it('when a row marker is mistyped, rather than reading the row as a continuation', function () {
            expect(foldingError("      | type  | enrollment |\n      | major | LSpS 1     |+\n      |       | LSpS       |\n      | minor | Terminale  |;\n      | other | Bordeaux   |+\n")).toBe('Line 8: expected "+" or nothing after a table row\'s last "|", got ";"');
        });
    });
});
//# sourceMappingURL=multiline-table-cells.test.js.map