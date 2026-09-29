// Minimal cross-browser (Chrome / Firefox) extension API surface.
//
// Why not the vendor typings: `chrome.*` and `browser.*` are structurally
// incompatible in their callback flavours, so a hand-rolled subset is the only
// way to keep one code path for both browsers under strict typing.

export const EMACS_KEYBIND_TOGGLE = "EMACS_KEYBIND_TOGGLE";
export const EMACS_KEYBIND_STORAGE_KEY = "emacsKeybindEnabled";

export interface EmacsKeybindToggleMessage {
  readonly type: typeof EMACS_KEYBIND_TOGGLE;
  readonly enabled: boolean;
}

interface ExtensionTab {
  readonly id?: number | undefined;
}

export interface ExtensionApi {
  readonly runtime: {
    readonly getURL: (path: string) => string;
    readonly onMessage: {
      readonly addListener: (callback: (message: unknown) => void) => void;
    };
  };
  readonly storage: {
    readonly local: {
      readonly get: (key: string) => Promise<Record<string, unknown>>;
      readonly set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
  readonly tabs: {
    readonly query: (queryInfo: {
      active: boolean;
      currentWindow: boolean;
    }) => Promise<ExtensionTab[]>;
    readonly sendMessage: (tabId: number, message: unknown) => Promise<unknown>;
  };
}

interface ExtensionGlobal {
  browser?: ExtensionApi;
  chrome?: ExtensionApi;
}

export function getExtensionApi(): ExtensionApi {
  const extensionGlobal = globalThis as unknown as ExtensionGlobal;
  const api = extensionGlobal.browser ?? extensionGlobal.chrome;
  if (api === undefined) {
    throw new Error("No extension API available (neither `browser` nor `chrome`)");
  }

  return api;
}

export function isEmacsKeybindToggle(message: unknown): message is EmacsKeybindToggleMessage {
  if (typeof message !== "object" || message === null) {
    return false;
  }

  const record = message as Record<string, unknown>;

  return record["type"] === EMACS_KEYBIND_TOGGLE && typeof record["enabled"] === "boolean";
}
