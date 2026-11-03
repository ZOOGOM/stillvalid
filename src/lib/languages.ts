export const resultLanguages = [
  "en",
  "zh",
  "es",
  "fr",
  "de",
  "ja",
  "ko",
  "pt",
  "ar",
  "ru",
] as const;

export type ResultLang = (typeof resultLanguages)[number];

export function isResultLang(value: unknown): value is ResultLang {
  return (
    typeof value === "string" &&
    (resultLanguages as readonly string[]).includes(value)
  );
}

export const resultLanguageOptions: Array<{
  code: ResultLang;
  nativeName: string;
  englishName: string;
}> = [
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "zh", nativeName: "简体中文", englishName: "Simplified Chinese" },
  { code: "es", nativeName: "Español", englishName: "Spanish" },
  { code: "fr", nativeName: "Français", englishName: "French" },
  { code: "de", nativeName: "Deutsch", englishName: "German" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese" },
  { code: "ko", nativeName: "한국어", englishName: "Korean" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese" },
  { code: "ar", nativeName: "العربية", englishName: "Arabic" },
  { code: "ru", nativeName: "Русский", englishName: "Russian" },
];

export function resultDirection(lang: ResultLang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function resultLocale(lang: ResultLang): string {
  return lang === "zh" ? "zh-CN" : lang === "pt" ? "pt-BR" : lang;
}
