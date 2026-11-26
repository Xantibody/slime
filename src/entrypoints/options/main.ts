// The other settings page: what most users never need, kept out of the popup
import { EMACS_KEYBIND_STORAGE_KEY, emacsKeybindFrom } from "../../settings/settings.ts";

const emacsToggle = document.querySelector("#emacsToggle");
if (!(emacsToggle instanceof HTMLInputElement)) {
  throw new TypeError("#emacsToggle checkbox is missing from options.html");
}

async function loadState(toggle: HTMLInputElement): Promise<void> {
  toggle.checked = emacsKeybindFrom(await browser.storage.local.get(EMACS_KEYBIND_STORAGE_KEY));
}

void loadState(emacsToggle);

// Writing storage is enough: every Slite tab's content script follows it
emacsToggle.addEventListener("change", () => {
  void browser.storage.local.set({ [EMACS_KEYBIND_STORAGE_KEY]: emacsToggle.checked });
});
