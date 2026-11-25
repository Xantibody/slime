// Composing-keydown shield.
//
// Slite's form fields (a database row title, for one) blur themselves on Enter
// without asking whether that Enter is the one committing an IME conversion.
// Blurring mid-composition makes the browser commit the text itself, and the
// IME then sends its own commit on top: the row title ends up as `テストテスト`.
//
// A key pressed while composing belongs to the IME, so it is stopped in the
// capture phase on `document`, before any page handler sees it. The default
// action is left alone; the browser and the IME still commit normally.

export interface ComposingKeyShield {
  start: () => void;
  stop: () => void;
}

// Only plain form fields: the Slate editor keeps its own composition state and
// reads composing keydowns to keep it in sync.
function isFormField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function shieldKeydown(event: KeyboardEvent): void {
  if (event.isComposing && isFormField(event.target)) {
    event.stopImmediatePropagation();
  }
}

export function createComposingKeyShield(root: Document = document): ComposingKeyShield {
  return {
    start: () => {
      root.addEventListener("keydown", shieldKeydown, true);
    },
    stop: () => {
      root.removeEventListener("keydown", shieldKeydown, true);
    },
  };
}
