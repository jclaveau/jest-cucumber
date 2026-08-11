Feature: Multiline table cells — candidate D: a leading marker column

  Candidate A's "+" gutter, kept inside the table. The first column has an empty
  header and holds only the row marker: "+" opens a new logical row, blank continues
  the one above.

  Every line still starts with "|", so the table stays 100% valid stock Gherkin and
  keeps whatever highlighting Gherkin tables already get.

  Scenario: A data table whose cells hold long values and JSON arrays
    Given there are the following available disciplines
      |   | type  | name  | enrollment               | split_by | schedule_segments        |
      | + | major | Santé | LSpS 1                   | semester | [                        |
      |   |       |       | LSpS                     |          |   {"key": "semester_1"}, |
      |   |       |       | Bordeaux                 |          |   {"key": "semester_2"}  |
      |   |       |       |                          |          | ]                        |
      | + | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |
      |   |       |       |                          |          |   {"key": "semester_1"}  |
      |   |       |       |                          |          | ]                        |
