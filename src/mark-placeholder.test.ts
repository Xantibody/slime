import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupMarkPlaceholders,
  createPlaceholderGuard,
  hasResidualText,
  resetMarkPlaceholder,
  ZWNBSP,
} from "./mark-placeholder.ts";

/**
 * The DOM Slite actually leaves behind after committing 「だ体現」, copied from a
 * Slite page saved while the bug was showing (the page itself is not in the
 * repository). The committed text lives in the `data-slate-string` leaf
 * while the mark placeholder — declared `data-slate-length="0"` — still holds a
 * duplicate of it, so the user sees 「大変だ体現だ体現」.
 */
const BROKEN_BLOCK = `
<div class="slite-editor-block unstyled-block" data-type="unstyled">
  <span data-slate-node="text">
    <span data-slate-leaf="true"><span data-slate-string="true">大変だ体現</span></span><span
      data-slate-leaf="true"
    ><span
      data-slate-zero-width="z"
      data-slate-length="0"
      data-slate-mark-placeholder="true"
    >${ZWNBSP}だ体現</span></span>
  </span>
</div>`;

function renderBrokenBlock(): HTMLElement {
  document.body.innerHTML = BROKEN_BLOCK;
  const placeholder = document.querySelector<HTMLElement>("[data-slate-mark-placeholder]");
  if (placeholder === null) {
    throw new Error("fixture is missing its mark placeholder");
  }

  return placeholder;
}

function visibleText(): string {
  return document.body.textContent?.replaceAll(ZWNBSP, "").trim() ?? "";
}

