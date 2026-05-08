const DefaultChangelogRenderer =
    require("nx/release/changelog-renderer").default;
const {
    COMMIT_TYPES,
    TYPE_SUBJECTS,
} = require("./release-conventional-commits.cjs");

const TITLE = Object.fromEntries(
    Object.entries(COMMIT_TYPES)
        .filter(([, value]) => value?.changelog && value.changelog !== false)
        .map(([type, value]) => [type, value.changelog.title])
);

class ChangelogTypeFirstRenderer extends DefaultChangelogRenderer {
    getTitleForType(type) {
        const configuredTitle =
            this.conventionalCommitsConfig?.types?.[type]?.changelog?.title;
        if (configuredTitle) {
            return configuredTitle;
        }
        return TITLE[type] || `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
    }

    getRenderOrder(typeGroups) {
        const configuredTypes = Object.keys(
            this.conventionalCommitsConfig?.types || {}
        );
        const discoveredTypes = Object.keys(typeGroups);

        return Array.from(
            new Set([...TYPE_SUBJECTS, ...configuredTypes, ...discoveredTypes])
        );
    }

    shouldRenderType(type) {
        const changelogConfig =
            this.conventionalCommitsConfig?.types?.[type]?.changelog;
        if (changelogConfig === false) {
            return false;
        }
        return true;
    }

    renderChangesByType() {
        const markdownLines = [];
        const typeGroups = this.groupChangesByType();
        const types = this.getRenderOrder(typeGroups);

        for (const type of types) {
            const group = typeGroups[type];
            if (!group || group.length === 0 || !this.shouldRenderType(type)) {
                continue;
            }

            markdownLines.push("", `### ${this.getTitleForType(type)}`, "");

            if (this.project === null) {
                const changesGroupedByScope = this.groupChangesByScope(group);
                const scopesSortedAlphabetically = Object.keys(
                    changesGroupedByScope
                ).sort();

                for (const scope of scopesSortedAlphabetically) {
                    const changes = changesGroupedByScope[scope];
                    for (const change of changes.reverse()) {
                        const line = this.formatChange(change);
                        markdownLines.push(line);
                        if (change.isBreaking && !this.isVersionPlans) {
                            this.breakingChanges.push(
                                this.formatBreakingChange(change)
                            );
                        }
                    }
                }
                continue;
            }

            for (const change of group) {
                const line = this.formatChange(change);
                markdownLines.push(line);
                if (change.isBreaking && !this.isVersionPlans) {
                    this.breakingChanges.push(this.formatBreakingChange(change));
                }
            }
        }

        return markdownLines;
    }

    formatChange(change) {
        let description = change.description;
        let extraLines = [];
        let extraLinesStr = "";
        if (description.includes("\n")) {
            [description, ...extraLines] = description.split("\n");
            const indentation = "  ";
            extraLinesStr = (
                this.isVersionPlans
                    ? extraLines
                    : extraLines.filter(line => line.trim().length > 0)
            )
                .map(
                    line =>
                        line.trim().length > 0 ? `${indentation}${line}` : ""
                )
                .join("\n");
        }

        const subjectLabel = (change.scope || change.type || "other").trim();
        let changeLine =
            "- " +
            (!this.isVersionPlans && change.isBreaking ? "⚠️  " : "") +
            `**${subjectLabel}:** ` +
            description;

        if (
            this.remoteReleaseClient.getRemoteRepoData() &&
            this.changelogRenderOptions.commitReferences &&
            change.githubReferences
        ) {
            changeLine += this.remoteReleaseClient.formatReferences(
                change.githubReferences
            );
        }

        if (extraLinesStr) {
            changeLine += (this.isVersionPlans ? "\n" : "\n\n") + extraLinesStr;
        }

        return changeLine;
    }
}

module.exports = ChangelogTypeFirstRenderer;
