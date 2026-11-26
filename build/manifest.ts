// Manifest generation - pure functions (no I/O)
import { SLITE_MATCH_PATTERN } from "../src/slite/url.ts";

// 16 and 32 for the toolbar at 1x and 2x, 48 for the extensions page, 32 and
// 64 for AMO's listing, 128 for the Chrome Web Store and the install dialog
interface IconSet {
  readonly 16: string;
  readonly 32: string;
  readonly 48: string;
  readonly 64: string;
  readonly 128: string;
}

export interface BaseManifest {
  readonly manifest_version: 3;
  readonly name: string;
  readonly version: string;
  readonly default_locale: string;
  readonly description: string;
  readonly host_permissions: readonly string[];
  readonly icons: IconSet;
  readonly action: {
    readonly default_title: string;
    readonly default_popup: string;
    readonly default_icon: IconSet;
  };
  readonly options_ui: { readonly page: string; readonly open_in_tab: boolean };
  readonly content_scripts: readonly {
    readonly matches: readonly string[];
    readonly js: readonly string[];
    readonly run_at: "document_start";
  }[];
  readonly web_accessible_resources: readonly {
    readonly resources: readonly string[];
    readonly matches: readonly string[];
  }[];
}

export interface ChromeManifest extends BaseManifest {
  readonly minimum_chrome_version: string;
  readonly permissions: readonly string[];
  readonly background: { readonly service_worker: string };
}

export interface FirefoxManifest extends BaseManifest {
  readonly permissions: readonly string[];
  readonly background: { readonly scripts: readonly string[] };
  readonly browser_specific_settings: {
    readonly gecko: {
      readonly id: string;
      readonly strict_min_version: string;
      readonly data_collection_permissions: { readonly required: readonly ["none"] };
    };
  };
}

const ICONS: IconSet = {
  128: "icons/icon-128.png",
  16: "icons/icon-16.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  64: "icons/icon-64.png",
};

/** Chrome stores each version component as a 16-bit integer. */
const MAX_VERSION_COMPONENT = 65_535;

/**
 * Browsers only accept one to four dot-separated integers from 0 to 65535,
 * without leading zeros, and a release tag is the one place the version is
 * authoritative — so reject anything else loudly rather than shipping a
 * package the store will refuse.
 *
 * @param version - candidate version string, e.g. from a `v1.2.0` tag
 * @returns the same string, once it is known to be well-formed
 */
export function assertVersion(version: string): string {
  if (
    !/^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,3}$/u.test(version) ||
    version.split(".").some((part) => Number(part) > MAX_VERSION_COMPONENT)
  ) {
    throw new Error(`Invalid extension version: ${version} (expected e.g. 1.2.0)`);
  }

  return version;
}

export function createBaseManifest(version: string): BaseManifest {
  return {
    action: {
      default_icon: ICONS,
      default_popup: "popup.html",
      default_title: "Slime",
    },
    // Settings most users never need stay out of the popup. Chrome lists this
    // page as Options in the toolbar icon's right-click menu; Firefox gets its
    // own menu item from the background
    options_ui: {
      page: "options.html",
      open_in_tab: true,
    },
    content_scripts: [
      {
        matches: [SLITE_MATCH_PATTERN],
        js: ["content-script.js"],
        run_at: "document_start",
      },
    ],
    // The browser picks the text from _locales (build/locales.ts) by the UI
    // language, falling back to English
    default_locale: "en",
    description: "__MSG_description__",
    host_permissions: [SLITE_MATCH_PATTERN],
    icons: ICONS,
    manifest_version: 3,
    name: "Slime",
    version: assertVersion(version),
    web_accessible_resources: [
      {
        resources: ["inject.js"],
        matches: [SLITE_MATCH_PATTERN],
      },
    ],
  };
}

export function generateChromeManifest(version: string): ChromeManifest {
  return {
    ...createBaseManifest(version),
    background: {
      service_worker: "background.js",
    },
    // The first release that exposes `browser.*` (with promises) next to
    // `chrome.*`, so every script shares one namespace with Firefox
    minimum_chrome_version: "148",
    permissions: ["declarativeContent", "storage"],
  };
}

export function generateFirefoxManifest(version: string): FirefoxManifest {
  return {
    ...createBaseManifest(version),
    background: {
      scripts: ["background.js"],
    },
    browser_specific_settings: {
      gecko: {
        // AIDEV-NOTE: never change this once the add-on is on AMO, which ties a
        // listing to its ID for good. release.yml, update-flake-amo.yml and
        // flake.nix repeat the same string
        id: "slime@example.com",
        strict_min_version: "109.0",
        // AMO refuses new add-ons that do not declare this. The extension
        // only rewrites the editor's DOM and never sends anything anywhere
        data_collection_permissions: { required: ["none"] },
      },
    },
    // menus: Firefox's toolbar button has no Options item, so the background
    // adds one that opens options.html
    permissions: ["tabs", "storage", "menus"],
  };
}
