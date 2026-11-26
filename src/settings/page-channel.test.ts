import { afterEach, describe, expect, it } from "vitest";
import {
  EMACS_KEYBIND_ATTRIBUTE,
  publishEmacsKeybind,
  subscribeEmacsKeybind,
} from "./page-channel.ts";

describe(subscribeEmacsKeybind, () => {
  const unsubscribes: (() => void)[] = [];

  function subscribe(): boolean[] {
    const seen: boolean[] = [];
    unsubscribes.push(
      subscribeEmacsKeybind((enabled) => {
        seen.push(enabled);
      }),
    );

    return seen;
  }

  afterEach(() => {
    for (const unsubscribe of unsubscribes.splice(0)) {
      unsubscribe();
    }
    document.documentElement.removeAttribute(EMACS_KEYBIND_ATTRIBUTE);
  });

  it("should start off when the content script has published nothing yet", () => {
    expect(subscribe()).toStrictEqual([false]);
  });

  it("should pick up a setting published before the page script loaded", () => {
    publishEmacsKeybind(true);

    expect(subscribe()).toStrictEqual([true]);
  });

  it("should follow every setting published afterwards", () => {
    const seen = subscribe();

    publishEmacsKeybind(true);
    publishEmacsKeybind(false);

    expect(seen).toStrictEqual([false, true, false]);
  });

  it("should stop following once unsubscribed", () => {
    const seen = subscribe();
    for (const unsubscribe of unsubscribes.splice(0)) {
      unsubscribe();
    }

    publishEmacsKeybind(true);

    expect(seen).toStrictEqual([false]);
  });
});
