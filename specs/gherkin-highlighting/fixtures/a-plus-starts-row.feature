Feature: Multiline table cells — candidate A: "+" starts a logical row

  A line starting with "+" opens a new logical row. Every following line starting
  with "|" is a continuation of that same logical row: each non-blank cell is
  appended to the cell above it.

  This is the syntax proposed in the original request.

  Scenario: A data table whose cells hold long values and JSON arrays
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments        |
      + major | Santé | LSpS 1                   | semester | [                        |
      |       |       | LSpS                     |          |   {"key": "semester_1"}, |
      |       |       | Bordeaux                 |          |   {"key": "semester_2"}  |
      |       |       |                          |          | ]                        |
      + minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |
      |       |       |                          |          |   {"key": "semester_1"}  |
      |       |       |                          |          | ]                        |
