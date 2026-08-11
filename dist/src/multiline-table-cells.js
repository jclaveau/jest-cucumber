"use strict";
/*
 * Gherkin data tables are one physical line per row, which stops being readable as soon as a cell
 * holds a JSON array or a long composite identifier. This module folds two opt-in-by-shape
 * notations back into ordinary Gherkin before the parser ever sees the text:
 *
 *   separator notation, verbose      compact notation
 *   -----------------------------    ------------------------------
 *   | type  | segments           |   | type  | segments           |
 *   |-------|--------------------|   | major | [                  |+   <- opens a row
 *   | major | [                  |   |       |   {"key": "s_1"},  |    <- continues it
 *   |       |   {"key": "s_1"},  |   |       | ]                  |    <- continues it
 *   |       | ]                  |   | minor | []                 |+   <- opens a row
 *   |-------|--------------------|
 *   | minor | []                 |
 *
 * In the separator notation the delimiter line is the row boundary. In the compact notation the
 * "+" marks a row's beginning, so every row carries one on its first line — single-line rows very
 * much included — and a line without one continues the row above. Nothing about a line's cells
 * decides which it is.
 *
 * Both notations keep every line starting with a pipe, which is what GitHub's Gherkin grammar
 * needs to colour them — see specs/gherkin-highlighting for the measurements behind that choice.
 *
 * A table using neither notation is left exactly as it was found.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.foldMultilineTableCells = void 0;
var gherkin_1 = require("@cucumber/gherkin");
var TABLE_LINE = /^\s*\|/;
var IGNORED_BETWEEN_ROWS = /^\s*(#|$)/;
// Matched against the raw text between two pipes, padding included: a rule is drawn tight against
// the pipes ("|-----|", "|-|"), while a "-" used as a placeholder value is padded like every other
// cell ("| - |") and stays data. Getting this wrong is expensive — a row mistaken for a separator
// is dropped AND the rows on either side of it are welded into one.
var SEPARATOR_CELL = /^-+$/;
var DOC_STRING_DELIMITER = /^\s*("""|```)/;
var TRAILING_BACKSLASHES = /\\+$/;
var LANGUAGE_HEADER = /^\s*#\s*language\s*:\s*([\w-]+)\s*$/;
var ROW_START_MARKER = '+';
var splitOnUnescapedPipes = function (line) {
    var parts = [];
    var current = '';
    for (var index = 0; index < line.length; index += 1) {
        var character = line[index];
        if (character === '\\' && index + 1 < line.length) {
            current += character + line[index + 1];
            index += 1;
        }
        else if (character === '|') {
            parts.push(current);
            current = '';
        }
        else {
            current += character;
        }
    }
    parts.push(current);
    return parts;
};
var readTableRowLine = function (line, lineNumber) {
    var parts = splitOnUnescapedPipes(line);
    var indentation = parts[0];
    var trailingText = parts[parts.length - 1].trim();
    var cells = parts.slice(1, -1);
    return {
        lineNumber: lineNumber,
        indentation: indentation,
        cells: cells,
        isSeparator: cells.length > 0 && cells.every(function (cell) { return SEPARATOR_CELL.test(cell); }),
        isMarkedAsRowStart: trailingText === ROW_START_MARKER,
        trailingText: trailingText,
    };
};
/*
 * A cell's value is its fragments joined by a newline, dedented as a block so that a
 * pretty-printed JSON array keeps its inner indentation while the column's own padding goes away.
 * Blank fragments at either end are dropped, so a cell that only carries a value on the logical
 * row's first line reads exactly as it would in a single-line table.
 *
 * The newline is the whole of the contract: what a multiline value means is the step definition's
 * business, so wrapping a scalar over three lines yields the three lines, not the original scalar.
 */
