# Multiline table cells — GitHub highlighting probe

Fixtures and measurements for the "multiline data-table cells" proposal: which candidate syntax
survives GitHub's Gherkin renderer, which is the question that had to be settled before any parser
work.

**Outcome: C and E are implemented** — see [`src/multiline-table-cells.ts`](../../src/multiline-table-cells.ts)
and [the user-facing docs](../../docs/GherkinTables.md#multiline-cells). A, B, D and F are kept
here as measured fixtures only; the library rejects them.

## Why this matters

Gherkin data tables are one physical line per row. A cell holding a JSON array, or a long
composite identifier, pushes the row past any reasonable line width, and the table stops being
readable — which is the readability argument the whole point of Gherkin rests on. The problem got
sharper now that feature files are routinely generated: a generator has no incentive to keep a
table narrow.

The escape hatches Gherkin offers today are:

- **`\n` inside a cell.** Supported by `@cucumber/gherkin`, documented in the
  [Gherkin reference](https://cucumber.io/docs/gherkin/reference/). It moves the newline into the
  value but does nothing for the source line width, which is the actual complaint.
- **A doc string instead of a table.** Loses the tabular shape entirely.
- **One scenario per row.** Multiplies runtime and duplicates the prose.

Prior art on the Cucumber side, all still unresolved:

- [cucumber/common#565 — Gherkin: Accept multiline example cell](https://github.com/cucumber/common/issues/565)
  proposes continuation rows in `Examples:` tables. Closed with no maintainer decision.
- [cucumber-attic/gherkin#52 — Multiline in examples tables](https://github.com/cucumber-attic/gherkin/issues/52)
- [cucumber-attic/gherkin#146 — escaping new line in tables](https://github.com/cucumber-attic/gherkin/issues/146)

## How GitHub highlights Gherkin

- GitHub delegates to [github-linguist/linguist](https://github.com/github-linguist/linguist/blob/main/grammars.yml),
  which maps Gherkin to the scope `text.gherkin.feature`.
- That scope is vendored from
  [cucumber/cucumber-tmbundle](https://github.com/cucumber/cucumber-tmbundle) — **archived, last
  pushed December 2020**. It is not going to grow a new rule for us.
- The grammar's entire notion of a table is a single begin/end rule:

  ```xml
  <key>table</key>
  <dict>
    <key>begin</key><string>^\s*\|</string>
    <key>end</key><string>\|\s*$</string>
    <key>name</key><string>keyword.control.cucumber.table</string>
  </dict>
  ```

- Consequence: **a line that does not start with `|` gets no table scope at all** and renders as
  plain uncoloured text. Any marker character placed in the left gutter — `+`, `-`, `\`, anything
  — kills the highlighting of the line it is on.
- `end` is a different lever, and a much gentler one. It does not decide whether a line is
  coloured, only where the region stops. **A line that matches `begin` but not `end` leaves its
  region open**, so the region spans into the following lines until one of them ends on a pipe.
  Those lines stay coloured; a multiline logical row simply renders as one contiguous region
  instead of one region per line. This is what makes a _trailing_ marker (candidates E and F)
  behave so differently from a leading one.
  - The cost is a bleed: if the last table line of a file never matches `end`, the table scope
    runs on into whatever follows.
- Unrelated but worth knowing while reading rendered output: GitHub's Gherkin highlighting is
  already partly broken (`Rule:` is not coloured), reported in
  [community discussion #185937](https://github.com/orgs/community/discussions/185937) with no
  staff reply.

## Candidates

| Fixture                                                                             | Row marker                                    | Continuation marker                                              |
| ----------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| [`00-baseline.feature`](fixtures/00-baseline.feature)                               | `\|`                                          | — (stock Gherkin, control)                                       |
| [`a-plus-starts-row.feature`](fixtures/a-plus-starts-row.feature)                   | `+`                                           | `\|`                                                             |
| [`b-plus-continues-row.feature`](fixtures/b-plus-continues-row.feature)             | `\|`                                          | `+`                                                              |
| [`c-separator-row.feature`](fixtures/c-separator-row.feature)                       | `\|`                                          | `\|`, logical rows split by a Markdown-style `\|---\|---\|` line |
| [`d-marker-column.feature`](fixtures/d-marker-column.feature)                       | `\|`, `+` in a leading marker column          | `\|`, blank marker column                                        |
| [`e-trailing-plus-first-line.feature`](fixtures/e-trailing-plus-first-line.feature) | `\|`, trailing `+` flags a row that continues | `\|`                                                             |
| [`f-trailing-plus-every-line.feature`](fixtures/f-trailing-plus-every-line.feature) | `\|`                                          | `\|`, trailing `+` means "joins with the next line"              |

## Measured results

Produced by [`highlighting.test.ts`](highlighting.test.ts), which applies the tmbundle regexes
above to each fixture and feeds each fixture to the raw `@cucumber/gherkin` parser — deliberately
not this library's `parseFeature`, which now folds C and E before parsing them, so the "stock
Gherkin" column would stop measuring stock Gherkin.

| Fixture                      | Table lines | Coloured | Region-spanning lines | Stock `@cucumber/gherkin`                                              |
| ---------------------------- | ----------- | -------- | --------------------- | ---------------------------------------------------------------------- |
| `00-baseline`                | 3           | 3 / 3    | 0                     | parses                                                                 |
| `a-plus-starts-row`          | 8           | 6 / 8    | 0                     | **error** — `expected: #EOF, #TableRow, … got '+ major \| Santé \| …'` |
| `b-plus-continues-row`       | 8           | 3 / 8    | 0                     | **error** — same on every `+` line                                     |
| `c-separator-row`            | 10          | 10 / 10  | 0                     | parses, **into junk rows**                                             |
| `d-marker-column`            | 8           | 8 / 8    | 0                     | parses, **with a junk column**                                         |
| `e-trailing-plus-first-line` | 8           | 8 / 8    | 2                     | parses, **cleanly**                                                    |
| `f-trailing-plus-every-line` | 8           | 8 / 8    | 5                     | parses, **cleanly**                                                    |

Readings of those numbers:

- **Candidate A loses fewer lines than candidate B**, but it loses the wrong ones: the uncoloured
  lines are exactly the ones carrying a row's identifying values, the lines a reader scans.
  Candidate B loses more lines, but keeps colour on every row opener, and a table containing no
  multiline cell is byte-identical to stock Gherkin.
- **C, D, E and F lose nothing**, because every line still starts with `|`. That is not a
  coincidence — it is the only way to satisfy a grammar whose sole table rule is `^\s*\|`.
- **E and F additionally leave no trace in the stock parse.** They are the only candidates that do.

### Not every "parses" is the same kind of yes

C and D parse, but into junk — a pre-processor is still required, and a reader without the plugin
gets a misleading table rather than a hard failure:

```js
// c-separator-row, parsed by stock @cucumber/gherkin
{ type: '-------', name: '-------', enrollment: '--------------------------', … }
{ type: 'major',   name: 'Santé',   enrollment: 'LSpS 1', schedule_segments: '[' }

// d-marker-column, parsed by stock @cucumber/gherkin — note the '' column
{ '': '+', type: 'major', name: 'Santé', enrollment: 'LSpS 1', schedule_segments: '[' }
```

E and F parse into _the right columns with the right values_, one physical line per row — merely
unfolded, never wrong:

```js
// e- and f-, parsed by stock @cucumber/gherkin — the trailing "+" is simply gone
{ type: 'major', name: 'Santé', enrollment: 'LSpS 1', split_by: 'semester', schedule_segments: '[' }
{ type: '',      name: '',      enrollment: 'LSpS',   split_by: '',         schedule_segments: '{"key": "semester_1"},' }
```

That is not luck either: Gherkin builds a row's cells from the text _between_ pipes, so anything
after a row's final pipe is discarded. A trailing marker is free — it costs nothing in the AST,
and any third-party Gherkin tool ignores it too.

Whether silent degradation beats A/B's loud parser error is an open design question for C and D.
For E and F the question does not arise, because there is nothing to degrade.

Note also that `@cucumber/gherkin` **trims every cell value**: `|   {"key": "x"}, |` arrives as
`{"key": "x"},`, with the leading indentation gone. Any candidate that folds cells _after_ the
stock parser cannot preserve a pretty-printed JSON block's indentation. Folding has to happen on
the raw feature text, before `new Parser(...).parse(...)`.

### Why C and E, and not F

F reads well and measures as well as E, but the two disagree about where a logical row ends: F's
marker means "joins with the next line", E's means "the lines below continue me". Supporting both
would make the same marker mean two things, so F-shaped input is rejected with an error rather than
quietly read as E. D was dropped for costing a column with an empty header while buying nothing E
does not already give.

## What is still only measurable by eye

The probe covers the grammar. It cannot cover:

- **The rendered colours themselves** on `github.com`, in the blob view and in a fenced code block
  tagged `gherkin`.
- **The diff view**, where GitHub already puts a `+` in the gutter of every added line, so a
  candidate-A row renders as `+` immediately followed by the syntax's own `+`. Candidates E and F
  put their `+` at the far right, where the diff gutter cannot collide with it.
- **What a spanning region actually looks like** for E and F. The grammar says those lines keep the
  table scope; that a multi-line region renders the same as a per-line one is a prediction from the
  rule, not a measurement.

For those, open the fixtures on the branch and open a pull request against it.

## Side by side, for the eyeball test

Same tables as the fixtures, in fenced blocks tagged `gherkin`, so this page exercises the fenced
code block renderer while the fixture files exercise the blob renderer.

Baseline — stock Gherkin:

```gherkin
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments                              |
      | major | Santé | LSpS 1 - LSpS - Bordeaux | semester | [{"key": "semester_1"}, {"key": "semester_2"}] |
      | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [{"key": "semester_1"}]                        |
```

Candidate A — `+` starts a logical row:

```gherkin
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments        |
      + major | Santé | LSpS 1                   | semester | [                        |
      |       |       | LSpS                     |          |   {"key": "semester_1"}, |
      |       |       | Bordeaux                 |          |   {"key": "semester_2"}  |
      |       |       |                          |          | ]                        |
      + minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |
      |       |       |                          |          |   {"key": "semester_1"}  |
      |       |       |                          |          | ]                        |
```

Candidate B — `+` continues a logical row:

```gherkin
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments        |
      | major | Santé | LSpS 1                   | semester | [                        |
      +       |       | LSpS                     |          |   {"key": "semester_1"}, |
      +       |       | Bordeaux                 |          |   {"key": "semester_2"}  |
      +       |       |                          |          | ]                        |
      | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |
      +       |       |                          |          |   {"key": "semester_1"}  |
      +       |       |                          |          | ]                        |
```

Candidate C — Markdown-style separator rows:

```gherkin
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments        |
      |-------|-------|--------------------------|----------|--------------------------|
      | major | Santé | LSpS 1                   | semester | [                        |
      |       |       | LSpS                     |          |   {"key": "semester_1"}, |
      |       |       | Bordeaux                 |          |   {"key": "semester_2"}  |
      |       |       |                          |          | ]                        |
      |-------|-------|--------------------------|----------|--------------------------|
      | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |
      |       |       |                          |          |   {"key": "semester_1"}  |
      |       |       |                          |          | ]                        |
```

Candidate D — leading marker column:

```gherkin
    Given there are the following available disciplines
      |   | type  | name  | enrollment               | split_by | schedule_segments        |
      | + | major | Santé | LSpS 1                   | semester | [                        |
      |   |       |       | LSpS                     |          |   {"key": "semester_1"}, |
      |   |       |       | Bordeaux                 |          |   {"key": "semester_2"}  |
      |   |       |       |                          |          | ]                        |
      | + | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |
      |   |       |       |                          |          |   {"key": "semester_1"}  |
      |   |       |       |                          |          | ]                        |
```

Candidate E — trailing `+` flags a row that continues:

```gherkin
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments        |
      | major | Santé | LSpS 1                   | semester | [                        |+
      |       |       | LSpS                     |          |   {"key": "semester_1"}, |
      |       |       | Bordeaux                 |          |   {"key": "semester_2"}  |
      |       |       |                          |          | ]                        |
      | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |+
      |       |       |                          |          |   {"key": "semester_1"}  |
      |       |       |                          |          | ]                        |
```

Candidate F — trailing `+` means "joins with the next line":

```gherkin
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments        |
      | major | Santé | LSpS 1                   | semester | [                        |+
      |       |       | LSpS                     |          |   {"key": "semester_1"}, |+
      |       |       | Bordeaux                 |          |   {"key": "semester_2"}  |+
      |       |       |                          |          | ]                        |
      | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |+
      |       |       |                          |          |   {"key": "semester_1"}  |+
      |       |       |                          |          | ]                        |
```

## Running the probe

```sh
npx jest specs/gherkin-highlighting
```
