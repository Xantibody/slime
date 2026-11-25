import {
  EMACS_KEYBIND_STORAGE_KEY,
  PAUSED_STORAGE_KEY,
  emacsKeybindFrom,
  pausedFrom,
} from "../../settings/settings.ts";

function checkbox(selector: string): HTMLInputElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLInputElement)) {
    throw new TypeError(`${selector} checkbox is missing from popup.html`);
  }

  return element;
}

const enabledToggle = checkbox("#enabledToggle");
const emacsToggle = checkbox("#emacsToggle");
const status = document.querySelector("#status");
const version = document.querySelector("#version");

// The manifest is the one place the version is set, by the release tag
if (version !== null) {
  version.textContent = `v${browser.runtime.getManifest().version}`;
}

function showPaused(paused: boolean): void {
  enabledToggle.checked = !paused;
  document.body.classList.toggle("paused", paused);
  if (status !== null) {
    status.textContent = paused ? "一時停止中" : "動作中";
  }
}

async function loadState(): Promise<void> {
  const stored = await browser.storage.local.get([PAUSED_STORAGE_KEY, EMACS_KEYBIND_STORAGE_KEY]);
  showPaused(pausedFrom(stored));
  emacsToggle.checked = emacsKeybindFrom(stored);
}

void loadState();

// Writing storage is enough: every Slite tab's content script follows it
enabledToggle.addEventListener("change", () => {
  const paused = !enabledToggle.checked;
  showPaused(paused);
  void browser.storage.local.set({ [PAUSED_STORAGE_KEY]: paused });
});

emacsToggle.addEventListener("change", () => {
  void browser.storage.local.set({ [EMACS_KEYBIND_STORAGE_KEY]: emacsToggle.checked });
});
