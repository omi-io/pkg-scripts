import path from "node:path";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { build } from "esbuild";
import {
    BASE_BUILD_CONFIG,
    FORMAT_CONFIGS,
    loadPackageConfig,
} from "./config.mjs";

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
    });
};

export {
    getEntriesFromPackageExports,
    getBuildOutputGlobsFromConfig,
    loadPackageConfig,
} from "./config.mjs";
