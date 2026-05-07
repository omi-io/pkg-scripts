import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path/posix";
import { loadPackageConfig, getBuildOutputGlobsFromConfig } from "./config.mjs";

const mergeUnique = (first, second) => {
    const seen = new Set();
    const out = [];
    for (const g of [...first, ...second]) {
        if (typeof g === "string" && g.length > 0 && !seen.has(g)) {
            seen.add(g);
            out.push(g);
        }
    }
    return out;
};

const hasNodeModulesSegment = filePath =>
    filePath.split(path.sep).includes("node_modules") ||
    filePath.split("/").includes("node_modules");

/**
 * @param {Record<string, unknown> | undefined} scripts
 * @param {string} [needle]
 */
const scriptReferencesCli = (scripts, needle = "omi-io-pkg") => {
    if (!scripts || typeof scripts !== "object") {
        return false;
    }
    return Object.values(scripts).some(
        v => typeof v === "string" && v.includes(needle)
    );
};

/**
 * @param {string} packageJsonPath path relative to workspace root (posix-style segments)
 * @param {unknown} _options
 * @param {{ workspaceRoot: string; nxJsonConfiguration?: unknown; configFiles?: string[] }} context
 */
const handlePackageJson = async (packageJsonPath, _options, context) => {
    if (hasNodeModulesSegment(packageJsonPath)) {
        return {};
    }
    const absPackageJson = path.join(context.workspaceRoot, packageJsonPath);
    if (!existsSync(absPackageJson)) {
        return {};
    }
    let pkg;
    try {
        pkg = JSON.parse(readFileSync(absPackageJson, "utf-8"));
    } catch {
        return {};
    }
    if (!scriptReferencesCli(pkg.scripts)) {
        return {};
    }
    if (typeof pkg.scripts?.build !== "string") {
        return {};
    }

    const projectRoot = dirname(packageJsonPath);
    const cwd = path.dirname(absPackageJson);

    const cfg = loadPackageConfig({ cwd });
    const computed = getBuildOutputGlobsFromConfig({
        entries: cfg.entries,
        outDir: cfg.outDir,
    });
    const existing = pkg.nx?.targets?.build?.outputs;
    const merged = mergeUnique(
        Array.isArray(existing) ? existing : [],
        computed
    );

    return {
        projects: {
            [projectRoot]: {
                targets: {
                    build: {
                        outputs: merged,
                    },
                },
            },
        },
    };
};

const plugin = {
    name: "@omi-io/pkg-scripts/nx",
    createNodesV2: [
        "**/package.json",
        async (packageJsonFiles, options, context) => {
            const { createNodesFromFiles } = await import("@nx/devkit");
            return createNodesFromFiles(
                handlePackageJson,
                packageJsonFiles,
                options,
                context
            );
        },
    ],
};

export const { createNodesV2 } = plugin;
export default plugin;
