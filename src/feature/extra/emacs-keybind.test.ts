import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmacsKeybind, mapToKey, shouldIntercept } from "./emacs-keybind.ts";
import type { EmacsKeybind, KeyEventLike } from "./emacs-keybind.ts";

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

function pressCtrl(key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  document.body.dispatchEvent(event);

  return event;
}

describe(createEmacsKeybind, () => {
  let keybind: EmacsKeybind;
  let pageSaw: string[];

  function recordPageKeys(event: Event): void {
    pageSaw.push((event as KeyboardEvent).key);
  }

  beforeEach(() => {
    pageSaw = [];
    document.body.addEventListener("keydown", recordPageKeys);
    keybind = createEmacsKeybind();
    keybind.start();
  });

  afterEach(() => {
    keybind.stop();
    document.body.removeEventListener("keydown", recordPageKeys);
  });

  it("should leave every key to the page while it is off", () => {
    const event = pressCtrl("f");

    expect({ pageSaw, prevented: event.defaultPrevented }).toStrictEqual({
      pageSaw: ["f"],
      prevented: false,
    });
  });

  it("should take a mapped key away from the page once it is on", () => {
    keybind.setEnabled(true);

    const event = pressCtrl("f");

    expect({ pageSaw, prevented: event.defaultPrevented }).toStrictEqual({
      pageSaw: [],
      prevented: true,
    });
  });

  it("should leave an unmapped key to the page even when on", () => {
    keybind.setEnabled(true);

    pressCtrl("x");

    expect(pageSaw).toStrictEqual(["x"]);
  });

  it("should give the keys back once it is stopped", () => {
    keybind.setEnabled(true);
    keybind.stop();

    pressCtrl("f");

    expect(pageSaw).toStrictEqual(["f"]);
  });
});
