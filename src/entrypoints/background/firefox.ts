// Enable action icon only on Slite pages, and mark it while paused (Firefox
// version)
import { PAUSED_STORAGE_KEY, pausedBadgeText, pausedFrom } from "../../settings/settings.ts";
import { isSliteUrl } from "../../slite/url.ts";

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

// Mark the icon while paused, on every start of the event page and on change
async function showPause(): Promise<void> {
  const paused = pausedFrom(await browser.storage.local.get(PAUSED_STORAGE_KEY));
  await browser.action.setBadgeText({ text: pausedBadgeText(paused) });
}

void showPause();
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && Object.hasOwn(changes, PAUSED_STORAGE_KEY)) {
    void showPause();
  }
});
