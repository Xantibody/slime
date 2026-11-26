// Locale messages for the manifest - pure functions (no I/O)
//
// AIDEV-NOTE: the messages live here, not in _locales/<lang>/messages.json,
// because configuration files may hold no Japanese (Vale reads them whole).
// The build writes them out as _locales; only dist/ ever holds the JSON.

export const LOCALES = ["en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

interface Message {
  readonly message: string;
  readonly description?: string;
}

type Messages = Readonly<Record<string, Message>>;

const MESSAGES: Readonly<Record<Locale, Messages>> = {
  en: {
    description: {
      message:
        "Stops Japanese text from showing up or being saved twice when you type it in Slite.",
      description: "Manifest description, shown in the browser's extension list and the stores",
    },
  },
  ja: {
    description: {
      message: "Slite で日本語を入力したときに、文字が二重に表示・保存されるのを防ぎます。",
    },
  },
};

export function localeMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}
