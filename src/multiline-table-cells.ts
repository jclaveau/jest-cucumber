/*
 * Gherkin data tables are one physical line per row, which stops being readable as soon as a cell
 * holds a JSON array or a long composite identifier. This module folds two opt-in-by-shape
 * notations back into ordinary Gherkin before the parser ever sees the text:
 *
 *   separator notation, verbose      compact notation
 *   -----------------------------    ------------------------------
 *   | type  | segments           |   | type  | segments           |
 *   |-------|--------------------|   | major | [                  |+
 *   | major | [                  |   |       |   {"key": "s_1"},  |
 *   |       |   {"key": "s_1"},  |   |       | ]                  |
 *   |       | ]                  |   | minor | []                 |
 *   |-------|--------------------|
 *   | minor | []                 |
 *
 * Both notations keep every line starting with a pipe, which is what GitHub's Gherkin grammar
 * needs to colour them — see specs/gherkin-highlighting for the measurements behind that choice.
 *
 * A table using neither notation is left exactly as it was found.
 */

const TABLE_LINE = /^\s*\|/;
const IGNORED_BETWEEN_ROWS = /^\s*(#|$)/;
const SEPARATOR_CELL = /^-+$/;
const DOC_STRING_DELIMITER = /^\s*("""|```)/;
const CONTINUATION_MARKER = '+';

type TableRowLine = {
  lineNumber: number;
  indentation: string;
  cells: string[];
  isSeparator: boolean;
  isMarkedAsContinued: boolean;
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

  if (afterLastPipe !== '' && afterLastPipe !== CONTINUATION_MARKER && afterLastPipe.startsWith(CONTINUATION_MARKER)) {
    throw new Error(
      `Line ${lineNumber}: expected "${CONTINUATION_MARKER}" or nothing after a table row's last "|", got "${afterLastPipe}"`,
    );
  }

  return {
    lineNumber,
    indentation,
    cells,
    isSeparator: cells.length > 0 && cells.every(cell => SEPARATOR_CELL.test(cell.trim())),
    isMarkedAsContinued: afterLastPipe === CONTINUATION_MARKER,
  };
};

/*
 * A cell's value is its fragments joined by a newline, dedented as a block so that a
 * pretty-printed JSON array keeps its inner indentation while the column's own padding goes away.
 * Blank fragments at either end are dropped, so a cell that only carries a value on the logical
 * row's first line reads exactly as it would in a single-line table.
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

const groupRowsByContinuationMarker = (bodyLines: TableRowLine[]) => {
  const logicalRows: TableRowLine[][] = [];

  bodyLines.forEach(rowLine => {
    const opensARow = rowLine.cells.length === 0 || rowLine.cells[0].trim() !== '';
    const currentRow = logicalRows[logicalRows.length - 1];

    if (opensARow) {
      logicalRows.push([rowLine]);
      return;
    }

    if (!currentRow) {
      throw new Error(
        `Line ${rowLine.lineNumber}: a continuation row must follow a row marked with "|${CONTINUATION_MARKER}"`,
      );
    }

    if (!currentRow[0].isMarkedAsContinued) {
      throw new Error(
        `Line ${rowLine.lineNumber}: continues line ${currentRow[0].lineNumber}, which is not marked with "|${CONTINUATION_MARKER}"`,
      );
    }

    // Marking every line of a row, the way a trailing backslash works in a shell, would read as
    // "joins with the next line" and so would disagree with this notation about where the row
    // ends. Only the row's first line carries the marker, and anything else is rejected rather
    // than quietly reinterpreted.
    if (rowLine.isMarkedAsContinued) {
      throw new Error(
        `Line ${rowLine.lineNumber}: only a logical row's first line carries "|${CONTINUATION_MARKER}", not its continuation rows`,
      );
    }

    currentRow.push(rowLine);
  });

  const emptyPromise = logicalRows.find(rowLines => rowLines[0].isMarkedAsContinued && rowLines.length === 1);

  if (emptyPromise) {
    throw new Error(
      `Line ${emptyPromise[0].lineNumber}: marked with "|${CONTINUATION_MARKER}" but no continuation row follows`,
    );
  }

  return logicalRows;
};

const foldTableBlock = (blockLines: string[], firstLineNumber: number) => {
  const rowLines = blockLines.flatMap((line, index) =>
    TABLE_LINE.test(line) ? [readTableRowLine(line, firstLineNumber + index)] : [],
  );

  const usesSeparators = rowLines.some(rowLine => rowLine.isSeparator);
  const usesContinuationMarkers = rowLines.some(rowLine => rowLine.isMarkedAsContinued);

  if (usesSeparators && usesContinuationMarkers) {
    throw new Error(
      `Line ${firstLineNumber}: a table cannot mix separator rows and "|${CONTINUATION_MARKER}" continuation markers`,
    );
  }

  if (!usesSeparators && !usesContinuationMarkers) {
    return blockLines;
  }

  const [headerLine, ...bodyLines] = rowLines;

  if (headerLine.isSeparator) {
    throw new Error(`Line ${headerLine.lineNumber}: a table cannot open on a separator row`);
  }

  if (headerLine.isMarkedAsContinued) {
    throw new Error(`Line ${headerLine.lineNumber}: a table header cannot be marked with "|${CONTINUATION_MARKER}"`);
  }

  const logicalRows = usesSeparators ? groupRowsBySeparator(bodyLines) : groupRowsByContinuationMarker(bodyLines);

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
