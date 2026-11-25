import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createComposingKeyShield } from "./composing-keydown.ts";
import type { ComposingKeyShield } from "./composing-keydown.ts";

/**
 * Slite's row-title input, reduced to what matters: React listens on its root
 * container, and the Enter handler blurs the input.
 *
 * @returns the input and the keys the page's handler received
 */
function renderRowTitle(): { input: HTMLInputElement; handled: string[] } {
  document.body.innerHTML = `<div id="root"><input data-test-id="databaseNoteLinkTextInput"></div>`;
  const root = document.querySelector("#root");
  const input = document.querySelector("input");
  if (root === null || input === null) {
    throw new Error("fixture is missing its input");
  }

  const handled: string[] = [];
  root.addEventListener("keydown", (event) => {
    handled.push((event as KeyboardEvent).key);
  });

  return { input, handled };
}

function pressEnter(target: Element, init: KeyboardEventInit = {}): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...init }),
  );
}

describe(createComposingKeyShield, () => {
  let shield: ComposingKeyShield;

  beforeEach(() => {
    shield = createComposingKeyShield();
    shield.start();
  });

  afterEach(() => {
    shield.stop();
  });

  it("should keep the Enter that commits an IME conversion away from the page", () => {
    const { input, handled } = renderRowTitle();

    pressEnter(input, { isComposing: true });

    expect(handled).toStrictEqual([]);
  });

  it("should let an Enter outside composition through, so Enter still ends editing", () => {
    const { input, handled } = renderRowTitle();

    pressEnter(input);

    expect(handled).toStrictEqual(["Enter"]);
  });

  it("should shield a textarea the same way", () => {
    const { handled } = renderRowTitle();
    const textarea = document.createElement("textarea");
    document.querySelector("#root")?.append(textarea);

    pressEnter(textarea, { isComposing: true });

    expect(handled).toStrictEqual([]);
  });

  it("should leave the default action to the IME, so the commit itself still happens", () => {
    const { input } = renderRowTitle();
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      isComposing: true,
      bubbles: true,
      cancelable: true,
    });

    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("should stop shielding once stopped", () => {
    const { input, handled } = renderRowTitle();
    shield.stop();

    pressEnter(input, { isComposing: true });

    expect(handled).toStrictEqual(["Enter"]);
  });

  it("should leave the Slate editor's own keys alone, since Slate tracks composition itself", () => {
    const { handled } = renderRowTitle();
    const root = document.querySelector("#root");
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.dataset["slateEditor"] = "true";
    root?.append(editor);

    pressEnter(editor, { isComposing: true });

    expect(handled).toStrictEqual(["Enter"]);
  });
});
