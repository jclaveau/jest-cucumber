Feature: Multiline table cell arguments

  Rule: When a table spreads a row over several lines, the step definition should get one table row object
        per logical row, with each multiline cell holding its fragments joined by newlines.

    Scenario: Logical rows delimited by separator rows
      Given a step with a table whose logical rows are delimited by separator rows
      When I run my Jest Cucumber tests
      Then my step definition should get one row object per logical row, with the multiline cells folded

    Scenario: Logical rows marked by a trailing continuation marker
      Given a step with a table whose multiline rows are marked with a trailing continuation marker
      When I run my Jest Cucumber tests
      Then my step definition should get one row object per logical row, with the multiline cells folded

  Rule: When a table uses neither notation, every line stays a row of its own.

    Scenario: A table using neither notation
      Given a step with a table using neither notation
      When I run my Jest Cucumber tests
      Then my step definition should get one row object per table line

  Rule: When a table is ambiguous, running the feature should fail with the offending line number.

    Scenario: A continuation row that continues an unmarked row
      Given a step with a table whose continuation row follows an unmarked row
      When I run my Jest Cucumber tests
      Then I should see an error message telling me which line is at fault
