// Content script: injects page.js into the page context and relays the
// stored settings to it
import { EMACS_KEYBIND, PAUSED, publish } from "../settings/page-channel.ts";
import {
  EMACS_KEYBIND_STORAGE_KEY,
  PAUSED_STORAGE_KEY,
  emacsKeybindFrom,
  pausedFrom,
} from "../settings/settings.ts";

const script = document.createElement("script");
script.src = browser.runtime.getURL("page.js");
script.addEventListener("load", () => {
  script.remove();
});
(document.head ?? document.documentElement).append(script);

const KEYS = [PAUSED_STORAGE_KEY, EMACS_KEYBIND_STORAGE_KEY];

async function relaySettings(): Promise<void> {
  const stored = await browser.storage.local.get(KEYS);
  publish(PAUSED, pausedFrom(stored));
  publish(EMACS_KEYBIND, emacsKeybindFrom(stored));
}

// Storage is the only source of the settings: read them once for this page,
// and again whenever the popup changes one, in whichever tab that happens
void relaySettings();
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && KEYS.some((key) => Object.hasOwn(changes, key))) {
    void relaySettings();
  }
});
