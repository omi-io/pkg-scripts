import path from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const ALIAS_DIR_GITIGNORE_CONTENT = "*\n";

export function assertSafeAliasEntryForGitignore(entry) {
    if (typeof entry !== "string") {
        throw new TypeError(`Alias entry must be a string, got ${typeof entry}`);
    }
    const normalized = entry.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (!normalized) {
        throw new Error("Alias entry must not be empty");
    }
    if (normalized.includes("..")) {
        throw new Error(`Alias entry must not contain "..": ${JSON.stringify(entry)}`);
    }
    for (const segment of normalized.split("/")) {
        if (segment === "" || segment === "." || segment === "..") {
            throw new Error(`Invalid alias entry segment: ${JSON.stringify(entry)}`);
        }
    }
}

/**
 * Ensure `<packageDir>/<entry>/.gitignore` exists and contains only `*`.
 * Idempotent: file is rewritten only when contents differ.
 *
 * @param {string} packageDir
 * @param {string} entry
 */
export function syncAliasDirGitignore(packageDir, entry) {
    assertSafeAliasEntryForGitignore(entry);
    const gitignorePath = path.join(packageDir, entry, ".gitignore");
    const existing = existsSync(gitignorePath)
        ? readFileSync(gitignorePath, "utf-8").replace(/\r\n/g, "\n")
        : "";

    if (existing !== ALIAS_DIR_GITIGNORE_CONTENT) {
        writeFileSync(gitignorePath, ALIAS_DIR_GITIGNORE_CONTENT, "utf-8");
    }
}
