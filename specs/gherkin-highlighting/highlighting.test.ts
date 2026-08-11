import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { parseFeature } from '../../src';

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
const TMBUNDLE_TABLE_BEGIN = /^\s*\|/;
const TMBUNDLE_TABLE_END = /\|\s*$/;

const FIXTURES_PATH = resolve(__dirname, 'fixtures');

const isTableLine = (line: string) => /^\s*[|+]/.test(line);

const probeFixture = (fileName: string) => {
  const featureText = readFileSync(resolve(FIXTURES_PATH, fileName), 'utf8');
  const tableLines = featureText.split('\n').filter(isTableLine);

  let parseError: string | null = null;
  let stockRows: Record<string, string>[] = [];

  try {
    stockRows = parseFeature(featureText).scenarios[0].steps[0].stepArgument as Record<string, string>[];
  } catch (err) {
    parseError = (err as Error).message;
  }

  return {
    tableLines: tableLines.length,
    highlightedTableLines: tableLines.filter(line => TMBUNDLE_TABLE_BEGIN.test(line)).length,
    unterminatedTableLines: tableLines.filter(line => !TMBUNDLE_TABLE_END.test(line)).length,
    parseError,
    stockRows,
  };
};

const HEADER_COLUMNS = ['type', 'name', 'enrollment', 'split_by', 'schedule_segments'];

describe('multiline table cell candidate syntaxes', () => {
  it('has one fixture per candidate syntax, plus the stock Gherkin baseline', () => {
    expect(readdirSync(FIXTURES_PATH).sort()).toStrictEqual([
      '00-baseline.feature',
      'a-plus-starts-row.feature',
      'b-plus-continues-row.feature',
      'c-separator-row.feature',
      'd-marker-column.feature',
      'e-trailing-plus-first-line.feature',
      'f-trailing-plus-every-line.feature',
    ]);
  });

  it('baseline: stock Gherkin is fully highlighted and parses', () => {
    const probe = probeFixture('00-baseline.feature');

    expect(probe.tableLines).toBe(3);
    expect(probe.highlightedTableLines).toBe(probe.tableLines);
    expect(probe.unterminatedTableLines).toBe(0);
    expect(probe.parseError).toBeNull();
  });

  it('candidate A ("+" starts a row): every logical row loses its highlighting', () => {
    const probe = probeFixture('a-plus-starts-row.feature');

    // The 2 uncoloured lines are exactly the ones opening a logical row, so they are the lines
    // carrying that row's identifying values. Fewer lines lose their colour than in candidate B,
    // but the ones that do are the ones a reader scans for.
    expect(probe.tableLines).toBe(8);
    expect(probe.highlightedTableLines).toBe(6);
    expect(probe.parseError).toContain('expected: #EOF, #TableRow, #StepLine, #TagLine, #ExamplesLine');
  });

  it('candidate B ("+" continues a row): only continuation lines lose their highlighting', () => {
    const probe = probeFixture('b-plus-continues-row.feature');

    // More lines lose their colour than in candidate A, because continuations outnumber row
    // openers. The lines that keep it are the ones opening a logical row, and a table with no
    // multiline cell keeps every line.
    expect(probe.tableLines).toBe(8);
    expect(probe.highlightedTableLines).toBe(3);
    expect(probe.parseError).toContain('expected: #EOF, #TableRow, #StepLine, #TagLine, #ExamplesLine');
  });

  it('candidate C (Markdown-style separator rows): fully highlighted, still stock Gherkin', () => {
    const probe = probeFixture('c-separator-row.feature');

    expect(probe.tableLines).toBe(10);
    expect(probe.highlightedTableLines).toBe(probe.tableLines);
    expect(probe.unterminatedTableLines).toBe(0);
    expect(probe.parseError).toBeNull();

    // Parsing is not the same as parsing usefully: the separator lines come back as rows of dashes.
    expect(Object.keys(probe.stockRows[0])).toStrictEqual(HEADER_COLUMNS);
    expect(probe.stockRows[0].type).toBe('-------');
  });

  it('candidate D (leading marker column): fully highlighted, still stock Gherkin', () => {
    const probe = probeFixture('d-marker-column.feature');

    expect(probe.tableLines).toBe(8);
    expect(probe.highlightedTableLines).toBe(probe.tableLines);
    expect(probe.unterminatedTableLines).toBe(0);
    expect(probe.parseError).toBeNull();

    // The marker column comes back as a real column, keyed on the empty header.
    expect(Object.keys(probe.stockRows[0])).toStrictEqual(['', ...HEADER_COLUMNS]);
    expect(probe.stockRows[0]['']).toBe('+');
  });

  it('candidate E (trailing "+" on the row\'s first line): invisible to stock Gherkin', () => {
    const probe = probeFixture('e-trailing-plus-first-line.feature');

    expect(probe.tableLines).toBe(8);
    expect(probe.highlightedTableLines).toBe(probe.tableLines);

    // The 2 row-opening lines end on "+" rather than on a pipe, so each one's table region stays
    // open until the following line closes it. Coloured, but spanning.
    expect(probe.unterminatedTableLines).toBe(2);

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

  it('candidate F (trailing "+" on every continued line): invisible to stock Gherkin', () => {
    const probe = probeFixture('f-trailing-plus-every-line.feature');

    expect(probe.tableLines).toBe(8);
    expect(probe.highlightedTableLines).toBe(probe.tableLines);

    // Every line of a logical row but its last ends on "+", so a whole logical row renders as one
    // contiguous table region rather than one region per line.
    expect(probe.unterminatedTableLines).toBe(5);

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
