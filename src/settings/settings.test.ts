import { describe, expect, it } from "vitest";
import {
  EMACS_KEYBIND_STORAGE_KEY,
  PAUSED_STORAGE_KEY,
  emacsKeybindFrom,
  pausedBadgeText,
  pausedFrom,
} from "./settings.ts";

describe(pausedBadgeText, () => {
  it("should leave the toolbar icon bare while Slime runs", () => {
    expect(pausedBadgeText(false)).toBe("");
  });

  it("should mark the toolbar icon while Slime is paused", () => {
    expect(pausedBadgeText(true)).toBe("OFF");
  });
});

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

describe(pausedFrom, () => {
  it("should not be paused when nothing has been stored yet", () => {
    expect(pausedFrom({})).toBe(false);
  });

  it("should be paused once the user paused it", () => {
    expect(pausedFrom({ [PAUSED_STORAGE_KEY]: true })).toBe(true);
  });

  it.each([false, "true", 1, null])("should not be paused for a stored %s", (stored) => {
    expect(pausedFrom({ [PAUSED_STORAGE_KEY]: stored })).toBe(false);
  });
});
