# Slite Japanese IME Fix

Browser extension that fixes the Japanese IME double-display bug in Slite editor.

Supports **Chrome**, **Edge**, and **Firefox**.

## Problem

When using Japanese IME (Input Method Editor) in Slite, composed text appears duplicated during input. This extension fixes that issue by properly handling composition events.

## Installation

### Chrome / Edge

1. Download `slite-ime-fix-chrome-vX.X.X.zip` from [Releases](https://github.com/Xantibody/slite-ime-fix/releases)
2. Extract the zip file
3. Open `chrome://extensions/` (or `edge://extensions/`)
4. Enable "Developer mode" (toggle in top-right corner)
5. Click "Load unpacked"
6. Select the extracted folder

### Firefox

1. Download `slite-ime-fix-firefox-vX.X.X.xpi` from [Releases](https://github.com/Xantibody/slite-ime-fix/releases)
2. Open Firefox and drag the `.xpi` file into the browser window
3. Click "Add" when prompted

> Note: Firefox may warn about unsigned extensions. For permanent installation without warnings, the extension needs to be signed by Mozilla or installed in Firefox Developer Edition with `xpinstall.signatures.required` set to `false`.

### Build from source

```bash
git clone https://github.com/Xantibody/slite-ime-fix.git
cd slite-ime-fix
pnpm install
pnpm build
```

This generates:

- `dist/slite-ime-fix-chrome.zip` - Chrome/Edge extension
- `dist/slite-ime-fix-firefox.xpi` - Firefox extension
- `dist/chrome/` - Unpacked Chrome extension (for development)
- `dist/firefox/` - Unpacked Firefox extension (for development)

## Features

### IME Fix

The extension intercepts `compositionstart` and `compositionend` events to temporarily clear and restore editor marks, preventing the double-display issue caused by Slate.js editor's mark handling during IME composition.

### Emacs Keybindings (Optional)

Click the extension icon to toggle Emacs-style cursor movement:

| Shortcut | Action                    |
| -------- | ------------------------- |
| Ctrl+F   | Move forward (right)      |
| Ctrl+B   | Move backward (left)      |
| Ctrl+N   | Move to next line         |
| Ctrl+P   | Move to previous line     |
| Ctrl+A   | Move to beginning of line |
| Ctrl+E   | Move to end of line       |

## Files

- `src/ime-fix.ts` - Composition tracking and mark parking
- `src/mark-placeholder.ts` - Placeholder repair and the MutationObserver guard
- `src/emacs-keybind.ts` - Emacs keybinding logic
- `src/inject.ts` - Page-context entry point that wires the above together
- `src/content-script.ts` - Injects `inject.js` into the page context
- `src/build/manifest.ts` - Manifest generation for Chrome/Firefox
- `src/background.chrome.ts` - Chrome background script (declarativeContent API)
- `src/background.firefox.ts` - Firefox background script (tabs API)
- `src/popup.html` / `src/popup.ts` - Toggle UI for Emacs keybindings
- `scripts/build.ts` - esbuild bundling into dist/
- `e2e/` - Browser-driven verification (see [Development](#development))

## Development

```bash
pnpm test:run     # unit tests (vitest + jsdom)
pnpm typecheck    # tsc --noEmit (TypeScript 7 / typescript-go)
pnpm lint         # oxlint, every category set to error
pnpm knip         # unused exports, files and dependencies
pnpm check        # all four of the above
pnpm e2e          # drives the built extension in a real browser
nix fmt           # oxfmt + nixfmt via treefmt
```

`pnpm e2e` needs `agent-browser`, which the Nix devShell provides (`nix develop`).
It loads `e2e/slate-ime-fixture.html` twice — once without the extension, to
confirm the bug still reproduces, and once with the built `dist/chrome/inject.js`
— and asserts on both outcomes.

Lint runs with `correctness`, `suspicious`, `pedantic`, `perf`, `style`,
`restriction` and `nursery` all set to `error`. Every disabled rule in
`.oxlintrc.json` carries a comment explaining why.

### Release

Releasing is `git tag vX.Y.Z && git push --tags`. The workflow takes the
version from the tag and builds the manifests with it — `pnpm build` alone
falls back to the `version` in `package.json`, and a tag that is not
dot-separated numbers fails the build rather than producing a package the
stores would reject.

## Technical Details

### Root Cause

Slite uses Slate.js as its rich text editor. There are two sources of duplicate text display during IME composition:

1. **Marks issue**: When `editor.marks` contains formatting information (bold, italic, etc.) during IME composition, Slate applies these marks to both the composing text and the committed text.

2. **Mark-placeholder issue**: Slate uses `data-slate-mark-placeholder` elements to show where marks will be applied. Sometimes committed text remains in these placeholder elements after composition ends, causing duplicate display.

### Solution

This extension applies two fixes:

1. **Marks handling**: Temporarily clears `editor.marks` during IME composition
   - `compositionstart`: Save `editor.marks` and set it to `null`
   - `compositionend`: Restore the saved marks

   This stops Slate from rendering a placeholder in the first place — but it
   cannot help with a placeholder that was already in the DOM when composition
   started.

2. **Placeholder guard**: A `MutationObserver` enforces the placeholder's own
   invariant — an element declared `data-slate-length="0"` may hold nothing but
   the zero-width no-break space (ZWNBSP).
   - Text appearing in a placeholder outside of composition is removed
     immediately, which covers the re-renders React performs a frame or more
     after `compositionend`
   - Text during composition is left alone, because there it is legitimate
   - A page that already shows the duplicate when the extension loads is
     repaired on startup
   - The repair mutates the existing text node instead of replacing it: Slate
     holds a reference to that node and re-reads the DOM if it disappears. The
     caret is restored when it was parked inside

This prevents both types of duplicate display while preserving the user's intended formatting.

## License

MIT
