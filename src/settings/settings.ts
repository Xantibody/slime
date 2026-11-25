// Settings shared by the popup, which writes them, and the content script,
// which relays them to the page. Storage is their only source.

export const EMACS_KEYBIND_STORAGE_KEY = "emacsKeybindEnabled";
export const PAUSED_STORAGE_KEY = "paused";

/**
 * Whether the user paused Slime as a whole. Stored as "paused" rather than
 * "enabled" so that a missing or malformed value leaves the fixes running.
 *
 * @param stored - the items `storage.local.get` returned
 * @returns whether every feature should stand down
 */
export function pausedFrom(stored: Readonly<Record<string, unknown>>): boolean {
  return stored[PAUSED_STORAGE_KEY] === true;
}

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
