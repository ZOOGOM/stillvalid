import { baseCopy } from "./ui-base";
import type { ResultLang } from "./languages";

// These keys cover the result view, its warnings, and the copied summary.
const resultKeys = [
  "resultEyebrow",
  "status_changed",
  "status_matched",
  "status_cancelled",
  "status_expired",
  "status_review",
  "status_unavailable",
  "desc_changed",
  "desc_matched",
  "desc_cancelled",
  "desc_expired",
  "desc_review",
  "desc_unavailable",
  "originalValue",
  "currentValue",
  "changed",
  "same",
  "uncertain",
  "showEvidence",
  "originalQuote",
  "sourceQuote",
  "noEvidence",
  "key_deadline",
  "key_date",
  "key_location",
  "key_status",
  "key_cost",
  "key_eligibility",
  "nextTitle",
  "nextLive",
  "nextReview",
  "openSource",
  "sourcesTitle",
  "sourceUnverified",
  "sourceRegistered",
  "fetched",
  "checked",
  "synthetic",
  "syntheticDesc",
  "syntheticSource",
  "demoStamp",
  "scope",
  "candidatesTitle",
  "candidatesHint",
  "useCandidate",
  "copy",
  "copied",
  "copyFailed",
  "recheck",
  "newCheck",
  "deleteResult",
  "noComparison",
  "warning_identity",
  "warning_authority",
  "warning_evidence",
  "warning_conflict",
  "warning_partial",
  "warning_search",
  "warning_fetch",
  "warning_network",
  "warning_budget",
  "attemptsTitle",
  "attempt_compared",
  "attempt_fetch_failed",
  "attempt_unrelated",
  "attempt_compare_failed",
  "identity_ok",
  "identity_title",
  "identity_institution",
  "identity_edition",
  "identity_heading",
  "identity_archived",
  "identity_different",
  "identity_quote",
  "identity_country",
  "identity_section",
  "evidenceCount",
  "timingTitle",
  "timing_search",
  "timing_fetch",
  "timing_compare",
  "timing_calls",
  "timing_total",
  "attemptsNote",
  "timing_prepare",
  "timing_extract",
  "timing_extractServer",
  "timing_review",
  "timing_check",
  "openLink",
  "mapSearch",
  "mapNewTab",
  "mapBothSides",
  "mapSearchNote",
] as const;

export type ResultCopyKey = (typeof resultKeys)[number];
type ResultCopy = Record<ResultCopyKey, string>;

// Reuse the established Korean and English wording exactly.
function existingCopy(lang: "ko" | "en"): ResultCopy {
  const source = baseCopy(lang);
  return Object.fromEntries(
    resultKeys.map((key) => [key, source[key]]),
  ) as ResultCopy;
}

