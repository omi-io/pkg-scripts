# @omi-io/pkg-scripts

Build scripts and CLI for bundling libraries with esbuild (standalone packages or monorepos).

**Requirements:** [Node.js](https://nodejs.org/) 16+

## Install

```bash
npm install --save-dev @omi-io/pkg-scripts
```

## What It Provides

- Programmatic API:
  - `runBuild()`
  - `runClean()`
  - `runAlias()`
  - `loadPackageConfig()`
  - `getEntriesFromPackageExports()`
  - `getBuildOutputGlobsFromConfig()` (for custom tooling; Nx plugin uses this internally)
  - `syncAliasDirGitignore()` (optional helper used by `runAlias()` for alias folders)
- CLI:
  - `omi-io-pkg build`
  - `omi-io-pkg clean`
  - `omi-io-pkg alias`

## Entries and config

Sub-entries (all targets besides the package root) are built like this:

1. **Read `package.json` → `exports`.** When `exports` is a plain object, walk its keys in declaration order. Skip keys in the ignore set: always `"."` and `"./package.json"`, plus any listed in `ignoreExports` in the config file (if present). Map each remaining key to a folder under `sourceDir` by stripping a leading `./` (for example `"./math"` → `math`, `"./nested/deep"` → `nested/deep`).
2. **Merge `entries` from `pkg-scripts.config.json`** when that key is an array: append names that are not already in the list from step 1 (export-derived names stay first, in `exports` key order).

If `exports` is missing or is a single string (shorthand for the main entry only), step 1 yields an empty list; use `entries` in the config file to declare sub-entries explicitly.

### Optional `pkg-scripts.config.json`

Place it in the package root next to `package.json`. You can rely on `exports` alone and skip this file when you do not need extra options.

Example:

```json
{
  "ignoreExports": ["check"],
  "entries": ["internal"],
  "sourceDir": "src",
  "sourceIndex": "index.ts",
  "outDir": "dist",
  "formats": ["cjs", "esm"]
}
```

### `pkg-scripts.config.json` schema

- `entries`: `string[]` (optional)
  - Sub-entry folders relative to `sourceDir`.
  - For each entry, scripts expect `<sourceDir>/<entry>/<sourceIndex>`.
  - When present, these names are **merged** with entries inferred from `package.json` → `exports` (export order first, then any new names from `entries`, without duplicates). Non-array values are ignored.
- `ignoreExports`: `string[]` (optional)
  - Extra `exports` keys to skip when building the list (same strings as in `package.json`, or a short name without `./`, e.g. `"check"` is treated like `"./check"`).
  - Default ignores always apply: `"."` and `"./package.json"`.
- `sourceDir`: `string` (default: `"src"`)
  - Source root for entry points.
- `sourceIndex`: `string` (default: `"index.ts"`)
  - Entry filename used for root and sub-entries.
- `outDir`: `string` (default: `"dist"`)
  - Build output base directory.
- `formats`: `("cjs" | "esm" | "iife")[]` (default: `["cjs", "esm"]`)
  - esbuild output formats.

### Programmatic config

`loadPackageConfig({ cwd, configFile })` reads `package.json` and, if it exists, `pkg-scripts.config.json` (or the file name you pass as `configFile`). `getEntriesFromPackageExports(packageJson, ignoreExportKeys?)` applies the same export-key rules as the loader (defaults for ignored keys match the loader when you omit the second argument).

## Use in Your Package

Example for `@acme/colors`:

1. Add dependency (same as above, or declare in `package.json`):

```json
{
  "devDependencies": {
    "@omi-io/pkg-scripts": "^2.1.0"
  }
}
```

2. Add scripts:

```json
{
  "scripts": {
    "build": "omi-io-pkg clean && omi-io-pkg build && tsc && omi-io-pkg alias"
  }
}
```

3. List sub-entries under `package.json` → `exports` (recommended), and add `pkg-scripts.config.json` only when you need `ignoreExports`, extra `entries`, or other options.

## Nx monorepos (task cache)

Nx can **skip** your `build` script when the output is served from the cache. By default, inferred `outputs` often cover only `dist/`, not the **top-level alias folders** that `omi-io-pkg alias` creates from `exports`. After a cache hit, those folders may be missing until the next full run.

**Optional fix (one-time per workspace):** register the Nx plugin from this package so every library that uses `omi-io-pkg` in `scripts` gets correct `build` `outputs` (merged with any `nx.targets.build.outputs` you already set in that `package.json`).

In the repo root `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "@omi-io/pkg-scripts/nx",
      "options": {}
    }
  ]
}
```

Requirements: `nx` and `@nx/devkit` compatible with your workspace (v19+). They are **optional** `peerDependencies` of `@omi-io/pkg-scripts`; install them in the workspace root as usual for Nx.

The plugin matches `**/package.json` outside `node_modules`, keeps packages whose **any** script mentions `omi-io-pkg` and that define a **`build`** script, then sets `targets.build.outputs` from `dist` (or `outDir` in `pkg-scripts.config.json`) plus one `{projectRoot}/<entry>/**` per merged entry (same rules as `exports` + config `entries`).

## Notes

- `runAlias()` creates `<package>/<entry>/package.json` aliases for subpath imports (one folder per merged entry name).
- **Git:** those stub directories are build outputs. `runAlias()` / `omi-io-pkg alias` writes `<package>/<entry>/.gitignore` for every generated alias folder, with the fixed content `*` (newline-terminated). This keeps generated files in alias directories out of `git status` without requiring package-root ignore rules.
- CLI commands resolve config from the current working directory.

## Releasing (maintainers)

1. Ensure tests pass: `npm test`
2. Inspect the tarball (no `test/` or stray files): `npm run pack:dry-run`
3. Dry-run publish: `npm publish --dry-run`
4. Bump version: `npm version patch` (or `minor` / `major`), then push tags if you use Git tags
5. Log in to the npm scope: `npm login` (account must have publish rights for `@omi-io`)
6. Publish: `npm publish`

`prepublishOnly` runs tests automatically on `npm publish`.