var foldCellFragments = function (fragments) {
    var withoutTrailingSpaces = fragments.map(function (fragment) { return fragment.replace(/\s+$/, ''); });
    var firstFilled = withoutTrailingSpaces.findIndex(function (fragment) { return fragment !== ''; });
    if (firstFilled === -1) {
        return '';
    }
    var lastFilled = withoutTrailingSpaces.reduce(function (last, fragment, index) { return (fragment === '' ? last : index); }, 0);
    var filled = withoutTrailingSpaces.slice(firstFilled, lastFilled + 1);
    var sharedIndentation = filled
        .filter(function (fragment) { return fragment !== ''; })
        .reduce(function (shared, fragment) { return Math.min(shared, fragment.length - fragment.trimStart().length); }, Infinity);
    var dedented = filled.map(function (fragment) { return fragment.slice(sharedIndentation); });
    return dedented
        .map(function (fragment, index) {
        var _a, _b;
        if (index === dedented.length - 1) {
            return fragment;
        }
        // This fragment gets a "\n" appended after it, and that escape opens with a backslash of its
        // own. An odd run of backslashes at the end of the fragment would pair with it and leave a
        // bare "n" instead of a newline, so the run is completed into escaped backslashes.
        var trailingBackslashes = (_b = (_a = TRAILING_BACKSLASHES.exec(fragment)) === null || _a === void 0 ? void 0 : _a[0].length) !== null && _b !== void 0 ? _b : 0;
        return trailingBackslashes % 2 === 0 ? fragment : "".concat(fragment, "\\");
    })
        .join('\\n');
};
var foldLogicalRow = function (rowLines, columnCount) {
    var firstLine = rowLines[0];
    var misshapen = rowLines.find(function (rowLine) { return rowLine.cells.length !== columnCount; });
    if (misshapen) {
        throw new Error("Line ".concat(misshapen.lineNumber, ": expected ").concat(columnCount, " table cells to match the header, got ").concat(misshapen.cells.length));
    }
    var values = Array.from({ length: columnCount }, function (_unused, column) {
        return foldCellFragments(rowLines.map(function (rowLine) { return rowLine.cells[column]; }));
    });
    return "".concat(firstLine.indentation, "| ").concat(values.join(' | '), " |");
};
var groupRowsBySeparator = function (bodyLines) {
    var logicalRows = [];
    var current = [];
    bodyLines.forEach(function (rowLine) {
        if (!rowLine.isSeparator) {
            current.push(rowLine);
            return;
        }
        if (current.length > 0) {
            logicalRows.push(current);
            current = [];
        }
    });
    if (current.length > 0) {
        logicalRows.push(current);
    }
    return logicalRows;
};
var groupRowsByRowStartMarker = function (bodyLines) {
    var logicalRows = [];
    bodyLines.forEach(function (rowLine) {
        if (rowLine.isMarkedAsRowStart) {
            logicalRows.push([rowLine]);
            return;
        }
        var currentRow = logicalRows[logicalRows.length - 1];
        if (!currentRow) {
            throw new Error("Line ".concat(rowLine.lineNumber, ": every row of this table opens with \"|").concat(ROW_START_MARKER, "\", so this line reads as a continuation of the header"));
        }
        currentRow.push(rowLine);
    });
    return logicalRows;
};
var foldTableBlock = function (blockLines, firstLineNumber) {
    var rowLines = blockLines.flatMap(function (line, index) {
        return TABLE_LINE.test(line) ? [readTableRowLine(line, firstLineNumber + index)] : [];
    });
    var usesSeparators = rowLines.some(function (rowLine) { return rowLine.isSeparator; });
    var usesRowStartMarkers = rowLines.some(function (rowLine) { return rowLine.isMarkedAsRowStart; });
    if (usesSeparators && usesRowStartMarkers) {
        var conflicting = rowLines.filter(function (rowLine) { return rowLine.isSeparator || rowLine.isMarkedAsRowStart; });
        throw new Error("Line ".concat(conflicting[1].lineNumber, ": a table cannot mix separator rows and \"|").concat(ROW_START_MARKER, "\" row markers"));
    }
    // Stock Gherkin discards whatever follows a row's last pipe, which is exactly why a mistyped
    // marker is dangerous here: an unmarked row is a continuation, so "|;" would silently weld a row
    // onto the one above it. Inside a table that uses markers, nothing but the marker may follow.
    var strayTrailingText = rowLines.find(function (rowLine) {
        return rowLine.trailingText !== '' &&
            rowLine.trailingText !== ROW_START_MARKER &&
            (usesRowStartMarkers || rowLine.trailingText.startsWith(ROW_START_MARKER));
    });
    if (strayTrailingText) {
        throw new Error("Line ".concat(strayTrailingText.lineNumber, ": expected \"").concat(ROW_START_MARKER, "\" or nothing after a table row's last \"|\", got \"").concat(strayTrailingText.trailingText, "\""));
    }
    if (!usesSeparators && !usesRowStartMarkers) {
        return blockLines;
    }
    var headerLine = rowLines[0], bodyLines = rowLines.slice(1);
    if (headerLine.isSeparator) {
        throw new Error("Line ".concat(headerLine.lineNumber, ": a table cannot open on a separator row"));
    }
    if (headerLine.isMarkedAsRowStart) {
        throw new Error("Line ".concat(headerLine.lineNumber, ": a table header cannot be marked with \"|").concat(ROW_START_MARKER, "\""));
    }
    var logicalRows = usesSeparators ? groupRowsBySeparator(bodyLines) : groupRowsByRowStartMarker(bodyLines);
    // Each logical row is emitted on its own first physical line, and every line it consumed — the
    // continuation lines and the separator rows alike — is blanked rather than removed, so the
    // folded text has the exact line count of the original and every line number still points at
    // the text it used to. Comments and blank lines are left where their author put them.
    var foldedBlock = blockLines.map(function (line, index) { return (index === 0 || !TABLE_LINE.test(line) ? line : ''); });
    logicalRows.forEach(function (logicalRow) {
        foldedBlock[logicalRow[0].lineNumber - firstLineNumber] = foldLogicalRow(logicalRow, headerLine.cells.length);
    });
    return foldedBlock;
};
/*
 * A doc string is a step's argument, so it can only open on a line that follows a step keyword.
 * That is what tells it apart from the free-form description text a Feature, Rule or Scenario may
 * carry, which is arbitrary prose and may perfectly well hold a line of backticks. Reading such a
 * line as a doc string that never closes used to switch folding off for the rest of the file.
 */
