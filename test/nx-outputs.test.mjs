import test from "node:test";
import assert from "node:assert/strict";
import { getBuildOutputGlobsFromConfig } from "../src/config.mjs";

test("getBuildOutputGlobsFromConfig includes dist and entry folders", () => {
    assert.deepEqual(
        getBuildOutputGlobsFromConfig({
            entries: ["check", "math"],
            outDir: "dist",
        }),
        ["{projectRoot}/dist/**", "{projectRoot}/check/**", "{projectRoot}/math/**"]
    );
});

test("getBuildOutputGlobsFromConfig normalizes outDir and entry slashes", () => {
    assert.deepEqual(
        getBuildOutputGlobsFromConfig({
            entries: ["./alpha/"],
            outDir: "./build/",
        }),
        ["{projectRoot}/build/**", "{projectRoot}/alpha/**"]
    );
});

test("getBuildOutputGlobsFromConfig handles nested entry names", () => {
    assert.deepEqual(
        getBuildOutputGlobsFromConfig({
            entries: ["nested/deep"],
            outDir: "dist",
        }),
        ["{projectRoot}/dist/**", "{projectRoot}/nested/deep/**"]
    );
});

test("getBuildOutputGlobsFromConfig skips empty entries", () => {
    assert.deepEqual(
        getBuildOutputGlobsFromConfig({
            entries: ["", "ok"],
            outDir: "dist",
        }),
        ["{projectRoot}/dist/**", "{projectRoot}/ok/**"]
    );
});
