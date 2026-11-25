// Content script -> page context channel.
//
// Why an attribute instead of CustomEvent `detail`: Firefox blocks reading
// `detail` across the content-script / page boundary, so the payload rides on
// a DOM attribute and the event is only a notification.
//
// The attribute also outlives the event: the page script is injected through
// a `<script>` tag and may run before or after the content script has read
// storage, so a subscriber reads the attribute once on start and again on
// every event. A missing attribute reads as off, so every setting carried
// here must default to off.

/** One on/off setting as it travels to the page. */
export interface PageSetting {
  readonly attribute: string;
  readonly event: string;
}

export const EMACS_KEYBIND: PageSetting = {
  attribute: "data-slime-emacs",
  event: "slime:emacs-keybind",
};

const ON = "on";
const OFF = "off";

/**
 * Hand a setting to the page. Called from the content script.
 *
 * @param setting - which setting
 * @param on - its value as stored
 */
export function publish(setting: PageSetting, on: boolean): void {
  document.documentElement.setAttribute(setting.attribute, on ? ON : OFF);
  globalThis.dispatchEvent(new CustomEvent(setting.event));
}

/**
 * Follow a setting from the page. Called from the page script.
 *
 * @param setting - which setting
 * @param listener - called at once with the current value, then on every change
 * @returns a function that stops following
 */
export function subscribe(setting: PageSetting, listener: (on: boolean) => void): () => void {
  function notify(): void {
    listener(document.documentElement.getAttribute(setting.attribute) === ON);
  }

  globalThis.addEventListener(setting.event, notify);
  notify();

  return () => {
    globalThis.removeEventListener(setting.event, notify);
  };
}
