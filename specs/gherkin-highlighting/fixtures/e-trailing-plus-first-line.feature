Feature: Multiline table cells — candidate E: a trailing "+" on the row's first line

  A "+" after the closing pipe of a row's first line means "this logical row continues".
  The lines that follow are plain Gherkin rows and carry the continued cells.

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
