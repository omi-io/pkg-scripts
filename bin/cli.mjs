#!/usr/bin/env node

import { runAlias, runBuild, runClean } from "../src/index.mjs";

const [, , command] = process.argv;

const usage = "Usage: omi-io-pkg <alias|build|clean>";

const run = async () => {
    switch (command) {
        case "alias":
            runAlias();
            return;
        case "build":
            await runBuild();
            return;
        case "clean":
            runClean();
            return;
        default:
            console.error(usage);
            process.exitCode = 1;
    }
};

run().catch(error => {
    console.error(error);
    process.exit(1);
});
