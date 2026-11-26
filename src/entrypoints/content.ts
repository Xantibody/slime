// Content script: relays the stored settings to page.js, which the manifest
// runs in the page's own world beside this one
import { EMACS_KEYBIND, PAUSED, publish } from "../settings/page-channel.ts";
import {
  EMACS_KEYBIND_STORAGE_KEY,
  PAUSED_STORAGE_KEY,
  emacsKeybindFrom,
  pausedFrom,
} from "../settings/settings.ts";

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
