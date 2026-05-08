import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

import {
    getEntriesFromPackageExports,
    loadPackageConfig,
    runAlias,
    runClean,
    runSyncFiles,
} from "../src/index.mjs";
import { cleanup, createTmpPackage, writeConfig } from "./helpers.mjs";

test("getEntriesFromPackageExports maps subpath keys to entry names", () => {
    assert.deepEqual(
        getEntriesFromPackageExports({
            exports: {
                ".": "./index.js",
                "./package.json": "./package.json",
                "./math": "./dist/math.js",
            },
        }),
        ["math"]
    );
});

test("getEntriesFromPackageExports returns [] when exports is a string", () => {
    assert.deepEqual(
        getEntriesFromPackageExports({
            exports: "./dist/index.js",
        }),
        []
    );
});

test("getEntriesFromPackageExports maps nested subpath keys", () => {
    assert.deepEqual(
        getEntriesFromPackageExports({
            exports: {
                ".": "./index.js",
                "./nested/deep": "./dist/nested/deep.js",
            },
        }),
        ["nested/deep"]
    );
});

test("getEntriesFromPackageExports ignores export key shape when value is conditional object", () => {
    assert.deepEqual(
        getEntriesFromPackageExports({
            exports: {
                ".": "./index.js",
                "./x": {
                    import: "./dist/x.mjs",
                    require: "./dist/x.cjs",
                },
            },
        }),
        ["x"]
    );
});

test("loadPackageConfig derives entries from package.json exports", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./package.json": "./package.json",
            "./alpha": "./dist/alpha.js",
            "./beta": "./dist/beta.js",
        },
    });
    try {
        const config = loadPackageConfig({ cwd: root });
        assert.deepEqual(config.entries, ["alpha", "beta"]);
    } finally {
        cleanup(root);
    }
});

test("loadPackageConfig applies only ignoreExports when entries omitted", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./drop": "./dist/drop.js",
            "./keep": "./dist/keep.js",
        },
    });
    try {
        writeConfig(root, { ignoreExports: ["drop"] });
        const config = loadPackageConfig({ cwd: root });
        assert.deepEqual(config.entries, ["keep"]);
    } finally {
        cleanup(root);
    }
});

test("loadPackageConfig keeps export entries when entries is empty array", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./a": "./dist/a.js",
        },
    });
    try {
        writeConfig(root, { entries: [] });
        const config = loadPackageConfig({ cwd: root });
        assert.deepEqual(config.entries, ["a"]);
    } finally {
        cleanup(root);
    }
});

test("loadPackageConfig ignores non-array entries field", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./fromExports": "./dist/from.js",
        },
    });
    try {
        writeConfig(root, { entries: "fromConfig" });
        const config = loadPackageConfig({ cwd: root });
        assert.deepEqual(config.entries, ["fromExports"]);
    } finally {
        cleanup(root);
    }
});

test("loadPackageConfig loads alternate config file name", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./api": "./dist/api.js",
        },
    });
    try {
        writeConfig(root, { ignoreExports: ["api"] }, "custom-pkg-scripts.json");
        const config = loadPackageConfig({
            cwd: root,
            configFile: "custom-pkg-scripts.json",
        });
        assert.deepEqual(config.entries, []);
    } finally {
        cleanup(root);
    }
});

test("loadPackageConfig redundant ignoreExports for root does not drop subpaths", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./z": "./dist/z.js",
        },
    });
    try {
        writeConfig(root, { ignoreExports: ["."] });
        const config = loadPackageConfig({ cwd: root });
        assert.deepEqual(config.entries, ["z"]);
    } finally {
        cleanup(root);
    }
});

test("loadPackageConfig respects ignoreExports and merges config entries", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./check": "./dist/check.js",
            "./keep": "./dist/keep.js",
        },
    });
    try {
        writeConfig(root, {
            ignoreExports: ["check", "extra"],
            entries: ["extra", "keep"],
        });
        const config = loadPackageConfig({ cwd: root });
        assert.deepEqual(config.entries, ["keep", "extra"]);
    } finally {
        cleanup(root);
    }
});

