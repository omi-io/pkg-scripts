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
- CLI:
  - `omi-io-pkg build`
  - `omi-io-pkg clean`
  - `omi-io-pkg alias`

## Config File

Each target package can define `pkg-scripts.config.json` in its package root.

Example:

```json
{
  "entries": ["core", "domain"],
  "sourceDir": "src",
  "sourceIndex": "index.ts",
  "outDir": "dist",
  "formats": ["cjs", "esm"]
}
```

### `pkg-scripts.config.json` schema

- `entries`: `string[]` (default: `[]`)
  - Sub-entry folders relative to `sourceDir`.
  - For each entry, scripts expect `<sourceDir>/<entry>/<sourceIndex>`.
- `sourceDir`: `string` (default: `"src"`)
  - Source root for entry points.
- `sourceIndex`: `string` (default: `"index.ts"`)
  - Entry filename used for root and sub-entries.
- `outDir`: `string` (default: `"dist"`)
  - Build output base directory.
- `formats`: `("cjs" | "esm" | "iife")[]` (default: `["cjs", "esm"]`)
  - esbuild output formats.

## Use in Your Package

Example for `@acme/colors`:

1. Add dependency (same as above, or declare in `package.json`):

```json
{
  "devDependencies": {
    "@omi-io/pkg-scripts": "^0.1.0"
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

3. Add `pkg-scripts.config.json` with package-specific entries.

## Notes

- `runAlias()` creates `<package>/<entry>/package.json` aliases for subpath imports.
- CLI commands resolve config from the current working directory.

## Releasing (maintainers)

1. Ensure tests pass: `npm test`
2. Inspect the tarball (no `test/` or stray files): `npm run pack:dry-run`
3. Dry-run publish: `npm publish --dry-run`
4. Bump version: `npm version patch` (or `minor` / `major`), then push tags if you use Git tags
5. Log in to the npm scope: `npm login` (account must have publish rights for `@omi-io`)
6. Publish: `npm publish`

`prepublishOnly` runs tests automatically on `npm publish`.