function flushMutations(): Promise<void> {
  // oxlint-disable-next-line promise/avoid-new -- MutationObserver callbacks only settle on a macrotask
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function textNodeOf(element: Element): Text {
  const [firstChild] = element.childNodes;
  if (firstChild === undefined || firstChild.nodeType !== Node.TEXT_NODE) {
    throw new TypeError("placeholder has no text node");
  }

  return firstChild as Text;
}

function currentSelection(): Selection {
  const selection = document.getSelection();
  if (selection === null) {
    throw new TypeError("jsdom provided no selection");
  }

  return selection;
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe(hasResidualText, () => {
  it("should detect committed text left inside a placeholder", () => {
    expect(hasResidualText(renderBrokenBlock())).toBe(true);
  });

  it("should accept a placeholder holding only the zero-width character", () => {
    const placeholder = renderBrokenBlock();
    placeholder.textContent = ZWNBSP;

    expect(hasResidualText(placeholder)).toBe(false);
  });

  it("should treat an empty placeholder as clean", () => {
    const placeholder = renderBrokenBlock();
    placeholder.textContent = "";

    expect(hasResidualText(placeholder)).toBe(false);
  });
});

describe(resetMarkPlaceholder, () => {
  it("should remove the duplicated text from the sample DOM", () => {
    const placeholder = renderBrokenBlock();

    expect(resetMarkPlaceholder(placeholder)).toBe(true);
    expect(placeholder.textContent).toBe(ZWNBSP);
    expect(visibleText()).toBe("大変だ体現");
  });

  it("should report no change when the placeholder is already clean", () => {
    const placeholder = renderBrokenBlock();
    resetMarkPlaceholder(placeholder);

    expect(resetMarkPlaceholder(placeholder)).toBe(false);
  });

  it("should keep the existing text node so React's reference stays valid", () => {
    const placeholder = renderBrokenBlock();
    const textNode = placeholder.firstChild;

    resetMarkPlaceholder(placeholder);

    expect(placeholder.firstChild).toBe(textNode);
    expect(placeholder.childNodes).toHaveLength(1);
  });

  it("should drop extra nodes the IME appended next to the text node", () => {
    const placeholder = renderBrokenBlock();
    placeholder.append(document.createElement("br"), document.createTextNode("ゴミ"));

    resetMarkPlaceholder(placeholder);

    expect(placeholder.childNodes).toHaveLength(1);
    expect(placeholder.textContent).toBe(ZWNBSP);
  });

  it("should keep the caret inside the placeholder instead of losing the selection", () => {
    const placeholder = renderBrokenBlock();
    const textNode = textNodeOf(placeholder);
    const selection = currentSelection();
    selection.collapse(textNode, 3);

    resetMarkPlaceholder(placeholder);

    expect(selection.anchorNode).toBe(textNode);
    expect(selection.anchorOffset).toBe(ZWNBSP.length);
  });
});

describe(cleanupMarkPlaceholders, () => {
  it("should fix every placeholder and report how many were touched", () => {
    renderBrokenBlock();
    const second = document.createElement("span");
    second.dataset["slateMarkPlaceholder"] = "true";
    second.textContent = `${ZWNBSP}もう一つ`;
    document.body.append(second);

    expect(cleanupMarkPlaceholders()).toBe(2);
    expect(visibleText()).toBe("大変だ体現");
  });

  it("should report zero when there is nothing to clean", () => {
    renderBrokenBlock();
    cleanupMarkPlaceholders();

    expect(cleanupMarkPlaceholders()).toBe(0);
  });

  it("should leave committed Slate text alone", () => {
    renderBrokenBlock();

    cleanupMarkPlaceholders();

    expect(document.querySelector("[data-slate-string]")?.textContent).toBe("大変だ体現");
  });
});

describe(createPlaceholderGuard, () => {
  let guard: ReturnType<typeof createPlaceholderGuard> | null = null;

  afterEach(() => {
    guard?.stop();
    guard = null;
  });

  it("should clean up residue that appears after composition ended", async () => {
    const placeholder = renderBrokenBlock();
    placeholder.textContent = ZWNBSP;
    guard = createPlaceholderGuard({ isComposing: () => false });
    guard.start();

    // Slate re-renders and writes the committed text back into the placeholder.
    placeholder.textContent = `${ZWNBSP}だ体現`;
    await flushMutations();

    expect(placeholder.textContent).toBe(ZWNBSP);
    expect(visibleText()).toBe("大変だ体現");
  });

  it("should not touch the placeholder while the IME is composing", async () => {
    const placeholder = renderBrokenBlock();
    placeholder.textContent = ZWNBSP;
    guard = createPlaceholderGuard({ isComposing: () => true });
    guard.start();

    placeholder.textContent = `${ZWNBSP}へんかんちゅう`;
    await flushMutations();

    expect(placeholder.textContent).toBe(`${ZWNBSP}へんかんちゅう`);
  });

  it("should repair residue that already exists when start() is called", () => {
    // The extension can load into a page that is already showing the duplicate,
    // and no mutation will follow to trigger the observer.
    const placeholder = renderBrokenBlock();
    guard = createPlaceholderGuard({ isComposing: () => false });

    guard.start();

    expect(placeholder.textContent).toBe(ZWNBSP);
    expect(visibleText()).toBe("大変だ体現");
  });

  it("should leave an existing placeholder alone if the IME is composing at start()", () => {
    const placeholder = renderBrokenBlock();
    guard = createPlaceholderGuard({ isComposing: () => true });

    guard.start();

    expect(placeholder.textContent).toBe(`${ZWNBSP}だ体現`);
  });

  it("should catch placeholders added to the DOM after start()", async () => {
    guard = createPlaceholderGuard({ isComposing: () => false });
    guard.start();

    const placeholder = renderBrokenBlock();
    await flushMutations();

    expect(placeholder.textContent).toBe(ZWNBSP);
  });

  it("should keep working across repeated composition cycles", async () => {
    const placeholder = renderBrokenBlock();
    placeholder.textContent = ZWNBSP;
    let composing = true;
    guard = createPlaceholderGuard({ isComposing: () => composing });
    guard.start();

    for (const text of ["いち", "に", "さん"]) {
      composing = true;
      placeholder.textContent = `${ZWNBSP}${text}`;
      await flushMutations();
      expect(placeholder.textContent).toBe(`${ZWNBSP}${text}`);

      composing = false;
      guard.flush();
      expect(placeholder.textContent).toBe(ZWNBSP);
    }
  });

  it("should stop observing after stop()", async () => {
    const placeholder = renderBrokenBlock();
    placeholder.textContent = ZWNBSP;
    guard = createPlaceholderGuard({ isComposing: () => false });
    guard.start();
    guard.stop();

    placeholder.textContent = `${ZWNBSP}のこる`;
    await flushMutations();

    expect(placeholder.textContent).toBe(`${ZWNBSP}のこる`);
  });

  it("should be safe to start twice", async () => {
    const placeholder = renderBrokenBlock();
    placeholder.textContent = ZWNBSP;
    guard = createPlaceholderGuard({ isComposing: () => false });
    guard.start();
    guard.start();

    placeholder.textContent = `${ZWNBSP}だ体現`;
    await flushMutations();

    expect(placeholder.textContent).toBe(ZWNBSP);
  });
});
