#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { COMMIT_TYPES } = require("./release-conventional-commits.cjs");

const command = process.argv[2];
const args = process.argv.slice(3);
const nxJsonPath = path.resolve(process.cwd(), "nx.json");
let exitCode = 0;

if (!command) {
    console.error("Usage: omi-io-pkg-release-with-config <cmd> [...args]");
    process.exit(1);
}

if (!fs.existsSync(nxJsonPath)) {
    console.error(`Cannot find nx.json in ${process.cwd()}`);
    process.exit(1);
}

const originalNxJson = fs.readFileSync(nxJsonPath, "utf8");

try {
    const nxJson = JSON.parse(originalNxJson);
    if (!nxJson.release) {
        nxJson.release = {};
    }
    if (!nxJson.release.conventionalCommits) {
        nxJson.release.conventionalCommits = {};
    }
    nxJson.release.conventionalCommits.types = COMMIT_TYPES;
    fs.writeFileSync(nxJsonPath, `${JSON.stringify(nxJson, null, 2)}\n`);

    const result = spawnSync(command, args, {
        stdio: "inherit",
        shell: false,
    });

    if (result.error) {
        throw result.error;
    }

    exitCode = result.status ?? 0;
} catch (error) {
    console.error(error);
    exitCode = 1;
} finally {
    fs.writeFileSync(nxJsonPath, originalNxJson);
}

process.exit(exitCode);
