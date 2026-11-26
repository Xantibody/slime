import { EMACS_KEYBIND_STORAGE_KEY, emacsKeybindFrom } from "../../settings/settings.ts";

const toggle = document.querySelector("#emacsToggle");
if (!(toggle instanceof HTMLInputElement)) {
  throw new TypeError("#emacsToggle checkbox is missing from popup.html");
}
const emacsToggle = toggle;

async function loadState(): Promise<void> {
  emacsToggle.checked = emacsKeybindFrom(
    await browser.storage.local.get(EMACS_KEYBIND_STORAGE_KEY),
  );
}

void loadState();

// Writing storage is enough: every Slite tab's content script follows it
emacsToggle.addEventListener("change", () => {
  void browser.storage.local.set({ [EMACS_KEYBIND_STORAGE_KEY]: emacsToggle.checked });
});
