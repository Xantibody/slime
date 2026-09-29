{
  description = "Slite Japanese IME Fix - Chrome Extension";

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
          name = "slite-ime-fix-toolchain";
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

        packages.toolchain = toolchain;

        devShells.default = pkgs.mkShell {
          packages = [
            toolchain
            # agent-browser は手で画面を触るときと pnpm e2e 用。
            # CI では使わないので toolchain の外
            pkgs.agent-browser
          ];

          shellHook = ''
            echo "Slite IME Fix dev environment"
            echo "Commands: pnpm check, pnpm test, pnpm e2e, treefmt"
          '';
        };
      }
    );
}
