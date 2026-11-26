# Architecture

Slime is five small programs that run in different worlds, plus a build that
runs in Node. The layout makes a file's path say which world it runs in and
what it is allowed to call.

```
src/
  entrypoints/          what the browser runs; wiring only
    page.ts             content script in the page's world (MAIN), as page.js
    content.ts          content script in the isolated world: relays settings
    popup/              the toolbar popup: version and the pause switch
    options/            the other settings, from the icon's right-click menu
    background/         chrome.ts (declarativeContent), firefox.ts (tabs)
  feature/              what Slime does
    fix/                the IME fixes, one per cause in root-causes.md
    extra/              opt-in additions, such as the Emacs keybindings
  settings/             what the popup, content script and page share
  slite/                facts about Slite itself, such as its URLs
build/                  Node-side bundling and manifest generation
e2e/                    browser-driven check against a saved Slite page
store/                  store listing text and images, and their renderer
```

## Four kinds of place

- **`entrypoints/`** says where code runs. An entry creates the parts it needs
  and connects them; it holds no rule of its own. A new screen or script is a
  new entry.
- **`feature/`** says what Slime does to Slite. `fix/` restores what Slite
  should have done (the reason the extension exists); `extra/` adds what
  Slite does not do. Whether a feature is on by default is a setting, not a
  place: both kinds can be switched off.
- **`settings/`** holds the values the user chooses, their defaults, and how
  they reach the page.
- **`slite/`** holds what is true of Slite whether or not Slime runs, such as
  which URLs are Slite's. The manifest and both backgrounds derive their
  checks from it, so the pattern is written once.

`build/` and `store/` never ship in the extension, so they sit outside `src/`.

## Import direction

Only an entry imports from a parent directory. oxlint's
`no-relative-parent-imports` is on everywhere else, so `feature/` cannot
reach `settings/` or an entry: a feature receives what it needs (a predicate,
an enabled flag) from the entry that creates it.

## Settings flow

Storage is the only source of a setting, and its default lives in code
(`settings/settings.ts`), so nothing writes a default.

```mermaid
flowchart LR
  popup -- storage.local.set --> storage
  storage -- get on load, onChanged --> content[content script]
  content -- attribute + event --> page[page script]
```

Both are content scripts declared in the manifest at `document_start`. The
page script runs in the page's own world (`world: "MAIN"`) so it can reach
Slate's editor on the page's global object, and a script there cannot call
extension APIs; so the content script, in the isolated world, relays the
value through a DOM attribute and a notification event
(`settings/page-channel.ts`). The page reads the attribute when it starts as
well as on each event, because no browser promises which of the two runs
first, nor whether the content script has read storage by then.

## Browser differences

Every extension-world script calls `browser.*`, which Firefox has always had
and Chrome has had since 148 (`minimum_chrome_version` in the manifest).
Firefox runs a manifest content script in the MAIN world from 128
(`strict_min_version`); Chrome has done so since 111. What still differs
is chosen at build time: the manifest fields in `build/manifest.ts`, and the
background script, which uses `declarativeContent` on Chrome and the `tabs`
API on Firefox.
