import { parseFeature } from '../src';
import { foldMultilineTableCells } from '../src/multiline-table-cells';

const featureWith = (steps: string) => `Feature: Disciplines

  Scenario: Enrolling
    Given there are the following available disciplines
${steps}    Then enrollment is open
`;

const rowsOfFirstStep = (featureText: string) =>
  parseFeature(featureText).scenarios[0].steps[0].stepArgument as Record<string, string>[];

const SEPARATOR_TABLE = featureWith(
  `      | type  | enrollment | schedule_segments        |
      |-------|------------|--------------------------|
      | major | LSpS 1     | [                        |
      |       | LSpS       |   {"key": "semester_1"}, |
      |       | Bordeaux   |   {"key": "semester_2"}  |
      |       |            | ]                        |
      |-------|------------|--------------------------|
      | minor | Terminale  | []                       |
`,
);

const COMPACT_TABLE = featureWith(
  `      | type  | enrollment | schedule_segments        |
      | major | LSpS 1     | [                        |+
      |       | LSpS       |   {"key": "semester_1"}, |
      |       | Bordeaux   |   {"key": "semester_2"}  |
      |       |            | ]                        |
      | minor | Terminale  | []                       |
`,
);

const FOLDED_ROWS = [
  {
    type: 'major',
    enrollment: 'LSpS 1\nLSpS\nBordeaux',
    schedule_segments: '[\n  {"key": "semester_1"},\n  {"key": "semester_2"}\n]',
  },
  { type: 'minor', enrollment: 'Terminale', schedule_segments: '[]' },
];

