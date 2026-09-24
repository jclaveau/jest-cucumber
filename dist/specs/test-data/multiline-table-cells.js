"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableStep = exports.featureWithUnmarkedFirstRow = exports.featureWithoutMultilineCells = exports.featureWithContinuationMarkers = exports.featureWithSeparatorRows = void 0;
exports.featureWithSeparatorRows = "\nFeature: Multiline table cells\n\n    Scenario: Matching steps\n        Given a given step with this:\n        | type  | enrollment | schedule_segments        |\n        |-------|------------|--------------------------|\n        | major | LSpS 1     | [                        |\n        |       | LSpS       |   {\"key\": \"semester_1\"}, |\n        |       | Bordeaux   |   {\"key\": \"semester_2\"}  |\n        |       |            | ]                        |\n        |-------|------------|--------------------------|\n        | minor | Terminale  | []                       |\n";
exports.featureWithContinuationMarkers = "\nFeature: Multiline table cells\n\n    Scenario: Matching steps\n        Given a given step with this:\n        | type  | enrollment | schedule_segments        |\n        | major | LSpS 1     | [                        |+\n        |       | LSpS       |   {\"key\": \"semester_1\"}, |\n        |       | Bordeaux   |   {\"key\": \"semester_2\"}  |\n        |       |            | ]                        |\n        | minor | Terminale  | []                       |+\n";
exports.featureWithoutMultilineCells = "\nFeature: Multiline table cells\n\n    Scenario: Matching steps\n        Given a given step with this:\n        | type  | enrollment | schedule_segments        |\n        | major | LSpS 1     | [{\"key\": \"semester_1\"}]  |\n        | minor | Terminale  | []                       |\n";
exports.featureWithUnmarkedFirstRow = "\nFeature: Multiline table cells\n\n    Scenario: Matching steps\n        Given a given step with this:\n        | type  | enrollment |\n        | major | LSpS 1     |\n        | minor | Terminale  |+\n";
var tableStep = function (stepArgs) {
    return function (mockFeature, defineMockFeature) {
        defineMockFeature(mockFeature, function (test) {
            test('Matching steps', function (_a) {
                var given = _a.given;
                given('a given step with this:', function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    args.forEach(function (arg) { return stepArgs.push(arg); });
                });
            });
        });
    };
};
exports.tableStep = tableStep;
//# sourceMappingURL=multiline-table-cells.js.map