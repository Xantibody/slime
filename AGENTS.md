# Slime

Browser extension (Chrome, Edge, Firefox) that fixes the Japanese IME
double-display bug in the Slite editor. The README covers the bug, the fix and
the release flow; this file holds the rules for changing the code.

## Checks

Enter the toolchain with `nix develop`; CI installs the same `toolchain`
package from `flake.nix`, so add a tool there, never only in a workflow.

- `pnpm check` runs everything CI runs: format, oxlint, comments, types, knip,
  unit tests
- `pnpm e2e` drives the built extension in a real browser. CI skips it; run it
  before a release

## Conventions

- **Formatting is treefmt** (oxfmt for TypeScript, JSON and YAML; nixfmt for
  Nix). `pnpm fmt` applies it, and CI fails on unformatted files
- **Source comments are English**, like the README and the commit log, so the
  terms stay greppable. Japanese belongs in string literals, where the tests
  need the exact characters; when a comment has to quote it, put it in
  backticks. `pnpm lint:comments` runs Vale (`.vale.ini`: no Japanese,
  proselint) over TypeScript and JavaScript comments and typos over the tree
- Configuration (Nix, YAML, JSON, JSONC, TOML) may hold no Japanese at all,
  strings included: Vale cannot pick the comments out of those formats, so it
  reads the whole file. A new configuration file goes in `lint:comments`'s
  path list, or Vale never sees it
- A word typos rejects but is right (a product name, say) goes in
  `typos.toml` with a comment saying what it is
