// Caret movement through the Selection API, so it works in any editable
// element the way the arrow keys would, without synthesising key events.

export type CursorMove = readonly [
  alter: "move",
  direction: "forward" | "backward",
  granularity: "character" | "line" | "lineboundary",
];

export function moveCursor([alter, direction, granularity]: CursorMove): void {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  selection.modify(alter, direction, granularity);
}
