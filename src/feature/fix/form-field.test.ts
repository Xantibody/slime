import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFormFieldGuard } from "./form-field.ts";
import type { FormFieldGuard } from "./form-field.ts";

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

/**
 * Slite's search input, reduced to what matters: a plain `<input>` whose
 * value the page writes from its own state.
 *
 * @returns the search input
 */
function renderSearchInput(): HTMLInputElement {
  document.body.innerHTML = `<label><input data-test-id="search-input"></label>`;
  const input = document.querySelector("input");
  if (input === null) {
    throw new Error("fixture is missing its input");
  }
  return input;
}

/**
 * Types into the field the way the browser does during composition: the
 * composing text lands in the DOM without going through the page's setter.
 *
 * @param input - the field being composed into
 * @param text - the composing text
 */
function browserWrites(input: HTMLInputElement, text: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, text);
}

/**
 * React DOM's value tracker: an own `value` property on the field that
 * records every write before passing it to the prototype's setter.
 *
 * @param input - the field React renders
 * @returns the values the page wrote through the tracker
 */
function trackValueLikeReact(input: HTMLInputElement): string[] {
  const inherited = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const tracked: string[] = [];
  Object.defineProperty(input, "value", {
    configurable: true,
    get: () => inherited?.get?.call(input),
    set: (value: string) => {
      tracked.push(value);
      inherited?.set?.call(input, value);
    },
  });
  return tracked;
}

function startComposition(input: HTMLInputElement): void {
  input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
}

function endComposition(input: HTMLInputElement): void {
  input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
}

describe(createFormFieldGuard, () => {
  let guard: FormFieldGuard;

  beforeEach(() => {
    guard = createFormFieldGuard();
    guard.start();
  });

  afterEach(() => {
    guard.stop();
  });

  describe("keys", () => {
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
      guard.stop();

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

  describe("value writes", () => {
    it("should keep the composing text when the page writes back its stale value", () => {
      const input = renderSearchInput();
      startComposition(input);
      browserWrites(input, "k");

      input.value = "";

      expect(input.value).toBe("k");
    });

    it("should let the page write the value again once the conversion is committed", () => {
      const input = renderSearchInput();
      startComposition(input);
      browserWrites(input, "高度");
      endComposition(input);

      input.value = "";

      expect(input.value).toBe("");
    });

    it("should hand the value back to React's value tracker once the conversion is committed", () => {
      const input = renderSearchInput();
      const tracked = trackValueLikeReact(input);
      startComposition(input);
      browserWrites(input, "k");
      input.value = "";
      endComposition(input);

      input.value = "こう";

      expect({ tracked, value: input.value }).toStrictEqual({ tracked: ["こう"], value: "こう" });
    });

    it("should release the field even when compositionstart fires twice before the end", () => {
      const input = renderSearchInput();
      startComposition(input);
      startComposition(input);
      endComposition(input);

      input.value = "高度";

      expect(input.value).toBe("高度");
    });

    it("should release the field when it loses focus without a compositionend", () => {
      const input = renderSearchInput();
      startComposition(input);
      browserWrites(input, "こう");
      input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

      input.value = "高度";

      expect(input.value).toBe("高度");
    });

    it("should stop guarding once stopped", () => {
      const input = renderSearchInput();
      guard.stop();
      startComposition(input);

      input.value = "高度";

      expect(input.value).toBe("高度");
    });

    it("should guard a textarea the same way", () => {
      renderSearchInput();
      const textarea = document.createElement("textarea");
      document.body.append(textarea);
      textarea.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
        textarea,
        "k",
      );

      textarea.value = "";

      expect(textarea.value).toBe("k");
    });
  });
});
