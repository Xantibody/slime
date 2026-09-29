// Emacs Keybind - Core Logic

const KEY_MAP = {
  f: "ArrowRight",
  b: "ArrowLeft",
  n: "ArrowDown",
  p: "ArrowUp",
  a: "Home",
  e: "End",
} as const satisfies Record<string, string>;

type EmacsKey = keyof typeof KEY_MAP;
export type MappedKey = (typeof KEY_MAP)[EmacsKey];

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
