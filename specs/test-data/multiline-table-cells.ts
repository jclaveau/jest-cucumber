import { DefineFeatureFunction } from '../../src/feature-definition-creation';
import { ParsedFeature } from '../../src/models';
import { MockStepDefinitions } from '../utils/wire-up-mock-scenario';

export const featureWithSeparatorRows = `
Feature: Multiline table cells

    Scenario: Matching steps
        Given a given step with this:
        | type  | enrollment | schedule_segments        |
        |-------|------------|--------------------------|
        | major | LSpS 1     | [                        |
        |       | LSpS       |   {"key": "semester_1"}, |
        |       | Bordeaux   |   {"key": "semester_2"}  |
        |       |            | ]                        |
        |-------|------------|--------------------------|
        | minor | Terminale  | []                       |
`;

export const featureWithContinuationMarkers = `
Feature: Multiline table cells

    Scenario: Matching steps
        Given a given step with this:
        | type  | enrollment | schedule_segments        |
        | major | LSpS 1     | [                        |+
        |       | LSpS       |   {"key": "semester_1"}, |
        |       | Bordeaux   |   {"key": "semester_2"}  |
        |       |            | ]                        |
        | minor | Terminale  | []                       |
`;

export const featureWithoutMultilineCells = `
Feature: Multiline table cells

    Scenario: Matching steps
        Given a given step with this:
        | type  | enrollment | schedule_segments        |
        | major | LSpS 1     | [{"key": "semester_1"}]  |
        | minor | Terminale  | []                       |
`;

export const featureWithUnmarkedContinuationRow = `
Feature: Multiline table cells

    Scenario: Matching steps
        Given a given step with this:
        | type  | enrollment |
        | major | LSpS 1     |
        |       | LSpS       |+
        |       | Bordeaux   |
`;

export const tableStep = (stepArgs: unknown[]): MockStepDefinitions => {
  return (mockFeature: ParsedFeature, defineMockFeature: DefineFeatureFunction) => {
    defineMockFeature(mockFeature, test => {
      test('Matching steps', ({ given }) => {
        given('a given step with this:', (...args: unknown[]) => {
          args.forEach(arg => stepArgs.push(arg));
        });
      });
    });
  };
};
