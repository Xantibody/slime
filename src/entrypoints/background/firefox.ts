// Enable action icon only on Slite pages (Firefox version)
import { EMACS_KEYBIND_STORAGE_KEY } from "../../settings/settings.ts";

const SLITE_PATTERN = /^https:\/\/[^/]*\.slite\.com\//u;

export function isSliteUrl(url: string | undefined): boolean {
  return url !== undefined && SLITE_PATTERN.test(url);
}

function updateIcon(tabId: number | undefined, url: string | undefined): void {
  if (tabId === undefined) {
    return;
  }

  if (isSliteUrl(url)) {
    void browser.action.enable(tabId);
  } else {
    void browser.action.disable(tabId);
  }
}

// Check when tab is updated
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url !== undefined || changeInfo.status === "complete") {
    updateIcon(tabId, tab.url);
  }
});

// Check when tab is activated
browser.tabs.onActivated.addListener((activeInfo) => {
  void (async (): Promise<void> => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    updateIcon(tab.id, tab.url);
  })();
});

// Initialize: disable on all existing tabs, enable on Slite tabs
void (async (): Promise<void> => {
  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    updateIcon(tab.id, tab.url);
  }
})();

// Initialize storage
void browser.storage.local.set({ [EMACS_KEYBIND_STORAGE_KEY]: false });
