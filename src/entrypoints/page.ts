// Slime - page context entry point
import { createComposingKeyShield } from "../feature/fix/composing-keydown.ts";
import { createComposingValueGuard } from "../feature/fix/composing-value.ts";
import { createEmacsKeybind } from "../feature/extra/emacs-keybind.ts";
import { createIMEFix, getEditorFromRefs } from "../feature/fix/editor-marks.ts";
import type { EditorRefEntry } from "../feature/fix/editor-marks.ts";
import { createPlaceholderGuard } from "../feature/fix/mark-placeholder.ts";
import {
  EMACS_KEYBIND_ATTRIBUTE,
  EMACS_KEYBIND_EVENT,
  isEnabledAttributeValue,
} from "../settings/page-channel.ts";

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

// Form fields outside Slate (database row titles) duplicate the commit when
// the page reacts to the Enter that confirms a conversion.
createComposingKeyShield().start();

// The search page writes a stale value into its input on every keystroke,
// which ends the conversion after each letter.
createComposingValueGuard().start();

// === Emacs Keybind ===
const emacsKeybind = createEmacsKeybind();
emacsKeybind.start();

globalThis.addEventListener(EMACS_KEYBIND_EVENT, () => {
  const enabled = isEnabledAttributeValue(
    document.documentElement.getAttribute(EMACS_KEYBIND_ATTRIBUTE),
  );
  emacsKeybind.setEnabled(enabled);
  log("Emacs keybind:", enabled ? "ON" : "OFF");
});

log("Loaded");
