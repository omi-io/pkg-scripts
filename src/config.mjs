import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

const DEFAULT_SOURCE_DIR = "src";
const DEFAULT_SOURCE_INDEX = "index.ts";
const DEFAULT_OUT_DIR = "dist";
const DEFAULT_FORMATS = ["cjs", "esm"];
const DEFAULT_CONFIG_FILE = "pkg-scripts.config.json";

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

export const loadPackageConfig = ({
    cwd,
    configFile = DEFAULT_CONFIG_FILE,
} = {}) => {
    const packageDir = resolvePackageDir(cwd);
    const packageJsonPath = path.join(packageDir, "package.json");
    const packageJson = readJson(packageJsonPath);
    const configPath = path.join(packageDir, configFile);
    const userConfig = existsSync(configPath) ? readJson(configPath) : {};

    return {
        packageDir,
        packageName: packageJson.name,
        entries: userConfig.entries ?? [],
        sourceDir: userConfig.sourceDir ?? DEFAULT_SOURCE_DIR,
        sourceIndex: userConfig.sourceIndex ?? DEFAULT_SOURCE_INDEX,
        outDir: userConfig.outDir ?? DEFAULT_OUT_DIR,
        formats: userConfig.formats ?? DEFAULT_FORMATS,
    };
};
