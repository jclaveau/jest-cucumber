Feature: Multiline table cells — baseline (stock Gherkin, no extension)

  This is the control fixture: standard Gherkin, one physical line per logical row.
  It is the syntax every candidate below is compared against, both for GitHub
  highlighting and for the values the step definition finally receives.

  Scenario: A data table whose cells hold long values and JSON arrays
    Given there are the following available disciplines
      | type  | name  | enrollment               | split_by | schedule_segments                              |
      | major | Santé | LSpS 1 - LSpS - Bordeaux | semester | [{"key": "semester_1"}, {"key": "semester_2"}] |
      | minor | Droit | LSpS 1 - LSpS - Bordeaux | semester | [{"key": "semester_1"}]                        |
