// Browser-side check driven by agent-browser against e2e/slate-ime-fixture.html.
// Returns a JSON summary so the whole scenario runs in a single `eval`.

function press(key) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true, cancelable: true }),
  );
}

function tick() {
  // oxlint-disable-next-line promise/avoid-new -- there is no promise-based timer in the page context
  return new Promise((resolve) => {
    setTimeout(resolve, 60);
  });
}

(async () => {
  const ZWNBSP = "﻿";
  const placeholder = document.querySelector("#placeholder");
  const editorEl = document.querySelector("#editor");
  const show = (s) => s.replaceAll(ZWNBSP, "[Z]");

  const result = { start: globalThis.visibleText() };

  // --- IME commit -------------------------------------------------------
  globalThis.simulateIme("だ体現");
  result.afterCommitSync = globalThis.visibleText();
  // MutationObserver callbacks run as microtasks, i.e. before the next paint,
  // so this is what the user actually gets to see.
  await Promise.resolve();
  result.afterCommitMicrotask = globalThis.visibleText();
  await tick();
  result.afterCommitSettled = globalThis.visibleText();

  // --- Slate re-rendering a frame later ---------------------------------
  await globalThis.simulateLateRerender("だ体現");
  result.afterLateRerender = globalThis.visibleText();
  result.placeholderAfterRerender = show(placeholder.textContent);

  // --- A second conversion on top of the first --------------------------
  globalThis.simulateIme("です");
  await tick();
  result.afterSecondCommit = globalThis.visibleText();

  result.marksDuringComposition = JSON.stringify(globalThis.marksDuringComposition);
  result.marksAfterComposition = JSON.stringify(globalThis.editorMarks());
  result.placeholderChildNodes = placeholder.childNodes.length;

  // --- Emacs keybindings -------------------------------------------------
  const committed = document.querySelector("[data-slate-string]");
  const selection = document.getSelection();

  // Where the caret sits, not just how far into its node: Ctrl+E crosses into
  // the placeholder span, where a bare offset would be misleading.
  const caret = () => {
    const node = selection.anchorNode;
    const owner = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const label = owner?.id || owner?.dataset?.slateString ? "committed" : (owner?.id ?? "?");

    return `${owner?.id === "placeholder" ? "placeholder" : label}:${selection.anchorOffset}`;
  };

  editorEl.focus();
  selection.collapse(committed.firstChild, 0);

  press("f");
  result.emacsDisabled = caret();

  document.documentElement.dataset.slimeEmacs = "on";
  globalThis.dispatchEvent(new CustomEvent("slime:emacs-keybind"));

  press("f");
  result.emacsForward = caret();
  press("f");
  press("b");
  result.emacsForwardTwiceThenBack = caret();
  press("e");
  result.emacsEnd = caret();
  press("a");
  result.emacsHome = caret();

  press("x");
  result.emacsIgnoresUnmappedKey = caret();

  document.documentElement.dataset.slimeEmacs = "off";
  globalThis.dispatchEvent(new CustomEvent("slime:emacs-keybind"));
  press("f");
  result.emacsAfterToggleOff = caret();

  result.committedText = committed.textContent;

  return JSON.stringify(result, null, 2);
})();
