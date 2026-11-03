"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  CircleCheck,
  Clock3,
  Copy,
  Crop,
  ExternalLink,
  FileCheck2,
  FileText,
  Globe2,
  Info,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCw,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  AlertTriangle,
} from "lucide-react";
import { countryCodes } from "@/lib/countries";
import { copy, errorText, type CopyKey } from "@/lib/i18n";
import type { Lang, Notice, Result } from "@/lib/schema";
import type { DemoId } from "@/lib/demo";
import { loadImage, prepareImage, transformImage } from "./image";

type Stage = "input" | "review" | "processing" | "result";
type Dialog = "how" | "about" | "privacy" | "delete" | null;
type ProgressStep = "extract" | "search" | "sources" | "compare" | "resume";
const GitHub = "https://github.com/ZOOGOM/stillvalid";
function countryName(code: string | null, lang: Lang) {
  return code
    ? new Intl.DisplayNames([lang], { type: "region" }).of(code) || code
    : copy(lang).unset;
}
function timeLabel(value: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: undefined,
  }).format(new Date(value));
}

function Modal({
  children,
  title,
  close,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          "button, input, select, textarea, a[href], [tabindex='0']",
        ) || [],
      ).filter((e) => !e.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={ref}
      >
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            aria-label="Close / 닫기"
            onClick={close}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CountryPicker({
  value,
  setValue,
  lang,
  close,
}: {
  value: string | null;
  setValue: (v: string | null) => void;
  lang: Lang;
  close: () => void;
}) {
  const t = copy(lang),
    [query, setQuery] = useState(""),
    [remember, setRemember] = useState(false);
  useEffect(() => {
    try {
      setRemember(localStorage.getItem("sv_remember_country") === "true");
    } catch {}
  }, []);
  const items = countryCodes
    .map((code) => ({ code, name: countryName(code, lang) }))
    .filter((c) =>
      (c.name + " " + c.code)
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name, lang));
  const choose = (code: string | null) => {
    setValue(code);
    try {
      if (remember && code) localStorage.setItem("sv_country", code);
      else localStorage.removeItem("sv_country");
    } catch {}
    close();
  };
  return (
    <>
      <p className="muted modal-intro">{t.countryHint}</p>
      <div className="country-search">
        <Search size={18} />
        <input
          aria-label={t.countrySearch}
          placeholder={t.countrySearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="country-list">
        <button
          className={!value ? "selected" : ""}
          onClick={() => choose(null)}
        >
          <Globe2 size={17} />
          {t.unset}
          {!value && <Check size={17} />}
        </button>
        {items.length ? (
          items.map((c) => (
            <button
              key={c.code}
              className={value === c.code ? "selected" : ""}
              onClick={() => choose(c.code)}
            >
              <span className="country-code">{c.code}</span>
              {c.name}
              {value === c.code && <Check size={17} />}
            </button>
          ))
        ) : (
          <p className="muted">{t.noCountries}</p>
        )}
      </div>
      <div className="country-preferences">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => {
              const checked = e.target.checked;
              setRemember(checked);
              try {
                if (checked) {
                  localStorage.setItem("sv_remember_country", "true");
                  if (value) localStorage.setItem("sv_country", value);
                } else {
                  localStorage.removeItem("sv_remember_country");
                  localStorage.removeItem("sv_country");
                }
              } catch {}
            }}
          />
          {t.remember}
        </label>
        <button
          className="text-button"
          onClick={() => {
            try {
              localStorage.removeItem("sv_country");
              localStorage.removeItem("sv_remember_country");
            } catch {}
            setRemember(false);
            setValue(null);
          }}
        >
          {t.clearCountry}
        </button>
      </div>
    </>
  );
}

function CropModal({
  image,
  lang,
  close,
  done,
}: {
  image: string;
  lang: Lang;
  close: () => void;
  done: (image: string) => void;
}) {
  const t = copy(lang),
    [crop, setCrop] = useState({ x: 0, y: 0 }),
    [zoom, setZoom] = useState(1),
    [area, setArea] = useState<Area | null>(null),
    [ratio, setRatio] = useState(4 / 3),
    [aspect, setAspect] = useState("photo"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    loadImage(image)
      .then((i) => setRatio(i.width / i.height))
      .catch(() => {});
  }, [image]);
  return (
    <Modal title={t.cropTitle} close={close} wide>
      <p className="muted modal-intro">{t.cropDesc}</p>
      <div className="crop-viewport">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect === "photo" ? ratio : 4 / 5}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_area, pixels) => setArea(pixels)}
        />
      </div>
      <div className="crop-controls">
        <label>
          {t.zoom}
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <label>
          {t.cropAspect}
          <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
            <option value="photo">{t.aspectPhoto}</option>
            <option value="document">{t.aspectDocument}</option>
          </select>
        </label>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {errorText(error, lang)}
        </p>
      )}
      <button
        className="primary full"
        disabled={!area || busy}
        onClick={async () => {
          if (!area) return;
          setBusy(true);
          setError(null);
          try {
            const updated = await transformImage(image, 0, area);
            if (mounted.current) done(updated);
          } catch (e) {
            if (mounted.current)
              setError(e instanceof Error ? e.message : "image_type");
          } finally {
            if (mounted.current) setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="spin" size={18} /> : <Crop size={18} />}{" "}
        {t.cropApply}
      </button>
    </Modal>
  );
}

