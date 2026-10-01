// Content script -> page context channel.
//
// Why an attribute instead of CustomEvent `detail`: Firefox blocks reading
// `detail` across the content-script / page boundary, so the payload rides on
// a DOM attribute and the event is only a notification.

export const EMACS_KEYBIND_ATTRIBUTE = "data-slime-emacs";
export const EMACS_KEYBIND_EVENT = "slime:emacs-keybind";

const ENABLED = "on";
const DISABLED = "off";

export function toAttributeValue(enabled: boolean): string {
  return enabled ? ENABLED : DISABLED;
}

export function isEnabledAttributeValue(value: string | null): boolean {
  return value === ENABLED;
}
