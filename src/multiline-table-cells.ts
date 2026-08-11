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

const TABLE_LINE = /^\s*\|/;
const IGNORED_BETWEEN_ROWS = /^\s*(#|$)/;
// An all-dashes row is always a delimiter, with no way to opt out and read it back as data: it
// would take a table whose every column holds nothing but dashes, which nobody writes.
const SEPARATOR_CELL = /^-+$/;
const DOC_STRING_DELIMITER = /^\s*("""|```)/;
const ROW_START_MARKER = '+';

type TableRowLine = {
  lineNumber: number;
  indentation: string;
  cells: string[];
  isSeparator: boolean;
  isMarkedAsRowStart: boolean;
};

const splitOnUnescapedPipes = (line: string) => {
  const parts: string[] = [];
  let current = '';

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '\\' && index + 1 < line.length) {
      current += character + line[index + 1];
      index += 1;
    } else if (character === '|') {
      parts.push(current);
      current = '';
    } else {
      current += character;
    }
  }

  parts.push(current);

  return parts;
};

const readTableRowLine = (line: string, lineNumber: number): TableRowLine => {
  const parts = splitOnUnescapedPipes(line);
  const indentation = parts[0];
  const afterLastPipe = parts[parts.length - 1].trim();
  const cells = parts.slice(1, -1);

  if (afterLastPipe !== '' && afterLastPipe !== ROW_START_MARKER && afterLastPipe.startsWith(ROW_START_MARKER)) {
    throw new Error(
      `Line ${lineNumber}: expected "${ROW_START_MARKER}" or nothing after a table row's last "|", got "${afterLastPipe}"`,
    );
  }

  return {
    lineNumber,
    indentation,
    cells,
    isSeparator: cells.length > 0 && cells.every(cell => SEPARATOR_CELL.test(cell.trim())),
    isMarkedAsRowStart: afterLastPipe === ROW_START_MARKER,
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
const foldCellFragments = (fragments: string[], lineNumber: number) => {
  const withoutTrailingSpaces = fragments.map(fragment => fragment.replace(/\s+$/, ''));

  const firstFilled = withoutTrailingSpaces.findIndex(fragment => fragment !== '');

  if (firstFilled === -1) {
    return '';
  }

  const lastFilled = withoutTrailingSpaces.reduce((last, fragment, index) => (fragment === '' ? last : index), 0);
  const filled = withoutTrailingSpaces.slice(firstFilled, lastFilled + 1);

  const danglingEscape = filled.find(fragment => /(?:^|[^\\])(?:\\\\)*\\$/.test(fragment));

  if (danglingEscape !== undefined) {
    throw new Error(
      `Line ${lineNumber}: a folded table cell fragment cannot end on a "\\" ("${danglingEscape.trim()}")`,
    );
  }

  const sharedIndentation = filled
    .filter(fragment => fragment !== '')
    .reduce((shared, fragment) => Math.min(shared, fragment.length - fragment.trimStart().length), Infinity);

  return filled.map(fragment => fragment.slice(sharedIndentation)).join('\\n');
};

const foldLogicalRow = (rowLines: TableRowLine[], columnCount: number) => {
  const [firstLine] = rowLines;

  const misshapen = rowLines.find(rowLine => rowLine.cells.length !== columnCount);

  if (misshapen) {
    throw new Error(
      `Line ${misshapen.lineNumber}: expected ${columnCount} table cells to match the header, got ${misshapen.cells.length}`,
    );
  }

  const values = Array.from({ length: columnCount }, (_unused, column) =>
    foldCellFragments(
      rowLines.map(rowLine => rowLine.cells[column]),
      firstLine.lineNumber,
    ),
  );

  return `${firstLine.indentation}| ${values.join(' | ')} |`;
};

const groupRowsBySeparator = (bodyLines: TableRowLine[]) => {
  const logicalRows: TableRowLine[][] = [];
  let current: TableRowLine[] = [];

  bodyLines.forEach(rowLine => {
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

const groupRowsByRowStartMarker = (bodyLines: TableRowLine[]) => {
  const logicalRows: TableRowLine[][] = [];

  bodyLines.forEach(rowLine => {
    if (rowLine.isMarkedAsRowStart) {
      logicalRows.push([rowLine]);
      return;
    }

    const currentRow = logicalRows[logicalRows.length - 1];

    if (!currentRow) {
      throw new Error(
        `Line ${rowLine.lineNumber}: every row of this table opens with "|${ROW_START_MARKER}", so this line reads as a continuation of the header`,
      );
    }

    currentRow.push(rowLine);
  });

  return logicalRows;
};

const foldTableBlock = (blockLines: string[], firstLineNumber: number) => {
  const rowLines = blockLines.flatMap((line, index) =>
    TABLE_LINE.test(line) ? [readTableRowLine(line, firstLineNumber + index)] : [],
  );

  const usesSeparators = rowLines.some(rowLine => rowLine.isSeparator);
  const usesRowStartMarkers = rowLines.some(rowLine => rowLine.isMarkedAsRowStart);

  if (usesSeparators && usesRowStartMarkers) {
    throw new Error(
      `Line ${firstLineNumber}: a table cannot mix separator rows and "|${ROW_START_MARKER}" row markers`,
    );
  }

  if (!usesSeparators && !usesRowStartMarkers) {
    return blockLines;
  }

  const [headerLine, ...bodyLines] = rowLines;

  if (headerLine.isSeparator) {
    throw new Error(`Line ${headerLine.lineNumber}: a table cannot open on a separator row`);
  }

  if (headerLine.isMarkedAsRowStart) {
    throw new Error(`Line ${headerLine.lineNumber}: a table header cannot be marked with "|${ROW_START_MARKER}"`);
  }

  const logicalRows = usesSeparators ? groupRowsBySeparator(bodyLines) : groupRowsByRowStartMarker(bodyLines);

  // Each logical row is emitted on its own first physical line, and every line it consumed — the
  // continuation lines and the separator rows alike — is blanked rather than removed, so the
  // folded text has the exact line count of the original and every line number still points at
  // the text it used to. Comments and blank lines are left where their author put them.
  const foldedBlock = blockLines.map((line, index) => (index === 0 || !TABLE_LINE.test(line) ? line : ''));

  logicalRows.forEach(logicalRow => {
    foldedBlock[logicalRow[0].lineNumber - firstLineNumber] = foldLogicalRow(logicalRow, headerLine.cells.length);
  });

  return foldedBlock;
};

export const foldMultilineTableCells = (featureText: string) => {
  const lines = featureText.split('\n');
  const foldedLines: string[] = [];
  let docStringDelimiter: string | null = null;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const docStringMatch = DOC_STRING_DELIMITER.exec(line);

    if (docStringMatch) {
      docStringDelimiter = docStringDelimiter === docStringMatch[1] ? null : (docStringDelimiter ?? docStringMatch[1]);
    }

    if (docStringDelimiter !== null || !TABLE_LINE.test(line)) {
      foldedLines.push(line);
      index += 1;
    } else {
      // Gherkin ignores comments and blank lines between the rows of a table, so a table stays one
      // block across them and a logical row can be commented mid-way like any other.
      let blockEnd = index;

      while (
        blockEnd < lines.length &&
        (TABLE_LINE.test(lines[blockEnd]) || IGNORED_BETWEEN_ROWS.test(lines[blockEnd]))
      ) {
        blockEnd += 1;
      }

      foldedLines.push(...foldTableBlock(lines.slice(index, blockEnd), index + 1));
      index = blockEnd;
    }
  }

  return foldedLines.join('\n');
};
