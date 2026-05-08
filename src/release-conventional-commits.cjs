const COMMIT_TYPES = {
    feat: { semverBump: "minor", changelog: { title: "🚀 Features" } }, // The new feature you're adding to a particular application
    fix: { semverBump: "patch", changelog: { title: "🩹 Fixes" } }, // A bug fix
    perf: { semverBump: "patch", changelog: { title: "🔥 Performance" } }, // A code change that improves perfor­mance
    docs: { semverBump: "none", changelog: { title: "📚 Documentation" } }, // Everything related to documentation
    chore: { semverBump: "none", changelog: { title: "🧹 Chores" } }, // Changes which doesn't change source code or tests e.g. changes to the build process, auxiliary tools, libraries
    ci: { semverBump: "none", changelog: { title: "🤖 CI" } }, // Changes to our CI config­uration files and scripts (example scopes: Travis, Circle, Browse­rStack, SauceLabs)
    build: { semverBump: "none", changelog: { title: "📦 Build" } }, // Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
    refactor: { semverBump: "none", changelog: { title: "♻️ Refactors" } }, // Refactoring a specific section of the codebase
    style: { semverBump: "none", changelog: { title: "🎨 Style" } }, // Changes that do not affect the meaning of the code (white­-space, format­ting, missing semi-c­olons, etc)
    test: { semverBump: "none", changelog: { title: "✅ Tests" } }, // Everything related to testing
    revert: { semverBump: "patch", changelog: { title: "⏪ Reverts" } }, // Reverts a previous commit
    release: { semverBump: "none", changelog: false },
};

const TYPE_SUBJECTS = Object.keys(COMMIT_TYPES);

module.exports = {
    COMMIT_TYPES,
    TYPE_SUBJECTS,
};
