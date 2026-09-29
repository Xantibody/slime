import { describe, expect, it } from "vitest";
import {
  assertVersion,
  createBaseManifest,
  generateChromeManifest,
  generateFirefoxManifest,
} from "./manifest.ts";

const VERSION = "1.2.3";

describe(assertVersion, () => {
  it.each(["1", "1.0", "1.2.3", "10.20.30.40"])("should accept %s", (version) => {
    expect(assertVersion(version)).toBe(version);
  });

  it.each(["v1.2.3", "1.2.3-beta", "", "1.2.3.4.5", "latest"])("should reject %s", (version) => {
    expect(() => assertVersion(version)).toThrow(/Invalid extension version/u);
  });
});

describe(createBaseManifest, () => {
  it("should have required common fields", () => {
    const manifest = createBaseManifest(VERSION);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("Slite Japanese IME Fix");
    expect(manifest.host_permissions).toContain("https://*.slite.com/*");
  });

  it("should carry the version it was given", () => {
    expect(createBaseManifest(VERSION).version).toBe(VERSION);
  });

  it("should refuse a tag-shaped version", () => {
    expect(() => createBaseManifest("v1.2.3")).toThrow(/Invalid extension version/u);
  });

  it("should have icons configuration", () => {
    expect(createBaseManifest(VERSION).icons).toStrictEqual({
      16: "icons/icon-16.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    });
  });

  it("should have content_scripts for slite.com", () => {
    const { content_scripts } = createBaseManifest(VERSION);

    expect(content_scripts).toHaveLength(1);
    expect(content_scripts[0]?.matches).toContain("https://*.slite.com/*");
  });

  it("should expose inject.js as a web accessible resource", () => {
    expect(createBaseManifest(VERSION).web_accessible_resources[0]?.resources).toContain(
      "inject.js",
    );
  });
});

describe(generateChromeManifest, () => {
  it("should include declarativeContent permission", () => {
    expect(generateChromeManifest(VERSION).permissions).toContain("declarativeContent");
  });

  it("should include storage permission", () => {
    expect(generateChromeManifest(VERSION).permissions).toContain("storage");
  });

  it("should use service_worker for background", () => {
    expect(generateChromeManifest(VERSION).background).toStrictEqual({
      service_worker: "background.js",
    });
  });

  it("should not have browser_specific_settings", () => {
    const manifest: Record<string, unknown> = { ...generateChromeManifest(VERSION) };

    expect(manifest["browser_specific_settings"]).toBeUndefined();
  });

  it("should preserve base manifest fields", () => {
    const manifest = generateChromeManifest(VERSION);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe(VERSION);
    expect(manifest.icons).toBeDefined();
    expect(manifest.content_scripts).toBeDefined();
  });
});

describe(generateFirefoxManifest, () => {
  it("should include tabs permission", () => {
    expect(generateFirefoxManifest(VERSION).permissions).toContain("tabs");
  });

  it("should include storage permission", () => {
    expect(generateFirefoxManifest(VERSION).permissions).toContain("storage");
  });

  it("should use scripts array for background", () => {
    expect(generateFirefoxManifest(VERSION).background).toStrictEqual({
      scripts: ["background.js"],
    });
  });

  it("should have browser_specific_settings for gecko", () => {
    const { gecko } = generateFirefoxManifest(VERSION).browser_specific_settings;

    expect(gecko.id).toBeDefined();
    expect(gecko.strict_min_version).toBeDefined();
  });

  it("should preserve base manifest fields", () => {
    const manifest = generateFirefoxManifest(VERSION);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe(VERSION);
    expect(manifest.icons).toBeDefined();
    expect(manifest.content_scripts).toBeDefined();
  });
});
