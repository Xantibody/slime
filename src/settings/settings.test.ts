import { describe, expect, it } from "vitest";
import { EMACS_KEYBIND_STORAGE_KEY, emacsKeybindFrom } from "./settings.ts";

describe(emacsKeybindFrom, () => {
  it("should be off when nothing has been stored yet", () => {
    expect(emacsKeybindFrom({})).toBe(false);
  });

  it("should be on once the user turned it on", () => {
    expect(emacsKeybindFrom({ [EMACS_KEYBIND_STORAGE_KEY]: true })).toBe(true);
  });

  it.each([false, "true", 1, null])("should be off for a stored %s", (stored) => {
    expect(emacsKeybindFrom({ [EMACS_KEYBIND_STORAGE_KEY]: stored })).toBe(false);
  });
});
