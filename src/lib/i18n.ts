import type { Lang } from "./schema";
import { baseCopy, type Copy, type CopyKey } from "./ui-base";
import { resultCopy } from "./result-i18n";
import { zhUiCopy, jaUiCopy } from "./ui-translations-east";
import { esUiCopy, frUiCopy } from "./ui-translations-latin-one";
import { deUiCopy, ptUiCopy } from "./ui-translations-latin-two";
import { arUiCopy, ruUiCopy } from "./ui-translations-other";
import type { UiCopy } from "./ui-types";

const translations: Record<Exclude<Lang, "ko" | "en">, UiCopy> = {
  zh: zhUiCopy,
  es: esUiCopy,
  fr: frUiCopy,
  de: deUiCopy,
  ja: jaUiCopy,
  pt: ptUiCopy,
  ar: arUiCopy,
  ru: ruUiCopy,
};

export function copy(lang: Lang): Copy {
  return lang === "ko" || lang === "en"
    ? baseCopy(lang)
    : { ...translations[lang], ...resultCopy(lang) };
}

export type { CopyKey };

export function errorText(code: string, lang: Lang): string {
  const t = copy(lang);
  return t[("error_" + code) as CopyKey] || t.error_default;
}
