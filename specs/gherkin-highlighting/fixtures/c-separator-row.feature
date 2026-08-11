Feature: Multiline table cells — candidate C: Markdown-style separator rows

  Every line still starts with "|", so the table stays 100% valid stock Gherkin and keeps whatever
  highlighting Gherkin tables already get. Logical rows are delimited by a separator line whose
  cells contain only dashes, exactly like a Markdown table, so the single-line row at the bottom
  needs a delimiter of its own like any other.

  A cell is the concatenation of its fragments between two separator lines.

  Scenario: A data table whose cells hold long values and JSON arrays
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
      |-------|-------|--------------------------|----------|--------------------------|
      | minor | Génie | Terminale                | semester | []                       |
