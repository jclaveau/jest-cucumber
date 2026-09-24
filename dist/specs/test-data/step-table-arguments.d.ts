import { MockStepDefinitions } from '../utils/wire-up-mock-scenario';
export declare const featureWithTableArgument = "\nFeature: Table arguments\n\n    Scenario: Matching steps\n        Given a given step with step arguments \"1\" and \"2\" and this:\n        | foo | bar |\n        | baz | boo |\n        | ban | bat |\n";
export declare const tableStepWithoutStepArgs: (stepArgs: unknown[]) => MockStepDefinitions;
export declare const tableStepWithStepArgs: (stepArgs: unknown[]) => MockStepDefinitions;
