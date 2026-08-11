export { loadFeature, loadFeatures, parseFeature } from './parsed-feature-loading';
export { DefineStepFunction } from './feature-definition-creation';
export { Options, ErrorOptions, ScenarioNameTemplateVars, setJestCucumberConfiguration } from './configuration';
export { generateCodeFromFeature, generateCodeWithSeparateFunctionsFromFeature, } from './code-generation/generate-code-by-line-number';
export { StepsDefinitionCallbackFunction as StepDefinitions, StepsDefinitionCallbackFunctionWithContext as StepDefinitionsWithContext, IJestLike, } from './feature-definition-creation';
export declare const defineFeature: import("./feature-definition-creation").DefineFeatureFunction;
export declare const autoBindSteps: <C extends NonNullable<unknown> = {}>(parsedFeatures: import("./models").ParsedFeature | import("./models").ParsedFeature[], stepDefinitions: import("./feature-definition-creation").StepsDefinitionCallbackFunctionWithContext<C>[]) => void;
