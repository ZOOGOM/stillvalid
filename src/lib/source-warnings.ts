import type { ResultLang } from "./languages";

// Fixed messages only: no URLs, server response bodies or network details.
const warnings: Record<
  ResultLang,
  Record<
    | "format"
    | "size"
    | "blocked"
    | "missing"
    | "timeout"
    | "technical"
    | "unrelated"
    | "script"
    | "compare"
    | "scanned",
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
    unrelated: "가져온 출처가 이 공고와 관련 없어 보여 비교하지 않았어요.",
    script:
      "이 페이지는 내용을 스크립트로만 보여줘서 읽을 수 없어요. 공고 본문 페이지의 주소를 입력해 보세요.",
    compare:
      "출처 하나는 분석을 끝내지 못해 비교에서 뺐어요. 나머지 출처로만 판단했어요.",
    scanned:
      "이 PDF는 글자 정보가 없는 스캔 문서라 읽을 수 없어요. 글자를 선택할 수 있는 PDF나 공고 페이지 주소를 입력해 보세요.",
  },
  en: {
    format: "The source format or text encoding is not supported.",
    size: "The source is too large to check in full.",
    blocked: "The source blocked access.",
    missing: "The source page could not be found.",
    timeout: "The source did not respond in time.",
    technical: "This address points to a technical file, not a notice.",
    unrelated:
      "A fetched source did not appear related to this notice, so it was not compared.",
    script:
      "This page shows its content only through scripts, so it could not be read. Try the address of the notice page itself.",
    compare:
      "One source could not be analysed and was left out; the result uses the other sources only.",
    scanned:
      "This PDF is a scan without a text layer, so it can't be read. Try a PDF with selectable text or the notice page link.",
  },
  zh: {
    format: "不支持该来源的格式或文字编码。",
    size: "来源过大，无法完整核查。",
    blocked: "该来源拒绝了访问。",
    missing: "找不到来源页面。",
    timeout: "来源响应超时。",
    technical: "此地址指向技术文件，而非公告。",
    unrelated: "获取的来源似乎与此公告无关，因此未进行比对。",
    script: "此页面仅通过脚本显示内容，无法读取。请尝试公告正文页面的地址。",
    compare: "有一个来源未能完成分析，已排除在比较之外；结果仅基于其他来源。",
    scanned:
      "此 PDF 是没有文字层的扫描件，无法读取。请尝试可选中文字的 PDF 或公告页面链接。",
  },
  es: {
    format: "No se admite el formato o la codificación de la fuente.",
    size: "La fuente es demasiado grande para revisarla completa.",
    blocked: "La fuente bloqueó el acceso.",
    missing: "No se encontró la página de la fuente.",
    timeout: "La fuente tardó demasiado en responder.",
    technical: "Esta dirección apunta a un archivo técnico, no a un aviso.",
    unrelated:
      "Una fuente obtenida no parecía relacionada con este aviso, así que no se comparó.",
    script:
      "Esta página muestra su contenido solo mediante scripts y no se pudo leer. Prueba con la dirección de la página del aviso.",
    compare:
      "No se pudo analizar una fuente y se dejó fuera; el resultado usa solo las demás fuentes.",
    scanned:
      "Este PDF es un escaneo sin capa de texto, así que no se puede leer. Prueba con un PDF con texto seleccionable o el enlace de la página del aviso.",
  },
  fr: {
    format: "Le format ou l’encodage de la source n’est pas pris en charge.",
    size: "La source est trop volumineuse pour être vérifiée en entier.",
    blocked: "La source a bloqué l’accès.",
    missing: "La page de la source est introuvable.",
    timeout: "La source n’a pas répondu à temps.",
    technical: "Cette adresse désigne un fichier technique, pas une annonce.",
    unrelated:
      "Une source récupérée ne semblait pas liée à cette annonce ; elle n’a pas été comparée.",
    script:
      "Cette page n’affiche son contenu qu’au moyen de scripts ; elle n’a pas pu être lue. Essayez l’adresse de la page de l’annonce elle-même.",
    compare:
      "Une source n'a pas pu être analysée et a été écartée ; le résultat repose uniquement sur les autres sources.",
    scanned:
      "Ce PDF est un document numérisé sans couche de texte ; il ne peut pas être lu. Essayez un PDF au texte sélectionnable ou le lien de la page de l'avis.",
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
    unrelated:
      "Eine abgerufene Quelle schien nicht zu dieser Mitteilung zu passen und wurde nicht verglichen.",
    script:
      "Diese Seite zeigt ihren Inhalt nur über Skripte an und konnte nicht gelesen werden. Versuchen Sie die Adresse der Mitteilungsseite selbst.",
    compare:
      "Eine Quelle konnte nicht analysiert werden und wurde ausgelassen; das Ergebnis beruht nur auf den übrigen Quellen.",
    scanned:
      "Dieses PDF ist ein Scan ohne Textebene und kann nicht gelesen werden. Versuchen Sie ein PDF mit markierbarem Text oder den Link zur Bekanntmachungsseite.",
  },
  ja: {
    format: "この資料の形式または文字コードには対応していません。",
    size: "資料が大きすぎるため、全体を確認できません。",
    blocked: "出典がアクセスを拒否しました。",
    missing: "出典ページが見つかりません。",
    timeout: "出典の応答がタイムアウトしました。",
    technical: "このアドレスはお知らせではなく技術ファイルを指しています。",
    unrelated:
      "取得した出典はこのお知らせと関係がないようだったため、比較しませんでした。",
    script:
      "このページはスクリプトでのみ内容を表示するため読み取れませんでした。お知らせ本文のページのアドレスをお試しください。",
    compare:
      "1つの出典は分析を完了できなかったため比較から除外しました。結果は他の出典のみに基づいています。",
    scanned:
      "このPDFは文字情報のないスキャン文書のため読み取れません。文字を選択できるPDFか、お知らせページのリンクをお試しください。",
  },
  pt: {
    format: "O formato ou a codificação da fonte não é compatível.",
    size: "A fonte é grande demais para ser verificada por completo.",
    blocked: "A fonte bloqueou o acesso.",
    missing: "A página da fonte não foi encontrada.",
    timeout: "A fonte não respondeu a tempo.",
    technical:
      "Este endereço aponta para um arquivo técnico, não para um aviso.",
    unrelated:
      "Uma fonte obtida não parecia relacionada a este aviso, então não foi comparada.",
    script:
      "Esta página mostra o conteúdo apenas por scripts e não pôde ser lida. Tente o endereço da própria página do aviso.",
    compare:
      "Não foi possível analisar uma fonte, que ficou de fora; o resultado usa apenas as demais fontes.",
    scanned:
      "Este PDF é uma digitalização sem camada de texto e não pode ser lido. Tente um PDF com texto selecionável ou o link da página do aviso.",
  },
  ar: {
    format: "تنسيق المصدر أو ترميز النص غير مدعوم.",
    size: "المصدر كبير جدًا بحيث يتعذر التحقق منه بالكامل.",
    blocked: "حظر المصدر الوصول.",
    missing: "لم يُعثر على صفحة المصدر.",
    timeout: "لم يستجب المصدر في الوقت المحدد.",
    technical: "يشير هذا العنوان إلى ملف تقني وليس إعلانًا.",
    unrelated:
      "بدا أن أحد المصادر التي جرى جلبها غير مرتبط بهذا الإعلان، لذلك لم تتم مقارنته.",
    script:
      "تعرض هذه الصفحة محتواها عبر البرامج النصية فقط، لذلك تعذّرت قراءتها. جرّب عنوان صفحة الإعلان نفسها.",
    compare:
      "تعذر تحليل أحد المصادر فاستُبعد من المقارنة؛ تعتمد النتيجة على المصادر الأخرى فقط.",
    scanned:
      "ملف PDF هذا صورة ممسوحة بلا طبقة نص، لذا تتعذر قراءته. جرّب ملف PDF بنص قابل للتحديد أو رابط صفحة الإعلان.",
  },
  ru: {
    format: "Формат или кодировка источника не поддерживается.",
    size: "Источник слишком велик для полной проверки.",
    blocked: "Источник заблокировал доступ.",
    missing: "Страница источника не найдена.",
    timeout: "Источник не ответил вовремя.",
    technical: "Этот адрес ведёт к техническому файлу, а не к объявлению.",
    unrelated:
      "Полученный источник, похоже, не связан с этим объявлением, поэтому сравнение не выполнялось.",
    script:
      "Эта страница показывает содержимое только с помощью скриптов, поэтому её не удалось прочитать. Попробуйте адрес самой страницы объявления.",
    compare:
      "Один источник не удалось проанализировать, и он исключён; результат основан только на остальных источниках.",
    scanned:
      "Этот PDF — скан без текстового слоя, его нельзя прочитать. Попробуйте PDF с выделяемым текстом или ссылку на страницу объявления.",
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
  source_unrelated: "unrelated",
  source_script_only: "script",
  source_compare_failed: "compare",
  source_pdf_no_text: "scanned",
};
export function sourceWarningText(
  code: string,
  lang: ResultLang,
): string | undefined {
  const category = categories[code];
  return category ? warnings[lang][category] : undefined;
}
