// Emacs-style cursor keys (Ctrl+F/B/N/P/A/E), off until the user turns them on.

import { moveCursor } from "./cursor.ts";
import type { CursorMove } from "./cursor.ts";

const KEY_MAP = {
  f: "ArrowRight",
  b: "ArrowLeft",
  n: "ArrowDown",
  p: "ArrowUp",
  a: "Home",
  e: "End",
} as const satisfies Record<string, string>;

type EmacsKey = keyof typeof KEY_MAP;
type MappedKey = (typeof KEY_MAP)[EmacsKey];

const CURSOR_MOVES: Readonly<Record<MappedKey, CursorMove>> = {
  ArrowRight: ["move", "forward", "character"],
  ArrowLeft: ["move", "backward", "character"],
  ArrowDown: ["move", "forward", "line"],
  ArrowUp: ["move", "backward", "line"],
  Home: ["move", "backward", "lineboundary"],
  End: ["move", "forward", "lineboundary"],
};

/** The parts of a `KeyboardEvent` the interception decision depends on. */
export interface KeyEventLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly altKey?: boolean | undefined;
  readonly metaKey?: boolean | undefined;
}

function isEmacsKey(key: string): key is EmacsKey {
  return Object.hasOwn(KEY_MAP, key);
}

export function shouldIntercept(event: KeyEventLike, enabled: boolean): boolean {
  if (!enabled) {
    return false;
  }
  if (!event.ctrlKey) {
    return false;
  }
  if (event.altKey === true || event.metaKey === true) {
    return false;
  }

  return isEmacsKey(event.key);
}

export function mapToKey(key: string): MappedKey | null {
  return isEmacsKey(key) ? KEY_MAP[key] : null;
}

export interface EmacsKeybind {
  start: () => void;
  stop: () => void;
  setEnabled: (enabled: boolean) => void;
}

export function createEmacsKeybind(root: Document = document): EmacsKeybind {
  let enabled = false;

  function handleKeydown(event: KeyboardEvent): void {
    if (!shouldIntercept(event, enabled)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const key = mapToKey(event.key);
    if (key !== null) {
      moveCursor(CURSOR_MOVES[key]);
    }
  }

  return {
    start: () => {
      root.addEventListener("keydown", handleKeydown, true);
    },
    stop: () => {
      root.removeEventListener("keydown", handleKeydown, true);
    },
    setEnabled: (next) => {
      enabled = next;
    },
  };
}
