import { loadFeature, defineFeature, DefineStepFunction } from '../../src';
import {
  featureWithContinuationMarkers,
  featureWithSeparatorRows,
  featureWithUnmarkedFirstRow,
  featureWithoutMultilineCells,
  tableStep,
} from '../test-data/multiline-table-cells';
import { MockTestRunner } from '../utils/mock-test-runner/mock-test-runner';
import { MockStepDefinitions, wireUpMockFeature } from '../utils/wire-up-mock-scenario';

const feature = loadFeature('./specs/features/steps/multiline-table-cells.feature');

defineFeature(feature, test => {
  let mockTestRunner: MockTestRunner;
  let errorMessage = '';
  let stepDefinitions: MockStepDefinitions | null = null;
  let featureFile: string | null = null;
  let stepArguments: unknown[];

  beforeEach(() => {
    mockTestRunner = new MockTestRunner();
    errorMessage = '';
    stepArguments = [];
  });

  const whenIRunMyJestCucumberTests = (when: DefineStepFunction) => {
    when('I run my Jest Cucumber tests', async () => {
      try {
        wireUpMockFeature(mockTestRunner, featureFile as string, stepDefinitions);

        await mockTestRunner.execute();
      } catch (err) {
        errorMessage = err.message;
      }
    });
  };

  const thenTheRowsShouldBeFolded = (then: DefineStepFunction) => {
    then('my step definition should get one row object per logical row, with the multiline cells folded', () => {
      expect(errorMessage).toBeFalsy();
      expect(stepArguments).toHaveLength(1);
      expect(stepArguments[0]).toStrictEqual([
        {
          type: 'major',
          enrollment: 'LSpS 1\nLSpS\nBordeaux',
          schedule_segments: '[\n  {"key": "semester_1"},\n  {"key": "semester_2"}\n]',
        },
        { type: 'minor', enrollment: 'Terminale', schedule_segments: '[]' },
      ]);
    });
  };

  test('Logical rows delimited by separator rows', ({ given, when, then }) => {
    given('a step with a table whose logical rows are delimited by separator rows', () => {
      featureFile = featureWithSeparatorRows;
      stepDefinitions = tableStep(stepArguments);
    });

    whenIRunMyJestCucumberTests(when);

    thenTheRowsShouldBeFolded(then);
  });

  test('Logical rows opened by a trailing marker', ({ given, when, then }) => {
    given('a step with a table whose every row is opened by a trailing marker', () => {
      featureFile = featureWithContinuationMarkers;
      stepDefinitions = tableStep(stepArguments);
    });

    whenIRunMyJestCucumberTests(when);

    thenTheRowsShouldBeFolded(then);
  });

  test('A table using neither notation', ({ given, when, then }) => {
    given('a step with a table using neither notation', () => {
      featureFile = featureWithoutMultilineCells;
      stepDefinitions = tableStep(stepArguments);
    });

    whenIRunMyJestCucumberTests(when);

    then('my step definition should get one row object per table line', () => {
      expect(errorMessage).toBeFalsy();
      expect(stepArguments[0]).toStrictEqual([
        { type: 'major', enrollment: 'LSpS 1', schedule_segments: '[{"key": "semester_1"}]' },
        { type: 'minor', enrollment: 'Terminale', schedule_segments: '[]' },
      ]);
    });
  });

  test('A table whose first row is not marked', ({ given, when, then }) => {
    given('a step with a table whose first row is not marked', () => {
      featureFile = featureWithUnmarkedFirstRow;
      stepDefinitions = tableStep(stepArguments);
    });

    whenIRunMyJestCucumberTests(when);

    then('I should see an error message telling me which line is at fault', () => {
      expect(errorMessage).toBe(
        'Line 7: every row of this table opens with "|+", so this line reads as a continuation of the header',
      );
      expect(stepArguments).toHaveLength(0);
    });
  });
});
