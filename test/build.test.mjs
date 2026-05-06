import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { runBuild } from "../src/index.mjs";
import { cleanup, createTmpPackage, writeConfig } from "./helpers.mjs";

test("runBuild produces cjs and esm bundles", async () => {
    const root = createTmpPackage();
    try {
        writeConfig(root, { entries: ["core"], formats: ["cjs", "esm"] });
        mkdirSync(path.join(root, "src", "core"), { recursive: true });
        writeFileSync(
            path.join(root, "src", "index.ts"),
            'export const rootValue = "root";\n',
            "utf-8"
        );
        writeFileSync(
            path.join(root, "src", "core", "index.ts"),
            'export const coreValue = "core";\n',
            "utf-8"
        );

        await runBuild({ cwd: root });

        assert.equal(
            existsSync(path.join(root, "dist", "cjs", "index.cjs")),
            true
        );
        assert.equal(
            existsSync(path.join(root, "dist", "cjs", "core", "index.cjs")),
            true
        );
        assert.equal(
            existsSync(path.join(root, "dist", "esm", "index.js")),
            true
        );
        assert.equal(
            existsSync(path.join(root, "dist", "esm", "core", "index.js")),
            true
        );
    } finally {
        cleanup(root);
    }
});

test("runBuild derives entry points from package.json exports without config file", async () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./core": "./dist/core.js",
        },
    });
    try {
        mkdirSync(path.join(root, "src", "core"), { recursive: true });
        writeFileSync(
            path.join(root, "src", "index.ts"),
            'export const rootValue = "root";\n',
            "utf-8"
        );
        writeFileSync(
            path.join(root, "src", "core", "index.ts"),
            'export const coreValue = "core";\n',
            "utf-8"
        );

        await runBuild({ cwd: root, formats: ["cjs", "esm"] });

        assert.equal(
            existsSync(path.join(root, "dist", "cjs", "index.cjs")),
            true
        );
        assert.equal(
            existsSync(path.join(root, "dist", "cjs", "core", "index.cjs")),
            true
        );
        assert.equal(
            existsSync(path.join(root, "dist", "esm", "core", "index.js")),
            true
        );
    } finally {
        cleanup(root);
    }
});

test("runBuild handles nested export subpath as entry directory", async () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./nested/deep": "./dist/nested/deep.js",
        },
    });
    try {
        mkdirSync(path.join(root, "src", "nested", "deep"), { recursive: true });
        writeFileSync(
            path.join(root, "src", "index.ts"),
            "export const root = 1;\n",
            "utf-8"
        );
        writeFileSync(
            path.join(root, "src", "nested", "deep", "index.ts"),
            "export const deep = 1;\n",
            "utf-8"
        );

        await runBuild({ cwd: root, formats: ["cjs", "esm"] });

        assert.equal(
            existsSync(
                path.join(root, "dist", "cjs", "nested", "deep", "index.cjs")
            ),
            true
        );
        assert.equal(
            existsSync(
                path.join(root, "dist", "esm", "nested", "deep", "index.js")
            ),
            true
        );
    } finally {
        cleanup(root);
    }
});
