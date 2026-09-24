import { ParsedFeature } from './models';
import { type StepsDefinitionCallbackFunctionWithContext } from './feature-definition-creation';
export declare const createAutoBindSteps: () => <C extends NonNullable<unknown> = {}>(parsedFeatures: ParsedFeature | ParsedFeature[], stepDefinitions: StepsDefinitionCallbackFunctionWithContext<C>[]) => void;
