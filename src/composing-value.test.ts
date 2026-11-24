import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createComposingValueGuard } from "./composing-value.ts";
import type { ComposingValueGuard } from "./composing-value.ts";

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

describe(createComposingValueGuard, () => {
  let guard: ComposingValueGuard;

  beforeEach(() => {
    guard = createComposingValueGuard();
    guard.start();
  });

  afterEach(() => {
    guard.stop();
  });

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
