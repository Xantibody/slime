// Slate mark-placeholder repair.
//
// Slate renders a `data-slate-mark-placeholder` span to show where pending
// marks (bold, italic, …) will apply. It declares `data-slate-length="0"`, so
// the only content it may ever hold is a single zero-width character. During
// IME composition the browser writes the composing text straight into that
// span, and on commit Slate inserts the text as a real leaf while the
// placeholder keeps its copy — the user then sees 「大変だ体現だ体現」.
//
// Clearing marks on `compositionstart` is not enough on its own: a placeholder
// that was already rendered stays in the DOM, and React can write the committed
// text back into it a frame or more after `compositionend`. So the invariant
// (length 0 => content is exactly ZWNBSP) is enforced continuously instead.

/** Zero-width no-break space (used by Slate as placeholder content) */
export const ZWNBSP = "﻿";

const MARK_PLACEHOLDER_SELECTOR = "[data-slate-mark-placeholder]";

export function hasResidualText(element: Element): boolean {
  const text = element.textContent;

  return text !== null && text !== "" && text !== ZWNBSP;
}

/**
 * Restore the zero-width-only invariant of a placeholder.
 *
 * The existing text node is reused rather than replaced: Slate and React hold
 * references to it, and swapping it out makes Slate re-read the DOM and
 * reinsert the very text this removes.
 *
 * @param element - a `data-slate-mark-placeholder` span
 * @returns whether the placeholder actually had to be repaired
 */
export function resetMarkPlaceholder(element: Element): boolean {
  if (!hasResidualText(element)) {
    return false;
  }

  const [firstChild] = element.childNodes;
  if (firstChild === undefined || firstChild.nodeType !== Node.TEXT_NODE) {
    element.textContent = ZWNBSP;

    return true;
  }

  while (firstChild.nextSibling !== null) {
    firstChild.nextSibling.remove();
  }

  const textNode = firstChild as Text;
  const selection = document.getSelection();
  const caretWasInside = selection !== null && selection.anchorNode === textNode;

  textNode.data = ZWNBSP;

  if (caretWasInside) {
    // Collapsing to the end of the zero-width character is where Slate itself
    // parks the caret for an empty leaf.
    selection.collapse(textNode, ZWNBSP.length);
  }

  return true;
}

/**
 * Repair every mark placeholder under `root`.
 *
 * @param root - subtree to scan, the whole document by default
 * @returns the number of placeholders that needed repair
 */
export function cleanupMarkPlaceholders(root: ParentNode = document): number {
  let repaired = 0;
  for (const placeholder of root.querySelectorAll(MARK_PLACEHOLDER_SELECTOR)) {
    if (resetMarkPlaceholder(placeholder)) {
      repaired += 1;
    }
  }

  return repaired;
}

export interface PlaceholderGuardOptions {
  /** While the IME is composing, the placeholder legitimately holds text. */
  readonly isComposing: () => boolean;
  readonly root?: Element | Document | undefined;
}

export interface PlaceholderGuard {
  start: () => void;
  stop: () => void;
  /** Repair immediately, ignoring pending mutation records. */
  flush: () => number;
}

/**
 * Watch the document and repair placeholders as soon as text appears in them,
 * which covers the re-renders that happen after `compositionend`.
 *
 * @param options - composition predicate and the subtree to watch
 * @returns the guard's start / stop / flush controls
 */
export function createPlaceholderGuard(options: PlaceholderGuardOptions): PlaceholderGuard {
  const root = options.root ?? document;
  let observer: MutationObserver | null = null;

  function flush(): number {
    const repaired = cleanupMarkPlaceholders(root);
    // Drop the records our own repair just produced, so the callback does not
    // re-enter for changes we made ourselves.
    observer?.takeRecords();

    return repaired;
  }

  function start(): void {
    if (observer !== null) {
      return;
    }

    observer = new MutationObserver(() => {
      if (options.isComposing()) {
        return;
      }
      flush();
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ["data-slate-mark-placeholder"],
    });

    // The page may already be showing a duplicate when the extension loads —
    // nothing would mutate afterwards to wake the observer up.
    if (!options.isComposing()) {
      flush();
    }
  }

  function stop(): void {
    observer?.disconnect();
    observer = null;
  }

  return { start, stop, flush };
}
