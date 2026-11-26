// Content script -> page context channel.
//
// Why an attribute instead of CustomEvent `detail`: Firefox blocks reading
// `detail` across the content-script / page boundary, so the payload rides on
// a DOM attribute and the event is only a notification.
//
// The attribute also outlives the event: the page script is injected through
// a `<script>` tag and may run before or after the content script has read
// storage, so a subscriber reads the attribute once on start and again on
// every event.

export const EMACS_KEYBIND_ATTRIBUTE = "data-slime-emacs";
const EMACS_KEYBIND_EVENT = "slime:emacs-keybind";

const ENABLED = "on";
const DISABLED = "off";

/**
 * Hand the Emacs keybind setting to the page. Called from the content script.
 *
 * @param enabled - the setting as stored
 */
export function publishEmacsKeybind(enabled: boolean): void {
  document.documentElement.setAttribute(EMACS_KEYBIND_ATTRIBUTE, enabled ? ENABLED : DISABLED);
  globalThis.dispatchEvent(new CustomEvent(EMACS_KEYBIND_EVENT));
}

/**
 * Follow the Emacs keybind setting from the page. Called from the page script.
 *
 * @param listener - called at once with the current setting, then on every change
 * @returns a function that stops following
 */
export function subscribeEmacsKeybind(listener: (enabled: boolean) => void): () => void {
  function notify(): void {
    listener(document.documentElement.getAttribute(EMACS_KEYBIND_ATTRIBUTE) === ENABLED);
  }

  globalThis.addEventListener(EMACS_KEYBIND_EVENT, notify);
  notify();

  return () => {
    globalThis.removeEventListener(EMACS_KEYBIND_EVENT, notify);
  };
}
