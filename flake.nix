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
      in
      {
        formatter = treefmtEval.config.build.wrapper;
        checks.formatting = treefmtEval.config.build.check self;

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            pnpm
            oxlint
            typescript
            agent-browser
            treefmtEval.config.build.wrapper
          ];

          shellHook = ''
            echo "Slite IME Fix dev environment"
            echo "Commands: pnpm test, oxlint, tsc --noEmit, treefmt, agent-browser"
          '';
        };
      }
    );
}
