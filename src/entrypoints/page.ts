// Slime - page context entry point
import { createEmacsKeybind } from "../feature/extra/emacs-keybind.ts";
import { createIMEFix, getEditorFromRefs } from "../feature/fix/editor-marks.ts";
import type { EditorRefEntry } from "../feature/fix/editor-marks.ts";
import { createFormFieldGuard } from "../feature/fix/form-field.ts";
import { createPlaceholderGuard } from "../feature/fix/mark-placeholder.ts";
import { EMACS_KEYBIND, PAUSED, subscribe } from "../settings/page-channel.ts";

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

function handleCompositionStart(): void {
  imeFix.handleCompositionStart();
}

function handleCompositionEnd(): void {
  imeFix.handleCompositionEnd();
  placeholderGuard.flush();
  requestAnimationFrame(() => {
    placeholderGuard.flush();
  });
}

// Form fields outside Slate: database row titles duplicate the commit when the
// page reacts to the Enter that confirms a conversion, and the search page
// writes a stale value into its input on every keystroke.
const formFieldGuard = createFormFieldGuard();

// === Emacs Keybind ===
const emacsKeybind = createEmacsKeybind();

subscribe(EMACS_KEYBIND, (enabled) => {
  emacsKeybind.setEnabled(enabled);
  log("Emacs keybind:", enabled ? "ON" : "OFF");
});

// === Pause ===
// Not paused until the content script says so: the fixes start at once rather
// than waiting for storage to be read.
subscribe(PAUSED, (paused) => {
  if (paused) {
    document.removeEventListener("compositionstart", handleCompositionStart, true);
    document.removeEventListener("compositionend", handleCompositionEnd, true);
    // Puts back marks parked by a composition that will now end unobserved.
    imeFix.handleCompositionEnd();
    placeholderGuard.stop();
    formFieldGuard.stop();
    emacsKeybind.stop();
  } else {
    document.addEventListener("compositionstart", handleCompositionStart, true);
    document.addEventListener("compositionend", handleCompositionEnd, true);
    placeholderGuard.start();
    formFieldGuard.start();
    emacsKeybind.start();
  }
  log(paused ? "Paused" : "Running");
});
