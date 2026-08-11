"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefineFeature = void 0;
var scenario_validation_1 = require("./validation/scenario-validation");
var step_definition_validation_1 = require("./validation/step-definition-validation");
var tag_filtering_1 = require("./tag-filtering");
var configuration_1 = require("./configuration");
var getJestLike = function (jestLike) {
    var _a, _b, _c;
    var jestLikeConfig = (_a = (0, configuration_1.getJestCucumberConfiguration)().runner) !== null && _a !== void 0 ? _a : {};
    if (typeof describe === 'function' && typeof test === 'function') {
        jestLikeConfig.describe = describe;
        jestLikeConfig.test = test;
    }
    jestLikeConfig.describe = (_b = jestLike === null || jestLike === void 0 ? void 0 : jestLike.describe) !== null && _b !== void 0 ? _b : jestLikeConfig === null || jestLikeConfig === void 0 ? void 0 : jestLikeConfig.describe;
    jestLikeConfig.test = (_c = jestLike === null || jestLike === void 0 ? void 0 : jestLike.test) !== null && _c !== void 0 ? _c : jestLikeConfig === null || jestLikeConfig === void 0 ? void 0 : jestLikeConfig.test;
    if (!(jestLikeConfig === null || jestLikeConfig === void 0 ? void 0 : jestLikeConfig.test) || !(jestLikeConfig === null || jestLikeConfig === void 0 ? void 0 : jestLikeConfig.describe)) {
        throw new Error("The 'describe' and 'test' functions cannot be found. If you are using vitest or equivalent, please use the following function in your setupTest to configure jest-cucumber:\n\nimport { describe, test } from 'vitest';\nimport { setJestCucumberConfiguration } from './src';\n\nsetJestCucumberConfiguration({\n  runner: {\n    describe,\n    test,\n  },\n});\n\nPlease check your configuration.");
    }
    return jestLikeConfig;
};
var createDefineFeature = function () {
    var processScenarioTitleTemplate = function (scenarioTitle, parsedFeature, options, parsedScenario, parsedScenarioOutline) {
        if (options && options.scenarioNameTemplate) {
            try {
                return (options &&
                    options.scenarioNameTemplate({
                        featureTitle: parsedFeature.title,
                        scenarioTitle: scenarioTitle.toString(),
                        featureTags: parsedFeature.tags,
                        scenarioTags: (parsedScenario || parsedScenarioOutline).tags,
                    }));
            }
            catch (err) {
                throw new Error("An error occurred while executing a scenario name template. \nTemplate:\n".concat(options.scenarioNameTemplate, "\nError:").concat(err.message));
            }
        }
        return scenarioTitle;
    };
    var checkForPendingSteps = function (scenarioFromStepDefinitions) {
        var scenarioPending = false;
        scenarioFromStepDefinitions.steps.forEach(function (step) {
            try {
                if (step.stepFunction.toString().indexOf('pending()') !== -1) {
                    // eslint-disable-next-line no-new-func
                    var pendingTest = new Function("\n                        let isPending = false;\n\n                        const pending = function () {\n                            isPending = true;\n                        };\n\n                        (".concat(step.stepFunction, ")();\n\n                        return isPending;\n                    "));
                    scenarioPending = pendingTest();
                }
            }
            catch (err) {
                // Ignore
            }
        });
        return scenarioPending;
    };
    var getTestFunction = function (skippedViaTagFilter, only, skip, concurrent, jestLike) {
        if (skip || skippedViaTagFilter) {
            return jestLike.test.skip;
        }
        if (only) {
            return jestLike.test.only;
        }
        if (concurrent) {
            return jestLike.test.concurrent;
        }
        return jestLike.test;
    };
    var defineScenario = function (scenarioTitle, scenarioFromStepDefinitions, parsedScenario, jestLike, only, skip, concurrent, timeout) {
        if (only === void 0) { only = false; }
        if (skip === void 0) { skip = false; }
        if (concurrent === void 0) { concurrent = false; }
        if (timeout === void 0) { timeout = undefined; }
        var testFunction = getTestFunction(parsedScenario.skippedViaTagFilter, only, skip, concurrent, jestLike);
        testFunction(scenarioTitle, function () {
            return scenarioFromStepDefinitions.steps.reduce(function (promiseChain, nextStep, index) {
                var parsedStep = parsedScenario.steps[index];
                var stepArgument = parsedStep.stepArgument;
                var matches = (0, step_definition_validation_1.matchSteps)(parsedStep.stepText, scenarioFromStepDefinitions.steps[index].stepMatcher);
                var matchArgs = [];
                if (matches && matches.length) {
                    matchArgs = matches.slice(1);
                }
                var args = __spreadArray([], matchArgs, true);
                if (stepArgument !== undefined && stepArgument !== null) {
                    args.push(stepArgument);
                }
                var hasDoneCallback = nextStep.stepFunction.length > args.length;
                return promiseChain.then(function () {
                    return Promise.resolve()
                        .then(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            if (hasDoneCallback) {
                                return [2 /*return*/, new Promise(function (resolve, reject) {
                                        var doneFunction = function (reason) {
                                            if (reason) {
                                                reject(typeof reason === 'string' ? new Error(reason) : reason);
                                            }
                                            else {
                                                resolve();
                                            }
                                        };
                                        nextStep.stepFunction.apply(nextStep, __spreadArray(__spreadArray([], args, false), [doneFunction], false));
                                    })];
                            }
                            return [2 /*return*/, nextStep.stepFunction.apply(nextStep, args)];
                        });
                    }); })
                        .catch(function (error) {
                        var formattedError = error;
                        formattedError.message = "Failing step: \"".concat(parsedStep.stepText, "\"\n\nStep arguments: ").concat(JSON.stringify(args), "\n\nError: ").concat(error.message);
                        throw formattedError;
                    });
                });
            }, Promise.resolve());
        }, timeout);
    };
    var createDefineStepFunction = function (scenarioFromStepDefinitions) {
        return function (stepMatcher, stepFunction) {
            var stepDefinition = {
                stepMatcher: stepMatcher,
                stepFunction: stepFunction,
            };
            scenarioFromStepDefinitions.steps.push(stepDefinition);
        };
    };
    var createDefineScenarioFunction = function (featureFromStepDefinitions, parsedFeature, only, skip, concurrent) {
        if (only === void 0) { only = false; }
        if (skip === void 0) { skip = false; }
        if (concurrent === void 0) { concurrent = false; }
        var defineScenarioFunction = function (scenarioTitle, stepsDefinitionFunctionCallback, timeout) {
            var _a;
            var scenarioFromStepDefinitions = {
                title: scenarioTitle,
                steps: [],
            };
            featureFromStepDefinitions.scenarios.push(scenarioFromStepDefinitions);
            stepsDefinitionFunctionCallback({
                defineStep: createDefineStepFunction(scenarioFromStepDefinitions),
                given: createDefineStepFunction(scenarioFromStepDefinitions),
                when: createDefineStepFunction(scenarioFromStepDefinitions),
                then: createDefineStepFunction(scenarioFromStepDefinitions),
                and: createDefineStepFunction(scenarioFromStepDefinitions),
                but: createDefineStepFunction(scenarioFromStepDefinitions),
                pending: function () {
                    // Nothing to do
                },
            });
            var parsedScenario = parsedFeature.scenarios.filter(function (s) { return s.title.toLowerCase() === scenarioTitle.toLowerCase(); })[0];
            var parsedScenarioOutline = parsedFeature.scenarioOutlines.filter(function (s) { return s.title.toLowerCase() === scenarioTitle.toLowerCase(); })[0];
            var options = parsedFeature.options;
            // eslint-disable-next-line no-param-reassign
            scenarioTitle = processScenarioTitleTemplate(scenarioTitle, parsedFeature, options, parsedScenario, parsedScenarioOutline);
            (0, step_definition_validation_1.ensureFeatureFileAndStepDefinitionScenarioHaveSameSteps)(options, parsedScenario || parsedScenarioOutline, scenarioFromStepDefinitions);
            if (checkForPendingSteps(scenarioFromStepDefinitions)) {
                (_a = options.runner) === null || _a === void 0 ? void 0 : _a.test.skip(scenarioTitle, function () {
                    // Nothing to do
                }, undefined);
            }
            else if (parsedScenario) {
                defineScenario(scenarioTitle, scenarioFromStepDefinitions, parsedScenario, options.runner, only, skip, concurrent, timeout);
            }
            else if (parsedScenarioOutline) {
                parsedScenarioOutline.scenarios.forEach(function (scenario) {
                    defineScenario(scenario.title || scenarioTitle, scenarioFromStepDefinitions, scenario, options.runner, only, skip, concurrent, timeout);
                });
            }
        };
        return defineScenarioFunction;
    };
    var createDefineScenarioFunctionWithAliases = function (featureFromStepDefinitions, parsedFeature) {
        var defineScenarioFunctionWithAliases = createDefineScenarioFunction(featureFromStepDefinitions, parsedFeature);
        defineScenarioFunctionWithAliases.only = createDefineScenarioFunction(featureFromStepDefinitions, parsedFeature, true, false, false);
        defineScenarioFunctionWithAliases.skip = createDefineScenarioFunction(featureFromStepDefinitions, parsedFeature, false, true, false);
        defineScenarioFunctionWithAliases.concurrent = createDefineScenarioFunction(featureFromStepDefinitions, parsedFeature, false, false, true);
        return defineScenarioFunctionWithAliases;
    };
    return function defineFeature(featureFromFile, scenariosDefinitionCallback) {
        var jestLike = getJestLike(featureFromFile.options.runner);
        var featureFromDefinedSteps = {
            title: featureFromFile.title,
            scenarios: [],
        };
        var parsedFeatureWithTagFiltersApplied = (0, tag_filtering_1.applyTagFilters)(featureFromFile);
        parsedFeatureWithTagFiltersApplied.options.runner = jestLike;
        if (parsedFeatureWithTagFiltersApplied.scenarios.length === 0 &&
            parsedFeatureWithTagFiltersApplied.scenarioOutlines.length === 0) {
            return;
        }
        jestLike.describe(featureFromFile.title, function () {
            scenariosDefinitionCallback(createDefineScenarioFunctionWithAliases(featureFromDefinedSteps, parsedFeatureWithTagFiltersApplied));
            (0, scenario_validation_1.checkThatFeatureFileAndStepDefinitionsHaveSameScenarios)(parsedFeatureWithTagFiltersApplied, featureFromDefinedSteps);
        });
    };
};
exports.createDefineFeature = createDefineFeature;
//# sourceMappingURL=feature-definition-creation.js.map