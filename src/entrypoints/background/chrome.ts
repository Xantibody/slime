// Enable action icon only on Slite pages, and mark it while paused (Chrome
// version)
import { PAUSED_STORAGE_KEY, pausedBadgeText, pausedFrom } from "../../settings/settings.ts";

async function showPause(): Promise<void> {
  const paused = pausedFrom(await browser.storage.local.get(PAUSED_STORAGE_KEY));
  await browser.action.setBadgeText({ text: pausedBadgeText(paused) });
}

// The service worker starts again on each event, so the badge is set on every
// start as well as on each change
void showPause();
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && Object.hasOwn(changes, PAUSED_STORAGE_KEY)) {
    void showPause();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.action.disable();

  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: ".slite.com" },
          }),
        ],
        actions: [new chrome.declarativeContent.ShowAction()],
      },
    ]);
  });
});
