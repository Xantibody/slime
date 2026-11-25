// Content script: injects inject.js into the page context
import { isEmacsKeybindToggle } from "./extension-api.ts";
import { EMACS_KEYBIND_ATTRIBUTE, EMACS_KEYBIND_EVENT, toAttributeValue } from "./page-channel.ts";

const script = document.createElement("script");
script.src = browser.runtime.getURL("inject.js");
script.addEventListener("load", () => {
  script.remove();
});
(document.head ?? document.documentElement).append(script);

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isEmacsKeybindToggle(message)) {
    return;
  }

  document.documentElement.setAttribute(EMACS_KEYBIND_ATTRIBUTE, toAttributeValue(message.enabled));
  globalThis.dispatchEvent(new CustomEvent(EMACS_KEYBIND_EVENT));
});
