{
  description = "Slime - browser extension for Chrome and Firefox";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    treefmt-nix.url = "github:numtide/treefmt-nix";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      treefmt-nix,
    }:
    let
      # NOTE: url and hash are auto-updated by .github/workflows/update-flake-amo.yml
      # (empty until the first release is published on AMO)
      amoUrl = "https://addons.mozilla.org/firefox/downloads/file/5087057/slime_ime-1.2.0.xpi";
      amoHash = "sha256-9biqOlA+5KaxFj6DXSf6JeRy0QH65wQ4Yca3R8TTMS0=";
    in
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        treefmtEval = treefmt-nix.lib.evalModule pkgs {
          projectRootFile = "flake.nix";
          programs.oxfmt.enable = true;
          programs.nixfmt.enable = true;
        };

        # The tools the checks need. The devShell and CI both read this one
        # list; a second copy in the workflows would let a tool be added to
        # one side and fail on the other
        toolchain = pkgs.buildEnv {
          name = "slime-toolchain";
          paths = [
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.oxlint
            pkgs.typescript
            pkgs.vale
            pkgs.typos
            treefmtEval.config.build.wrapper
          ];
        };
      in
      {
        formatter = treefmtEval.config.build.wrapper;
        checks.formatting = treefmtEval.config.build.check self;

        packages = {
          inherit toolchain;
        }
        # Ships the xpi signed by AMO. A locally built xpi is unsigned, and
        # release Firefox will not load it.
        # Until the first version is public there is no URL, so default is
        # left out entirely (evaluating fetchurl with an empty URL breaks
        # evaluation of the whole flake)
        // pkgs.lib.optionalAttrs (amoUrl != "") {
          default = pkgs.stdenv.mkDerivation {
            name = "slime-firefox-xpi";

            src = pkgs.fetchurl {
              url = amoUrl;
              hash = amoHash;
            };

            passthru.addonId = "slime@example.com";

            preferLocalBuild = true;
            allowSubstitutes = true;

            buildCommand = ''
              dst="$out/share/mozilla/extensions/{ec8030f7-c20a-464f-9b0e-13a3a9e97384}"
              mkdir -p "$dst"
              install -v -m644 "$src" "$dst/slime@example.com.xpi"
            '';
          };
        };

        devShells.default = pkgs.mkShell {
          packages = [
            toolchain
            # agent-browser is for poking at the screen by hand and for
            # pnpm e2e. CI does not use it, so it stays out of toolchain
            pkgs.agent-browser
          ];

          shellHook = ''
            echo "Slime dev environment"
            echo "Commands: pnpm check, pnpm test, pnpm e2e, treefmt"
          '';
        };
      }
    );
}
