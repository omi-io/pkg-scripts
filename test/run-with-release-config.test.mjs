import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import {
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
    existsSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(testDir, "..", "src", "run-with-release-config.cjs");

const createTmpDir = () => mkdtempSync(path.join(os.tmpdir(), "release-config-"));

const runScript = ({ cwd, args = [] }) =>
    spawnSync(process.execPath, [scriptPath, ...args], {
        cwd,
        encoding: "utf-8",
    });

test("exits with usage when command is missing", () => {
    const root = createTmpDir();
    try {
        const result = runScript({ cwd: root });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Usage: omi-io-pkg-release-with-config/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("exits when nx.json is missing", () => {
    const root = createTmpDir();
    try {
        const result = runScript({ cwd: root, args: [process.execPath, "-e", ""] });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Cannot find nx\.json/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("injects commit types for child command and restores nx.json afterwards", () => {
    const root = createTmpDir();
    const nxJsonPath = path.join(root, "nx.json");
    const originalNxJson = `${JSON.stringify({ release: { projects: ["a"] } }, null, 2)}\n`;
    const probePath = path.join(root, "probe.json");

    try {
        writeFileSync(nxJsonPath, originalNxJson, "utf-8");

        const result = runScript({
            cwd: root,
            args: [
                process.execPath,
                "-e",
                [
                    "const fs = require('fs');",
                    "const nx = JSON.parse(fs.readFileSync('nx.json', 'utf8'));",
                    "const hasFeat = Boolean(nx.release?.conventionalCommits?.types?.feat);",
                    `fs.writeFileSync(${JSON.stringify(
                        probePath
                    )}, JSON.stringify({ hasFeat }));`,
                ].join(""),
            ],
        });

        assert.equal(result.status, 0);
        assert.equal(existsSync(probePath), true);
        assert.deepEqual(JSON.parse(readFileSync(probePath, "utf-8")), {
            hasFeat: true,
        });
        assert.equal(readFileSync(nxJsonPath, "utf-8"), originalNxJson);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("returns child command non-zero status and still restores nx.json", () => {
    const root = createTmpDir();
    const nxJsonPath = path.join(root, "nx.json");
    const originalNxJson = `${JSON.stringify({ release: {} }, null, 2)}\n`;

    try {
        writeFileSync(nxJsonPath, originalNxJson, "utf-8");

        const result = runScript({
            cwd: root,
            args: [process.execPath, "-e", "process.exit(7)"],
        });

        assert.equal(result.status, 7);
        assert.equal(readFileSync(nxJsonPath, "utf-8"), originalNxJson);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
