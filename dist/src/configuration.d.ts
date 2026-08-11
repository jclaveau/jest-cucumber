import type { IJestLike } from './feature-definition-creation';
export type ErrorOptions = {
    scenariosMustMatchFeatureFile: boolean;
    stepsMustMatchFeatureFile: boolean;
    allowScenariosNotInFeatureFile: boolean;
};
export type Options = {
    loadRelativePath?: boolean;
    tagFilter?: string;
    errors?: ErrorOptions | boolean;
    scenarioNameTemplate?: (vars: ScenarioNameTemplateVars) => string;
    runner?: IJestLike;
};
export type ScenarioNameTemplateVars = {
    featureTitle: string;
    scenarioTitle: string;
    scenarioTags: string[];
    featureTags: string[];
};
export declare const defaultErrorSettings: {
    scenariosMustMatchFeatureFile: boolean;
    stepsMustMatchFeatureFile: boolean;
    allowScenariosNotInFeatureFile: boolean;
};
export declare const defaultConfiguration: Options;
export declare const getJestCucumberConfiguration: (options?: Options) => {
    loadRelativePath?: boolean;
    tagFilter?: string;
    errors?: ErrorOptions | boolean;
    scenarioNameTemplate?: (vars: ScenarioNameTemplateVars) => string;
    runner?: IJestLike;
};
export declare const setJestCucumberConfiguration: (options: Options) => void;
