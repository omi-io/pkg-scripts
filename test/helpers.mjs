import path from "node:path";
import os from "node:os";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";

export const createTmpPackage = () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "pkg-scripts-"));
    writeFileSync(
        path.join(root, "package.json"),
        JSON.stringify({ name: "@omiio/test-pkg" }, null, 2),
        "utf-8"
    );
    return root;
};

export const writeConfig = (root, config) => {
    writeFileSync(
        path.join(root, "pkg-scripts.config.json"),
        JSON.stringify(config, null, 2),
        "utf-8"
    );
};

export const cleanup = root => {
    rmSync(root, { recursive: true, force: true });
};
