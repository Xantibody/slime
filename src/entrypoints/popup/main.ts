// The popup: what Slime is, its version, and the one switch everyone needs.
// Settings few users want live on the options page instead.
import { PAUSED_STORAGE_KEY, pausedFrom } from "../../settings/settings.ts";

const enabledToggle = document.querySelector("#enabledToggle");
if (!(enabledToggle instanceof HTMLInputElement)) {
  throw new TypeError("#enabledToggle checkbox is missing from popup.html");
}
const status = document.querySelector("#status");
const version = document.querySelector("#version");

// The manifest is the one place the version is set, by the release tag
if (version !== null) {
  version.textContent = `v${browser.runtime.getManifest().version}`;
}

function showPaused(toggle: HTMLInputElement, paused: boolean): void {
  toggle.checked = !paused;
  document.body.classList.toggle("paused", paused);
  if (status !== null) {
    status.textContent = paused ? "一時停止中" : "動作中";
  }
}

async function loadState(toggle: HTMLInputElement): Promise<void> {
  showPaused(toggle, pausedFrom(await browser.storage.local.get(PAUSED_STORAGE_KEY)));
}

void loadState(enabledToggle);

// Writing storage is enough: every Slite tab's content script follows it
enabledToggle.addEventListener("change", () => {
  const paused = !enabledToggle.checked;
  showPaused(enabledToggle, paused);
  void browser.storage.local.set({ [PAUSED_STORAGE_KEY]: paused });
});
