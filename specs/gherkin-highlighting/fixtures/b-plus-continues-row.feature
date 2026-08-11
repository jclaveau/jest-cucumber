Feature: Multiline table cells — candidate B: "+" continues a logical row

  The inverse of candidate A. A line starting with "|" is a normal Gherkin row and
  opens a new logical row; a line starting with "+" continues the logical row above.

  A table that contains no multiline cell is byte-identical to stock Gherkin, so the
  extension only shows up where it is actually used.

  Scenario: A data table whose cells hold long values and JSON arrays
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments        |
      | major | Santé | LSpS 1                   | semester | [                        |
      +       |       | LSpS                     |          |   {"key": "semester_1"}, |
      +       |       | Bordeaux                 |          |   {"key": "semester_2"}  |
      +       |       |                          |          | ]                        |
      | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |
      +       |       |                          |          |   {"key": "semester_1"}  |
      +       |       |                          |          | ]                        |
