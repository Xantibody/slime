import { beforeEach, describe, expect, it } from "vitest";
import { createIMEFix, getEditorFromRefs } from "./editor-marks.ts";
import type { EditorRefEntry, IMEFix, SlateEditor } from "./editor-marks.ts";

describe(createIMEFix, () => {
  let mockEditor: SlateEditor;
  let imeFix: IMEFix;

  beforeEach(() => {
    mockEditor = { marks: { bold: true, italic: true } };
    imeFix = createIMEFix(() => mockEditor);
  });

  describe("handleCompositionStart", () => {
    it("should save marks and set editor.marks to null", () => {
      const originalMarks = mockEditor.marks;

      imeFix.handleCompositionStart();

      expect(mockEditor.marks).toBeNull();
      expect(imeFix.getState().savedMarks).toStrictEqual(originalMarks);
      expect(imeFix.getState().isComposing).toBe(true);
    });

    it("should still record that composition started when the editor is unreachable", () => {
      const nullEditorFix = createIMEFix(() => null);

      nullEditorFix.handleCompositionStart();

      expect(nullEditorFix.getState().isComposing).toBe(true);
      expect(nullEditorFix.getState().savedMarks).toBeNull();
    });
  });

  describe("handleCompositionEnd", () => {
    it("should restore saved marks", () => {
      const originalMarks = mockEditor.marks;

      imeFix.handleCompositionStart();
      expect(mockEditor.marks).toBeNull();

      imeFix.handleCompositionEnd();

      expect(mockEditor.marks).toStrictEqual(originalMarks);
      expect(imeFix.getState().savedMarks).toBeNull();
      expect(imeFix.getState().isComposing).toBe(false);
    });

    it("should do nothing if no saved marks", () => {
      imeFix.handleCompositionEnd();

      expect(mockEditor.marks).toStrictEqual({ bold: true, italic: true });
    });

    it("should clear the composition flag even when the editor is unreachable", () => {
      const nullEditorFix = createIMEFix(() => null);

      nullEditorFix.handleCompositionStart();
      nullEditorFix.handleCompositionEnd();

      expect(nullEditorFix.getState().isComposing).toBe(false);
    });
  });

  describe("full IME composition cycle", () => {
    it("should handle multiple composition cycles", () => {
      const originalMarks = { bold: true };
      mockEditor.marks = originalMarks;

      // First cycle
      imeFix.handleCompositionStart();
      expect(mockEditor.marks).toBeNull();
      imeFix.handleCompositionEnd();
      expect(mockEditor.marks).toStrictEqual(originalMarks);

      // Second cycle with different marks
      mockEditor.marks = { italic: true };
      imeFix.handleCompositionStart();
      expect(mockEditor.marks).toBeNull();
      imeFix.handleCompositionEnd();
      expect(mockEditor.marks).toStrictEqual({ italic: true });
    });
  });
});

describe(getEditorFromRefs, () => {
  it("should return null if editorRefs is null", () => {
    expect(getEditorFromRefs(null)).toBeNull();
  });

  it("should return null if editorRefs is empty", () => {
    expect(getEditorFromRefs(new Set<EditorRefEntry>())).toBeNull();
  });

  it("should return null if ref.deref is not a function", () => {
    expect(getEditorFromRefs(new Set([{ ref: {} }]))).toBeNull();
  });

  it("should return editor from WeakRef", () => {
    const mockEditor: SlateEditor = { marks: {} };
    const refs = new Set([{ ref: { deref: (): SlateEditor => mockEditor } }]);

    expect(getEditorFromRefs(refs)).toBe(mockEditor);
  });

  it("should return null if WeakRef is garbage collected", () => {
    const refs = new Set([{ ref: { deref: (): undefined => undefined } }]);

    expect(getEditorFromRefs(refs)).toBeNull();
  });
});
