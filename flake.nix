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
      amoUrl = "";
      amoHash = "";
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

        # 検査に使う道具立て。devShell と CI の両方がこれ一つを読む。
        # 一覧をワークフロー側にも書くと、片方だけ足して片方で落ちる
        toolchain = pkgs.buildEnv {
          name = "slime-toolchain";
          paths = [
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.oxlint
            pkgs.typescript
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
        # AMO で署名された xpi を配る。手元でビルドした xpi は未署名で、
        # 通常版の Firefox は読み込まない。
        # 初回公開までは URL が無いので、default そのものを出さない
        # (空の URL で fetchurl を評価すると flake 全体の評価が落ちる)
        // pkgs.lib.optionalAttrs (amoUrl != "") {
          default = pkgs.stdenv.mkDerivation {
            name = "slime-firefox-xpi";

            src = pkgs.fetchurl {
              url = amoUrl;
              hash = amoHash;
            };

            passthru.addonId = "slite-ime-fix@example.com";

            preferLocalBuild = true;
            allowSubstitutes = true;

            buildCommand = ''
              dst="$out/share/mozilla/extensions/{ec8030f7-c20a-464f-9b0e-13a3a9e97384}"
              mkdir -p "$dst"
              install -v -m644 "$src" "$dst/slite-ime-fix@example.com.xpi"
            '';
          };
        };

        devShells.default = pkgs.mkShell {
          packages = [
            toolchain
            # agent-browser は手で画面を触るときと pnpm e2e 用。
            # CI では使わないので toolchain の外
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
