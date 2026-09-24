"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line import/no-extraneous-dependencies
var vitest_1 = require("vitest");
var src_1 = require("../../../../src");
var certificate_factory_1 = require("../../src/certificate-factory");
var feature = (0, src_1.loadFeature)('./examples/typescript/specs/features/using-docstrings.feature');
(0, src_1.defineFeature)(feature, function (test) {
    var certificateFactory;
    var certificate;
    (0, vitest_1.beforeEach)(function () {
        certificateFactory = new certificate_factory_1.CertificateFactory();
    });
    test('Print a certificate', function (_a) {
        var given = _a.given, when = _a.when, then = _a.then;
        given(/^(.*) (.*) has achieved a ([0-9]*)$/, function (title, lastName, score) {
            certificateFactory.setReceiver(title, lastName, score);
        });
        when(/^I print the certificate$/, function () {
            certificate = certificateFactory.printCertificate();
        });
        then(/^It prints$/, function (expectedCertificate) {
            (0, vitest_1.expect)(certificate).toBe(expectedCertificate);
        });
    });
});
//# sourceMappingURL=using-docstrings.steps.js.map