// Manifest generation - pure functions (no I/O)

interface IconSet {
  readonly 16: string;
  readonly 48: string;
  readonly 128: string;
}

export interface BaseManifest {
  readonly manifest_version: 3;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly host_permissions: readonly string[];
  readonly icons: IconSet;
  readonly action: {
    readonly default_title: string;
    readonly default_popup: string;
    readonly default_icon: IconSet;
  };
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
  readonly permissions: readonly string[];
  readonly background: { readonly service_worker: string };
}

export interface FirefoxManifest extends BaseManifest {
  readonly permissions: readonly string[];
  readonly background: { readonly scripts: readonly string[] };
  readonly browser_specific_settings: {
    readonly gecko: { readonly id: string; readonly strict_min_version: string };
  };
}

const ICONS: IconSet = {
  128: "icons/icon-128.png",
  16: "icons/icon-16.png",
  48: "icons/icon-48.png",
};

/**
 * Browsers only accept dot-separated numbers here, and a release tag is the
 * one place the version is authoritative — so reject anything else loudly
 * rather than shipping a package the store will refuse.
 *
 * @param version - candidate version string, e.g. from a `v1.2.0` tag
 * @returns the same string, once it is known to be well-formed
 */
export function assertVersion(version: string): string {
  if (!/^\d+(?:\.\d+){0,3}$/u.test(version)) {
    throw new Error(`Invalid extension version: ${version} (expected e.g. 1.2.0)`);
  }

  return version;
}

export function createBaseManifest(version: string): BaseManifest {
  return {
    action: {
      default_icon: ICONS,
      default_popup: "popup.html",
      default_title: "Slite IME Fix",
    },
    content_scripts: [
      {
        matches: ["https://*.slite.com/*"],
        js: ["content-script.js"],
        run_at: "document_start",
      },
    ],
    description: "Fixes Japanese IME double-display issue in Slite editor",
    host_permissions: ["https://*.slite.com/*"],
    icons: ICONS,
    manifest_version: 3,
    name: "Slite Japanese IME Fix",
    version: assertVersion(version),
    web_accessible_resources: [
      {
        resources: ["inject.js"],
        matches: ["https://*.slite.com/*"],
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
        id: "slite-ime-fix@example.com",
        strict_min_version: "109.0",
      },
    },
    permissions: ["tabs", "storage"],
  };
}
