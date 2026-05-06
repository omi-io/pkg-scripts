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
