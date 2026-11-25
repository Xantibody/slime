// Settings shared by the popup, which writes them, and the content script,
// which relays them to the page. Storage is their only source.

export const EMACS_KEYBIND_STORAGE_KEY = "emacsKeybindEnabled";

/**
 * The Emacs keybind setting as stored, off unless the user turned it on. The
 * default lives here rather than in storage, so nothing has to write it.
 *
 * @param stored - the items `storage.local.get` returned
 * @returns whether the keybindings are on
 */
export function emacsKeybindFrom(stored: Readonly<Record<string, unknown>>): boolean {
  return stored[EMACS_KEYBIND_STORAGE_KEY] === true;
}