test("loadPackageConfig applies defaults", () => {
    const root = createTmpPackage();
    try {
        const config = loadPackageConfig({ cwd: root });
        assert.equal(config.packageName, "@omiio/test-pkg");
        assert.deepEqual(config.entries, []);
        assert.deepEqual(config.ignoreFilesEntries, []);
        assert.equal(config.sourceDir, "src");
        assert.equal(config.sourceIndex, "index.ts");
        assert.equal(config.outDir, "dist");
        assert.deepEqual(config.formats, ["cjs", "esm"]);
    } finally {
        cleanup(root);
    }
});

test("runAlias uses entries from package.json exports when config file absent", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./core": "./dist/core.js",
        },
    });
    try {
        runAlias({ cwd: root });

        const corePkgPath = path.join(root, "core", "package.json");
        assert.equal(existsSync(corePkgPath), true);
        const coreManifest = JSON.parse(readFileSync(corePkgPath, "utf-8"));
        assert.equal(coreManifest.name, "@omiio/test-pkg/core");
    } finally {
        cleanup(root);
    }
});

test("runClean removes dist and alias folders derived from exports", () => {
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

        runClean({ cwd: root });

        assert.equal(existsSync(path.join(root, "dist")), false);
        assert.equal(existsSync(path.join(root, "seg")), false);
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

test("runSyncFiles writes dist and alias package manifests", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./check": "./dist/check.js",
            "./nested/deep": "./dist/nested/deep.js",
        },
    });
    try {
        const changed = runSyncFiles({ cwd: root });
        const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));

        assert.equal(changed, true);
        assert.deepEqual(pkg.files, [
            "dist",
            "check/package.json",
            "nested/deep/package.json",
        ]);
    } finally {
        cleanup(root);
    }
});

test("runSyncFiles is idempotent when files already up to date", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./check": "./dist/check.js",
        },
        files: ["dist", "check/package.json"],
    });
    try {
        const changed = runSyncFiles({ cwd: root });
        assert.equal(changed, false);
    } finally {
        cleanup(root);
    }
});

test("runSyncFiles respects pkg-scripts.config ignoreExports and entries merge", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./drop": "./dist/drop.js",
            "./keep": "./dist/keep.js",
        },
    });
    try {
        writeConfig(root, {
            ignoreExports: ["drop"],
            entries: ["extra", "keep"],
        });
        const changed = runSyncFiles({ cwd: root });
        const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));

        assert.equal(changed, true);
        assert.deepEqual(pkg.files, [
            "dist",
            "keep/package.json",
            "extra/package.json",
        ]);
    } finally {
        cleanup(root);
    }
});

test("runSyncFiles supports alternate configFile for entries", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./api": "./dist/api.js",
        },
    });
    try {
        writeConfig(
            root,
            {
                ignoreExports: ["api"],
                entries: ["custom"],
            },
            "custom-pkg-scripts.json"
        );
        const changed = runSyncFiles({
            cwd: root,
            configFile: "custom-pkg-scripts.json",
        });
        const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));

        assert.equal(changed, true);
        assert.deepEqual(pkg.files, ["dist", "custom/package.json"]);
    } finally {
        cleanup(root);
    }
});

test("loadPackageConfig normalizes ignoreFilesEntries", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./alpha": "./dist/alpha.js",
        },
    });
    try {
        writeConfig(root, {
            ignoreFilesEntries: ["alpha", "./nested/deep", ".", "./package.json"],
        });
        const config = loadPackageConfig({ cwd: root });
        assert.deepEqual(config.ignoreFilesEntries, ["alpha", "nested/deep"]);
    } finally {
        cleanup(root);
    }
});

test("runSyncFiles ignores files entries configured by ignoreFilesEntries", () => {
    const root = createTmpPackage({
        name: "@omiio/test-pkg",
        exports: {
            ".": "./dist/index.js",
            "./check": "./dist/check.js",
            "./serve": "./dist/serve.js",
        },
    });
    try {
        writeConfig(root, { ignoreFilesEntries: ["check"] });
        const changed = runSyncFiles({ cwd: root });
        const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));

        assert.equal(changed, true);
        assert.deepEqual(pkg.files, ["dist", "serve/package.json"]);
    } finally {
        cleanup(root);
    }
});
