const fs = require("fs");
const path = require("path");
const BaseRenderer = require("./changelog-type-first-renderer.cjs");

class ChangelogScopeFilteredRenderer extends BaseRenderer {
    getExpectedProjectScope() {
        if (this.expectedProjectScope !== undefined) {
            return this.expectedProjectScope;
        }

        const projectName =
            typeof this.project === "string"
                ? this.project
                : this.project?.name || null;

        if (!projectName) {
            this.expectedProjectScope = null;
            return this.expectedProjectScope;
        }

        const packagesDir = path.join(process.cwd(), "packages");
        if (!fs.existsSync(packagesDir)) {
            this.expectedProjectScope = null;
            return this.expectedProjectScope;
        }

        const packageDirs = fs
            .readdirSync(packagesDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => path.join(packagesDir, entry.name));

        for (const packageDir of packageDirs) {
            const packageJsonPath = path.join(packageDir, "package.json");
            if (!fs.existsSync(packageJsonPath)) {
                continue;
            }

            try {
                const packageJson = JSON.parse(
                    fs.readFileSync(packageJsonPath, "utf8")
                );
                if (packageJson.name === projectName) {
                    this.expectedProjectScope =
                        packageJson.scopeCommitName || projectName;
                    return this.expectedProjectScope;
                }
            } catch {
                // Ignore malformed package.json and continue scanning.
            }
        }

        this.expectedProjectScope = null;
        return this.expectedProjectScope;
    }

    groupChangesByType() {
        const grouped = super.groupChangesByType();
        const expectedScope = this.getExpectedProjectScope();

        if (!expectedScope || this.project === null) {
            return grouped;
        }

        const filtered = {};
        for (const [type, changes] of Object.entries(grouped)) {
            const scopedChanges = changes.filter(
                change => (change.scope || "").trim() === expectedScope
            );
            if (scopedChanges.length > 0) {
                filtered[type] = scopedChanges;
            }
        }

        return filtered;
    }
}

module.exports = ChangelogScopeFilteredRenderer;
