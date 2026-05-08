import path from "node:path";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
import {
    BASE_BUILD_CONFIG,
    FORMAT_CONFIGS,
    loadPackageConfig,
} from "./config.mjs";
import { syncAliasDirGitignore } from "./sync-alias-gitignore.mjs";

export const runBuild = async ({ cwd, configFile } = {}) => {
    const config = loadPackageConfig({ cwd, configFile });
    const entryPath = (...segments) => {
        const joined = path.join(...segments);
        return joined.startsWith(".") ? joined : `./${joined}`;
    };
    const entryPoints = [
        entryPath(config.sourceDir, config.sourceIndex),
        ...config.entries.map(entry =>
            entryPath(config.sourceDir, entry, config.sourceIndex)
        ),
    ];

    for (const format of config.formats) {
        await build({
            absWorkingDir: config.packageDir,
            entryPoints,
            format,
            outdir: `${config.outDir}/${format}`,
            ...BASE_BUILD_CONFIG,
            ...FORMAT_CONFIGS[format],
        });
    }
};

export const runClean = ({ cwd, configFile } = {}) => {
    const config = loadPackageConfig({ cwd, configFile });
    const pathsToRemove = [config.outDir, ...config.entries].map(target =>
        path.join(config.packageDir, target)
    );

    pathsToRemove.forEach(targetPath => {
        if (existsSync(targetPath)) {
            rmSync(targetPath, { recursive: true, force: true });
        }
    });
};

export const runAlias = ({ cwd, configFile } = {}) => {
    const config = loadPackageConfig({ cwd, configFile });

    config.entries
        .map(alias => path.join(config.packageDir, alias))
        .forEach(aliasDir => {
            if (existsSync(aliasDir)) {
                rmSync(aliasDir, { recursive: true, force: true });
            }
            mkdirSync(aliasDir, { recursive: true });
        });

    config.entries.forEach(alias => {
        const localDir = path.relative(
            config.packageDir,
            path.dirname(config.packageDir)
        );
        const pkgManifest = {
            name: `${config.packageName}/${alias}`,
            types: path.join(
                localDir,
                config.outDir,
                "types",
                alias,
                "index.d.ts"
            ),
            main: path.join(localDir, config.outDir, "cjs", alias, "index.cjs"),
            module: path.join(
                localDir,
                config.outDir,
                "esm",
                alias,
                "index.js"
            ),
            sideEffects: false,
        };

        const packagePath = path.join(config.packageDir, alias, "package.json");
        writeFileSync(
            packagePath,
            `${JSON.stringify(pkgManifest, null, 2)}\n`,
            "utf-8"
        );
        syncAliasDirGitignore(config.packageDir, alias);
    });
};

export const runSyncFiles = ({ cwd, configFile } = {}) => {
    const config = loadPackageConfig({ cwd, configFile });
    const packageJsonPath = path.join(config.packageDir, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const ignored = new Set(config.ignoreFilesEntries ?? []);

    const aliasPackageJsonFiles = config.entries
        .filter(entry => !ignored.has(entry))
        .map(entry => path.posix.join(entry.replace(/\\/g, "/"), "package.json"));
    const nextFiles = ["dist", ...aliasPackageJsonFiles];

    const currentFiles = Array.isArray(packageJson.files) ? packageJson.files : [];
    const isSame =
        currentFiles.length === nextFiles.length &&
        currentFiles.every((item, index) => item === nextFiles[index]);

    if (isSame) {
        return false;
    }

    packageJson.files = nextFiles;
    writeFileSync(
        packageJsonPath,
        `${JSON.stringify(packageJson, null, 2)}\n`,
        "utf-8"
    );
    return true;
};

export {
    getEntriesFromPackageExports,
    getBuildOutputGlobsFromConfig,
    loadPackageConfig,
} from "./config.mjs";
export {
    assertSafeAliasEntryForGitignore,
    ALIAS_DIR_GITIGNORE_CONTENT,
    syncAliasDirGitignore,
} from "./sync-alias-gitignore.mjs";
