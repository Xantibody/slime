// Slite Japanese IME Fix - Core Logic

/** The subset of the Slate editor instance this extension touches. */
export interface SlateEditor {
  marks: Record<string, unknown> | null;
}

export type EditorGetter = () => SlateEditor | null;

interface IMEFixState {
  readonly savedMarks: Record<string, unknown> | null;
  readonly isComposing: boolean;
}

export interface IMEFix {
  handleCompositionStart: () => void;
  handleCompositionEnd: () => void;
  getState: () => IMEFixState;
}

export function createIMEFix(getEditorFn: EditorGetter): IMEFix {
  let savedMarks: Record<string, unknown> | null = null;
  let isComposing = false;

  // The composition flag is tracked even when the editor cannot be reached:
  // the placeholder guard relies on it to know when text inside a placeholder
  // is legitimate, and that must stay correct regardless of Slate's internals.
  function handleCompositionStart(): void {
    isComposing = true;

    const editor = getEditorFn();
    if (!editor) {
      return;
    }

    savedMarks = editor.marks;
    editor.marks = null;
  }

  function handleCompositionEnd(): void {
    isComposing = false;

    const editor = getEditorFn();
    if (!editor) {
      return;
    }

    if (savedMarks !== null) {
      editor.marks = savedMarks;
      savedMarks = null;
    }
  }

  function getState(): IMEFixState {
    return { savedMarks, isComposing };
  }

  return {
    handleCompositionStart,
    handleCompositionEnd,
    getState,
  };
}

/** A `WeakRef`-like holder, as used by Slate's internal editor registry. */
export interface EditorRefEntry {
  ref?: { deref?: () => SlateEditor | undefined } | undefined;
}

export function getEditorFromRefs(
  editorRefs: ReadonlySet<EditorRefEntry> | null | undefined,
): SlateEditor | null {
  if (!editorRefs || editorRefs.size === 0) {
    return null;
  }

  const [entry] = [...editorRefs];
  if (entry === undefined) {
    return null;
  }

  const { ref } = entry;
  if (!ref || typeof ref.deref !== "function") {
    return null;
  }

  return ref.deref() ?? null;
}