var keywordAlternation = function (keywords) {
    return __spreadArray([], keywords, true).sort(function (left, right) { return right.length - left.length; })
        .map(function (keyword) { return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
        .join('|');
};
var dialectOf = function (lines) {
    var header = lines
        .slice(0, Math.max(lines.findIndex(function (line) { return !IGNORED_BETWEEN_ROWS.test(line); }), 0))
        .map(function (line) { var _a; return (_a = LANGUAGE_HEADER.exec(line)) === null || _a === void 0 ? void 0 : _a[1]; })
        .find(function (language) { return language !== undefined; });
    return (header && gherkin_1.dialects[header]) || gherkin_1.dialects.en;
};
var docStringLineNumbers = function (lines) {
    var _a;
    var dialect = dialectOf(lines);
    var stepLine = new RegExp("^\\s*(?:".concat(keywordAlternation(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], dialect.given, true), dialect.when, true), dialect.then, true), dialect.and, true), dialect.but, true)), ")"));
    var blockLine = new RegExp("^\\s*(?:".concat(keywordAlternation(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], dialect.feature, true), dialect.rule, true), dialect.background, true), dialect.scenario, true), dialect.scenarioOutline, true), dialect.examples, true)), ")\\s*:"));
    var insideDocString = new Set();
    var insideStep = false;
    var index = 0;
    var _loop_1 = function () {
        var line = lines[index];
        var delimiter = (_a = DOC_STRING_DELIMITER.exec(line)) === null || _a === void 0 ? void 0 : _a[1];
        if (blockLine.test(line)) {
            insideStep = false;
        }
        else if (stepLine.test(line)) {
            insideStep = true;
        }
        else if (TABLE_LINE.test(line)) {
            // A step carries one argument, so a table rules out a doc string for the same step.
            insideStep = false;
        }
        else if (insideStep && delimiter !== undefined) {
            var opensAt_1 = index;
            var closesAt = lines.findIndex(function (laterLine, laterIndex) { var _a; return laterIndex > opensAt_1 && ((_a = DOC_STRING_DELIMITER.exec(laterLine)) === null || _a === void 0 ? void 0 : _a[1]) === delimiter; });
            var lastLine = closesAt === -1 ? lines.length - 1 : closesAt;
            for (var inside = index; inside <= lastLine; inside += 1) {
                insideDocString.add(inside);
            }
            insideStep = false;
            index = lastLine;
        }
        index += 1;
    };
    while (index < lines.length) {
        _loop_1();
    }
    return insideDocString;
};
var foldMultilineTableCells = function (featureText) {
    var lines = featureText.split('\n');
    var insideDocString = docStringLineNumbers(lines);
    var foldedLines = [];
    var index = 0;
    while (index < lines.length) {
        var line = lines[index];
        if (insideDocString.has(index) || !TABLE_LINE.test(line)) {
            foldedLines.push(line);
            index += 1;
        }
        else {
            // Gherkin ignores comments and blank lines between the rows of a table, so a table stays one
            // block across them and a logical row can be commented mid-way like any other.
            var blockEnd = index;
            while (blockEnd < lines.length &&
                (TABLE_LINE.test(lines[blockEnd]) || IGNORED_BETWEEN_ROWS.test(lines[blockEnd]))) {
                blockEnd += 1;
            }
            foldedLines.push.apply(foldedLines, foldTableBlock(lines.slice(index, blockEnd), index + 1));
            index = blockEnd;
        }
    }
    return foldedLines.join('\n');
};
exports.foldMultilineTableCells = foldMultilineTableCells;
//# sourceMappingURL=multiline-table-cells.js.map