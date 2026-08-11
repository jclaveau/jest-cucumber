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
// Matched against the raw text between two pipes, padding included, so a drawn rule ("|-----|")
// is a separator while a "-" used as a placeholder value ("| - |") stays data. Three dashes
// minimum, for the same reason. Getting this wrong is expensive: a row mistaken for a separator is
// dropped AND the rows on either side of it are welded into one.
const SEPARATOR_CELL = /^-{3,}$/;
const DOC_STRING_DELIMITER = /^\s*("""|```)/;
const ROW_START_MARKER = '+';

type TableRowLine = {
  lineNumber: number;
  indentation: string;
  cells: string[];
  isSeparator: boolean;
  isMarkedAsRowStart: boolean;
  trailingText: string;
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
  const trailingText = parts[parts.length - 1].trim();
  const cells = parts.slice(1, -1);

  return {
    lineNumber,
    indentation,
    cells,
    isSeparator: cells.length > 0 && cells.every(cell => SEPARATOR_CELL.test(cell)),
    isMarkedAsRowStart: trailingText === ROW_START_MARKER,
    trailingText,
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
const foldCellFragments = (fragments: { text: string; lineNumber: number }[]) => {
  const withoutTrailingSpaces = fragments.map(fragment => ({
    ...fragment,
    text: fragment.text.replace(/\s+$/, ''),
  }));

  const firstFilled = withoutTrailingSpaces.findIndex(fragment => fragment.text !== '');

  if (firstFilled === -1) {
    return '';
  }

  const lastFilled = withoutTrailingSpaces.reduce((last, fragment, index) => (fragment.text === '' ? last : index), 0);
  const filled = withoutTrailingSpaces.slice(firstFilled, lastFilled + 1);

  // Only a fragment with another one appended after it grows an escape sequence at the seam, so a
  // trailing backslash is ambiguous there and nowhere else. The last fragment is emitted as it was
  // written, which keeps a Windows path or a regex in the final line of a cell working.
  const danglingEscape = filled.slice(0, -1).find(fragment => /(?:^|[^\\])(?:\\\\)*\\$/.test(fragment.text));

  if (danglingEscape !== undefined) {
    throw new Error(
      `Line ${danglingEscape.lineNumber}: a folded table cell fragment cannot end on a "\\" ("${danglingEscape.text.trim()}")`,
    );
  }

  const sharedIndentation = filled
    .filter(fragment => fragment.text !== '')
    .reduce((shared, { text }) => Math.min(shared, text.length - text.trimStart().length), Infinity);

  return filled.map(fragment => fragment.text.slice(sharedIndentation)).join('\\n');
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
    foldCellFragments(rowLines.map(rowLine => ({ text: rowLine.cells[column], lineNumber: rowLine.lineNumber }))),
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
    const conflicting = rowLines.filter(rowLine => rowLine.isSeparator || rowLine.isMarkedAsRowStart);

    throw new Error(
      `Line ${conflicting[1].lineNumber}: a table cannot mix separator rows and "|${ROW_START_MARKER}" row markers`,
    );
  }

  // Stock Gherkin discards whatever follows a row's last pipe, which is exactly why a mistyped
  // marker is dangerous here: an unmarked row is a continuation, so "|;" would silently weld a row
  // onto the one above it. Inside a table that uses markers, nothing but the marker may follow.
  const strayTrailingText = rowLines.find(
    rowLine =>
      rowLine.trailingText !== '' &&
      rowLine.trailingText !== ROW_START_MARKER &&
      (usesRowStartMarkers || rowLine.trailingText.startsWith(ROW_START_MARKER)),
  );

  if (strayTrailingText) {
    throw new Error(
      `Line ${strayTrailingText.lineNumber}: expected "${ROW_START_MARKER}" or nothing after a table row's last "|", got "${strayTrailingText.trailingText}"`,
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

/*
 * Gherkin lets a Feature, Rule or Scenario carry free-form description text, which may perfectly
 * well contain a line of backticks. Only delimiters that come in a matching pair are treated as a
 * doc string, so a stray fence in prose cannot switch folding off for the rest of the file.
 */
const docStringLineNumbers = (lines: string[]) => {
  const insideDocString = new Set<number>();
  let openedAt: number | null = null;
  let openDelimiter = '';

  lines.forEach((line, index) => {
    const delimiter = DOC_STRING_DELIMITER.exec(line)?.[1];

    if (delimiter === undefined) {
      return;
    }

    if (openedAt === null) {
      openedAt = index;
      openDelimiter = delimiter;
      return;
    }

    if (delimiter !== openDelimiter) {
      return;
    }

    for (let inside = openedAt; inside <= index; inside += 1) {
      insideDocString.add(inside);
    }

    openedAt = null;
  });

  return insideDocString;
};

export const foldMultilineTableCells = (featureText: string) => {
  const lines = featureText.split('\n');
  const insideDocString = docStringLineNumbers(lines);
  const foldedLines: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (insideDocString.has(index) || !TABLE_LINE.test(line)) {
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
