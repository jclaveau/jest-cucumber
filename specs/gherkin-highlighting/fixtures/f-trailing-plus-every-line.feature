Feature: Multiline table cells — candidate F: a trailing "+" on every continued line

  Candidate E's marker, applied as a line-continuation operator instead of a row-opening flag:
  a "+" after the closing pipe means "joins with the next line", exactly like a trailing
  backslash in shell or C. The last line of a logical row carries no "+", which is what ends it.

  Unlike candidate E, a reader never has to look ahead to know where a logical row stops, and the
  extent of a row is self-terminating rather than inferred from empty cells.

  Scenario: A data table whose cells hold long values and JSON arrays
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments        |
      | major | Santé | LSpS 1                   | semester | [                        |+
      |       |       | LSpS                     |          |   {"key": "semester_1"}, |+
      |       |       | Bordeaux                 |          |   {"key": "semester_2"}  |+
      |       |       |                          |          | ]                        |
      | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [                        |+
      |       |       |                          |          |   {"key": "semester_1"}  |+
      |       |       |                          |          | ]                        |
