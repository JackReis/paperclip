# Paperclip Server Nix Packaging

This directory contains the Nix flake that packages `@paperclipai/server`
from the npm registry for reproducible installation on Aegis.

## Building

```bash
# From this directory
nix build .#paperclip-server

# Or from any directory
nix build git+ssh://git@github.com/JackReis/paperclip#nix/paperclip-server
```

## Installing

```bash
# Install to the Nix profile
nix profile install .#paperclip-server

# Or install from git
nix profile install git+ssh://git@github.com/JackReis/paperclip#nix/paperclip-server
```

## Output Store Path

After a successful build, the output is located at:

```
/nix/store/<hash>-paperclip-server-2026.831.1/
```

The binary wrapper is at:

```
/nix/store/<hash>-paperclip-server-2026.831.1/bin/paperclip-server
```

Example from a verified build:

```
/nix/store/aszgqhrk0k3fnn4fhy41ph8r1g3yn8v3-paperclip-server-2026.831.1/bin/paperclip-server
```

## Structure

- `flake.nix` — Nix flake definition with `buildNpmPackage` derivation
- `package-lock.json` — Vendored lockfile with all platform-specific optional deps
- `README.md` — This file

## Architecture

### Why `buildNpmPackage`?

The `@paperclipai/server` npm package is published as a precompiled tarball
with `dist/index.js` as the entry point. We use `buildNpmPackage` because:

1. It provides dependency isolation via `npmDepsHash` — the entire dependency
   tree is hashed and cached, ensuring reproducible builds.
2. It handles Node.js module resolution correctly via `NODE_PATH`.
3. It integrates with the Nix store's content-addressed semantics.

### The `package-lock.json` vending problem

The npm tarball does NOT include a `package-lock.json`. `buildNpmPackage`
requires one for its `npm ci` step. Our approach:

1. Generate a complete `package-lock.json` by running `npm install` against
   the unpacked tarball (with devDependencies that don't resolve on the public
   npm registry stripped).
2. Manually add all platform-specific `@esbuild/*` optional dependency entries
   (npm on macOS only generates these for macOS).
3. Add `fsevents` entry (macOS-specific optional dep of tsx).
4. Vendor the completed lock file alongside `flake.nix`.

The `srcWithLock` derivation in `flake.nix` handles splicing these together
at build time: it fetches the npm tarball, strips devDependencies from
package.json via Python, then copies the vendored lock file in.

### DevDependencies

The published npm package includes `devDependencies` referencing
`@paperclipai/paperclip-runner@2026.831.1`, which does not exist on the public
npm registry at that version. The `srcWithLock` derivation strips
`devDependencies`, `peerDependencies`, and `peerDependenciesMeta` from
`package.json` before running `npm ci`.

### npm flags

- `--legacy-peer-deps`: peer dependency resolution quirks in the published package
- `--ignore-scripts`: esbuild install hooks attempt to download native binaries
  during `npm ci`; not needed since platform-specific `@esbuild/*` packages are
  already resolved by the vendored lockfile.

### Node.js version

Uses `nodejs_24` — the server requires Node.js >= 24.11.0 (per `engines` field
in `package.json`).

## Regenerating the Lock File

When the server version changes:

1. Download the new npm tarball:
   ```bash
   curl -sL https://registry.npmjs.org/@paperclipai/server/-/server-<NEW>.tgz -o /tmp/server-new.tgz
   mkdir -p /tmp/server-extract && tar -xzf /tmp/server-new.tgz -C /tmp/server-extract
   ```

2. Clean devDependencies:
   ```bash
   cd /tmp/server-extract/package
   python -c "
   import json
   d = json.load(open('package.json'))
   d.pop('devDependencies', None)
   d.pop('peerDependencies', None)
   d.pop('peerDependenciesMeta', None)
   json.dump(d, open('package.json', 'w'), indent=2)
   "
   ```

3. Generate lock file with all platforms:
   ```bash
   npm install --no-audit --no-fund --force
   ```

4. Patch the package-lock.json to include missing platform-specific optional deps:
   - Add all `@esbuild/*` platform packages (linux, darwin, android, win32, etc.)
     to the `packages` section
   - Add `fsevents` entries for macOS
   - Update the `optionalDependencies` of the esbuild parent package

5. Copy to this directory:
   ```bash
   cp /tmp/server-extract/package/package-lock.json $FLEET_DIR/nix/package-lock.json
   ```

6. Re-run `nix build` with `lib.fakeHash` to get the new `npmDepsHash`.

## Status

- `nix flake check` — passes
- `nix build .#paperclip-server` — succeeds, produces working binary
- `trusted-users` — requires JAC-5388 (Jack sudo gate) for `nix profile install`

jack-green-phoenix
