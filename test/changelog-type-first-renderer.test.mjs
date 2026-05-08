import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const rendererPath = path.resolve(
    testDir,
    "..",
    "src",
    "changelog-type-first-renderer.cjs"
);
const rendererDir = path.dirname(rendererPath);

const loadRenderer = () => {
    const source = readFileSync(rendererPath, "utf-8");
    const cjsModule = { exports: {} };
    const localRequire = id => {
        if (id === "nx/release/changelog-renderer") {
            return {
                default: class DefaultChangelogRenderer {},
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
const ChangelogTypeFirstRenderer = loadRenderer();

const createRenderer = overrides =>
    Object.assign(Object.create(ChangelogTypeFirstRenderer.prototype), {
        conventionalCommitsConfig: {},
        isVersionPlans: false,
        project: "pkg",
        remoteReleaseClient: {
            getRemoteRepoData: () => null,
            formatReferences: () => "",
        },
        changelogRenderOptions: { commitReferences: true },
        ...overrides,
    });

test("getTitleForType uses configured title first", () => {
    const renderer = createRenderer({
        conventionalCommitsConfig: {
            types: {
                custom: { changelog: { title: "Custom Title" } },
            },
        },
    });

    assert.equal(renderer.getTitleForType("custom"), "Custom Title");
});

test("getTitleForType falls back to known and capitalized names", () => {
    const renderer = createRenderer();
    assert.equal(renderer.getTitleForType("feat"), "🚀 Features");
    assert.equal(renderer.getTitleForType("unknown"), "Unknown");
});

test("getRenderOrder starts with type subjects and appends discovered types", () => {
    const renderer = createRenderer({
        conventionalCommitsConfig: { types: { zeta: { changelog: { title: "Z" } } } },
    });
    const order = renderer.getRenderOrder({ fix: [{}], alpha: [{}] });

    assert.equal(order[0], "feat");
    assert.equal(order.includes("zeta"), true);
    assert.equal(order.includes("alpha"), true);
    assert.equal(order.indexOf("fix"), order.lastIndexOf("fix"));
});

test("shouldRenderType hides type only when changelog is false", () => {
    const renderer = createRenderer({
        conventionalCommitsConfig: {
            types: {
                release: { changelog: false },
                feat: { changelog: { title: "Features" } },
            },
        },
    });

    assert.equal(renderer.shouldRenderType("release"), false);
    assert.equal(renderer.shouldRenderType("feat"), true);
    assert.equal(renderer.shouldRenderType("other"), true);
});

test("formatChange includes scope label and breaking marker", () => {
    const renderer = createRenderer();
    const line = renderer.formatChange({
        description: "New API",
        scope: "core",
        type: "feat",
        isBreaking: true,
    });

    assert.equal(line, "- ⚠️  **core:** New API");
});

test("formatChange preserves multiline body in version plans", () => {
    const renderer = createRenderer({ isVersionPlans: true });
    const line = renderer.formatChange({
        description: "Headline\n\nDetails",
        type: "docs",
        isBreaking: false,
    });

    assert.equal(line, "- **docs:** Headline\n\n  Details");
});

test("renderChangesByType groups, orders and collects breaking changes", () => {
    const renderer = createRenderer({
        conventionalCommitsConfig: {
            types: {
                release: { changelog: false },
            },
        },
        project: "pkg",
        breakingChanges: [],
        groupChangesByType: () => ({
            fix: [{ description: "Patch", type: "fix", isBreaking: false }],
            feat: [{ description: "Big change", type: "feat", isBreaking: true }],
            release: [{ description: "Skip", type: "release", isBreaking: false }],
        }),
        formatBreakingChange: change => `BREAKING: ${change.description}`,
    });

    const lines = renderer.renderChangesByType();

    assert.equal(lines.includes("### 🚀 Features"), true);
    assert.equal(lines.includes("- ⚠️  **feat:** Big change"), true);
    assert.equal(lines.includes("### 🩹 Fixes"), true);
    assert.equal(lines.some(line => line.includes("Skip")), false);
    assert.deepEqual(renderer.breakingChanges, ["BREAKING: Big change"]);
});