const translations: Record<ResultLang, ResultCopy> = {
  ko: existingCopy("ko"),
  en: existingCopy("en"),
  zh: {
    resultEyebrow: "公告核查结果",
    status_changed: "发现了几处变化",
    status_matched: "已核查的内容一致",
    status_cancelled: "已确认有取消公告",
    status_expired: "明确注明的申请截止时间已过",
    status_review: "需要进一步核查",
    status_unavailable: "无法核实来源",
    desc_changed: "这些差异有获取的资料支持。请查看下方证据及原始公告。",
    desc_matched:
      "比较的项目与获取的来源一致，但不能排除其他地方随后发布更新。",
    desc_cancelled: "官方来源明确取消了这一期活动。请打开原文确认取消范围。",
    desc_expired:
      "截止时间明确包含时间和时区。请在原始来源中确认当前申请状态。",
    desc_review:
      "公告是否相同、来源权威性或证据尚不充分。请勿将下方差异视为已确认的变化。",
    desc_unavailable:
      "未找到来源或无法访问。这并不意味着活动已取消或没有变化。",
    originalValue: "您保存的公告",
    currentValue: "获取的资料",
    changed: "有变化",
    same: "一致",
    uncertain: "需要核查",
    showEvidence: "查看依据原文",
    originalQuote: "输入的公告",
    sourceQuote: "获取的来源",
    noEvidence: "无法核实充分的引用依据。",
    key_deadline: "申请截止时间",
    key_date: "活动日期",
    key_location: "地点",
    key_status: "状态",
    key_cost: "费用",
    key_eligibility: "申请对象",
    nextTitle: "下一步",
    nextLive: "打开机构的原始公告，确认申请方式和适用对象。",
    nextReview: "确认机构和期次，然后提供正确的官方链接。",
    openSource: "打开官方来源",
    sourcesTitle: "已核查的来源",
    sourceUnverified: "与机构的官方关系未经独立验证",
    sourceRegistered: "已登记的机构域名 · 公告是否相同需另行核查",
    fetched: "获取时间",
    checked: "核查时间",
    synthetic: "合成示例",
    syntheticDesc:
      "此处比较的是虚构公告和虚构更新，未调用 Meta API，也未实时查询网页。",
    syntheticSource: "虚构来源 · 非真实网页",
    demoStamp: "示例资料",
    scope: "结果仅涵盖核查的来源和时间。原始日期、名称和地址均予以保留。",
    candidatesTitle: "其他候选来源",
    candidatesHint:
      "请先确认候选来源是否为同一公告，再选择链接重新核查。候选来源不一定是经过验证的官方来源。",
    useCandidate: "使用此链接重新核查",
    copy: "复制结果摘要",
    copied: "已复制",
    copyFailed: "复制失败，请检查浏览器权限。",
    recheck: "重新查询并核查",
    newCheck: "核查另一则公告",
    deleteResult: "删除此结果",
    noComparison:
      "目前没有证据支持的比较项目。请补充官方链接或更清晰的公告内容。",
    warning_identity: "无法确认机构、地点、年份或期次是否相同。",
    warning_authority: "未独立验证该来源与机构的官方关系。",
    warning_evidence: "部分值或引文与所提供的来源原文不符。",
    warning_conflict: "不同来源对同一项目给出了不同的值。",
    warning_partial: "并未核实原始公告中的所有内容。",
    warning_search: "搜索未完成，因此核查范围有限。",
    warning_fetch: "部分资料无法获取，因此核查范围有限。",
    warning_network: "当前网络无法访问来源网页。",
    warning_budget: "已达到今日可用的请求额度。",
    attemptsTitle: "各来源的核查情况",
    attempt_compared: "已比较",
    attempt_fetch_failed: "无法读取",
    attempt_unrelated: "与此公告无关，未比较",
    attempt_compare_failed: "分析未完成",
    identity_ok: "已确认为同一公告",
    identity_title: "来源文本中没有逐字出现公告标题（空格和附加字也算差异）",
    identity_institution: "发布机构未确认或不一致",
    identity_edition: "届次或年份未确认或不一致",
    identity_heading: "页面标题指向其他公告或文章",
    identity_archived: "页面注明已归档、结束或撤回",
    identity_different: "被判断为另一则公告",
    identity_quote: "用于确认身份的引文与来源原文不完全一致",
    identity_country: "国家不同",
    identity_section: "部分数值来自其他活动或届次的部分，已排除",
    evidenceCount: "已确认引文：{n}/{m}",
    timingTitle: "处理时间",
    timing_search: "搜索",
    timing_fetch: "获取资料",
    timing_compare: "比较",
    timing_calls: "模型调用 {n} 次",
    timing_total: "服务器合计",
    attemptsNote: "各来源的具体问题已在“各来源的核查情况”中分别列出。",
    timing_prepare: "照片准备",
    timing_extract: "读取（整个请求）",
    timing_extractServer: "读取（服务器）",
    timing_review: "您的核对",
    timing_check: "核查请求（整体）",
    openLink: "打开链接",
    mapSearch: "在 Google 地图中搜索",
    mapNewTab: "在新窗口中打开",
    mapBothSides: "您保存的公告与查到资料中的同一地点",
    mapSearchNote:
      "地图搜索会把这段地点文字发送到 Google 地图供您查找，并不表示地点或来源已得到确认。",
  },
  es: {
    resultEyebrow: "Resultado de la comprobación",
    status_changed: "Encontramos algunos cambios",
    status_matched: "Los datos comprobados coinciden",
    status_cancelled: "Se ha documentado una cancelación",
    status_expired: "El plazo explícito ha vencido",
    status_review: "Hace falta revisar de nuevo",
    status_unavailable: "No pudimos verificar las fuentes",
    desc_changed:
      "Estas diferencias están respaldadas por el material obtenido. Revisa las pruebas y el aviso original a continuación.",
    desc_matched:
      "Los campos comparados coinciden con la fuente consultada. Esto no descarta una actualización posterior en otro lugar.",
    desc_cancelled:
      "Una fuente oficial cancela expresamente esta edición. Ábrela para comprobar el alcance de la cancelación.",
    desc_expired:
      "El plazo incluye una hora y zona horaria explícitas. Consulta la fuente original para conocer el estado actual de la solicitud.",
    desc_review:
      "La identidad del aviso, la autoridad de la fuente o las pruebas son insuficientes. No consideres confirmadas las diferencias siguientes.",
    desc_unavailable:
      "No se encontró la fuente o no se pudo acceder a ella. Esto no significa que el evento se haya cancelado o no haya cambiado.",
    originalValue: "Tu aviso guardado",
    currentValue: "Material consultado",
    changed: "Cambió",
    same: "Coincide",
    uncertain: "Requiere revisión",
    showEvidence: "Ver el texto de respaldo",
    originalQuote: "Tu aviso",
    sourceQuote: "Fuente consultada",
    noEvidence: "No pudimos verificar una cita de respaldo suficiente.",
    key_deadline: "Plazo de solicitud",
    key_date: "Fecha del evento",
    key_location: "Lugar",
    key_status: "Estado",
    key_cost: "Coste",
    key_eligibility: "Quién puede solicitarlo",
    nextTitle: "Siguiente paso",
    nextLive:
      "Abre el aviso original de la institución para confirmar cómo solicitarlo y a quién se aplica.",
    nextReview:
      "Confirma la institución y la edición y proporciona el enlace oficial correcto.",
    openSource: "Abrir fuente oficial",
    sourcesTitle: "Fuentes consultadas",
    sourceUnverified: "Relación oficial no verificada de forma independiente",
    sourceRegistered:
      "Dominio registrado de la institución · identidad del aviso comprobada por separado",
    fetched: "Consulta",
    checked: "Comprobación",
    synthetic: "Ejemplo sintético",
    syntheticDesc:
      "Se compara un aviso ficticio con una actualización ficticia. No se llamó a la API de Meta ni se consultó la web en directo.",
    syntheticSource: "Fuente ficticia · no es una página real",
    demoStamp: "Material de ejemplo",
    scope:
      "Los resultados solo abarcan las fuentes y el momento de la consulta. Se conservan las fechas, nombres y direcciones originales.",
    candidatesTitle: "Otras fuentes candidatas",
    candidatesHint:
      "Revisa si corresponden al mismo aviso y elige un enlace para comprobarlo de nuevo. Una fuente candidata no es necesariamente una fuente oficial verificada.",
    useCandidate: "Comprobar con este enlace",
    copy: "Copiar resumen",
    copied: "Copiado",
    copyFailed: "No se pudo copiar. Comprueba los permisos del navegador.",
    recheck: "Realizar una nueva comprobación",
    newCheck: "Comprobar otro aviso",
    deleteResult: "Eliminar este resultado",
    noComparison:
      "Aún no hay comparaciones respaldadas por pruebas. Añade una URL oficial o un texto más claro del aviso.",
    warning_identity:
      "No se pudo confirmar que coincidan la institución, el lugar, el año o la edición.",
    warning_authority:
      "No se verificó de forma independiente la relación oficial entre la fuente y la institución.",
    warning_evidence:
      "Algunos valores o citas no coinciden con el texto de la fuente proporcionada.",
    warning_conflict: "Las fuentes discrepan sobre el mismo campo.",
    warning_partial: "No se verificaron todos los datos del aviso original.",
    warning_search:
      "La búsqueda no terminó, por lo que la comprobación tiene un alcance limitado.",
    warning_fetch:
      "No se pudieron obtener algunos materiales, por lo que la cobertura es limitada.",
    warning_network:
      "La red actual no permite acceder a las páginas de las fuentes.",
    warning_budget: "Se ha alcanzado el límite de solicitudes de hoy.",
    attemptsTitle: "Qué pasó con cada fuente",
    attempt_compared: "Comparada",
    attempt_fetch_failed: "No se pudo leer",
    attempt_unrelated: "No relacionada con este aviso; no se comparó",
    attempt_compare_failed: "El análisis no terminó",
    identity_ok: "Se confirmó que es el mismo aviso",
    identity_title:
      "El título del aviso no aparece letra por letra en el texto de la fuente (los espacios y las palabras añadidas cuentan)",
    identity_institution: "La institución emisora no se confirmó o es distinta",
    identity_edition: "La edición o el año no se confirmaron o son distintos",
    identity_heading:
      "El título de la página se refiere a otro aviso o artículo",
    identity_archived:
      "La página indica que está archivada, finalizada o retirada",
    identity_different: "Se consideró un aviso distinto",
    identity_quote:
      "La cita de identificación no coincide exactamente con el texto de la fuente",
    identity_country: "El país es distinto",
    identity_section:
      "Algunos valores procedían de la sección de otro evento o edición y se excluyeron",
    evidenceCount: "Citas confirmadas: {n} de {m}",
    timingTitle: "Tiempo de procesamiento",
    timing_search: "Búsqueda",
    timing_fetch: "Obtención",
    timing_compare: "Comparación",
    timing_calls: "{n} llamadas al modelo",
    timing_total: "Total del servidor",
    attemptsNote:
      "Los problemas de cada fuente se muestran por separado en «Qué pasó con cada fuente».",
    timing_prepare: "Preparación de la foto",
    timing_extract: "Lectura (solicitud completa)",
    timing_extractServer: "Lectura (servidor)",
    timing_review: "Tu revisión",
    timing_check: "Solicitud de comprobación (completa)",
    openLink: "Abrir enlace",
    mapSearch: "Buscar en Google Maps",
    mapNewTab: "se abre en una pestaña nueva",
    mapBothSides: "El mismo lugar en tu aviso y en el material consultado",
    mapSearchNote:
      "La búsqueda en el mapa envía este texto del lugar a Google Maps para que lo busques. No significa que el lugar ni la fuente estén confirmados.",
  },
  fr: {
    resultEyebrow: "Résultat de la vérification",
    status_changed: "Nous avons trouvé des changements",
    status_matched: "Les éléments vérifiés correspondent",
    status_cancelled: "Une annulation est documentée",
    status_expired: "La date limite explicite est passée",
    status_review: "Une nouvelle vérification est nécessaire",
    status_unavailable: "Nous n’avons pas pu vérifier les sources",
    desc_changed:
      "Ces différences sont étayées par les documents consultés. Examinez les preuves et l’avis original ci-dessous.",
    desc_matched:
      "Les éléments comparés correspondent à la source consultée. Une mise à jour ultérieure ailleurs reste possible.",
    desc_cancelled:
      "Une source officielle annule explicitement cette édition. Ouvrez-la pour vérifier la portée de l’annulation.",
    desc_expired:
      "La date limite précise une heure et un fuseau horaire. Consultez la source originale pour connaître l’état actuel des inscriptions.",
    desc_review:
      "L’identité de l’avis, l’autorité de la source ou les preuves sont insuffisantes. Ne considérez pas les différences ci-dessous comme confirmées.",
    desc_unavailable:
      "La source est introuvable ou inaccessible. Cela ne signifie pas que l’événement a été annulé ou qu’il est inchangé.",
    originalValue: "Votre avis enregistré",
    currentValue: "Document consulté",
    changed: "Modifié",
    same: "Correspond",
    uncertain: "À vérifier",
    showEvidence: "Voir le texte justificatif",
    originalQuote: "Votre avis",
    sourceQuote: "Source consultée",
    noEvidence:
      "Nous n’avons pas pu vérifier une citation suffisamment probante.",
    key_deadline: "Date limite de candidature",
    key_date: "Date de l’événement",
    key_location: "Lieu",
    key_status: "Statut",
    key_cost: "Coût",
    key_eligibility: "Personnes admissibles",
    nextTitle: "Prochaine étape",
    nextLive:
      "Ouvrez l’avis original de l’organisme pour vérifier les modalités et les personnes concernées.",
    nextReview:
      "Confirmez l’organisme et l’édition, puis fournissez le lien officiel correct.",
    openSource: "Ouvrir la source officielle",
    sourcesTitle: "Sources consultées",
    sourceUnverified: "Lien officiel non vérifié indépendamment",
    sourceRegistered:
      "Domaine enregistré de l’organisme · identité de l’avis vérifiée séparément",
    fetched: "Consultation",
    checked: "Vérification",
    synthetic: "Exemple synthétique",
    syntheticDesc:
      "Cet exemple compare un avis fictif à une mise à jour fictive. Aucun appel à l’API Meta ni aucune recherche Web en direct n’a été effectué.",
    syntheticSource: "Source fictive · page non réelle",
    demoStamp: "Document d’exemple",
    scope:
      "Les résultats portent uniquement sur les sources et le moment de la vérification. Les dates, noms et adresses d’origine sont conservés.",
    candidatesTitle: "Autres sources possibles",
    candidatesHint:
      "Vérifiez qu’elles concernent le même avis, puis choisissez un lien pour relancer la vérification. Une source proposée n’est pas nécessairement une source officielle vérifiée.",
    useCandidate: "Vérifier avec ce lien",
    copy: "Copier le résumé",
    copied: "Copié",
    copyFailed: "Échec de la copie. Vérifiez les autorisations du navigateur.",
    recheck: "Relancer la vérification",
    newCheck: "Vérifier un autre avis",
    deleteResult: "Supprimer ce résultat",
    noComparison:
      "Aucune comparaison étayée n’est disponible. Ajoutez une URL officielle ou un texte d’avis plus clair.",
    warning_identity:
      "L’organisme, le lieu, l’année ou l’édition n’ont pas pu être rapprochés avec certitude.",
    warning_authority:
      "Le lien officiel entre la source et l’organisme n’a pas été vérifié indépendamment.",
    warning_evidence:
      "Certaines valeurs ou citations ne correspondent pas au texte de la source fournie.",
    warning_conflict:
      "Les sources donnent des valeurs différentes pour un même élément.",
    warning_partial:
      "Tous les éléments de l’avis original n’ont pas été vérifiés.",
    warning_search:
      "La recherche n’a pas abouti ; la portée de la vérification est donc limitée.",
    warning_fetch:
      "Certains documents n’ont pas pu être récupérés ; la couverture est donc limitée.",
    warning_network:
      "Le réseau actuel ne permet pas d’accéder aux pages des sources.",
    warning_budget: "Le quota de demandes du jour est atteint.",
    attemptsTitle: "Ce qui s'est passé pour chaque source",
    attempt_compared: "Comparée",
    attempt_fetch_failed: "Lecture impossible",
    attempt_unrelated: "Sans rapport avec cet avis ; non comparée",
    attempt_compare_failed: "L'analyse n'a pas abouti",
    identity_ok: "Même avis confirmé",
    identity_title:
      "Le titre de l'avis n'apparaît pas à l'identique dans le texte de la source (espaces et mots accolés compris)",
    identity_institution: "L'organisme émetteur n'est pas confirmé ou diffère",
    identity_edition: "L'édition ou l'année n'est pas confirmée ou diffère",
    identity_heading: "Le titre de la page désigne un autre avis ou article",
    identity_archived:
      "La page indique qu'elle est archivée, terminée ou retirée",
    identity_different: "Jugé comme un autre avis",
    identity_quote:
      "La citation d'identification ne correspond pas exactement au texte de la source",
    identity_country: "Le pays diffère",
    identity_section:
      "Certaines valeurs provenaient de la section d'un autre événement ou d'une autre édition et ont été écartées",
    evidenceCount: "Citations confirmées : {n} sur {m}",
    timingTitle: "Temps de traitement",
    timing_search: "Recherche",
    timing_fetch: "Récupération",
    timing_compare: "Comparaison",
    timing_calls: "{n} appels au modèle",
    timing_total: "Total serveur",
    attemptsNote:
      "Les problèmes propres à chaque source sont indiqués séparément dans « Ce qui s'est passé pour chaque source ».",
    timing_prepare: "Préparation de la photo",
    timing_extract: "Lecture (requête complète)",
    timing_extractServer: "Lecture (serveur)",
    timing_review: "Votre relecture",
    timing_check: "Requête de vérification (complète)",
    openLink: "Ouvrir le lien",
    mapSearch: "Rechercher sur Google Maps",
    mapNewTab: "s'ouvre dans un nouvel onglet",
    mapBothSides: "Même lieu dans votre avis et dans la source consultée",
    mapSearchNote:
      "La recherche sur la carte envoie ce texte de lieu à Google Maps pour que vous le cherchiez. Cela ne signifie pas que le lieu ou la source soit confirmé.",
  },
  de: {
    resultEyebrow: "Ergebnis der Prüfung",
    status_changed: "Wir haben Änderungen gefunden",
    status_matched: "Die geprüften Angaben stimmen überein",
    status_cancelled: "Eine Absage ist dokumentiert",
    status_expired: "Die ausdrücklich genannte Frist ist abgelaufen",
    status_review: "Eine weitere Prüfung ist nötig",
    status_unavailable: "Die Quellen konnten nicht geprüft werden",
    desc_changed:
      "Diese Unterschiede werden durch das abgerufene Material belegt. Prüfen Sie unten die Nachweise und die ursprüngliche Bekanntmachung.",
    desc_matched:
      "Die verglichenen Angaben stimmen mit der abgerufenen Quelle überein. Eine spätere Aktualisierung an anderer Stelle ist damit nicht ausgeschlossen.",
    desc_cancelled:
      "Eine offizielle Quelle sagt diese Ausgabe ausdrücklich ab. Öffnen Sie sie, um den Umfang der Absage zu prüfen.",
    desc_expired:
      "Für die Frist sind Uhrzeit und Zeitzone ausdrücklich angegeben. Prüfen Sie den aktuellen Anmeldestatus in der Originalquelle.",
    desc_review:
      "Die Identität der Bekanntmachung, die Autorität der Quelle oder die Nachweise sind nicht ausreichend geklärt. Betrachten Sie die folgenden Unterschiede nicht als bestätigte Änderungen.",
    desc_unavailable:
      "Die Quelle wurde nicht gefunden oder war nicht zugänglich. Das bedeutet nicht, dass die Veranstaltung abgesagt wurde oder unverändert ist.",
    originalValue: "Ihre gespeicherte Bekanntmachung",
    currentValue: "Abgerufenes Material",
    changed: "Geändert",
    same: "Stimmt überein",
    uncertain: "Prüfung nötig",
    showEvidence: "Belegtext ansehen",
    originalQuote: "Ihre Bekanntmachung",
    sourceQuote: "Abgerufene Quelle",
    noEvidence:
      "Ein ausreichendes belegendes Zitat konnte nicht geprüft werden.",
    key_deadline: "Anmeldefrist",
    key_date: "Veranstaltungsdatum",
    key_location: "Ort",
    key_status: "Status",
    key_cost: "Kosten",
    key_eligibility: "Wer sich anmelden kann",
    nextTitle: "Nächster Schritt",
    nextLive:
      "Öffnen Sie die Originalbekanntmachung der Einrichtung und prüfen Sie das Anmeldeverfahren und den betroffenen Personenkreis.",
    nextReview:
      "Prüfen Sie Einrichtung und Ausgabe und ergänzen Sie den richtigen offiziellen Link.",
    openSource: "Offizielle Quelle öffnen",
    sourcesTitle: "Geprüfte Quellen",
    sourceUnverified: "Offizielle Beziehung nicht unabhängig geprüft",
    sourceRegistered:
      "Registrierte Domain der Einrichtung · Identität der Bekanntmachung wird separat geprüft",
    fetched: "Abgerufen",
    checked: "Geprüft",
    synthetic: "Synthetisches Beispiel",
    syntheticDesc:
      "Hier werden eine fiktive Bekanntmachung und eine fiktive Aktualisierung verglichen. Es erfolgte kein Meta-API-Aufruf und keine Live-Websuche.",
    syntheticSource: "Fiktive Quelle · keine echte Webseite",
    demoStamp: "Beispielmaterial",
    scope:
      "Die Ergebnisse gelten nur für die geprüften Quellen und den Prüfzeitpunkt. Ursprüngliche Daten, Namen und Adressen bleiben erhalten.",
    candidatesTitle: "Weitere mögliche Quellen",
    candidatesHint:
      "Prüfen Sie, ob sie dieselbe Bekanntmachung betreffen, und wählen Sie einen Link für eine erneute Prüfung. Ein Vorschlag ist nicht automatisch eine verifizierte offizielle Quelle.",
    useCandidate: "Mit diesem Link erneut prüfen",
    copy: "Zusammenfassung kopieren",
    copied: "Kopiert",
    copyFailed:
      "Kopieren fehlgeschlagen. Prüfen Sie die Browserberechtigungen.",
    recheck: "Erneut abrufen und prüfen",
    newCheck: "Weitere Bekanntmachung prüfen",
    deleteResult: "Dieses Ergebnis löschen",
    noComparison:
      "Es gibt noch keine durch Nachweise gestützten Vergleiche. Ergänzen Sie eine offizielle URL oder einen klareren Bekanntmachungstext.",
    warning_identity:
      "Einrichtung, Ort, Jahr oder Ausgabe konnten nicht sicher zugeordnet werden.",
    warning_authority:
      "Die offizielle Beziehung zwischen Quelle und Einrichtung wurde nicht unabhängig überprüft.",
    warning_evidence:
      "Einige Werte oder Zitate stimmen nicht mit dem angegebenen Quelltext überein.",
    warning_conflict:
      "Quellen nennen unterschiedliche Werte für dieselbe Angabe.",
    warning_partial:
      "Nicht alle Angaben der ursprünglichen Bekanntmachung wurden geprüft.",
    warning_search:
      "Die Suche wurde nicht abgeschlossen, daher ist der Prüfumfang begrenzt.",
    warning_fetch:
      "Einige Materialien konnten nicht abgerufen werden, daher ist der Umfang begrenzt.",
    warning_network:
      "Das aktuelle Netzwerk kann nicht auf die Quellseiten zugreifen.",
    warning_budget: "Das heutige Anfragekontingent ist erreicht.",
    attemptsTitle: "Was mit jeder Quelle geschah",
    attempt_compared: "Verglichen",
    attempt_fetch_failed: "Konnte nicht gelesen werden",
    attempt_unrelated:
      "Nicht zu dieser Bekanntmachung gehörig; nicht verglichen",
    attempt_compare_failed: "Analyse nicht abgeschlossen",
    identity_ok: "Gleiche Bekanntmachung bestätigt",
    identity_title:
      "Der Titel steht nicht buchstabengetreu im Quelltext (Leerzeichen und angehängte Wörter zählen)",
    identity_institution:
      "Die herausgebende Stelle wurde nicht bestätigt oder weicht ab",
    identity_edition: "Ausgabe oder Jahr wurde nicht bestätigt oder weicht ab",
    identity_heading:
      "Die Seitenüberschrift nennt eine andere Bekanntmachung oder einen anderen Artikel",
    identity_archived:
      "Die Seite gibt an, archiviert, beendet oder zurückgezogen zu sein",
    identity_different: "Als andere Bekanntmachung eingestuft",
    identity_quote:
      "Das Identitätszitat stimmt nicht exakt mit dem Quelltext überein",
    identity_country: "Das Land weicht ab",
    identity_section:
      "Einige Werte stammten aus dem Abschnitt einer anderen Veranstaltung oder Ausgabe und wurden ausgelassen",
    evidenceCount: "Bestätigte Zitate: {n} von {m}",
    timingTitle: "Bearbeitungszeit",
    timing_search: "Suche",
    timing_fetch: "Abruf",
    timing_compare: "Vergleich",
    timing_calls: "{n} Modellaufrufe",
    timing_total: "Server gesamt",
    attemptsNote:
      "Probleme einzelner Quellen stehen separat unter „Was mit jeder Quelle geschah“.",
    timing_prepare: "Fotovorbereitung",
    timing_extract: "Lesen (gesamte Anfrage)",
    timing_extractServer: "Lesen (Server)",
    timing_review: "Ihre Prüfung",
    timing_check: "Prüfanfrage (gesamt)",
    openLink: "Link öffnen",
    mapSearch: "In Google Maps suchen",
    mapNewTab: "öffnet in neuem Tab",
    mapBothSides:
      "Gleicher Ort in Ihrer Bekanntmachung und im abgerufenen Material",
    mapSearchNote:
      "Die Kartensuche sendet diesen Ortstext an Google Maps, damit Sie ihn nachschlagen können. Sie bedeutet nicht, dass Ort oder Quelle bestätigt sind.",
  },
  ja: {
    resultEyebrow: "お知らせの確認結果",
    status_changed: "変更点が見つかりました",
    status_matched: "確認した内容は一致しています",
    status_cancelled: "中止の案内を確認しました",
    status_expired: "明記された申込期限が過ぎています",
    status_review: "もう一度確認が必要です",
    status_unavailable: "情報源を確認できませんでした",
    desc_changed:
      "取得した資料に基づく差異です。以下の根拠と元のお知らせを確認してください。",
    desc_matched:
      "比較した項目は取得した情報源と一致しています。別の場所で後から更新された可能性は残ります。",
    desc_cancelled:
      "公式情報源にこの回の中止が明記されています。原文を開いて中止の範囲を確認してください。",
    desc_expired:
      "期限には時刻とタイムゾーンが明記されています。現在の申込状況は元の情報源で確認してください。",
    desc_review:
      "同じお知らせかどうか、情報源の権威性、または根拠が不十分です。以下の差異を確定した変更として扱わないでください。",
    desc_unavailable:
      "情報源が見つからないか、アクセスできませんでした。中止された、または変更がないという意味ではありません。",
    originalValue: "お手元のお知らせ",
    currentValue: "取得した資料",
    changed: "変更",
    same: "一致",
    uncertain: "要確認",
    showEvidence: "根拠の文章を見る",
    originalQuote: "入力したお知らせ",
    sourceQuote: "取得した情報源",
    noEvidence: "十分な引用根拠を確認できませんでした。",
    key_deadline: "申込締切",
    key_date: "開催日",
    key_location: "場所",
    key_status: "状況",
    key_cost: "費用",
    key_eligibility: "申込対象",
    nextTitle: "次にすること",
    nextLive: "機関の元のお知らせを開き、申込方法と対象者を確認してください。",
    nextReview: "機関と回が同じか確認し、正しい公式リンクを追加してください。",
    openSource: "公式情報源を開く",
    sourcesTitle: "確認した情報源",
    sourceUnverified: "機関との公式な関係は独立して検証されていません",
    sourceRegistered: "登録済み機関ドメイン · お知らせの同一性は別途確認",
    fetched: "取得日時",
    checked: "確認日時",
    synthetic: "合成例",
    syntheticDesc:
      "架空のお知らせと架空の更新を比較した例です。Meta API の呼び出しや実際のウェブ検索は行っていません。",
    syntheticSource: "架空の情報源 · 実在するページではありません",
    demoStamp: "体験用資料",
    scope:
      "結果は確認した情報源と時点に限られます。原文の日付、名称、住所はそのまま保持されます。",
    candidatesTitle: "その他の情報源候補",
    candidatesHint:
      "同じお知らせか確認してからリンクを選び、再確認してください。候補は必ずしも検証済みの公式情報源ではありません。",
    useCandidate: "このリンクで再確認",
    copy: "結果の要約をコピー",
    copied: "コピーしました",
    copyFailed: "コピーできませんでした。ブラウザの権限を確認してください。",
    recheck: "新たに取得して再確認",
    newCheck: "別のお知らせを確認",
    deleteResult: "この結果を削除",
    noComparison:
      "根拠に基づく比較項目がまだありません。公式 URL またはより明確なお知らせの文章を追加してください。",
    warning_identity:
      "機関、場所、年、回が一致するか確実に確認できませんでした。",
    warning_authority:
      "情報源と機関の公式な関係を独立して検証できませんでした。",
    warning_evidence:
      "一部の値や引用が提供された情報源の文章と一致しませんでした。",
    warning_conflict: "同じ項目について情報源間で値が異なります。",
    warning_partial: "元のお知らせのすべての内容を確認したわけではありません。",
    warning_search: "検索が完了していないため、確認範囲は限定されています。",
    warning_fetch:
      "一部の資料を取得できなかったため、確認範囲は限定されています。",
    warning_network:
      "現在のネットワークでは情報源のページにアクセスできません。",
    warning_budget: "本日のリクエスト上限に達しました。",
    attemptsTitle: "出典ごとの確認結果",
    attempt_compared: "比較済み",
    attempt_fetch_failed: "読み込めませんでした",
    attempt_unrelated: "このお知らせと無関係のため比較していません",
    attempt_compare_failed: "分析が完了しませんでした",
    identity_ok: "同じお知らせと確認",
    identity_title:
      "お知らせのタイトルが出典の本文に一字一句そのままでは見つかりません（空白や付いた語も差異になります）",
    identity_institution: "発行機関が確認できないか、異なります",
    identity_edition: "回次または年が確認できないか、異なります",
    identity_heading: "ページの見出しが別のお知らせや記事を指しています",
    identity_archived: "アーカイブ・終了・撤回されたページと記載されています",
    identity_different: "別のお知らせと判断されました",
    identity_quote: "同一性の根拠となる引用が出典の本文と完全には一致しません",
    identity_country: "国が異なります",
    identity_section:
      "一部の値は別の行事や回次の項目からのもので、除外しました",
    evidenceCount: "確認済みの引用：{m}件中{n}件",
    timingTitle: "処理時間",
    timing_search: "検索",
    timing_fetch: "資料の取得",
    timing_compare: "比較",
    timing_calls: "モデル呼び出し {n} 回",
    timing_total: "サーバー合計",
    attemptsNote:
      "出典ごとの問題は「出典ごとの確認結果」に分けて表示しています。",
    timing_prepare: "写真の準備",
    timing_extract: "読み取り（リクエスト全体）",
    timing_extractServer: "読み取り（サーバー）",
    timing_review: "内容の確認（ユーザー）",
    timing_check: "確認リクエスト全体",
    openLink: "リンクを開く",
    mapSearch: "Google マップで検索",
    mapNewTab: "新しいタブで開きます",
    mapBothSides: "手元のお知らせと取得した資料で同じ場所",
    mapSearchNote:
      "地図検索はこの場所の文言を Google マップに送って探す機能で、場所や出典が確認されたという意味ではありません。",
  },
  pt: {
    resultEyebrow: "Resultado da verificação",
    status_changed: "Encontramos algumas alterações",
    status_matched: "Os dados verificados coincidem",
    status_cancelled: "Há um cancelamento documentado",
    status_expired: "O prazo explícito terminou",
    status_review: "É preciso verificar novamente",
    status_unavailable: "Não foi possível verificar as fontes",
    desc_changed:
      "Essas diferenças são sustentadas pelo material consultado. Confira as evidências e o aviso original abaixo.",
    desc_matched:
      "Os campos comparados coincidem com a fonte consultada. Isso não descarta uma atualização posterior em outro lugar.",
    desc_cancelled:
      "Uma fonte oficial cancela explicitamente esta edição. Abra-a para verificar o alcance do cancelamento.",
    desc_expired:
      "O prazo inclui horário e fuso horário explícitos. Consulte a fonte original para saber a situação atual das inscrições.",
    desc_review:
      "A identidade do aviso, a autoridade da fonte ou as evidências são insuficientes. Não trate as diferenças abaixo como alterações confirmadas.",
    desc_unavailable:
      "A fonte não foi encontrada ou não pôde ser acessada. Isso não significa que o evento foi cancelado ou permaneceu igual.",
    originalValue: "Seu aviso salvo",
    currentValue: "Material consultado",
    changed: "Alterado",
    same: "Coincide",
    uncertain: "Precisa de revisão",
    showEvidence: "Ver o texto de apoio",
    originalQuote: "Seu aviso",
    sourceQuote: "Fonte consultada",
    noEvidence: "Não foi possível verificar uma citação de apoio suficiente.",
    key_deadline: "Prazo de inscrição",
    key_date: "Data do evento",
    key_location: "Local",
    key_status: "Situação",
    key_cost: "Custo",
    key_eligibility: "Quem pode se inscrever",
    nextTitle: "Próximo passo",
    nextLive:
      "Abra o aviso original da instituição para confirmar como se inscrever e a quem ele se aplica.",
    nextReview:
      "Confirme a instituição e a edição e informe o link oficial correto.",
    openSource: "Abrir fonte oficial",
    sourcesTitle: "Fontes consultadas",
    sourceUnverified: "Relação oficial não verificada de forma independente",
    sourceRegistered:
      "Domínio registrado da instituição · identidade do aviso verificada separadamente",
    fetched: "Consulta",
    checked: "Verificação",
    synthetic: "Exemplo sintético",
    syntheticDesc:
      "Este exemplo compara um aviso fictício com uma atualização fictícia. Nenhuma chamada à API da Meta ou consulta à web em tempo real foi feita.",
    syntheticSource: "Fonte fictícia · não é uma página real",
    demoStamp: "Material de exemplo",
    scope:
      "Os resultados cobrem apenas as fontes e o momento da verificação. Datas, nomes e endereços originais são preservados.",
    candidatesTitle: "Outras fontes candidatas",
    candidatesHint:
      "Confira se são do mesmo aviso e escolha um link para verificar novamente. Uma fonte candidata não é necessariamente uma fonte oficial verificada.",
    useCandidate: "Verificar com este link",
    copy: "Copiar resumo",
    copied: "Copiado",
    copyFailed:
      "Não foi possível copiar. Verifique as permissões do navegador.",
    recheck: "Fazer uma nova verificação",
    newCheck: "Verificar outro aviso",
    deleteResult: "Excluir este resultado",
    noComparison:
      "Ainda não há comparações sustentadas por evidências. Adicione uma URL oficial ou um texto de aviso mais claro.",
    warning_identity:
      "Não foi possível confirmar a correspondência da instituição, do local, do ano ou da edição.",
    warning_authority:
      "A relação oficial entre a fonte e a instituição não foi verificada de forma independente.",
    warning_evidence:
      "Alguns valores ou citações não correspondem ao texto da fonte fornecida.",
    warning_conflict:
      "As fontes apresentam valores diferentes para o mesmo campo.",
    warning_partial:
      "Nem todos os detalhes do aviso original foram verificados.",
    warning_search:
      "A busca não foi concluída, por isso a verificação tem alcance limitado.",
    warning_fetch:
      "Alguns materiais não puderam ser obtidos, por isso a cobertura é limitada.",
    warning_network: "A rede atual não consegue acessar as páginas das fontes.",
    warning_budget: "O limite de solicitações de hoje foi atingido.",
    attemptsTitle: "O que aconteceu com cada fonte",
    attempt_compared: "Comparada",
    attempt_fetch_failed: "Não foi possível ler",
    attempt_unrelated: "Sem relação com este aviso; não comparada",
    attempt_compare_failed: "A análise não terminou",
    identity_ok: "Mesmo aviso confirmado",
    identity_title:
      "O título do aviso não aparece letra por letra no texto da fonte (espaços e palavras anexadas contam)",
    identity_institution:
      "A instituição emissora não foi confirmada ou é diferente",
    identity_edition: "A edição ou o ano não foi confirmado ou é diferente",
    identity_heading: "O título da página se refere a outro aviso ou artigo",
    identity_archived:
      "A página informa que está arquivada, encerrada ou retirada",
    identity_different: "Considerado um aviso diferente",
    identity_quote:
      "A citação de identificação não corresponde exatamente ao texto da fonte",
    identity_country: "O país é diferente",
    identity_section:
      "Alguns valores vieram da seção de outro evento ou edição e foram excluídos",
    evidenceCount: "Citações confirmadas: {n} de {m}",
    timingTitle: "Tempo de processamento",
    timing_search: "Busca",
    timing_fetch: "Obtenção",
    timing_compare: "Comparação",
    timing_calls: "{n} chamadas ao modelo",
    timing_total: "Total do servidor",
    attemptsNote:
      "Os problemas de cada fonte aparecem separadamente em “O que aconteceu com cada fonte”.",
    timing_prepare: "Preparação da foto",
    timing_extract: "Leitura (solicitação inteira)",
    timing_extractServer: "Leitura (servidor)",
    timing_review: "Sua revisão",
    timing_check: "Solicitação de verificação (inteira)",
    openLink: "Abrir link",
    mapSearch: "Pesquisar no Google Maps",
    mapNewTab: "abre em uma nova aba",
    mapBothSides: "O mesmo local no seu aviso e no material consultado",
    mapSearchNote:
      "A busca no mapa envia este texto do local ao Google Maps para você procurá-lo. Não significa que o local ou a fonte foram confirmados.",
  },
  ar: {
    resultEyebrow: "نتيجة التحقق من الإعلان",
    status_changed: "وجدنا بعض التغييرات",
    status_matched: "التفاصيل التي تم التحقق منها متطابقة",
    status_cancelled: "تم توثيق إلغاء",
    status_expired: "انتهى الموعد النهائي المحدد صراحةً",
    status_review: "يلزم التحقق مرة أخرى",
    status_unavailable: "تعذر التحقق من المصادر",
    desc_changed:
      "تستند هذه الاختلافات إلى المواد التي تم جلبها. راجع الأدلة والإعلان الأصلي أدناه.",
    desc_matched:
      "تتطابق الحقول المقارنة مع المصدر الذي تم جلبه. ولا يستبعد ذلك صدور تحديث لاحق في مكان آخر.",
    desc_cancelled:
      "يلغي مصدر رسمي هذه الدورة صراحةً. افتحه للتحقق من نطاق الإلغاء.",
    desc_expired:
      "يتضمن الموعد النهائي وقتًا ومنطقة زمنية محددين صراحةً. تحقق من حالة التقديم الحالية في المصدر الأصلي.",
    desc_review:
      "هوية الإعلان أو صفة المصدر الرسمية أو الأدلة غير كافية. لا تعتبر الاختلافات أدناه تغييرات مؤكدة.",
    desc_unavailable:
      "لم يُعثر على المصدر أو تعذر الوصول إليه. لا يعني ذلك إلغاء الفعالية أو عدم تغيرها.",
    originalValue: "إعلانك المحفوظ",
    currentValue: "المواد التي تم جلبها",
    changed: "تغيّر",
    same: "متطابق",
    uncertain: "يحتاج إلى مراجعة",
    showEvidence: "عرض النص الداعم",
    originalQuote: "إعلانك",
    sourceQuote: "المصدر الذي تم جلبه",
    noEvidence: "تعذر التحقق من اقتباس داعم كافٍ.",
    key_deadline: "الموعد النهائي للتقديم",
    key_date: "تاريخ الفعالية",
    key_location: "المكان",
    key_status: "الحالة",
    key_cost: "التكلفة",
    key_eligibility: "من يحق له التقديم",
    nextTitle: "الخطوة التالية",
    nextLive:
      "افتح الإعلان الأصلي للجهة للتأكد من طريقة التقديم والفئات المشمولة.",
    nextReview: "تأكد من الجهة والدورة، ثم أضف الرابط الرسمي الصحيح.",
    openSource: "فتح المصدر الرسمي",
    sourcesTitle: "المصادر التي تم التحقق منها",
    sourceUnverified: "لم يتم التحقق مستقلًا من العلاقة الرسمية",
    sourceRegistered: "نطاق جهة مسجل · يتم التحقق من هوية الإعلان بشكل منفصل",
    fetched: "وقت الجلب",
    checked: "وقت التحقق",
    synthetic: "مثال مُصطنع",
    syntheticDesc:
      "يقارن هذا المثال إعلانًا افتراضيًا بتحديث افتراضي. لم يُجرَ أي اتصال بواجهة Meta API أو بحث مباشر على الويب.",
    syntheticSource: "مصدر افتراضي · ليس صفحة حقيقية",
    demoStamp: "مادة تجريبية",
    scope:
      "تقتصر النتائج على المصادر ووقت التحقق. تُحفظ التواريخ والأسماء والعناوين الأصلية.",
    candidatesTitle: "مصادر أخرى محتملة",
    candidatesHint:
      "تحقق من أنها تخص الإعلان نفسه ثم اختر رابطًا لإعادة التحقق. المصدر المقترح ليس بالضرورة مصدرًا رسميًا تم التحقق منه.",
    useCandidate: "التحقق باستخدام هذا الرابط",
    copy: "نسخ الملخص",
    copied: "تم النسخ",
    copyFailed: "تعذر النسخ. تحقق من أذونات المتصفح.",
    recheck: "إجراء تحقق جديد",
    newCheck: "التحقق من إعلان آخر",
    deleteResult: "حذف هذه النتيجة",
    noComparison:
      "لا توجد مقارنات مدعومة بالأدلة بعد. أضف رابطًا رسميًا أو نصًا أوضح للإعلان.",
    warning_identity:
      "تعذر التأكد من تطابق الجهة أو المكان أو السنة أو الدورة.",
    warning_authority:
      "لم يتم التحقق مستقلًا من العلاقة الرسمية بين المصدر والجهة.",
    warning_evidence: "بعض القيم أو الاقتباسات لا تطابق نص المصدر المقدّم.",
    warning_conflict: "تختلف المصادر في قيمة الحقل نفسه.",
    warning_partial: "لم يتم التحقق من جميع تفاصيل الإعلان الأصلي.",
    warning_search: "لم يكتمل البحث، لذا فإن نطاق التحقق محدود.",
    warning_fetch: "تعذر جلب بعض المواد، لذا فإن نطاق التحقق محدود.",
    warning_network: "لا تستطيع الشبكة الحالية الوصول إلى صفحات المصادر.",
    warning_budget: "تم بلوغ الحد المتاح لطلبات اليوم.",
    attemptsTitle: "ما حدث لكل مصدر",
    attempt_compared: "تمت المقارنة",
    attempt_fetch_failed: "تعذرت القراءة",
    attempt_unrelated: "غير مرتبط بهذا الإعلان؛ لم تتم المقارنة",
    attempt_compare_failed: "لم يكتمل التحليل",
    identity_ok: "تم التأكد من أنه الإعلان نفسه",
    identity_title:
      "لا يظهر عنوان الإعلان حرفيًا في نص المصدر (المسافات والكلمات الملتصقة تُحتسب)",
    identity_institution: "لم يتم التأكد من الجهة المصدرة أو أنها مختلفة",
    identity_edition: "لم يتم التأكد من الدورة أو السنة أو أنها مختلفة",
    identity_heading: "عنوان الصفحة يشير إلى إعلان أو مقال آخر",
    identity_archived: "تذكر الصفحة أنها مؤرشفة أو منتهية أو مسحوبة",
    identity_different: "اعتُبر إعلانًا مختلفًا",
    identity_quote: "اقتباس التعريف لا يطابق نص المصدر تمامًا",
    identity_country: "البلد مختلف",
    identity_section: "بعض القيم جاءت من قسم فعالية أو دورة أخرى فاستُبعدت",
    evidenceCount: "الاقتباسات المؤكدة: {n} من {m}",
    timingTitle: "وقت المعالجة",
    timing_search: "البحث",
    timing_fetch: "جلب المصادر",
    timing_compare: "المقارنة",
    timing_calls: "{n} استدعاءات للنموذج",
    timing_total: "إجمالي الخادم",
    attemptsNote: "تظهر مشكلات كل مصدر بشكل منفصل في «ما حدث لكل مصدر».",
    timing_prepare: "تجهيز الصورة",
    timing_extract: "القراءة (الطلب كاملًا)",
    timing_extractServer: "القراءة (الخادم)",
    timing_review: "مراجعتك",
    timing_check: "طلب التحقق (كاملًا)",
    openLink: "فتح الرابط",
    mapSearch: "البحث في خرائط Google",
    mapNewTab: "يفتح في علامة تبويب جديدة",
    mapBothSides: "المكان نفسه في إعلانك وفي المادة المسترجعة",
    mapSearchNote:
      "يرسل البحث في الخريطة نص هذا المكان إلى خرائط Google لتبحث عنه، ولا يعني ذلك أن المكان أو المصدر قد تم تأكيده.",
  },
  ru: {
    resultEyebrow: "Результат проверки объявления",
    status_changed: "Мы нашли изменения",
    status_matched: "Проверенные сведения совпадают",
    status_cancelled: "Отмена подтверждена документом",
    status_expired: "Указанный срок подачи истёк",
    status_review: "Требуется дополнительная проверка",
    status_unavailable: "Не удалось проверить источники",
    desc_changed:
      "Эти различия подтверждаются полученными материалами. Ознакомьтесь с доказательствами и исходным объявлением ниже.",
    desc_matched:
      "Сравниваемые поля совпадают с полученным источником. Это не исключает более позднего обновления в другом месте.",
    desc_cancelled:
      "Официальный источник прямо сообщает об отмене этого выпуска. Откройте его, чтобы уточнить, на что распространяется отмена.",
    desc_expired:
      "Для срока явно указаны время и часовой пояс. Проверьте текущий статус подачи заявок в исходном источнике.",
    desc_review:
      "Идентичность объявления, официальный статус источника или доказательства установлены недостаточно. Не считайте различия ниже подтверждёнными изменениями.",
    desc_unavailable:
      "Источник не найден или недоступен. Это не означает, что мероприятие отменено или осталось без изменений.",
    originalValue: "Ваше сохранённое объявление",
    currentValue: "Полученный материал",
    changed: "Изменено",
    same: "Совпадает",
    uncertain: "Нужна проверка",
    showEvidence: "Посмотреть подтверждающий текст",
    originalQuote: "Ваше объявление",
    sourceQuote: "Полученный источник",
    noEvidence: "Не удалось проверить достаточную подтверждающую цитату.",
    key_deadline: "Срок подачи заявки",
    key_date: "Дата мероприятия",
    key_location: "Место",
    key_status: "Статус",
    key_cost: "Стоимость",
    key_eligibility: "Кто может подать заявку",
    nextTitle: "Следующий шаг",
    nextLive:
      "Откройте исходное объявление учреждения, чтобы проверить порядок подачи и круг участников.",
    nextReview:
      "Проверьте учреждение и выпуск, затем укажите правильную официальную ссылку.",
    openSource: "Открыть официальный источник",
    sourcesTitle: "Проверенные источники",
    sourceUnverified: "Официальная связь не проверена независимо",
    sourceRegistered:
      "Зарегистрированный домен учреждения · идентичность объявления проверяется отдельно",
    fetched: "Получено",
    checked: "Проверено",
    synthetic: "Синтетический пример",
    syntheticDesc:
      "Здесь сравниваются вымышленное объявление и вымышленное обновление. Обращения к Meta API и поиска в интернете в реальном времени не было.",
    syntheticSource: "Вымышленный источник · не реальная страница",
    demoStamp: "Пример материала",
    scope:
      "Результаты относятся только к проверенным источникам и времени проверки. Исходные даты, имена и адреса сохраняются.",
    candidatesTitle: "Другие возможные источники",
    candidatesHint:
      "Проверьте, относятся ли они к тому же объявлению, и выберите ссылку для повторной проверки. Предложенный источник не обязательно является проверенным официальным источником.",
    useCandidate: "Проверить по этой ссылке",
    copy: "Копировать сводку",
    copied: "Скопировано",
    copyFailed: "Не удалось скопировать. Проверьте разрешения браузера.",
    recheck: "Выполнить новую проверку",
    newCheck: "Проверить другое объявление",
    deleteResult: "Удалить этот результат",
    noComparison:
      "Пока нет сравнений, подтверждённых доказательствами. Добавьте официальный URL или более понятный текст объявления.",
    warning_identity:
      "Не удалось уверенно установить совпадение учреждения, места, года или выпуска.",
    warning_authority:
      "Официальная связь источника с учреждением не проверена независимо.",
    warning_evidence:
      "Некоторые значения или цитаты не совпадают с текстом предоставленного источника.",
    warning_conflict:
      "Источники указывают разные значения одного и того же поля.",
    warning_partial: "Проверены не все сведения исходного объявления.",
    warning_search: "Поиск не завершён, поэтому охват проверки ограничен.",
    warning_fetch:
      "Некоторые материалы не удалось получить, поэтому охват ограничен.",
    warning_network:
      "Текущая сеть не позволяет получить доступ к страницам источников.",
    warning_budget: "Достигнут сегодняшний лимит запросов.",
    attemptsTitle: "Что произошло с каждым источником",
    attempt_compared: "Сравнено",
    attempt_fetch_failed: "Не удалось прочитать",
    attempt_unrelated: "Не относится к этому объявлению; не сравнивалось",
    attempt_compare_failed: "Анализ не завершён",
    identity_ok: "Подтверждено, что это то же объявление",
    identity_title:
      "Название объявления не встречается в тексте источника буква в букву (пробелы и присоединённые слова учитываются)",
    identity_institution: "Организация-издатель не подтверждена или отличается",
    identity_edition: "Выпуск или год не подтверждены или отличаются",
    identity_heading:
      "Заголовок страницы относится к другому объявлению или статье",
    identity_archived:
      "На странице указано, что она в архиве, завершена или отозвана",
    identity_different: "Признано другим объявлением",
    identity_quote:
      "Цитата для подтверждения не совпадает с текстом источника точно",
    identity_country: "Страна отличается",
    identity_section:
      "Некоторые значения взяты из раздела другого мероприятия или выпуска и исключены",
    evidenceCount: "Подтверждено цитат: {n} из {m}",
    timingTitle: "Время обработки",
    timing_search: "Поиск",
    timing_fetch: "Получение",
    timing_compare: "Сравнение",
    timing_calls: "Вызовов модели: {n}",
    timing_total: "Итого на сервере",
    attemptsNote:
      "Проблемы отдельных источников показаны в разделе «Что произошло с каждым источником».",
    timing_prepare: "Подготовка фото",
    timing_extract: "Чтение (весь запрос)",
    timing_extractServer: "Чтение (сервер)",
    timing_review: "Ваша проверка",
    timing_check: "Запрос проверки (целиком)",
    openLink: "Открыть ссылку",
    mapSearch: "Искать в Google Картах",
    mapNewTab: "открывается в новой вкладке",
    mapBothSides:
      "Одно и то же место в вашем объявлении и в найденном материале",
    mapSearchNote:
      "Поиск на карте отправляет этот текст места в Google Карты, чтобы вы могли его найти. Это не означает, что место или источник подтверждены.",
  },
};

export function resultCopy(lang: ResultLang): Record<ResultCopyKey, string> {
  return translations[lang];
}
