import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

const DEFAULT_SOURCE_DIR = "src";
const DEFAULT_SOURCE_INDEX = "index.ts";
const DEFAULT_OUT_DIR = "dist";
const DEFAULT_FORMATS = ["cjs", "esm"];
const DEFAULT_CONFIG_FILE = "pkg-scripts.config.json";

const DEFAULT_IGNORE_EXPORT_KEYS = [".", "./package.json"];

const normalizeIgnoreExportKey = key => {
    if (key === ".") {
        return ".";
    }
    return key.startsWith("./") ? key : `./${key}`;
};

const normalizeEntryName = value => {
    if (typeof value !== "string") {
        return null;
    }
    if (value === ".") {
        return null;
    }
    const normalized = value.startsWith("./") ? value.slice(2) : value;
    const trimmed = normalized.replace(/^\/+|\/+$/g, "");
    if (!trimmed || trimmed === "package.json") {
        return null;
    }
    return trimmed;
};

const exportKeyToEntry = exportKey => {
    if (exportKey === ".") {
        return null;
    }
    if (!exportKey.startsWith("./")) {
        return exportKey === "package.json" ? null : exportKey;
    }
    const subpath = exportKey.slice(2);
    if (subpath === "" || subpath === "package.json") {
        return null;
    }
    return subpath;
};

export const getEntriesFromPackageExports = (
    packageJson,
    ignoreExportKeys = DEFAULT_IGNORE_EXPORT_KEYS
) => {
    const exportsField = packageJson.exports;
    if (!exportsField || typeof exportsField === "string") {
        return [];
    }
    if (typeof exportsField !== "object" || Array.isArray(exportsField)) {
        return [];
    }
    const ignoreSet = new Set(ignoreExportKeys.map(normalizeIgnoreExportKey));
    const entries = [];
    const seen = new Set();
    for (const key of Object.keys(exportsField)) {
        if (ignoreSet.has(key)) {
            continue;
        }
        const entry = exportKeyToEntry(key);
        if (entry == null || seen.has(entry)) {
            continue;
        }
        seen.add(entry);
        entries.push(entry);
    }
    return entries;
};

const mergeEntryLists = (base, extra) => {
    const seen = new Set(base);
    const out = [...base];
    for (const item of extra) {
        if (!seen.has(item)) {
            seen.add(item);
            out.push(item);
        }
    }
    return out;
};

export const BASE_BUILD_CONFIG = {
    bundle: true,
    minify: true,
    treeShaking: true,
    packages: "external",
};

export const FORMAT_CONFIGS = {
    esm: {
        splitting: true,
        outExtension: {
            ".js": ".js",
        },
    },
    cjs: {
        outExtension: {
            ".js": ".cjs",
        },
    },
    iife: {
        outExtension: {
            ".js": ".cjs",
        },
    },
};

const resolvePackageDir = cwd => cwd ?? process.cwd();
const readJson = filePath => JSON.parse(readFileSync(filePath, "utf-8"));

/**
 * Globs for Nx `build` target `outputs` so task cache restores `outDir` and
 * top-level alias folders created by `omi-io-pkg alias`.
 *
 * @param {{ entries: string[]; outDir?: string }} param0
 * @returns {string[]}
 */
export const getBuildOutputGlobsFromConfig = ({
    entries,
    outDir = DEFAULT_OUT_DIR,
}) => {
    const norm = segment =>
        String(segment)
            .replace(/^\.?\/+/, "")
            .replace(/\/+$/, "");
    const base = norm(outDir) || DEFAULT_OUT_DIR;
    const ordered = new Map();
    const add = g => {
        if (g && !ordered.has(g)) {
            ordered.set(g, true);
        }
    };
    add(`{projectRoot}/${base}/**`);
    for (const entry of entries ?? []) {
        if (entry) {
            add(`{projectRoot}/${norm(entry)}/**`);
        }
    }
    return [...ordered.keys()];
};

export const loadPackageConfig = ({
    cwd,
    configFile = DEFAULT_CONFIG_FILE,
} = {}) => {
    const packageDir = resolvePackageDir(cwd);
    const packageJsonPath = path.join(packageDir, "package.json");
    const packageJson = readJson(packageJsonPath);
    const configPath = path.join(packageDir, configFile);
    const userConfig = existsSync(configPath) ? readJson(configPath) : {};
    const ignoreExportKeys = [
        ...DEFAULT_IGNORE_EXPORT_KEYS,
        ...(userConfig.ignoreExports ?? []),
    ];
    const exportEntries = getEntriesFromPackageExports(
        packageJson,
        ignoreExportKeys
    );
    const configEntries = Array.isArray(userConfig.entries)
        ? userConfig.entries
        : [];
    const entries = mergeEntryLists(exportEntries, configEntries);
    const ignoreFilesEntries = Array.isArray(userConfig.ignoreFilesEntries)
        ? userConfig.ignoreFilesEntries
              .map(normalizeEntryName)
              .filter(entry => entry != null)
        : [];

    return {
        packageDir,
        packageName: packageJson.name,
        entries,
        ignoreFilesEntries,
        sourceDir: userConfig.sourceDir ?? DEFAULT_SOURCE_DIR,
        sourceIndex: userConfig.sourceIndex ?? DEFAULT_SOURCE_INDEX,
        outDir: userConfig.outDir ?? DEFAULT_OUT_DIR,
        formats: userConfig.formats ?? DEFAULT_FORMATS,
    };
};
