import { ParsedFeature } from './models';
export type StepsDefinitionCallbackOptions = {
    defineStep: DefineStepFunction;
    given: DefineStepFunction;
    when: DefineStepFunction;
    then: DefineStepFunction;
    and: DefineStepFunction;
    but: DefineStepFunction;
    pending: () => void;
};
export type StepsDefinitionCallbackOptionsWithContext<C extends NonNullable<unknown> = NonNullable<unknown>> = StepsDefinitionCallbackOptions & {
    context: C;
};
export type TestGroup = ((title: string, action: (...args: unknown[]) => void) => void) & {
    skip: (title: string, action: (...args: unknown[]) => void) => void;
    only: (title: string, action: (...args: unknown[]) => void) => void;
};
export interface FrameworkTestCall {
    (title: string, action: (...args: unknown[]) => void | Promise<void> | undefined): void;
    skip: (title: string, action: (...args: unknown[]) => void | Promise<void> | undefined) => void;
    only: (title: string, action: (...args: unknown[]) => void | Promise<void> | undefined) => void;
    concurrent: (title: string, action: (...args: unknown[]) => void | Promise<void> | undefined) => void;
}
export interface IJestLike {
    describe: TestGroup | jest.Describe;
    test: FrameworkTestCall | jest.It;
}
export type ScenariosDefinitionCallbackFunction = (defineScenario: DefineScenarioFunctionWithAliases) => void;
export type DefineScenarioFunction = (scenarioTitle: string, stepsDefinitionCallback: StepsDefinitionCallbackFunction, timeout?: number) => void;
export type DefineScenarioFunctionWithAliases = DefineScenarioFunction & {
    skip: DefineScenarioFunction;
    only: DefineScenarioFunction;
    concurrent: DefineScenarioFunction;
};
export type StepsDefinitionCallbackFunction = (options: StepsDefinitionCallbackOptions) => void;
export type StepsDefinitionCallbackFunctionWithContext<C extends NonNullable<unknown> = NonNullable<unknown>> = (options: StepsDefinitionCallbackOptionsWithContext<C>) => void;
export type DefineStepFunction = (stepMatcher: string | RegExp, stepDefinitionCallback: (...args: any[]) => any) => any;
export type DefineFeatureFunction = (featureFromFile: ParsedFeature, scenariosDefinitionCallback: ScenariosDefinitionCallbackFunction) => void;
export declare const createDefineFeature: () => DefineFeatureFunction;
