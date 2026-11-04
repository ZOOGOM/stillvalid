import type { ResultLang } from "./languages";

// Fixed messages only: no URLs, server response bodies or network details.
const warnings: Record<
  ResultLang,
  Record<
    "format" | "size" | "blocked" | "missing" | "timeout" | "technical",
    string
  >
> = {
  ko: {
    format: "이 자료의 형식이나 문자 인코딩은 지원하지 않아요.",
    size: "자료가 너무 커서 전체 내용을 확인할 수 없어요.",
    blocked: "출처에서 접근을 차단했어요.",
    missing: "해당 출처 페이지를 찾을 수 없어요.",
    timeout: "출처 응답 시간이 초과됐어요.",
    technical: "이 주소는 공고가 아닌 기술 파일이에요.",
  },
  en: {
    format: "The source format or text encoding is not supported.",
    size: "The source is too large to check in full.",
    blocked: "The source blocked access.",
    missing: "The source page could not be found.",
    timeout: "The source did not respond in time.",
    technical: "This address points to a technical file, not a notice.",
  },
  zh: {
    format: "不支持该来源的格式或文字编码。",
    size: "来源过大，无法完整核查。",
    blocked: "该来源拒绝了访问。",
    missing: "找不到来源页面。",
    timeout: "来源响应超时。",
    technical: "此地址指向技术文件，而非公告。",
  },
  es: {
    format: "No se admite el formato o la codificación de la fuente.",
    size: "La fuente es demasiado grande para revisarla completa.",
    blocked: "La fuente bloqueó el acceso.",
    missing: "No se encontró la página de la fuente.",
    timeout: "La fuente tardó demasiado en responder.",
    technical: "Esta dirección apunta a un archivo técnico, no a un aviso.",
  },
  fr: {
    format: "Le format ou l’encodage de la source n’est pas pris en charge.",
    size: "La source est trop volumineuse pour être vérifiée en entier.",
    blocked: "La source a bloqué l’accès.",
    missing: "La page de la source est introuvable.",
    timeout: "La source n’a pas répondu à temps.",
    technical: "Cette adresse désigne un fichier technique, pas une annonce.",
  },
  de: {
    format:
      "Das Format oder die Zeichenkodierung der Quelle wird nicht unterstützt.",
    size: "Die Quelle ist für eine vollständige Prüfung zu groß.",
    blocked: "Die Quelle hat den Zugriff blockiert.",
    missing: "Die Quellseite wurde nicht gefunden.",
    timeout: "Die Quelle hat nicht rechtzeitig geantwortet.",
    technical:
      "Diese Adresse verweist auf eine technische Datei, nicht auf eine Mitteilung.",
  },
  ja: {
    format: "この資料の形式または文字コードには対応していません。",
    size: "資料が大きすぎるため、全体を確認できません。",
    blocked: "出典がアクセスを拒否しました。",
    missing: "出典ページが見つかりません。",
    timeout: "出典の応答がタイムアウトしました。",
    technical: "このアドレスはお知らせではなく技術ファイルを指しています。",
  },
  pt: {
    format: "O formato ou a codificação da fonte não é compatível.",
    size: "A fonte é grande demais para ser verificada por completo.",
    blocked: "A fonte bloqueou o acesso.",
    missing: "A página da fonte não foi encontrada.",
    timeout: "A fonte não respondeu a tempo.",
    technical:
      "Este endereço aponta para um arquivo técnico, não para um aviso.",
  },
  ar: {
    format: "تنسيق المصدر أو ترميز النص غير مدعوم.",
    size: "المصدر كبير جدًا بحيث يتعذر التحقق منه بالكامل.",
    blocked: "حظر المصدر الوصول.",
    missing: "لم يُعثر على صفحة المصدر.",
    timeout: "لم يستجب المصدر في الوقت المحدد.",
    technical: "يشير هذا العنوان إلى ملف تقني وليس إعلانًا.",
  },
  ru: {
    format: "Формат или кодировка источника не поддерживается.",
    size: "Источник слишком велик для полной проверки.",
    blocked: "Источник заблокировал доступ.",
    missing: "Страница источника не найдена.",
    timeout: "Источник не ответил вовремя.",
    technical: "Этот адрес ведёт к техническому файлу, а не к объявлению.",
  },
};
const categories: Record<string, keyof (typeof warnings)["en"]> = {
  source_format: "format",
  source_encoding: "format",
  source_too_large: "size",
  source_blocked: "blocked",
  source_not_found: "missing",
  source_timeout: "timeout",
  source_not_notice: "technical",
};
export function sourceWarningText(
  code: string,
  lang: ResultLang,
): string | undefined {
  const category = categories[code];
  return category ? warnings[lang][category] : undefined;
}
