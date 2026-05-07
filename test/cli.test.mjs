import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { cleanup, createTmpPackage, writeConfig } from "./helpers.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(testDir, "..", "bin", "cli.mjs");

const runCli = ({ cwd, args = [] }) =>
    spawnSync(process.execPath, [cliPath, ...args], {
        cwd,
        encoding: "utf-8",
    });

test("cli alias creates subpath manifests", () => {
    const root = createTmpPackage();
    try {
        writeConfig(root, { entries: ["core"] });
        const result = runCli({ cwd: root, args: ["alias"] });

        assert.equal(result.status, 0);
        assert.equal(existsSync(path.join(root, "core", "package.json")), true);
    } finally {
        cleanup(root);
    }
});

test("cli clean removes dist and alias folders", () => {
    const root = createTmpPackage();
    try {
        writeConfig(root, { entries: ["core"] });
        mkdirSync(path.join(root, "dist", "esm"), { recursive: true });
        mkdirSync(path.join(root, "core"), { recursive: true });

        const result = runCli({ cwd: root, args: ["clean"] });

        assert.equal(result.status, 0);
        assert.equal(existsSync(path.join(root, "dist")), false);
        assert.equal(existsSync(path.join(root, "core")), false);
    } finally {
        cleanup(root);
    }
});

test("cli shows usage for unknown command", () => {
    const root = createTmpPackage();
    try {
        const result = runCli({ cwd: root, args: ["unknown"] });

        assert.equal(result.status, 1);
        assert.match(result.stderr, /Usage: omi-io-pkg <alias\|build\|clean>/);
    } finally {
        cleanup(root);
    }
});

test("cli build uses entries from package.json exports when config absent", () => {
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
            "export const root = 1;\n",
            "utf-8"
        );
        writeFileSync(
            path.join(root, "src", "core", "index.ts"),
            "export const core = 1;\n",
            "utf-8"
        );

        const result = runCli({ cwd: root, args: ["build"] });

        assert.equal(result.status, 0);
        assert.equal(
            existsSync(path.join(root, "dist", "cjs", "core", "index.cjs")),
            true
        );
    } finally {
        cleanup(root);
    }
});

test("cli alias uses entries from package.json exports when config absent", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./seg": "./dist/seg.js",
        },
    });
    try {
        const result = runCli({ cwd: root, args: ["alias"] });

        assert.equal(result.status, 0);
        assert.equal(existsSync(path.join(root, "seg", "package.json")), true);
        const giPath = path.join(root, "seg", ".gitignore");
        assert.equal(existsSync(giPath), true);
        const gi = readFileSync(giPath, "utf-8");
        assert.equal(gi, "*\n");
    } finally {
        cleanup(root);
    }
});

test("cli clean removes dist and alias folders from exports-derived entries", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./seg": "./dist/seg.js",
        },
    });
    try {
        mkdirSync(path.join(root, "dist", "esm"), { recursive: true });
        mkdirSync(path.join(root, "seg"), { recursive: true });

        const result = runCli({ cwd: root, args: ["clean"] });

        assert.equal(result.status, 0);
        assert.equal(existsSync(path.join(root, "dist")), false);
        assert.equal(existsSync(path.join(root, "seg")), false);
    } finally {
        cleanup(root);
    }
});
