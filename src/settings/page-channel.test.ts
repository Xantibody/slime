import { afterEach, describe, expect, it } from "vitest";
import { EMACS_KEYBIND, publish, subscribe } from "./page-channel.ts";
import type { PageSetting } from "./page-channel.ts";

describe(subscribe, () => {
  const unsubscribes: (() => void)[] = [];

  function follow(setting: PageSetting = EMACS_KEYBIND): boolean[] {
    const seen: boolean[] = [];
    unsubscribes.push(
      subscribe(setting, (on) => {
        seen.push(on);
      }),
    );

    return seen;
  }

  function unsubscribeAll(): void {
    for (const unsubscribe of unsubscribes.splice(0)) {
      unsubscribe();
    }
  }

  afterEach(() => {
    unsubscribeAll();
    for (const attribute of document.documentElement.getAttributeNames()) {
      document.documentElement.removeAttribute(attribute);
    }
  });

  it("should start off when the content script has published nothing yet", () => {
    expect(follow()).toStrictEqual([false]);
  });

  it("should pick up a setting published before the page script loaded", () => {
    publish(EMACS_KEYBIND, true);

    expect(follow()).toStrictEqual([true]);
  });

  it("should follow every setting published afterwards", () => {
    const seen = follow();

    publish(EMACS_KEYBIND, true);
    publish(EMACS_KEYBIND, false);

    expect(seen).toStrictEqual([false, true, false]);
  });

  it("should stop following once unsubscribed", () => {
    const seen = follow();
    unsubscribeAll();

    publish(EMACS_KEYBIND, true);

    expect(seen).toStrictEqual([false]);
  });

  it("should keep settings apart from each other", () => {
    const other: PageSetting = { attribute: "data-slime-other", event: "slime:other" };
    const seen = follow(other);

    publish(EMACS_KEYBIND, true);

    expect(seen).toStrictEqual([false]);
  });
});
