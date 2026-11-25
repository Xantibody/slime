// Messages and storage keys shared by the popup, the content script and the
// background scripts.

export const EMACS_KEYBIND_TOGGLE = "EMACS_KEYBIND_TOGGLE";
export const EMACS_KEYBIND_STORAGE_KEY = "emacsKeybindEnabled";

export interface EmacsKeybindToggleMessage {
  readonly type: typeof EMACS_KEYBIND_TOGGLE;
  readonly enabled: boolean;
}

export function isEmacsKeybindToggle(message: unknown): message is EmacsKeybindToggleMessage {
  if (typeof message !== "object" || message === null) {
    return false;
  }

  const record = message as Record<string, unknown>;

  return record["type"] === EMACS_KEYBIND_TOGGLE && typeof record["enabled"] === "boolean";
}
