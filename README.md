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
    "@omi-io/pkg-scripts": "^1.0.0"
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

## Notes

- `runAlias()` creates `<package>/<entry>/package.json` aliases for subpath imports (one folder per merged entry name).
- CLI commands resolve config from the current working directory.

## Releasing (maintainers)

1. Ensure tests pass: `npm test`
2. Inspect the tarball (no `test/` or stray files): `npm run pack:dry-run`
3. Dry-run publish: `npm publish --dry-run`
4. Bump version: `npm version patch` (or `minor` / `major`), then push tags if you use Git tags
5. Log in to the npm scope: `npm login` (account must have publish rights for `@omi-io`)
6. Publish: `npm publish`

`prepublishOnly` runs tests automatically on `npm publish`.
