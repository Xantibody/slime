// Slime - page context entry point
import { mapToKey, shouldIntercept } from "./emacs-keybind.ts";
import type { MappedKey } from "./emacs-keybind.ts";
import { createIMEFix, getEditorFromRefs } from "./ime-fix.ts";
import type { EditorRefEntry } from "./ime-fix.ts";
import { createPlaceholderGuard } from "./mark-placeholder.ts";
import {
  EMACS_KEYBIND_ATTRIBUTE,
  EMACS_KEYBIND_EVENT,
  isEnabledAttributeValue,
} from "./page-channel.ts";

/** Slate publishes its live editor instances on the page's global object. */
interface SlateGlobal {
  __EDITOR_REFS__?: ReadonlySet<EditorRefEntry> | undefined;
}

const slateGlobal = globalThis as unknown as SlateGlobal;

function log(...args: readonly unknown[]): void {
  // oxlint-disable-next-line no-console -- the page console is this extension's only diagnostic channel
  console.log("[Slime]", ...args);
}

// === IME Fix ===
const imeFix = createIMEFix(() => getEditorFromRefs(slateGlobal.__EDITOR_REFS__));

// Two layers guard against the duplicate: clearing marks stops the placeholder
// from being rendered in the first place, and the guard repairs any placeholder
// that Slate re-renders with committed text once composition is over.
const placeholderGuard = createPlaceholderGuard({
  isComposing: () => imeFix.getState().isComposing,
});
placeholderGuard.start();

document.addEventListener(
  "compositionstart",
  () => {
    imeFix.handleCompositionStart();
  },
  true,
);

document.addEventListener(
  "compositionend",
  () => {
    imeFix.handleCompositionEnd();
    placeholderGuard.flush();
    requestAnimationFrame(() => {
      placeholderGuard.flush();
    });
  },
  true,
);

// === Emacs Keybind ===
type CursorMove = readonly [
  alter: "move",
  direction: "forward" | "backward",
  granularity: "character" | "line" | "lineboundary",
];

const CURSOR_MOVES: Readonly<Record<MappedKey, CursorMove>> = {
  ArrowRight: ["move", "forward", "character"],
  ArrowLeft: ["move", "backward", "character"],
  ArrowDown: ["move", "forward", "line"],
  ArrowUp: ["move", "backward", "line"],
  Home: ["move", "backward", "lineboundary"],
  End: ["move", "forward", "lineboundary"],
};

let emacsKeybindEnabled = false;

globalThis.addEventListener(EMACS_KEYBIND_EVENT, () => {
  emacsKeybindEnabled = isEnabledAttributeValue(
    document.documentElement.getAttribute(EMACS_KEYBIND_ATTRIBUTE),
  );
  log("Emacs keybind:", emacsKeybindEnabled ? "ON" : "OFF");
});

function moveCursor(key: MappedKey): void {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const [alter, direction, granularity] = CURSOR_MOVES[key];
  selection.modify(alter, direction, granularity);
}

document.addEventListener(
  "keydown",
  (event) => {
    if (!shouldIntercept(event, emacsKeybindEnabled)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const key = mapToKey(event.key);
    if (key !== null) {
      moveCursor(key);
    }
  },
  true,
);

log("Loaded");
