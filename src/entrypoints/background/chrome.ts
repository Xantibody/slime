// Enable action icon only on Slite pages (Chrome version)
import { EMACS_KEYBIND_STORAGE_KEY } from "../../settings/settings.ts";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.action.disable();
  void chrome.storage.local.set({ [EMACS_KEYBIND_STORAGE_KEY]: false });

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
