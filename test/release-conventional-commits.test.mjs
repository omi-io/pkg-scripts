import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
    COMMIT_TYPES,
    TYPE_SUBJECTS,
} = require("../src/release-conventional-commits.cjs");

test("COMMIT_TYPES contains expected release mapping", () => {
    assert.equal(COMMIT_TYPES.feat.semverBump, "minor");
    assert.equal(COMMIT_TYPES.fix.semverBump, "patch");
    assert.equal(COMMIT_TYPES.release.changelog, false);
});

test("TYPE_SUBJECTS mirrors commit type keys in order", () => {
    assert.deepEqual(TYPE_SUBJECTS, Object.keys(COMMIT_TYPES));
});

test("visible commit types provide changelog titles", () => {
    for (const [type, config] of Object.entries(COMMIT_TYPES)) {
        if (config.changelog === false) {
            continue;
        }
        assert.equal(typeof config.changelog.title, "string", type);
        assert.ok(config.changelog.title.length > 0, type);
    }
});
