import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import {
    ALIAS_DIR_GITIGNORE_CONTENT,
    assertSafeAliasEntryForGitignore,
    runAlias,
    syncAliasDirGitignore,
} from "../src/index.mjs";
import { cleanup, createTmpPackage, writeConfig } from "./helpers.mjs";

test("assertSafeAliasEntryForGitignore rejects traversal in entry names", () => {
    assert.throws(() => assertSafeAliasEntryForGitignore("../x"), /\.\./);
});

test("syncAliasDirGitignore creates alias-local .gitignore with star pattern", () => {
    const root = createTmpPackage();
    try {
        writeConfig(root, { entries: ["echo"] });
        runAlias({ cwd: root });
        const gi = path.join(root, "echo", ".gitignore");
        assert.equal(existsSync(gi), true);
        assert.equal(readFileSync(gi, "utf-8"), ALIAS_DIR_GITIGNORE_CONTENT);
    } finally {
        cleanup(root);
    }
});

test("runAlias writes alias-local .gitignore for exports-derived alias", () => {
    const root = createTmpPackage({
        name: "@omi/example-lib",
        exports: {
            ".": "./dist/index.js",
            "./echo": "./dist/echo.js",
        },
    });
    try {
        runAlias({ cwd: root });
        const gi = path.join(root, "echo", ".gitignore");
        assert.equal(existsSync(gi), true);
        const text = readFileSync(gi, "utf-8");
        assert.equal(text, ALIAS_DIR_GITIGNORE_CONTENT);
    } finally {
        cleanup(root);
    }
});

test("syncAliasDirGitignore is idempotent on disk", () => {
    const root = createTmpPackage();
    try {
        writeConfig(root, { entries: ["core"] });
        runAlias({ cwd: root });
        const giPath = path.join(root, "core", ".gitignore");
        const once = readFileSync(giPath, "utf-8");
        syncAliasDirGitignore(root, "core");
        const twice = readFileSync(giPath, "utf-8");
        assert.equal(twice, once);
    } finally {
        cleanup(root);
    }
});

test("syncAliasDirGitignore overwrites custom content with star pattern", () => {
    const root = createTmpPackage();
    try {
        writeConfig(root, { entries: ["a"] });
        runAlias({ cwd: root });
        writeFileSync(
            path.join(root, "a", ".gitignore"),
            "# custom\n!keep-me\n",
            "utf-8"
        );
        syncAliasDirGitignore(root, "a");

        const text = readFileSync(path.join(root, "a", ".gitignore"), "utf-8");
        assert.equal(text, ALIAS_DIR_GITIGNORE_CONTENT);
    } finally {
        cleanup(root);
    }
});
