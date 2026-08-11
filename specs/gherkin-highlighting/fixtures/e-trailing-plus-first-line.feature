Feature: Multiline table cells — candidate E: a trailing "+" opens a logical row

  A "+" after a row's closing pipe marks that row's beginning, so every row carries one on its
  first line — the single-line row at the bottom very much included — and a line without one
  continues the row above. Nothing about a line's cells decides which it is.

  Every line still starts with "|", so the line keeps its table scope. What the trailing "+"
  changes is the tmbundle rule's *end* match, `\|\s*$`, which no longer fires on that line: the
  table region stays open until the next line that does end on a pipe. A multiline logical row
  therefore renders as one contiguous highlighted region instead of one region per line.

  Scenario: A data table whose cells hold long values and JSON arrays
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments        |
      | major | Santé | LSpS 1                   | semester | [                        |+
      |       |       | LSpS                     |          |   {"key": "semester_1"}, |
      |       |       | Bordeaux                 |          |   {"key": "semester_2"}  |
      |       |       |                          |          | ]                        |
      | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |+
      |       |       |                          |          |   {"key": "semester_1"}  |
      |       |       |                          |          | ]                        |
      | minor | Génie | Terminale                | semester | []                       |+
