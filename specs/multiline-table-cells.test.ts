import { loadFeature, parseFeature } from '../src';
import { generateCodeFromFeature } from '../src/code-generation/generate-code-by-line-number';
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
      | minor | Terminale  | []                       |+
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

    it('takes any number of dashes, as long as they touch the pipes', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type  | enrollment |
      |-|-|
      | major | LSpS 1     |
      |       | LSpS       |
      |------|------------|
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

    it('marks a single-line row too, so it cannot read as a continuation', () => {
      expect(rowsOfFirstStep(COMPACT_TABLE)[1]).toStrictEqual({
        type: 'minor',
        enrollment: 'Terminale',
        schedule_segments: '[]',
      });
    });

    it('lets a logical row have an empty first cell, since the marker alone opens it', () => {
      const rows = rowsOfFirstStep(
        featureWith(
          `      | type  | enrollment |
      | major | LSpS 1     |+
      |       | LSpS       |
      |       | Terminale  |+
`,
        ),
      );

      expect(rows).toStrictEqual([
        { type: 'major', enrollment: 'LSpS 1\nLSpS' },
        { type: '', enrollment: 'Terminale' },
      ]);
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

  describe('the rest of the library', () => {
    // The two fixtures the highlighting probe measures are also the two notations that shipped, so
    // they double as the on-disk feature files this reads through the public `loadFeature`.
    it.each([
      ['separator notation', './specs/gherkin-highlighting/fixtures/c-separator-row.feature'],
      ['compact notation', './specs/gherkin-highlighting/fixtures/e-trailing-plus-first-line.feature'],
    ])('folds a %s table read off disk by loadFeature', (_notation, featureFilePath) => {
      const rows = loadFeature(featureFilePath, { loadRelativePath: false }).scenarios[0].steps[0]
        .stepArgument as Record<string, string>[];

      expect(rows[0]).toStrictEqual({
        type: 'major',
        name: 'Santé',
        enrollment: 'LSpS 1\nLSpS\nBordeaux',
        split_by: 'semester',
        schedule_segments: '[\n  {"key": "semester_1"},\n  {"key": "semester_2"}\n]',
      });
    });

    it('folds a table written in another spoken language', () => {
      const step = parseFeature(`# language: fr
Fonctionnalité: Disciplines

  Scénario: Inscription
    Soit les disciplines suivantes
      | type  | segments |
      | major | [        |+
      |       |   1,     |
      |       | ]        |
`).scenarios[0].steps[0];

      expect(step.keyword).toBe('given');
      expect(step.stepArgument).toStrictEqual([{ type: 'major', segments: '[\n  1,\n]' }]);
    });

    it('generates step code for the line the folded table opens on', () => {
      // Code generation addresses steps by line number, so it only lands on the right step because
      // folding blanks the lines a logical row consumed instead of removing them.
      expect(generateCodeFromFeature(parseFeature(COMPACT_TABLE), 4)).toBe(
        "given('there are the following available disciplines', (table) => {\n\n});",
      );
      expect(generateCodeFromFeature(parseFeature(COMPACT_TABLE), 11)).toBe(
        "then('enrollment is open', () => {\n\n});",
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
      | minor | Terminale  |+
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

  describe('leaves alone what only looks like the notations', () => {
    it('treats a "-" placeholder row as data, not as a separator', () => {
      const featureText = featureWith(
        `      | type  | enrollment |
      | major | LSpS 1     |
      | -     | -          |
      | minor | Terminale  |
`,
      );

      // Mistaking this row for a separator would drop it AND weld its neighbours into one row.
      expect(foldMultilineTableCells(featureText)).toBe(featureText);
      expect(rowsOfFirstStep(featureText)).toStrictEqual([
        { type: 'major', enrollment: 'LSpS 1' },
        { type: '-', enrollment: '-' },
        { type: 'minor', enrollment: 'Terminale' },
      ]);
    });

    it('treats a "-" cell in a single-column table as data', () => {
      expect(
        rowsOfFirstStep(
          featureWith(
            `      | enrollment |
      | LSpS 1     |
      | -          |
      | Terminale  |
`,
          ),
        ),
      ).toStrictEqual([{ enrollment: 'LSpS 1' }, { enrollment: '-' }, { enrollment: 'Terminale' }]);
    });

    it('keeps folding after an unpaired fence in a description', () => {
      // A Feature description is free-form text and may hold a line of backticks. Treating it as a
      // doc string that never closes used to switch folding off for the rest of the file.
      const outline = parseFeature(`Feature: Disciplines
  \`\`\`
  not a doc string, just prose

  Scenario: Enrolling
    Given there are the following available disciplines
      | type  | segments |
      | major | [        |+
      |       | ]        |
`);

      expect(outline.scenarios[0].steps[0].stepArgument).toStrictEqual([{ type: 'major', segments: '[\n]' }]);
    });

    it('tells a prose fence apart from the real doc string that follows it', () => {
      // A doc string is a step's argument, so it can only open after a step keyword. Pairing
      // delimiters off instead used to mispair the prose fence with the real opener.
      const { steps } = parseFeature(`Feature: Disciplines
  \`\`\`
  prose in the description, not a doc string

  Scenario: Enrolling
    Given this payload
      """
      | not | a | table |
      """
    And there are the following available disciplines
      | type  | segments |
      | major | [        |+
      |       | ]        |
`).scenarios[0];

      expect(steps[0].stepArgument).toBe('| not | a | table |');
      expect(steps[1].stepArgument).toStrictEqual([{ type: 'major', segments: '[\n]' }]);
    });

    it('reads the step keywords of the declared spoken language', () => {
      const step = parseFeature(`# language: fr
Fonctionnalité: Disciplines
  \`\`\`
  de la prose

  Scénario: Inscription
    Soit les disciplines suivantes
      | type  | segments |
      | major | [        |+
      |       | ]        |
`).scenarios[0].steps[0];

      expect(step.stepArgument).toStrictEqual([{ type: 'major', segments: '[\n]' }]);
    });

    it('leaves an unterminated doc string to the parser rather than mangling it', () => {
      const featureText = `Feature: Disciplines

  Scenario: Enrolling
    Given this payload
      """
      | type  | segments |
      | major | [        |+
`;

      expect(foldMultilineTableCells(featureText)).toBe(featureText);
      expect(() => parseFeature(featureText)).toThrow('Error parsing feature Gherkin');
    });

    it('keeps a trailing backslash in the last fragment of a cell', () => {
      // Only a fragment with another appended after it grows an escape at the seam, so a Windows
      // path or a regex ending a cell is none of folding's business.
      expect(
        rowsOfFirstStep(
          featureWith(
            `      | path      | segments |
      | C:\\dir\\   | [        |+
      |           | ]        |
`,
          ),
        ),
      ).toStrictEqual([{ path: 'C:\\dir\\', segments: '[\n]' }]);
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
        // Line 7 is the marker that conflicts with the separator on line 6, not the table's first line.
      ).toBe('Line 7: a table cannot mix separator rows and "|+" row markers');
    });

    it('when the first body row is not marked, so it continues the header', () => {
      expect(
        foldingError(`      | type  | enrollment |
      | major | LSpS 1     |
      | minor | Terminale  |+
`),
      ).toBe('Line 6: every row of this table opens with "|+", so this line reads as a continuation of the header');
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
      // Reported against line 7, the fragment's own line, not line 6 where its logical row opens.
      expect(
        foldingError(`      | type  | pattern |
      | major | a       |+
      |       | b\\      |
      |       | c       |
`),
      ).toBe('Line 7: a folded table cell fragment cannot end on a "\\" ("b\\")');
    });

    it('when a row marker is mistyped, rather than reading the row as a continuation', () => {
      expect(
        foldingError(`      | type  | enrollment |
      | major | LSpS 1     |+
      |       | LSpS       |
      | minor | Terminale  |;
      | other | Bordeaux   |+
`),
      ).toBe('Line 8: expected "+" or nothing after a table row\'s last "|", got ";"');
    });
  });
});
