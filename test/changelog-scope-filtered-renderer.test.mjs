import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const rendererPath = path.resolve(
    testDir,
    "..",
    "src",
    "changelog-scope-filtered-renderer.cjs"
);
const rendererDir = path.dirname(rendererPath);

const loadRenderer = () => {
    const source = readFileSync(rendererPath, "utf-8");
    const cjsModule = { exports: {} };
    const localRequire = id => {
        if (id === "./changelog-type-first-renderer.cjs") {
            return class BaseRenderer {
                groupChangesByType() {
                    return this.baseGroupedChanges || {};
                }
            };
        }
        if (id.startsWith(".")) {
            return require(path.resolve(rendererDir, id));
        }
        return require(id);
    };
    const evaluate = new Function(
        "require",
        "module",
        "exports",
        "__filename",
        "__dirname",
        source
    );
    evaluate(
        localRequire,
        cjsModule,
        cjsModule.exports,
        rendererPath,
        rendererDir
    );
    return cjsModule.exports;
};

const ChangelogScopeFilteredRenderer = loadRenderer();

const createRenderer = overrides =>
    Object.assign(Object.create(ChangelogScopeFilteredRenderer.prototype), {
        project: "@omi-io/pkg-a",
        baseGroupedChanges: {},
        ...overrides,
    });

const withTmpCwd = fn => {
    const prev = process.cwd();
    const tmp = mkdtempSync(path.join(os.tmpdir(), "scope-renderer-"));
    process.chdir(tmp);
    try {
        return fn(tmp);
    } finally {
        process.chdir(prev);
        rmSync(tmp, { recursive: true, force: true });
    }
};

test("getExpectedProjectScope returns null when packages directory is absent", () => {
    withTmpCwd(() => {
        const renderer = createRenderer({ project: "@omi-io/pkg-a" });
        assert.equal(renderer.getExpectedProjectScope(), null);
    });
});

test("getExpectedProjectScope resolves scopeCommitName from matching package", () => {
    withTmpCwd(tmp => {
        const packageDir = path.join(tmp, "packages", "pkg-a");
        mkdirSync(packageDir, { recursive: true });
        writeFileSync(
            path.join(packageDir, "package.json"),
            JSON.stringify(
                {
                    name: "@omi-io/pkg-a",
                    scopeCommitName: "pkg-a-scope",
                },
                null,
                2
            ),
            "utf-8"
        );

        const renderer = createRenderer({ project: "@omi-io/pkg-a" });
        assert.equal(renderer.getExpectedProjectScope(), "pkg-a-scope");
    });
});

test("getExpectedProjectScope falls back to package name when custom scope missing", () => {
    withTmpCwd(tmp => {
        const packageDir = path.join(tmp, "packages", "pkg-a");
        mkdirSync(packageDir, { recursive: true });
        writeFileSync(
            path.join(packageDir, "package.json"),
            JSON.stringify({ name: "@omi-io/pkg-a" }, null, 2),
            "utf-8"
        );

        const renderer = createRenderer({ project: "@omi-io/pkg-a" });
        assert.equal(renderer.getExpectedProjectScope(), "@omi-io/pkg-a");
    });
});

test("groupChangesByType filters to expected scope only", () => {
    withTmpCwd(tmp => {
        const packageDir = path.join(tmp, "packages", "pkg-a");
        mkdirSync(packageDir, { recursive: true });
        writeFileSync(
            path.join(packageDir, "package.json"),
            JSON.stringify(
                {
                    name: "@omi-io/pkg-a",
                    scopeCommitName: "pkg-a",
                },
                null,
                2
            ),
            "utf-8"
        );

        const renderer = createRenderer({
            project: "@omi-io/pkg-a",
            baseGroupedChanges: {
                feat: [
                    { scope: "pkg-a", description: "kept" },
                    { scope: "pkg-b", description: "drop" },
                ],
                fix: [{ scope: "pkg-b", description: "drop fix" }],
                docs: [{ scope: " pkg-a ", description: "trimmed keep" }],
            },
        });

        const grouped = renderer.groupChangesByType();
        assert.deepEqual(grouped, {
            feat: [{ scope: "pkg-a", description: "kept" }],
            docs: [{ scope: " pkg-a ", description: "trimmed keep" }],
        });
    });
});

test("groupChangesByType does not filter when project is null", () => {
    const renderer = createRenderer({
        project: null,
        expectedProjectScope: "pkg-a",
        baseGroupedChanges: {
            feat: [{ scope: "pkg-a" }, { scope: "pkg-b" }],
        },
    });

    assert.deepEqual(renderer.groupChangesByType(), {
        feat: [{ scope: "pkg-a" }, { scope: "pkg-b" }],
    });
});
