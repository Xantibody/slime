// Content script: injects inject.js into the page context and relays the
// stored settings to it
import { publishEmacsKeybind } from "../settings/page-channel.ts";
import { EMACS_KEYBIND_STORAGE_KEY, emacsKeybindFrom } from "../settings/settings.ts";

const script = document.createElement("script");
script.src = browser.runtime.getURL("inject.js");
script.addEventListener("load", () => {
  script.remove();
});
(document.head ?? document.documentElement).append(script);

async function relayEmacsKeybind(): Promise<void> {
  publishEmacsKeybind(emacsKeybindFrom(await browser.storage.local.get(EMACS_KEYBIND_STORAGE_KEY)));
}

// Storage is the only source of the setting: read it once for this page, and
// again whenever the popup changes it, in whichever tab that happens
void relayEmacsKeybind();
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && Object.hasOwn(changes, EMACS_KEYBIND_STORAGE_KEY)) {
    void relayEmacsKeybind();
  }
});