describe('multiline table cells', () => {
  describe('separator notation', () => {
    it('gives one step argument row per logical row', () => {
      expect(rowsOfFirstStep(SEPARATOR_TABLE)).toStrictEqual(FOLDED_ROWS);
    });

    it('folds a cell into indented JSON that can be parsed back', () => {
      expect(JSON.parse(rowsOfFirstStep(SEPARATOR_TABLE)[0].schedule_segments)).toStrictEqual([
        { key: 'semester_1' },
        { key: 'semester_2' },
      ]);
    });

    it('does not need a separator between the header and the first row', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type  | enrollment |
      | major | LSpS 1     |
      |       | LSpS       |
      |-------|------------|
      | minor | Terminale  |
`,
        ),
      );

      expect(rows).toStrictEqual([
        { type: 'major', enrollment: 'LSpS 1\nLSpS' },
        { type: 'minor', enrollment: 'Terminale' },
      ]);
    });

    it('tolerates a trailing separator row', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type  | enrollment |
      |-------|------------|
      | major | LSpS 1     |
      |-------|------------|
`,
        ),
      );

      expect(rows).toStrictEqual([{ type: 'major', enrollment: 'LSpS 1' }]);
    });
  });

  describe('compact notation', () => {
    it('gives the same rows as the separator notation', () => {
      expect(rowsOfFirstStep(COMPACT_TABLE)).toStrictEqual(FOLDED_ROWS);
      expect(rowsOfFirstStep(COMPACT_TABLE)).toStrictEqual(rowsOfFirstStep(SEPARATOR_TABLE));
    });

    it('lets a single-line row follow a folded one without a marker', () => {
      expect(rowsOfFirstStep(COMPACT_TABLE)[1]).toStrictEqual({
        type: 'minor',
        enrollment: 'Terminale',
        schedule_segments: '[]',
      });
    });
  });

  describe('a table using neither notation', () => {
    it('is left byte-identical', () => {
      const featureText = featureWith(
        `      | type  | enrollment               | schedule_segments                              |
      | major | LSpS 1 - LSpS - Bordeaux | [{"key": "semester_1"}, {"key": "semester_2"}] |
      | minor | Terminale                | []                                             |
`,
      );

      expect(foldMultilineTableCells(featureText)).toBe(featureText);
    });

    it('still trims its cells the way Gherkin always did', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type      | enrollment |
      |   major   |   LSpS 1   |
`,
        ),
      );

      expect(rows).toStrictEqual([{ type: 'major', enrollment: 'LSpS 1' }]);
    });
  });

  describe('the rest of the feature file', () => {
    it('keeps the line numbers of everything after a folded table', () => {
      const separatorSteps = parseFeature(SEPARATOR_TABLE).scenarios[0].steps;
      const compactSteps = parseFeature(COMPACT_TABLE).scenarios[0].steps;

      // Both tables hold the same two logical rows, but the separator notation spends two extra
      // physical lines on its delimiters. Each "Then" sits on the line right after its own table,
      // which it only can if folding blanks the consumed lines instead of removing them.
      expect(separatorSteps[0].lineNumber).toBe(4);
      expect(separatorSteps[1].lineNumber).toBe(13);
      expect(compactSteps[0].lineNumber).toBe(4);
      expect(compactSteps[1].lineNumber).toBe(11);
    });

    it('leaves pipe lines inside a doc string alone', () => {
      const featureText = `Feature: Disciplines

  Scenario: Enrolling
    Given this payload
      """
      | type  | enrollment |
      |-------|------------|
      | major | LSpS 1     |
      """
`;

      expect(foldMultilineTableCells(featureText)).toBe(featureText);
      expect(parseFeature(featureText).scenarios[0].steps[0].stepArgument).toContain('|-------|');
    });

    it('does not let a nested delimiter close a doc string early', () => {
      const featureText = `Feature: Disciplines

  Scenario: Enrolling
    Given this payload
      """
      \`\`\`
      | type  | enrollment |
      | major | LSpS 1     |+
      \`\`\`
      """
`;

      expect(foldMultilineTableCells(featureText)).toBe(featureText);
    });

    it('folds an Examples table and substitutes the folded value', () => {
      const outline = parseFeature(`Feature: Disciplines

  Scenario Outline: Enrolling in <type>
    Given the segments <segments>

    Examples:
      | type  | segments                 |
      | major | [                        |+
      |       |   {"key": "semester_1"}, |
      |       |   {"key": "semester_2"}  |
      |       | ]                        |
`).scenarioOutlines[0];

      expect(outline.scenarios).toHaveLength(1);
      expect(outline.scenarios[0].title).toBe('Enrolling in major');
      expect(outline.scenarios[0].steps[0].stepText).toBe(
        'the segments [\n  {"key": "semester_1"},\n  {"key": "semester_2"}\n]',
      );
    });
  });

  describe('comments and blank lines between rows', () => {
    it('do not break a logical row they sit inside', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type  | enrollment |
      | major | LSpS 1     |+
      # the campus moved
      |       | LSpS       |

      |       | Bordeaux   |
      | minor | Terminale  |
`,
        ),
      );

      expect(rows).toStrictEqual([
        { type: 'major', enrollment: 'LSpS 1\nLSpS\nBordeaux' },
        { type: 'minor', enrollment: 'Terminale' },
      ]);
    });

    it('do not break a table delimited by separator rows', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type  | enrollment |
      | major | LSpS 1     |
      # the campus moved
      |       | LSpS       |
      |-------|------------|
      | minor | Terminale  |
`,
        ),
      );

      expect(rows).toStrictEqual([
        { type: 'major', enrollment: 'LSpS 1\nLSpS' },
        { type: 'minor', enrollment: 'Terminale' },
      ]);
    });

    it('stay on their own line, so line numbers still hold', () => {
      const { steps } = parseFeature(
        featureWith(
          `      | type  | enrollment |
      | major | LSpS 1     |+
      # the campus moved
      |       | LSpS       |
`,
        ),
      ).scenarios[0];

      expect(steps[1].lineNumber).toBe(9);
    });

    it('leave a table using neither notation byte-identical', () => {
      const featureText = featureWith(
        `      | type  | enrollment |
      | major | LSpS 1     |
      # the campus moved
      | minor | Terminale  |
`,
      );

      expect(foldMultilineTableCells(featureText)).toBe(featureText);
    });

    it('come out unchanged when they merely follow a table', () => {
      const featureText = `Feature: Disciplines

  Scenario: Enrolling
    Given there are the following available disciplines
      | type  | enrollment |
      | major | LSpS 1     |+
      |       | LSpS       |

    # about what comes next
    Then enrollment is open
`;

      expect(foldMultilineTableCells(featureText).split('\n').slice(7)).toStrictEqual([
        '',
        '    # about what comes next',
        '    Then enrollment is open',
        '',
      ]);
    });
  });

  describe('cell contents', () => {
    it('keeps an escaped pipe and an escaped backslash', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type  | pattern   |
      | major | a\\|b      |+
      |       | c\\\\d      |
`,
        ),
      );

      expect(rows).toStrictEqual([{ type: 'major', pattern: 'a|b\nc\\d' }]);
    });

    it('keeps a blank fragment between two filled ones', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type  | notes |
      | major | first |+
      |       |       |
      |       | third |
`,
        ),
      );

      expect(rows).toStrictEqual([{ type: 'major', notes: 'first\n\nthird' }]);
    });

    it('gives an empty string for a cell that is blank on every line', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type  | notes | enrollment |
      | major |       | LSpS 1     |+
      |       |       | LSpS       |
`,
        ),
      );

      expect(rows).toStrictEqual([{ type: 'major', notes: '', enrollment: 'LSpS 1\nLSpS' }]);
    });
  });

  describe('rejects an ambiguous table', () => {
    const foldingError = (steps: string) => {
      try {
        foldMultilineTableCells(featureWith(steps));
      } catch (err) {
        return (err as Error).message;
      }

      return null;
    };

    it('when it mixes both notations', () => {
      expect(
        foldingError(`      | type  | enrollment |
      |-------|------------|
      | major | LSpS 1     |+
      |       | LSpS       |
`),
      ).toBe('Line 5: a table cannot mix separator rows and "|+" continuation markers');
    });

    it('when a continuation row follows an unmarked row', () => {
      expect(
        foldingError(`      | type  | enrollment |
      | major | LSpS 1     |+
      |       | LSpS       |
      | minor | Terminale  |
      |       | Bordeaux   |
`),
      ).toBe('Line 9: continues line 8, which is not marked with "|+"');
    });

    it('when the first body row is a continuation', () => {
      expect(
        foldingError(`      | type  | enrollment |
      |       | LSpS 1     |
      | major | LSpS       |+
      |       | Bordeaux   |
`),
      ).toBe('Line 6: a continuation row must follow a row marked with "|+"');
    });

    it('when a marked row has no continuation', () => {
      expect(
        foldingError(`      | type  | enrollment |
      | major | LSpS 1     |+
      | minor | Terminale  |
`),
      ).toBe('Line 6: marked with "|+" but no continuation row follows');
    });

    it('when a continuation row carries the marker too', () => {
      expect(
        foldingError(`      | type  | enrollment |
      | major | LSpS 1     |+
      |       | LSpS       |+
      |       | Bordeaux   |
`),
      ).toBe('Line 7: only a logical row\'s first line carries "|+", not its continuation rows');
    });

    it('when the header itself is marked', () => {
      expect(
        foldingError(`      | type  | enrollment |+
      |       | LSpS 1     |
`),
      ).toBe('Line 5: a table header cannot be marked with "|+"');
    });

    it('when the table opens on a separator row', () => {
      expect(
        foldingError(`      |-------|------------|
      | major | LSpS 1     |
`),
      ).toBe('Line 5: a table cannot open on a separator row');
    });

    it('when a continuation row has a different number of cells', () => {
      expect(
        foldingError(`      | type  | enrollment |
      | major | LSpS 1     |+
      |       | LSpS       | Bordeaux |
`),
      ).toBe('Line 7: expected 2 table cells to match the header, got 3');
    });

    it('when something other than the marker follows the last pipe', () => {
      expect(
        foldingError(`      | type  | enrollment |
      | major | LSpS 1     |++
      |       | LSpS       |
`),
      ).toBe('Line 6: expected "+" or nothing after a table row\'s last "|", got "++"');
    });

    it('when a folded fragment ends on a dangling backslash', () => {
      expect(
        foldingError(`      | type  | pattern |
      | major | a\\     |+
      |       | b       |
`),
      ).toBe('Line 6: a folded table cell fragment cannot end on a "\\" ("a\\")');
    });
  });
});
