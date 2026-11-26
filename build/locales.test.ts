import { describe, expect, it } from "vitest";
import { LOCALES, localeMessages } from "./locales.ts";
import { generateChromeManifest, generateFirefoxManifest } from "./manifest.ts";

const MESSAGE_REFERENCE = /__MSG_(?<key>\w+)__/gu;

function referencedKeys(manifest: object): string[] {
  return [...JSON.stringify(manifest).matchAll(MESSAGE_REFERENCE)].map(
    (match) => match.groups?.["key"] ?? "",
  );
}

describe(localeMessages, () => {
  it("should offer English, the default locale, and Japanese", () => {
    expect(LOCALES).toStrictEqual(["en", "ja"]);
  });

  it.each(LOCALES)("should define every message the manifests refer to in %s", (locale) => {
    const keys = [
      ...referencedKeys(generateChromeManifest("1.0.0")),
      ...referencedKeys(generateFirefoxManifest("1.0.0")),
    ];

    expect(keys).not.toHaveLength(0);
    expect(Object.keys(localeMessages(locale))).toStrictEqual(expect.arrayContaining(keys));
  });

  it("should describe Slime in Japanese for Japanese users", () => {
    expect(localeMessages("ja")["description"]?.message).toBe(
      "Slite で日本語を入力したときに、文字が二重に表示・保存されるのを防ぎます。",
    );
  });

  it.each(LOCALES)(
    "should keep the %s description within the Chrome Web Store's 132 characters",
    (locale) => {
      expect(localeMessages(locale)["description"]?.message.length).toBeLessThanOrEqual(132);
    },
  );
});
