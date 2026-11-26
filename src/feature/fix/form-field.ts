// Composing form-field guard.
//
// While a plain form field is composing, the field belongs to the IME. Slite
// breaks that in two places, and each one duplicates or breaks the text:
//
// - Keys. Slite's form fields (a database row title, for one) blur themselves
//   on Enter without asking whether that Enter is the one committing an IME
//   conversion. Blurring mid-composition makes the browser commit the text
//   itself, and the IME then sends its own commit on top: the row title ends
//   up as `テストテスト`. A key pressed while composing is therefore stopped in
//   the capture phase on `document`, before any page handler sees it. The
//   default action is left alone; the browser and the IME still commit
//   normally.
//
// - Value writes. Slite's search page renders its input from the URL's `q`,
//   and the URL state reaches the page's store only in a layout effect after
//   the route renders. Each keystroke therefore commits the previous `q` into
//   the input first and the new one a moment later. Outside composition that
//   at most moves the caret to the end; during composition the stale write
//   ends the conversion, so `koudo` becomes `kおうdおう`. Slite's other
//   URL-driven search fields (channels, user groups, members in settings)
//   follow the same pattern. Writes from the page are dropped until
//   `compositionend`; the browser's own composition updates do not go through
//   the setter and are not affected.

export interface FormFieldGuard {
  start: () => void;
  stop: () => void;
}

type FormField = HTMLInputElement | HTMLTextAreaElement;

/**
 * The `value` property each guarded field had of its own before the guard,
 * `undefined` when it had none. React DOM keeps its value tracker there.
 */
type OwnValues = WeakMap<FormField, PropertyDescriptor | undefined>;

// Only plain form fields: the Slate editor keeps its own composition state,
// reads composing keydowns to keep it in sync, and is a contenteditable with
// no value.
function isFormField(target: EventTarget | null): target is FormField {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function shieldKeydown(event: KeyboardEvent): void {
  if (event.isComposing && isFormField(event.target)) {
    event.stopImmediatePropagation();
  }
}

function guardValue(ownValues: OwnValues, field: FormField): void {
  if (ownValues.has(field)) {
    return;
  }
  const own = Object.getOwnPropertyDescriptor(field, "value");
  const reader = own ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value");
  ownValues.set(field, own);
  Object.defineProperty(field, "value", {
    configurable: true,
    get: () => reader?.get?.call(field),
    set: () => {
      // Dropped: the IME owns the value until the conversion is committed.
    },
  });
}

function releaseValue(ownValues: OwnValues, field: FormField): void {
  if (!ownValues.has(field)) {
    return;
  }
  const own = ownValues.get(field);
  ownValues.delete(field);
  if (own === undefined) {
    Reflect.deleteProperty(field, "value");
  } else {
    Object.defineProperty(field, "value", own);
  }
}

export function createFormFieldGuard(root: Document = document): FormFieldGuard {
  const ownValues: OwnValues = new WeakMap();

  function handleCompositionStart(event: Event): void {
    if (isFormField(event.target)) {
      guardValue(ownValues, event.target);
    }
  }

  function handleRelease(event: Event): void {
    if (isFormField(event.target)) {
      releaseValue(ownValues, event.target);
    }
  }

  // Chrome ends a composition without `compositionend` when the field moves in
  // the DOM, but it still fires `focusout`.
  const releaseEvents = ["compositionend", "focusout"] as const;

  return {
    start: () => {
      root.addEventListener("keydown", shieldKeydown, true);
      root.addEventListener("compositionstart", handleCompositionStart, true);
      for (const type of releaseEvents) {
        root.addEventListener(type, handleRelease, true);
      }
    },
    stop: () => {
      root.removeEventListener("keydown", shieldKeydown, true);
      root.removeEventListener("compositionstart", handleCompositionStart, true);
      for (const type of releaseEvents) {
        root.removeEventListener(type, handleRelease, true);
      }
    },
  };
}
