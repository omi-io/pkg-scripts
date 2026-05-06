import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

import { loadPackageConfig, runAlias, runClean } from "../src/index.mjs";
import { cleanup, createTmpPackage, writeConfig } from "./helpers.mjs";

test("loadPackageConfig applies defaults", () => {
    const root = createTmpPackage();
    try {
        const config = loadPackageConfig({ cwd: root });
        assert.equal(config.packageName, "@omiio/test-pkg");
        assert.deepEqual(config.entries, []);
        assert.equal(config.sourceDir, "src");
        assert.equal(config.sourceIndex, "index.ts");
        assert.equal(config.outDir, "dist");
        assert.deepEqual(config.formats, ["cjs", "esm"]);
    } finally {
        cleanup(root);
    }
});

test("runAlias creates subpath package manifests", () => {
    const root = createTmpPackage();
    try {
        writeConfig(root, { entries: ["core", "domain"] });
        runAlias({ cwd: root });

        const corePkgPath = path.join(root, "core", "package.json");
        const domainPkgPath = path.join(root, "domain", "package.json");
        assert.equal(existsSync(corePkgPath), true);
        assert.equal(existsSync(domainPkgPath), true);

        const coreManifest = JSON.parse(readFileSync(corePkgPath, "utf-8"));
        assert.equal(coreManifest.name, "@omiio/test-pkg/core");
        assert.equal(coreManifest.main, "../dist/cjs/core/index.cjs");
        assert.equal(coreManifest.module, "../dist/esm/core/index.js");
        assert.equal(coreManifest.types, "../dist/types/core/index.d.ts");
    } finally {
        cleanup(root);
    }
});

test("runClean removes dist and alias folders", () => {
    const root = createTmpPackage();
    try {
        writeConfig(root, { entries: ["core"] });
        mkdirSync(path.join(root, "dist", "esm"), { recursive: true });
        mkdirSync(path.join(root, "core"), { recursive: true });

        runClean({ cwd: root });

        assert.equal(existsSync(path.join(root, "dist")), false);
        assert.equal(existsSync(path.join(root, "core")), false);
    } finally {
        cleanup(root);
    }
});
