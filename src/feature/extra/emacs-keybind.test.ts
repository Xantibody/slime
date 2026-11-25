import { describe, expect, it } from "vitest";
import { mapToKey, shouldIntercept } from "./emacs-keybind.ts";
import type { KeyEventLike } from "./emacs-keybind.ts";

function keyEvent(overrides: Partial<KeyEventLike> & { key: string }): KeyEventLike {
  return { ctrlKey: true, ...overrides };
}

describe(shouldIntercept, () => {
  it("should return false when disabled", () => {
    expect(shouldIntercept(keyEvent({ key: "f" }), false)).toBe(false);
  });

  it.each(["f", "b", "n", "p", "a", "e"])("should return true for Ctrl+%s when enabled", (key) => {
    expect(shouldIntercept(keyEvent({ key }), true)).toBe(true);
  });

  it("should return false for non-mapped keys", () => {
    expect(shouldIntercept(keyEvent({ key: "x" }), true)).toBe(false);
  });

  it("should return false without Ctrl key", () => {
    expect(shouldIntercept(keyEvent({ key: "f", ctrlKey: false }), true)).toBe(false);
  });

  it("should return false when Alt is also pressed", () => {
    expect(shouldIntercept(keyEvent({ key: "f", altKey: true }), true)).toBe(false);
  });

  it("should return false when Meta is also pressed", () => {
    expect(shouldIntercept(keyEvent({ key: "f", metaKey: true }), true)).toBe(false);
  });

  it("should not be fooled by inherited Object properties", () => {
    expect(shouldIntercept(keyEvent({ key: "constructor" }), true)).toBe(false);
    expect(shouldIntercept(keyEvent({ key: "toString" }), true)).toBe(false);
  });
});

describe(mapToKey, () => {
  it.each([
    ["f", "ArrowRight"],
    ["b", "ArrowLeft"],
    ["n", "ArrowDown"],
    ["p", "ArrowUp"],
    ["a", "Home"],
    ["e", "End"],
  ])("should map Ctrl+%s to %s", (key, expected) => {
    expect(mapToKey(key)).toBe(expected);
  });

  it("should return null for unmapped keys", () => {
    expect(mapToKey("x")).toBeNull();
  });

  it("should return null for inherited Object properties", () => {
    expect(mapToKey("constructor")).toBeNull();
  });
});
