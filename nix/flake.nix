{
  description = "Fleet flake packaging the Paperclip server (@paperclipai/server) for reproducible nix profile install on Aegis.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        # Use Node 24 — the @paperclipai/server package requires
        # engines.node >= 24.11.0 (per package.json).
        node = pkgs.nodejs_24;

        # Publish version must match the version on npm.
        # When updating: bump this, regenerate package-lock.json,
        # and recompute npmDepsHash with lib.fakeHash.
        paperclipServerVersion = "2026.831.1";

        # The npm tarball does NOT ship a package-lock.json.  We vendor a
        # complete one (with all platform-specific optional deps patched in)
        # alongside this flake and splice it into the source tree during the
        # unpack phase so that npm ci has a fully consistent lockfile.
        vendoredLock = ./. + "/package-lock.json";

        # Build a source directory: fetch the npm tarball, unpack it,
        # strip devDependencies (which include unresolvable npm packages),
        # and copy in the vendored lockfile.
        srcWithLock = pkgs.runCommand "paperclip-server-src" { } ''
          mkdir -p $out
          tar -xzf ${pkgs.fetchurl {
            url = "https://registry.npmjs.org/@paperclipai/server/-/server-${paperclipServerVersion}.tgz";
            sha256 = "sha256:0m8bhdh9ir2mmvd1gj3pxb65kg8yw01grh4mxqpqjwqgf3yisl67";
          }} --strip-components=1 -C $out

          # Strip devDependencies / peerDependencies from package.json.
          # The published package references @paperclipai/paperclip-runner
          # (devDep) which does not exist on the public npm registry at
          # the matching version.
          ${pkgs.python3}/bin/python -c """
          import json
          p = '$out/package.json'
          d = json.load(open(p))
          d.pop('devDependencies', None)
          d.pop('peerDependencies', None)
          d.pop('peerDependenciesMeta', None)
          json.dump(d, open(p, 'w'), indent=2)
          """

          # Splice in the vendored lockfile (includes all platform-optional
          # @esbuild/* deps + fsevents that npm ci requires).
          cp ${vendoredLock} $out/package-lock.json
        '';
      in
      {
        packages = {
          paperclip-server = pkgs.buildNpmPackage {
            pname = "paperclip-server";
            version = paperclipServerVersion;

            src = srcWithLock;

            # npmDepsHash was computed by building with lib.fakeHash,
            # then substituting back the "got:" value.
            # Verify: nix build .#paperclip-server --no-link
            npmDepsHash = "sha256-tukabWlAaQV91GyWE3LKWJv9HGHU0NxZM5cHFll7GfY=";

            nodejs = node;

            # --legacy-peer-deps: peer dep resolution quirks in the
            #   published package.
            # --ignore-scripts: esbuild install hooks try to download native
            #   binaries during npm ci; not needed since @esbuild/* packages
            #   are already resolved by the vendored lockfile.
            npmFlags = [ "--legacy-peer-deps" "--ignore-scripts" ];

            # dist/ is precompiled — no build step needed.
            # npmInstallPhase (part of buildPhase) still runs to populate
            # node_modules from the vendored lockfile.
            buildPhase = "true";

            installPhase = ''
              runHook preInstall
              mkdir -p $out/lib/node_modules/@paperclipai/server
              cp -r dist package.json $out/lib/node_modules/@paperclipai/server/
              cp -r node_modules $out/lib/node_modules/@paperclipai/server/
              cp -r ui-dist $out/lib/node_modules/@paperclipai/server/ 2>/dev/null || true
              cp -r onboarding-assets $out/lib/node_modules/@paperclipai/server/ 2>/dev/null || true
              cp -r built-ins $out/lib/node_modules/@paperclipai/server/ 2>/dev/null || true

              makeWrapper ${node}/bin/node $out/bin/paperclip-server \
                --set NODE_PATH "$out/lib/node_modules/@paperclipai/server/node_modules" \
                --chdir "$out/lib/node_modules/@paperclipai/server" \
                --add-flags "$out/lib/node_modules/@paperclipai/server/dist/index.js"
              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Paperclip AI control plane server (@paperclipai/server)";
              homepage = "https://github.com/paperclipai/paperclip";
              license = licenses.mit;
              platforms = [ "aarch64-darwin" ];
              maintainers = [ "Coordinator" ];
            };
          };

          default = self.packages.${system}.paperclip-server;
        };

        devShells = {
          default = pkgs.mkShell {
            buildInputs = [ pkgs.nixpkgs-fmt node ];
            shellHook = ''
              echo "Paperclip Nix packaging dev shell"
              echo "  node $(node --version)"
              echo "  paperclipServerVersion ${paperclipServerVersion}"
            '';
          };
        };
      });
}