export default function StillValidApp() {
  const [lang, setLang] = useState<Lang>("ko"),
    [prefsLoaded, setPrefsLoaded] = useState(false),
    t = copy(lang);
  const [stage, setStage] = useState<Stage>("input"),
    [mode, setMode] = useState<"photo" | "text">("photo");
  const [country, setCountry] = useState<string | null>(null),
    [countryOpen, setCountryOpen] = useState(false),
    [countryConfirmed, setCountryConfirmed] = useState(false);
  const [text, setText] = useState(""),
    [image, setImage] = useState<string | null>(null),
    [imageName, setImageName] = useState(""),
    [preparing, setPreparing] = useState(false),
    [cropping, setCropping] = useState(false),
    [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null),
    [sourceUrl, setSourceUrl] = useState(""),
    [result, setResult] = useState<Result | null>(null);
  const [live, setLive] = useState<boolean | null>(null),
    [error, setError] = useState<string | null>(null),
    [toast, setToast] = useState<string | null>(null),
    [step, setStep] = useState<ProgressStep>("extract"),
    [dialog, setDialog] = useState<Dialog>(null);
  const controller = useRef<AbortController | null>(null),
    busy = useRef(false),
    activeId = useRef<string | null>(null),
    inFlightId = useRef<string | null>(null),
    interacted = useRef(false),
    uploadGeneration = useRef(0),
    operation = useRef(0),
    fileRef = useRef<HTMLInputElement>(null),
    cameraRef = useRef<HTMLInputElement>(null),
    mainRef = useRef<HTMLElement>(null);
  const closeDialog = useCallback(() => setDialog(null), []),
    closeCountry = useCallback(() => setCountryOpen(false), []),
    closeCrop = useCallback(() => setCropping(false), []);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("sv_lang");
      if (savedLang === "en" || savedLang === "ko") setLang(savedLang);
      else
        setLang(
          navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en",
        );
      if (localStorage.getItem("sv_remember_country") === "true") {
        const saved = localStorage.getItem("sv_country");
        if (saved && countryCodes.includes(saved)) setCountry(saved);
      }
    } catch {}
    setPrefsLoaded(true);
    let stopped = false;
    const initialOperation = operation.current;
    fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(async (status) => {
        if (stopped) return;
        setLive(!!status.liveAvailable);
        let id: string | null = null;
        try {
          id = sessionStorage.getItem("sv_active_check");
        } catch {}
        if (id) {
          try {
            const response = await fetch(
              `/api/checks/${encodeURIComponent(id)}`,
              { cache: "no-store" },
            );
            if (
              stopped ||
              interacted.current ||
              operation.current !== initialOperation
            )
              return;
            if (response.ok) {
              const saved = await response.json();
              if (
                stopped ||
                interacted.current ||
                operation.current !== initialOperation
              )
                return;
              if (saved.result) {
                setResult(saved.result);
                setStage("result");
                activeId.current = id;
              } else {
                try {
                  sessionStorage.removeItem("sv_active_check");
                } catch {}
              }
            } else {
              try {
                sessionStorage.removeItem("sv_active_check");
              } catch {}
            }
          } catch {
            // Failure to restore a previous check must not disable new checks.
          }
        }
      })
      .catch(() => {
        if (!stopped) setLive(false);
      });
    return () => {
      stopped = true;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    if (prefsLoaded) {
      try {
        localStorage.setItem("sv_lang", lang);
      } catch {}
    }
  }, [lang, prefsLoaded]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (stage !== "input") {
      mainRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      mainRef.current
        ?.querySelector<HTMLElement>("h1")
        ?.focus({ preventScroll: true });
    }
  }, [stage]);
  const mismatch =
    !!notice?.country &&
    !!country &&
    notice.country !== country &&
    !countryConfirmed;
  const setCountryValue = (value: string | null) => {
    setCountry(value);
    setCountryConfirmed(false);
  };
  const reset = () => {
    controller.current?.abort();
    operation.current++;
    uploadGeneration.current++;
    busy.current = false;
    setStage("input");
    setResult(null);
    setNotice(null);
    setImage(null);
    setImageName("");
    setText("");
    setMode("photo");
    setPreparing(false);
    setError(null);
    setSourceUrl("");
    activeId.current = null;
    inFlightId.current = null;
    try {
      sessionStorage.removeItem("sv_active_check");
    } catch {}
  };
  const chooseImage = async (file: File | undefined) => {
    if (!file) return;
    const generation = ++uploadGeneration.current;
    setPreparing(true);
    setError(null);
    try {
      const prepared = await prepareImage(file);
      if (generation === uploadGeneration.current) {
        setImage(prepared);
        setImageName(file.name);
        setMode("photo");
      }
    } catch (e) {
      if (generation === uploadGeneration.current)
        setError(e instanceof Error ? e.message : "image_type");
    } finally {
      if (generation === uploadGeneration.current) setPreparing(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  };
  const extract = async () => {
    if (busy.current) return;
    if (!live) {
      setError("not_configured");
      return;
    }
    if ((mode === "photo" && !image) || (mode === "text" && !text.trim())) {
      setError("input");
      return;
    }
    const generation = ++operation.current;
    busy.current = true;
    setError(null);
    setStage("processing");
    setStep("extract");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: mode === "text" ? text : "",
          image: mode === "photo" ? image : undefined,
          country,
        }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "default");
      if (abort.signal.aborted || operation.current !== generation) return;
      setNotice(data.notice);
      setCountryConfirmed(false);
      setStage("review");
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(
          e instanceof TypeError || e instanceof SyntaxError
            ? "network"
            : e instanceof Error
              ? e.message
              : "network",
        );
        setStage("input");
      }
    } finally {
      if (operation.current === generation) busy.current = false;
    }
  };
  const runCheck = async (overrideUrl?: string) => {
    if (!notice || busy.current) return;
    if (mismatch) {
      setError("countryConfirm");
      return;
    }
    const generation = ++operation.current;
    inFlightId.current = null;
    busy.current = true;
    setError(null);
    setStage("processing");
    setStep("search");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch("/api/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notice,
          country,
          lang,
          sourceUrl: overrideUrl ?? sourceUrl,
          requestKey: crypto.randomUUID(),
        }),
        signal: abort.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "default");
      }
      if (response.headers.get("content-type")?.includes("application/json")) {
        const saved = await response.json();
        if (!saved.result) throw new Error("busy");
        if (abort.signal.aborted || operation.current !== generation) return;
        setResult(saved.result);
        setStage("result");
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("network");
      const decoder = new TextDecoder();
      let buffer = "",
        completed = false;
      for (;;) {
        const part = await reader.read();
        if (abort.signal.aborted || operation.current !== generation) return;
        buffer += decoder.decode(part.value, { stream: !part.done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "created") {
            activeId.current = event.data.id;
            inFlightId.current = event.data.id;
            try {
              sessionStorage.setItem("sv_active_check", event.data.id);
            } catch {}
          }
          if (event.type === "phase") setStep(event.data.step);
          if (event.type === "error") throw new Error(event.data.code);
          if (event.type === "result") {
            setResult(event.data);
            setStage("result");
            inFlightId.current = null;
            completed = true;
          }
        }
        if (part.done) break;
      }
      if (!completed) throw new Error("network");
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(
          e instanceof TypeError || e instanceof SyntaxError
            ? "network"
            : e instanceof Error
              ? e.message
              : "network",
        );
        setStage("review");
      }
    } finally {
      if (operation.current === generation) busy.current = false;
    }
  };
  const cancel = async () => {
    controller.current?.abort();
    operation.current++;
    busy.current = false;
    setStage(notice ? "review" : "input");
    setError(null);
    const id = inFlightId.current;
    inFlightId.current = null;
    if (id) {
      try {
        await fetch(`/api/checks/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      } catch {}
      if (activeId.current === id) {
        activeId.current = null;
        try {
          sessionStorage.removeItem("sv_active_check");
        } catch {}
      }
    }
  };
  const example = async (id: DemoId) => {
    if (busy.current) return;
    const generation = ++operation.current;
    busy.current = true;
    setError(null);
    try {
      const response = await fetch(`/api/demo?id=${id}&lang=${lang}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("network");
      const data = await response.json();
      if (generation !== operation.current) return;
      setResult(data.result);
      setStage("result");
      setNotice(null);
      activeId.current = null;
      try {
        sessionStorage.removeItem("sv_active_check");
      } catch {}
    } catch {
      if (generation === operation.current) setError("network");
    } finally {
      if (generation === operation.current) busy.current = false;
    }
  };
  const deleteResult = async () => {
    if (result?.mode === "live") {
      try {
        const response = await fetch(
          `/api/checks/${encodeURIComponent(result.id)}`,
          { method: "DELETE" },
        );
        if (!response.ok) throw new Error("not_found");
      } catch {
        setToast(errorText("network", lang));
        setDialog(null);
        return;
      }
    }
    setDialog(null);
    reset();
    setToast(t.deleted);
  };
  const copySummary = async () => {
    if (!result) return;
    const summary = [
      "StillValid · " + t[("status_" + result.status) as CopyKey],
      result.title,
      result.mode === "demo"
        ? t.syntheticDesc
        : t.checked + ": " + timeLabel(result.checkedAt, lang),
      ...result.comparisons.map(
        (f) =>
          `${t[("key_" + f.key) as CopyKey]}: ${f.before ?? "—"} → ${f.after ?? "—"} (${f.verified ? t[f.relation === "same" ? "same" : "changed"] : t.uncertain})`,
      ),
      ...result.sources.map((s) =>
        result.mode === "demo" ? t.syntheticSource : s.url,
      ),
      t.scope,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setToast(t.copied);
    } catch {
      setToast(t.copyFailed);
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {lang === "ko" ? "본문으로 이동" : "Skip to content"}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => {
              if (stage !== "processing") reset();
            }}
            aria-label="StillValid home"
          >
            <span className="brand-icon">
              <ScanLine size={23} strokeWidth={1.8} />
            </span>
            <span>
              Still<span className="brand-light">Valid</span>
              <span className="brand-dot">.</span>
            </span>
          </button>
          <nav aria-label={lang === "ko" ? "주 메뉴" : "Main navigation"}>
            <button onClick={() => setDialog("how")}>{t.navHow}</button>
            <button className="about-nav" onClick={() => setDialog("about")}>
              {t.navAbout}
            </button>
            <span className="nav-divider" />
            <button
              className="language-button"
              onClick={() => setLang(lang === "ko" ? "en" : "ko")}
              aria-label={lang === "ko" ? "Switch to English" : "한국어로 전환"}
            >
              <Globe2 size={16} />
              {lang === "ko" ? "KO" : "EN"}
              <ChevronDown size={12} />
            </button>
          </nav>
        </div>
      </header>
      <main
        id="main"
        ref={mainRef}
        onPointerDownCapture={() => {
          interacted.current = true;
        }}
        onKeyDownCapture={() => {
          interacted.current = true;
        }}
      >
        {stage === "input" && (
          <>
            <section className="hero">
              <div className="hero-eyebrow">
                <span />
                {t.eyebrow}
              </div>
              <h1>
                {t.hero1}
                <br />
                <em>{t.hero2}</em>
              </h1>
              <p>{t.intro}</p>
              <div className="trust-row">
                <span>
                  <Globe2 size={15} />
                  {t.noGps}
                </span>
                <span>
                  <FileCheck2 size={15} />
                  {t.evidence}
                </span>
                <span>
                  <CheckCheck size={15} />
                  {t.language}
                </span>
              </div>
            </section>
            <div className="workspace-grid">
              <section className="input-card" aria-labelledby="form-title">
                <div className="card-heading">
                  <div>
                    <h2 id="form-title">{t.formTitle}</h2>
                    <p>{t.formDesc}</p>
                  </div>
                  <span className="small-step">01 / 03</span>
                </div>
                <div
                  className="input-tabs"
                  role="tablist"
                  aria-label={lang === "ko" ? "입력 방식" : "Input method"}
                >
                  <button
                    role="tab"
                    aria-selected={mode === "photo"}
                    aria-controls="photo-panel"
                    id="photo-tab"
                    onClick={() => {
                      setMode("photo");
                      setError(null);
                    }}
                    className={mode === "photo" ? "active" : ""}
                  >
                    <Camera size={17} />
                    {t.photo}
                  </button>
                  <button
                    role="tab"
                    aria-selected={mode === "text"}
                    aria-controls="text-panel"
                    id="text-tab"
                    onClick={() => {
                      setMode("text");
                      setError(null);
                    }}
                    className={mode === "text" ? "active" : ""}
                  >
                    <FileText size={17} />
                    {t.text}
                  </button>
                </div>
                {mode === "photo" ? (
                  <div
                    id="photo-panel"
                    role="tabpanel"
                    aria-labelledby="photo-tab"
                  >
                    <input
                      ref={fileRef}
                      className="sr-only"
                      tabIndex={-1}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label={t.chooseFile}
                      onChange={(e) => void chooseImage(e.target.files?.[0])}
                    />
                    <input
                      ref={cameraRef}
                      className="sr-only"
                      tabIndex={-1}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      aria-label={t.camera}
                      onChange={(e) => void chooseImage(e.target.files?.[0])}
                    />
                    {image ? (
                      <div className="image-preview">
                        <img
                          src={image}
                          alt={
                            lang === "ko"
                              ? "선택한 안내문 미리보기"
                              : "Preview of your notice"
                          }
                        />
                        <div className="image-toolbar">
                          <span title={imageName}>{imageName}</span>
                          <button
                            aria-label={t.crop}
                            title={t.crop}
                            disabled={preparing}
                            onClick={() => setCropping(true)}
                          >
                            <Crop size={17} />
                          </button>
                          <button
                            aria-label={t.rotate}
                            title={t.rotate}
                            disabled={preparing}
                            onClick={async () => {
                              const generation = ++uploadGeneration.current;
                              setPreparing(true);
                              try {
                                const rotated = await transformImage(image, 90);
                                if (generation === uploadGeneration.current)
                                  setImage(rotated);
                              } catch (e) {
                                if (generation === uploadGeneration.current)
                                  setError(
                                    e instanceof Error
                                      ? e.message
                                      : "image_type",
                                  );
                              } finally {
                                if (generation === uploadGeneration.current)
                                  setPreparing(false);
                              }
                            }}
                          >
                            <RotateCw size={17} />
                          </button>
                          <button
                            aria-label={t.remove}
                            title={t.remove}
                            onClick={() => {
                              uploadGeneration.current++;
                              setImage(null);
                              setPreparing(false);
                            }}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`dropzone ${dragging ? "dragging" : ""}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragging(false);
                          void chooseImage(e.dataTransfer.files?.[0]);
                        }}
                      >
                        <span className="upload-icon">
                          {preparing ? (
                            <Loader2 size={27} className="spin" />
                          ) : (
                            <ScanLine size={29} strokeWidth={1.5} />
                          )}
                        </span>
                        <h3>{t.dropTitle}</h3>
                        <p>{t.dropDesc}</p>
                        <div className="upload-actions">
                          <button
                            className="secondary"
                            onClick={() => fileRef.current?.click()}
                            disabled={preparing}
                          >
                            <UploadCloud size={15} />
                            {t.chooseFile}
                          </button>
                          <button
                            className="text-button camera-button"
                            onClick={() => cameraRef.current?.click()}
                            disabled={preparing}
                          >
                            <Camera size={15} />
                            {t.camera}
                          </button>
                        </div>
                        <span className="file-hint">{t.fileHint}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="text-panel"
                    id="text-panel"
                    role="tabpanel"
                    aria-labelledby="text-tab"
                  >
                    <textarea
                      aria-label={t.text}
                      placeholder={t.textPlaceholder}
                      value={text}
                      maxLength={18000}
                      onChange={(e) => setText(e.target.value)}
                    />
                    <span>{text.length.toLocaleString()} / 18,000</span>
                  </div>
                )}
                <div className="context-line">
                  <button
                    className="country-select"
                    onClick={() => setCountryOpen(true)}
                  >
                    <Globe2 size={17} />
                    <span>
                      <small>{t.country}</small>
                      {countryName(country, lang)}
                    </span>
                    <ChevronDown size={15} />
                  </button>
                  <div className="context-note">
                    <ShieldCheck size={15} />
                    <span>{t.countryHint}</span>
                  </div>
                </div>
                {error && (
                  <div className="inline-error" role="alert">
                    <AlertTriangle size={17} />
                    <span>{errorText(error, lang)}</span>
                  </div>
                )}
                <button
                  className="primary full start-button"
                  disabled={
                    preparing ||
                    live === null ||
                    (mode === "photo" ? !image : !text.trim())
                  }
                  onClick={() => void extract()}
                >
                  {t.check}
                  <ArrowRight size={19} />
                </button>
                <p className="privacy-caption">
                  <ShieldCheck size={13} />
                  {t.localPrivacy}
                </p>
                {live === false && (
                  <p className="availability">
                    <Info size={14} />
                    {t.liveUnavailable}
                  </p>
                )}
                {live === true && (
                  <p className="live-ready">
                    <span />
                    {t.liveReady}
                  </p>
                )}
              </section>
              <aside
                className="story-panel"
                aria-label={
                  lang === "ko" ? "서비스 예시" : "An illustrative comparison"
                }
              >
                <div className="story-heading">
                  <span className="tiny-label">
                    <span />
                    {t.paperTag}
                  </span>
                  <h2>
                    {t.paperTitle.split("\n").map((line, i) => (
                      <span key={line}>
                        {line}
                        {i === 0 && <br />}
                      </span>
                    ))}
                  </h2>
                  <p>{t.paperSub}</p>
                </div>
                <div className="paper-stack">
                  <div className="paper-sheet paper-back" />
                  <div className="paper-sheet paper-main">
                    <div className="paper-top">
                      <FileText size={16} />
                      <span>NOTICE / 2026</span>
                      <span className="paper-stamp">
                        <Check size={13} />
                      </span>
                    </div>
                    <div className="paper-rule" />
                    <p className="paper-field">{t.paperDeadline}</p>
                    <div className="paper-date">
                      <span>{t.paperOld}</span>
                      <ArrowRight size={18} />
                      <strong>{t.paperNew}</strong>
                    </div>
                    <span className="change-chip">
                      <RefreshCw size={11} />
                      {t.paperChange}
                    </span>
                    <div className="paper-rule" />
                    <p className="paper-field">
                      <MapPin size={13} />
                      {t.paperPlace}
                    </p>
                    <div className="paper-location">
                      <span>{t.paperOldPlace}</span>
                      <strong>{t.paperNewPlace}</strong>
                    </div>
                    <div className="paper-lines">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="evidence-seal">
                      <ShieldCheck size={16} />
                      <span>{t.evidence}</span>
                      <Check size={13} />
                    </div>
                  </div>
                </div>
                <p className="illustration-caption">{t.paperFoot}</p>
                <span className="decor-dot dot-one" />
                <span className="decor-dot dot-two" />
              </aside>
            </div>
            <section className="examples-section">
              <div>
                <h2>{t.exampleHeading}</h2>
                <p>{t.exampleNote}</p>
              </div>
              <div className="example-grid">
                {(["deadline", "cancelled", "identity"] as DemoId[]).map(
                  (id, i) => (
                    <button
                      key={id}
                      className="example-card"
                      onClick={() => void example(id)}
                    >
                      <span className={`example-icon example-icon-${i}`}>
                        {i === 0 ? (
                          <CalendarDays size={18} />
                        ) : i === 1 ? (
                          <Info size={18} />
                        ) : (
                          <FileCheck2 size={18} />
                        )}
                      </span>
                      <span>{t[("example" + (i + 1)) as CopyKey]}</span>
                      <ArrowUpRight size={16} />
                    </button>
                  ),
                )}
              </div>
            </section>
          </>
        )}

        {stage === "review" && notice && (
          <section className="flow-container">
            <button
              className="back-button"
              onClick={() => {
                setStage("input");
                setError(null);
              }}
            >
              <ArrowLeft size={16} />
              {t.back}
            </button>
            <div className="flow-heading">
              <span className="tiny-label">01 / 03</span>
              <h1 tabIndex={-1}>{t.reviewTitle}</h1>
              <p>{t.reviewDesc}</p>
            </div>
            <div className="review-card">
              <div className="notice-head-icon">
                <FileText size={25} />
              </div>
              <label className="field-label">
                {t.titleLabel}
                <input
                  value={notice.title}
                  maxLength={300}
                  onChange={(e) =>
                    setNotice({ ...notice, title: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                {t.institution}
                <input
                  value={notice.institution}
                  maxLength={300}
                  onChange={(e) =>
                    setNotice({ ...notice, institution: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                {t.edition}
                <input
                  value={notice.edition ?? ""}
                  maxLength={100}
                  onChange={(e) =>
                    setNotice({ ...notice, edition: e.target.value || null })
                  }
                />
              </label>
              <label className="field-label">
                {t.noticeCountry}
                <select
                  value={notice.country || ""}
                  onChange={(e) => {
                    setNotice({ ...notice, country: e.target.value || null });
                    setCountryConfirmed(false);
                  }}
                >
                  <option value="">{t.unset}</option>
                  {countryCodes
                    .map((code) => ({ code, name: countryName(code, lang) }))
                    .sort((a, b) => a.name.localeCompare(b.name, lang))
                    .map(({ code, name }) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="notice-metadata">
                <button
                  className="text-button"
                  onClick={() => setCountryOpen(true)}
                >
                  <Globe2 size={15} />
                  {t.country}: {countryName(country, lang)}
                  <ChevronDown size={13} />
                </button>
              </div>
              <div className="read-fields">
                {notice.fields.map((f, i) => (
                  <div key={f.key + i}>
                    <span>{t[("key_" + f.key) as CopyKey]}</span>
                    <strong>{f.value}</strong>
                  </div>
                ))}
              </div>
              {!notice.fields.length && (
                <p className="notice-warning">{t.noFields}</p>
              )}
              <details className="transcript">
                <summary>
                  {t.original}
                  <ChevronDown size={15} />
                </summary>
                <p>{notice.originalText}</p>
                <button
                  className="text-button"
                  onClick={() => {
                    setText(notice.originalText.slice(0, 18000));
                    setMode("text");
                    setNotice(null);
                    setStage("input");
                  }}
                >
                  {t.editText}
                  <ArrowRight size={14} />
                </button>
              </details>
              {mismatch && (
                <div className="mismatch-box" role="alert">
                  <p>
                    <AlertTriangle size={16} />
                    {t.mismatch}
                  </p>
                  <div>
                    <span>{countryName(country, lang)}</span>
                    <ArrowRight size={15} />
                    <strong>{countryName(notice.country, lang)}</strong>
                  </div>
                  <div className="mismatch-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setCountry(notice.country);
                        setCountryConfirmed(true);
                      }}
                    >
                      {t.useNoticeCountry}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setCountryConfirmed(true)}
                    >
                      {t.keepCountry}
                    </button>
                  </div>
                </div>
              )}
              <label className="field-label source-input-label">
                {t.sourceLabel}
                <span>{t.optional}</span>
                <div className="url-input">
                  <Link2 size={17} />
                  <input
                    type="url"
                    value={sourceUrl}
                    maxLength={2000}
                    placeholder={t.sourcePlaceholder}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>
              </label>
              <p className="field-hint">{t.sourceHint}</p>
              {error && (
                <div className="inline-error" role="alert">
                  <AlertTriangle size={17} />
                  {error === "countryConfirm"
                    ? t.countryConfirm
                    : errorText(error, lang)}
                </div>
              )}
              <button
                className="primary full"
                disabled={mismatch || !notice.title.trim()}
                onClick={() => void runCheck()}
              >
                {t.checkNow}
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}

        {stage === "processing" && (
          <section className="progress-screen" aria-live="polite">
            <div className="progress-orbit">
              <span />
              <ScanLine size={36} strokeWidth={1.3} />
              <i />
            </div>
            <h1 tabIndex={-1}>{t.progressTitle}</h1>
            <p>{t.progressDesc}</p>
            <div className="progress-steps">
              {(step === "extract"
                ? ["extract"]
                : step === "resume"
                  ? ["resume"]
                  : ["search", "sources", "compare"]
              ).map((s, i, all) => {
                const current = all.indexOf(step),
                  complete = i < current;
                return (
                  <div
                    className={
                      s === step ? "current" : complete ? "complete" : ""
                    }
                    key={s}
                  >
                    <span>
                      {complete ? (
                        <Check size={16} />
                      ) : s === step ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <i />
                      )}
                    </span>
                    {t[("phase_" + s) as CopyKey]}
                  </div>
                );
              })}
            </div>
            <p className="progress-hint">{t.takesTime}</p>
            <button className="secondary" onClick={() => void cancel()}>
              <X size={16} />
              {t.cancel}
            </button>
          </section>
        )}

        {stage === "result" && result && (
          <section className="result-container">
            <button className="back-button" onClick={reset}>
              <ArrowLeft size={16} />
              {t.newCheck}
            </button>
            {result.mode === "demo" && (
              <div className="demo-banner">
                <Sparkles size={18} />
                <div>
                  <strong>{t.synthetic}</strong>
                  <p>{t.syntheticDesc}</p>
                </div>
              </div>
            )}
            <div className={`result-heading result-${result.status}`}>
              <div className="result-status-icon">
                {["review", "unavailable"].includes(result.status) ? (
                  <Search size={27} />
                ) : result.status === "cancelled" ? (
                  <Info size={27} />
                ) : (
                  <CheckCheck size={28} />
                )}
              </div>
              <span className="tiny-label">{t.resultEyebrow}</span>
              <h1 tabIndex={-1}>{t[("status_" + result.status) as CopyKey]}</h1>
              <p>{t[("desc_" + result.status) as CopyKey]}</p>
              <div className="result-notice-name">{result.title}</div>
              <div className="result-meta">
                <span>
                  <Building2 size={14} />
                  {result.institution || "—"}
                </span>
                {result.country && (
                  <span>
                    <Globe2 size={14} />
                    {countryName(result.country, lang)}
                  </span>
                )}
                <span>
                  <Clock3 size={14} />
                  {result.mode === "demo"
                    ? t.demoStamp
                    : timeLabel(result.checkedAt, lang)}
                </span>
              </div>
            </div>
            <div className="result-grid">
              <div className="comparison-list">
                {!result.comparisons.length && (
                  <div className="empty-comparison">
                    <FileText size={25} />
                    <p>{t.noComparison}</p>
                  </div>
                )}
                {result.comparisons.map((f, i) => (
                  <article
                    className={`comparison-card ${f.verified ? f.relation : "unclear"}`}
                    key={f.sourceId + f.key + i}
                  >
                    <div className="comparison-title">
                      <h2>{t[("key_" + f.key) as CopyKey]}</h2>
                      <span className="comparison-badge">
                        {!f.verified ? (
                          t.uncertain
                        ) : f.relation === "same" ? (
                          <>
                            <Check size={12} />
                            {t.same}
                          </>
                        ) : (
                          <>
                            <RefreshCw size={12} />
                            {t.changed}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="value-comparison">
                      <div>
                        <small>{t.originalValue}</small>
                        <p>{f.before || "—"}</p>
                      </div>
                      <span className="compare-arrow">
                        <ArrowRight size={17} />
                      </span>
                      <div>
                        <small>{t.currentValue}</small>
                        <p>{f.after || "—"}</p>
                      </div>
                    </div>
                    <details className="evidence-details">
                      <summary>
                        <FileCheck2 size={15} />
                        {t.showEvidence}
                        <ChevronDown size={14} />
                      </summary>
                      <div className="evidence-quotes">
                        <div>
                          <small>{t.originalQuote}</small>
                          <blockquote>
                            {f.beforeQuote || t.noEvidence}
                          </blockquote>
                        </div>
                        <div>
                          <small>{t.sourceQuote}</small>
                          <blockquote>
                            {f.afterQuote || t.noEvidence}
                          </blockquote>
                        </div>
                      </div>
                      {!f.verified && (
                        <p className="evidence-warning">
                          <Info size={14} />
                          {t.noEvidence}
                        </p>
                      )}
                      {result.mode !== "demo" &&
                        result.sources.find((s) => s.id === f.sourceId) && (
                          <a
                            href={
                              result.sources.find((s) => s.id === f.sourceId)!
                                .url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t.openSource}
                            <ExternalLink size={13} />
                          </a>
                        )}
                    </details>
                  </article>
                ))}
                {!!result.warnings.length && (
                  <div className="result-warnings">
                    {result.warnings.map((w) => (
                      <p key={w}>
                        <Info size={15} />
                        <span>
                          {t[("warning_" + w) as CopyKey] || t.warning_evidence}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <aside className="result-sidebar">
                <section className="next-step-card">
                  <span className="tiny-label">
                    <span />
                    {t.nextTitle}
                  </span>
                  <h2>
                    {["review", "unavailable"].includes(result.status)
                      ? t.nextReview
                      : t.nextLive}
                  </h2>
                  {result.sources[0] && result.mode !== "demo" && (
                    <a
                      className="primary full"
                      href={result.sources[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.openSource}
                      <ArrowUpRight size={17} />
                    </a>
                  )}
                  <button
                    className="secondary full"
                    onClick={() => void copySummary()}
                  >
                    <Copy size={15} />
                    {t.copy}
                  </button>
                  {notice && result.mode === "live" && (
                    <button
                      className="text-button"
                      onClick={() => void runCheck()}
                    >
                      <RefreshCw size={14} />
                      {t.recheck}
                    </button>
                  )}
                </section>
                <section className="sources-card">
                  <h2>
                    <ShieldCheck size={17} />
                    {t.sourcesTitle}
                  </h2>
                  {result.sources.map((s) => (
                    <div className="source-entry" key={s.id}>
                      <div className="source-index">
                        <FileText size={16} />
                        <span>
                          {result.mode === "demo"
                            ? t.syntheticSource
                            : new URL(s.url).hostname}
                        </span>
                      </div>
                      <p>{s.title}</p>
                      {result.mode !== "demo" && (
                        <>
                          <small>
                            {s.authority === "registered"
                              ? t.sourceRegistered
                              : t.sourceUnverified}
                          </small>
                          <small>
                            {t.fetched}: {timeLabel(s.fetchedAt, lang)}
                          </small>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t.openSource}
                            <ArrowUpRight size={13} />
                          </a>
                        </>
                      )}
                    </div>
                  ))}
                  {!result.sources.length && (
                    <p className="muted">{t.noComparison}</p>
                  )}
                </section>
                {!!result.candidates.length && notice && (
                  <section className="sources-card">
                    <h2>{t.candidatesTitle}</h2>
                    <p className="muted">{t.candidatesHint}</p>
                    {result.candidates.map((c) => (
                      <div className="source-entry" key={c.url}>
                        <p>{c.title}</p>
                        <small>{new URL(c.url).hostname}</small>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSourceUrl(c.url);
                            void runCheck(c.url);
                          }}
                        >
                          {t.useCandidate}
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    ))}
                  </section>
                )}
              </aside>
            </div>
            <div className="result-bottom">
              <p>
                <Info size={15} />
                {t.scope}
              </p>
              <div>
                <button className="secondary" onClick={reset}>
                  {t.newCheck}
                  <ArrowRight size={16} />
                </button>
                <button
                  className="text-button delete-button"
                  onClick={() => setDialog("delete")}
                >
                  <Trash2 size={14} />
                  {t.deleteResult}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <div>
          <span className="footer-mark">
            <ScanLine size={16} />
            StillValid.
          </span>
          <p>{t.footer}</p>
        </div>
        <nav>
          <button onClick={() => setDialog("privacy")}>{t.privacy}</button>
          <a
            href={`${GitHub}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.codeLicense}
          </a>
          <a href={GitHub} target="_blank" rel="noopener noreferrer">
            {t.github}
            <ArrowUpRight size={12} />
          </a>
        </nav>
        <p className="footer-copyright" lang="en">
          <strong>Copyright 2026 Zoogom. All rights reserved.</strong>
        </p>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={17} />
          {toast}
        </div>
      )}
      {countryOpen && (
        <Modal title={t.country} close={closeCountry}>
          <CountryPicker
            value={country}
            setValue={setCountryValue}
            lang={lang}
            close={closeCountry}
          />
        </Modal>
      )}
      {cropping && image && (
        <CropModal
          image={image}
          lang={lang}
          close={closeCrop}
          done={(updated) => {
            setImage(updated);
            setCropping(false);
          }}
        />
      )}
      {dialog && (
        <Modal
          title={
            dialog === "how"
              ? t.howTitle
              : dialog === "about"
                ? t.aboutTitle
                : dialog === "privacy"
                  ? t.privacyTitle
                  : t.deleteAsk
          }
          close={closeDialog}
        >
          {dialog === "how" && (
            <div className="how-list">
              {[1, 2, 3].map((n) => (
                <div key={n}>
                  <span>{String(n).padStart(2, "0")}</span>
                  <div>
                    <h3>{t[("step" + n + "Title") as CopyKey]}</h3>
                    <p>{t[("step" + n + "Desc") as CopyKey]}</p>
                  </div>
                </div>
              ))}
              <p className="modal-footnote">{t.scope}</p>
            </div>
          )}
          {dialog === "about" && (
            <div className="prose">
              <p>{t.aboutBody}</p>
              <p>{t.aboutMeta}</p>
              <p className="modal-footnote">{t.safety}</p>
              <a
                className="text-button"
                href={GitHub}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
                <ArrowUpRight size={14} />
              </a>
            </div>
          )}
          {dialog === "privacy" && (
            <div className="prose">
              <p>{t.privacyBody}</p>
              <p>{t.privacyMore}</p>
              <a
                href="https://dev.meta.ai/docs/models"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.privacyMeta}
                <ArrowUpRight size={13} />
              </a>
              <button
                className="text-button delete-button"
                onClick={async () => {
                  if (
                    !window.confirm(
                      lang === "ko"
                        ? "이 세션의 모든 확인 결과를 삭제할까요?"
                        : "Delete all check results in this session?",
                    )
                  )
                    return;
                  try {
                    const response = await fetch("/api/session", {
                      method: "DELETE",
                    });
                    if (!response.ok) throw new Error("network");
                    reset();
                    setDialog(null);
                    setToast(t.deleted);
                  } catch {
                    setToast(errorText("network", lang));
                  }
                }}
              >
                <Trash2 size={14} />
                {lang === "ko"
                  ? "이 세션의 모든 결과 삭제"
                  : "Delete all results in this session"}
              </button>
            </div>
          )}
          {dialog === "delete" && (
            <div className="delete-dialog">
              <p className="muted">
                {result?.mode === "demo" ? t.synthetic : t.scope}
              </p>
              <div>
                <button className="secondary" onClick={closeDialog}>
                  {t.close}
                </button>
                <button
                  className="primary danger"
                  onClick={() => void deleteResult()}
                >
                  <Trash2 size={16} />
                  {t.deleteConfirm}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
