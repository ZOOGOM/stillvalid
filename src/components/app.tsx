"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Cropper, { type Area } from "react-easy-crop";
import Image from "next/image";
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
  ScanSearch,
  Undo2,
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
import { resultCopy, type ResultCopyKey } from "@/lib/result-i18n";
import { sourceWarningText } from "@/lib/source-warnings";
import {
  isResultLang,
  resultDirection,
  resultLanguageOptions,
  resultLocale,
  type ResultLang,
} from "@/lib/languages";
import type { Lang, Notice, Result } from "@/lib/schema";
import type { DemoId } from "@/lib/demo";
import { loadImage, prepareImage, transformImage } from "./image";

type Stage = "input" | "review" | "processing" | "result";
type Dialog = "how" | "about" | "privacy" | "delete" | null;
type ProgressStep = "extract" | "search" | "sources" | "compare" | "resume";
const GitHub = "https://github.com/ZOOGOM/stillvalid";
async function responseError(response: Response, tooLarge: string) {
  // Hosting platforms can reject a request before the app returns JSON.
  if (response.status === 413) return tooLarge;
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
    )
      return body.error;
  } catch {
    // A non-JSON error response is still an HTTP failure, not a network error.
  }
  return "default";
}
function countryName(code: string | null, lang: ResultLang) {
  return code
    ? new Intl.DisplayNames([resultLocale(lang)], { type: "region" }).of(
        code,
      ) || code
    : copy(lang).unset;
}
type ClientTiming = {
  prepareMs?: number;
  extractMs?: number;
  extractServerMs?: number;
  extractCalls?: number;
  extractedAt?: number;
  reviewMs?: number;
  checkMs?: number;
};
function seconds(ms: number, lang: ResultLang): string {
  return new Intl.NumberFormat(resultLocale(lang), {
    style: "unit",
    unit: "second",
    unitDisplay: "short",
    maximumFractionDigits: ms < 10000 ? 1 : 0,
  }).format(ms / 1000);
}
function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
function timeLabel(value: string, lang: ResultLang) {
  return new Intl.DateTimeFormat(resultLocale(lang), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: undefined,
  }).format(new Date(value));
}

function Modal({
  children,
  title,
  close,
  closeLabel,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  close: () => void;
  closeLabel: string;
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
            aria-label={closeLabel}
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
  setLang,
  close,
}: {
  value: string | null;
  setValue: (v: string | null) => void;
  lang: Lang;
  setLang: (v: Lang) => void;
  close: () => void;
}) {
  const t = copy(lang),
    [query, setQuery] = useState(""),
    [remember, setRemember] = useState(false),
    [locationStatus, setLocationStatus] = useState<
      | "idle"
      | "pending"
      | "detected"
      | "denied"
      | "timeout"
      | "uncertain"
      | "secure"
      | "unavailable"
    >("idle"),
    [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const locationGeneration = useRef(0),
    rememberRef = useRef(false);
  useEffect(
    () => () => {
      locationGeneration.current++;
    },
    [],
  );
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sv_remember_country") === "true";
      rememberRef.current = saved;
      setRemember(saved);
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
  const cancelLocation = () => {
    locationGeneration.current++;
    setLocationStatus("idle");
    setDetectedCountry(null);
  };
  const applyCountry = (code: string | null) => {
    setValue(code);
    try {
      if (rememberRef.current && code) localStorage.setItem("sv_country", code);
      else localStorage.removeItem("sv_country");
    } catch {}
  };
  const choose = (code: string | null) => {
    cancelLocation();
    applyCountry(code);
    close();
  };
  const detectLocation = () => {
    const generation = ++locationGeneration.current;
    setDetectedCountry(null);
    if (!window.isSecureContext) {
      setLocationStatus("secure");
      return;
    }
    try {
      if (!navigator.geolocation) {
        setLocationStatus("unavailable");
        return;
      }
      setLocationStatus("pending");
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const { countryFromPosition } = await import("@/lib/location");
            if (generation !== locationGeneration.current) return;
            const code = countryFromPosition(
              coords.latitude,
              coords.longitude,
              coords.accuracy,
            );
            if (!code) {
              setLocationStatus("uncertain");
              return;
            }
            applyCountry(code);
            setDetectedCountry(code);
            setLocationStatus("detected");
          } catch {
            if (generation === locationGeneration.current)
              setLocationStatus("unavailable");
          }
        },
        (error) => {
          if (generation !== locationGeneration.current) return;
          setLocationStatus(
            error.code === 1
              ? "denied"
              : error.code === 3
                ? "timeout"
                : "unavailable",
          );
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    } catch {
      if (generation === locationGeneration.current)
        setLocationStatus("unavailable");
    }
  };
  const locationMessage =
    locationStatus === "pending"
      ? t.locationDetecting
      : locationStatus === "detected" && detectedCountry
        ? t.locationDetected.replace(
            "{country}",
            countryName(detectedCountry, lang),
          )
        : locationStatus === "denied"
          ? t.locationDenied
          : locationStatus === "timeout"
            ? t.locationTimeout
            : locationStatus === "uncertain"
              ? t.locationUncertain
              : locationStatus === "secure"
                ? t.locationSecure
                : locationStatus === "unavailable"
                  ? t.locationUnavailable
                  : "";
  return (
    <>
      <div className="settings-language-fields">
        <label className="settings-field">
          {t.displayLanguage}
          <select
            value={lang}
            onChange={(e) => {
              if (isResultLang(e.target.value)) setLang(e.target.value);
            }}
          >
            {resultLanguageOptions.map(({ code, nativeName, englishName }) => (
              <option key={code} value={code} dir="auto">
                {nativeName}
                {nativeName !== englishName ? ` · ${englishName}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <h3>{t.country}</h3>
      <p className="muted modal-intro">{t.countryHint}</p>
      <button
        className="secondary"
        onClick={detectLocation}
        disabled={locationStatus === "pending"}
      >
        <MapPin size={16} /> {t.locationDetect}
      </button>
      {locationStatus === "pending" && (
        <button className="text-button" onClick={cancelLocation}>
          {t.locationCancel}
        </button>
      )}
      {locationMessage && <p role="status">{locationMessage}</p>}
      <p className="muted">
        {t.locationPrivacy}{" "}
        <a
          href="/licenses/country-coder.txt"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.locationLicense}
        </a>
      </p>
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
              rememberRef.current = checked;
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
            cancelLocation();
            rememberRef.current = false;
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
    <Modal title={t.cropTitle} close={close} closeLabel={t.closeLabel} wide>
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
    t = copy(lang),
    rt = resultCopy(lang);
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
  // The photo before an automatic notice crop, so it can be restored.
  const [beforeAutoCrop, setBeforeAutoCrop] = useState<string | null>(null);
  // Client-observed stage durations for the current flow (not stored).
  const timings = useRef<ClientTiming>({});
  const [clientTiming, setClientTiming] = useState<ClientTiming>({});
  const [progressStarted, setProgressStarted] = useState<number | null>(null),
    [progressNow, setProgressNow] = useState(0);
  useEffect(() => {
    if (stage !== "processing") {
      setProgressStarted(null);
      return;
    }
    const begin = Date.now();
    setProgressStarted(begin);
    setProgressNow(begin);
    const tick = setInterval(() => setProgressNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [stage]);
  const [live, setLive] = useState<boolean | null>(null),
    [error, setError] = useState<string | null>(null),
    [toast, setToast] = useState<{ text: string; lang: ResultLang } | null>(
      null,
    ),
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
    const browserLang = navigator.language.toLowerCase().split(/[-_]/)[0];
    const readPreference = (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    };
    const candidates = [
      readPreference("sv_display_lang"),
      readPreference("sv_result_lang"),
      readPreference("sv_lang"),
      browserLang,
    ];
    setLang(candidates.find(isResultLang) ?? "en");
    if (readPreference("sv_remember_country") === "true") {
      const saved = readPreference("sv_country");
      if (saved && countryCodes.includes(saved)) setCountry(saved);
    }
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
    document.documentElement.lang = resultLocale(lang);
    document.documentElement.dir = resultDirection(lang);
    if (prefsLoaded) {
      try {
        localStorage.setItem("sv_display_lang", lang);
        localStorage.removeItem("sv_result_lang");
        localStorage.removeItem("sv_lang");
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
    setClientTiming({});
    timings.current = {};
    controller.current?.abort();
    operation.current++;
    uploadGeneration.current++;
    busy.current = false;
    setStage("input");
    setResult(null);
    setNotice(null);
    setImage(null);
    setBeforeAutoCrop(null);
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
      const prepareStart = performance.now();
      const prepared = await prepareImage(file);
      timings.current = { prepareMs: performance.now() - prepareStart };
      if (generation === uploadGeneration.current) {
        setImage(prepared);
        setBeforeAutoCrop(null);
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
  // Opt-in: one SAM 3.1 call finds the printed notice and crops to it, with a
  // small margin. The user can undo, crop by hand or rotate as before.
  const autoFind = async () => {
    if (!image || preparing || !live) return;
    const generation = ++uploadGeneration.current;
    setPreparing(true);
    setError(null);
    try {
      const response = await fetch("/api/locate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (!response.ok)
        throw new Error(await responseError(response, "upload_too_large"));
      const data = (await response.json()) as {
        box: {
          x1: number;
          y1: number;
          x2: number;
          y2: number;
          w: number;
          h: number;
        } | null;
      };
      if (generation !== uploadGeneration.current) return;
      if (!data.box) {
        setToast({ text: t.autoFindNone, lang });
        return;
      }
      const loaded = await loadImage(image);
      const sx = loaded.naturalWidth / data.box.w,
        sy = loaded.naturalHeight / data.box.h;
      const marginX = loaded.naturalWidth * 0.02,
        marginY = loaded.naturalHeight * 0.02;
      const x = Math.max(0, data.box.x1 * sx - marginX),
        y = Math.max(0, data.box.y1 * sy - marginY);
      const area = {
        x,
        y,
        width:
          Math.min(loaded.naturalWidth, (data.box.x2 + 1) * sx + marginX) - x,
        height:
          Math.min(loaded.naturalHeight, (data.box.y2 + 1) * sy + marginY) - y,
      };
      const cropped = await transformImage(image, 0, area);
      if (generation !== uploadGeneration.current) return;
      setBeforeAutoCrop(image);
      setImage(cropped);
      setToast({ text: t.autoFindDone, lang });
    } catch (e) {
      if (generation === uploadGeneration.current)
        setError(e instanceof Error ? e.message : "network");
    } finally {
      if (generation === uploadGeneration.current) setPreparing(false);
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
    const extractStart = performance.now();
    if (mode === "text") timings.current = {};
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
      if (!response.ok)
        throw new Error(await responseError(response, "upload_too_large"));
      const data = await response.json();
      if (abort.signal.aborted || operation.current !== generation) return;
      timings.current = {
        prepareMs: timings.current.prepareMs,
        extractMs: performance.now() - extractStart,
        extractServerMs: data.timing?.extractMs,
        extractCalls: data.timing?.modelCalls,
        extractedAt: performance.now(),
      };
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
    const checkStart = performance.now();
    const reviewMs =
      timings.current.extractedAt !== undefined
        ? checkStart - timings.current.extractedAt
        : undefined;
    const finishTiming = () => {
      // Photo and reading stages belong only to the first check after them.
      const observed =
        reviewMs === undefined
          ? { checkMs: performance.now() - checkStart }
          : {
              ...timings.current,
              reviewMs,
              checkMs: performance.now() - checkStart,
            };
      // A recheck of the same notice is not a new review period.
      timings.current = { ...timings.current, extractedAt: undefined };
      setClientTiming(observed);
    };
    try {
      const response = await fetch("/api/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notice,
          country,
          lang: lang,
          sourceUrl: overrideUrl ?? sourceUrl,
          requestKey: crypto.randomUUID(),
        }),
        signal: abort.signal,
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "too_large"));
      }
      if (response.headers.get("content-type")?.includes("application/json")) {
        const saved = await response.json();
        if (!saved.result) throw new Error("busy");
        if (abort.signal.aborted || operation.current !== generation) return;
        finishTiming();
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
            finishTiming();
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
        setToast({ text: errorText("network", lang), lang });
        setDialog(null);
        return;
      }
    }
    setDialog(null);
    reset();
    setToast({ text: t.deleted, lang });
  };
  const copySummary = async () => {
    if (!result) return;
    const summary = [
      "StillValid · " + rt[("status_" + result.status) as ResultCopyKey],
      result.title,
      rt[("desc_" + result.status) as ResultCopyKey],
      result.mode === "demo"
        ? rt.syntheticDesc
        : rt.checked + ": " + timeLabel(result.checkedAt, lang),
      ...result.comparisons.map(
        (f) =>
          `${rt[("key_" + f.key) as ResultCopyKey]}: ${f.before ?? "—"} → ${f.after ?? "—"} (${f.verified ? rt[f.relation === "same" ? "same" : "changed"] : rt.uncertain})`,
      ),
      ...result.warnings.map(
        (w) =>
          sourceWarningText(w, lang) ||
          rt[("warning_" + w) as ResultCopyKey] ||
          rt.warning_evidence,
      ),
      rt.nextTitle +
        ": " +
        (["review", "unavailable"].includes(result.status)
          ? rt.nextReview
          : rt.nextLive),
      ...result.sources.map((s) =>
        result.mode === "demo" ? rt.syntheticSource : s.url,
      ),
      rt.scope,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setToast({ text: rt.copied, lang: lang });
    } catch {
      setToast({ text: rt.copyFailed, lang: lang });
    }
  };

  // Per-candidate outcomes replace source-specific warnings in the summary
  // list, so one unreadable or oversized candidate does not read as a failure
  // of every source.
  const perSourceView = !!result?.attempts?.length && result.mode !== "demo";
  const perCandidateWarning = (w: string) =>
    w.startsWith("source_") || w === "fetch" || w === "network";
  const shownWarnings = !result
    ? []
    : perSourceView
      ? [
          ...result.warnings.filter((w) => !perCandidateWarning(w)),
          ...(result.warnings.some(perCandidateWarning) ? ["attempts"] : []),
        ]
      : result.warnings;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t.skipToContent}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => {
              if (stage !== "processing") reset();
            }}
            aria-label={t.homeLabel}
          >
            <span className="brand-icon" aria-hidden="true">
              <Image
                src="/icons/stillvalid-192.png"
                alt=""
                width={36}
                height={36}
                loading="eager"
                unoptimized
              />
            </span>
            <span dir="ltr">
              Still<span className="brand-light">Valid</span>
              <span className="brand-dot">.</span>
            </span>
          </button>
          <nav aria-label={t.mainNavigation}>
            <button onClick={() => setDialog("how")}>{t.navHow}</button>
            <button className="about-nav" onClick={() => setDialog("about")}>
              {t.navAbout}
            </button>
            <span className="nav-divider" />
            <button
              className="language-button"
              onClick={() => setCountryOpen(true)}
              aria-label={t.settings}
            >
              <Globe2 size={16} />
              <span>{t.settings}</span>
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
                  aria-label={t.inputMethod}
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
                        <img src={image} alt={t.imagePreview} />
                        <div className="image-toolbar">
                          <span title={imageName} dir="auto">
                            {imageName}
                          </span>
                          {live === true &&
                            (beforeAutoCrop ? (
                              <button
                                aria-label={t.autoFindUndo}
                                title={t.autoFindUndo}
                                disabled={preparing}
                                onClick={() => {
                                  uploadGeneration.current++;
                                  setImage(beforeAutoCrop);
                                  setBeforeAutoCrop(null);
                                }}
                              >
                                <Undo2 size={17} />
                              </button>
                            ) : (
                              <button
                                aria-label={t.autoFind}
                                title={t.autoFind}
                                disabled={preparing}
                                onClick={() => void autoFind()}
                              >
                                <ScanSearch size={17} />
                              </button>
                            ))}
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
                                if (generation === uploadGeneration.current) {
                                  setImage(rotated);
                                  setBeforeAutoCrop(null);
                                }
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
                              setBeforeAutoCrop(null);
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
                      {countryName(country, lang)} · {t.displayLanguage}:{" "}
                      {
                        resultLanguageOptions.find((item) => item.code === lang)
                          ?.nativeName
                      }
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
              <aside className="story-panel" aria-label={t.illustrationLabel}>
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
              {mode === "photo" && image && (
                <div className="image-review">
                  <p className="notice-warning">{t.imageReviewWarning}</p>
                  <details className="transcript" open>
                    <summary>
                      {t.imagePreview}
                      <ChevronDown size={15} />
                    </summary>
                    <img src={image} alt={t.imagePreview} />
                  </details>
                </div>
              )}
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
                    <strong>
                      <bdi>{f.value}</bdi>
                    </strong>
                  </div>
                ))}
              </div>
              {!notice.fields.length && (
                <p className="notice-warning">{t.noFields}</p>
              )}
              <details
                className="transcript"
                open={mode === "photo" && !!image}
              >
                <summary>
                  {t.original}
                  <ChevronDown size={15} />
                </summary>
                <p dir="auto">{notice.originalText}</p>
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
                    dir="ltr"
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
            {progressStarted !== null && (
              <p className="progress-elapsed" aria-live="off">
                {t.progressElapsed.replace(
                  "{s}",
                  seconds(Math.max(0, progressNow - progressStarted), lang),
                )}
              </p>
            )}
            <p className="progress-hint">
              {t.takesTime} {step !== "extract" && t.progressTypical}
            </p>
            <button className="secondary" onClick={() => void cancel()}>
              <X size={16} />
              {t.cancel}
            </button>
          </section>
        )}

        {stage === "result" && result && (
          <section
            className="result-container"
            lang={lang}
            dir={resultDirection(lang)}
          >
            <button className="back-button" onClick={reset}>
              <ArrowLeft size={16} />
              {rt.newCheck}
            </button>
            {result.mode === "demo" && (
              <div className="demo-banner">
                <Sparkles size={18} />
                <div>
                  <strong>{rt.synthetic}</strong>
                  <p>{rt.syntheticDesc}</p>
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
              <span className="tiny-label">{rt.resultEyebrow}</span>
              <h1 tabIndex={-1}>
                {rt[("status_" + result.status) as ResultCopyKey]}
              </h1>
              <p>{rt[("desc_" + result.status) as ResultCopyKey]}</p>
              <div className="result-notice-name">
                <bdi>{result.title}</bdi>
              </div>
              <div className="result-meta">
                <span>
                  <Building2 size={14} />
                  <bdi>{result.institution || "—"}</bdi>
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
                    ? rt.demoStamp
                    : timeLabel(result.checkedAt, lang)}
                </span>
              </div>
            </div>
            <div className="result-grid">
              <div className="comparison-list">
                {!result.comparisons.length && (
                  <div className="empty-comparison">
                    <FileText size={25} />
                    <p>{rt.noComparison}</p>
                  </div>
                )}
                {result.comparisons.map((f, i) => (
                  <article
                    className={`comparison-card ${f.verified ? f.relation : "unclear"}`}
                    key={f.sourceId + f.key + i}
                  >
                    <div className="comparison-title">
                      <h2>{rt[("key_" + f.key) as ResultCopyKey]}</h2>
                      <span className="comparison-badge">
                        {!f.verified ? (
                          rt.uncertain
                        ) : f.relation === "same" ? (
                          <>
                            <Check size={12} />
                            {rt.same}
                          </>
                        ) : (
                          <>
                            <RefreshCw size={12} />
                            {rt.changed}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="value-comparison">
                      <div>
                        <small>{rt.originalValue}</small>
                        <p dir="auto">{f.before || "—"}</p>
                      </div>
                      <span className="compare-arrow">
                        <ArrowRight size={17} />
                      </span>
                      <div>
                        <small>{rt.currentValue}</small>
                        <p dir="auto">{f.after || "—"}</p>
                      </div>
                    </div>
                    <details className="evidence-details">
                      <summary>
                        <FileCheck2 size={15} />
                        {rt.showEvidence}
                        <ChevronDown size={14} />
                      </summary>
                      <div className="evidence-quotes">
                        <div>
                          <small>{rt.originalQuote}</small>
                          <blockquote dir="auto">
                            {f.beforeQuote || rt.noEvidence}
                          </blockquote>
                        </div>
                        <div>
                          <small>{rt.sourceQuote}</small>
                          <blockquote dir="auto">
                            {f.afterQuote || rt.noEvidence}
                          </blockquote>
                        </div>
                      </div>
                      {!f.verified && (
                        <p className="evidence-warning">
                          <Info size={14} />
                          {rt.noEvidence}
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
                            {rt.openSource}
                            <ExternalLink size={13} />
                          </a>
                        )}
                    </details>
                  </article>
                ))}
                {!!shownWarnings.length && (
                  <div className="result-warnings">
                    {shownWarnings.map((w) => (
                      <p key={w}>
                        <Info size={15} />
                        <span>
                          {w === "attempts"
                            ? rt.attemptsNote
                            : sourceWarningText(w, lang) ||
                              rt[("warning_" + w) as ResultCopyKey] ||
                              rt.warning_evidence}
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
                    {rt.nextTitle}
                  </span>
                  <h2>
                    {["review", "unavailable"].includes(result.status)
                      ? rt.nextReview
                      : rt.nextLive}
                  </h2>
                  {result.sources[0] && result.mode !== "demo" && (
                    <a
                      className="primary full"
                      href={result.sources[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {rt.openSource}
                      <ArrowUpRight size={17} />
                    </a>
                  )}
                  <button
                    className="secondary full"
                    onClick={() => void copySummary()}
                  >
                    <Copy size={15} />
                    {rt.copy}
                  </button>
                  {notice && result.mode === "live" && (
                    <button
                      className="text-button"
                      onClick={() => void runCheck()}
                    >
                      <RefreshCw size={14} />
                      {rt.recheck}
                    </button>
                  )}
                </section>
                <section className="sources-card">
                  <h2>
                    <ShieldCheck size={17} />
                    {perSourceView ? rt.attemptsTitle : rt.sourcesTitle}
                  </h2>
                  {perSourceView
                    ? result.attempts!.map((a, i) => {
                        const s = result.sources.find(
                          (source) => source.id === a.sourceId,
                        );
                        return (
                          <div
                            className={"source-entry attempt-" + a.outcome}
                            key={a.url + i}
                          >
                            <div className="source-index">
                              <FileText size={16} />
                              <span>
                                <bdi>{hostOf(a.url)}</bdi>
                              </span>
                            </div>
                            {s && <p dir="auto">{s.title}</p>}
                            <p className="attempt-outcome">
                              {rt[("attempt_" + a.outcome) as ResultCopyKey]}
                            </p>
                            {a.outcome === "fetch_failed" && (
                              <small>
                                {sourceWarningText(a.code || "", lang) ||
                                  rt[
                                    ("warning_" +
                                      (a.code === "network"
                                        ? "network"
                                        : "fetch")) as ResultCopyKey
                                  ]}
                              </small>
                            )}
                            {a.authority && (
                              <small>
                                {a.authority === "registered"
                                  ? rt.sourceRegistered
                                  : rt.sourceUnverified}
                              </small>
                            )}
                            {a.outcome === "compared" && a.identity && (
                              <small>
                                {
                                  rt[
                                    ("identity_" + a.identity) as ResultCopyKey
                                  ]
                                }
                              </small>
                            )}
                            {a.section && <small>{rt.identity_section}</small>}
                            {a.outcome === "compared" && !!a.fields && (
                              <small>
                                {rt.evidenceCount
                                  .replace("{n}", String(a.verified || 0))
                                  .replace("{m}", String(a.fields))}
                              </small>
                            )}
                            {s && (
                              <small>
                                {rt.fetched}: {timeLabel(s.fetchedAt, lang)}
                              </small>
                            )}
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {a.outcome === "compared" &&
                              a.authority === "registered"
                                ? rt.openSource
                                : rt.openLink}
                              <ArrowUpRight size={13} />
                            </a>
                          </div>
                        );
                      })
                    : result.sources.map((s) => (
                        <div className="source-entry" key={s.id}>
                          <div className="source-index">
                            <FileText size={16} />
                            <span>
                              {result.mode === "demo" ? (
                                rt.syntheticSource
                              ) : (
                                <bdi>{new URL(s.url).hostname}</bdi>
                              )}
                            </span>
                          </div>
                          <p dir="auto">{s.title}</p>
                          {result.mode !== "demo" && (
                            <>
                              <small>
                                {s.authority === "registered"
                                  ? rt.sourceRegistered
                                  : rt.sourceUnverified}
                              </small>
                              <small>
                                {rt.fetched}: {timeLabel(s.fetchedAt, lang)}
                              </small>
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {rt.openSource}
                                <ArrowUpRight size={13} />
                              </a>
                            </>
                          )}
                        </div>
                      ))}
                  {!result.sources.length && (
                    <p className="muted">{rt.noComparison}</p>
                  )}
                </section>
                {!!result.candidates.length && notice && (
                  <section className="sources-card">
                    <h2>{rt.candidatesTitle}</h2>
                    <p className="muted">{rt.candidatesHint}</p>
                    {result.candidates.map((c) => (
                      <div className="source-entry" key={c.url}>
                        <p dir="auto">{c.title}</p>
                        <small>
                          <bdi>{new URL(c.url).hostname}</bdi>
                        </small>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSourceUrl(c.url);
                            void runCheck(c.url);
                          }}
                        >
                          {rt.useCandidate}
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    ))}
                  </section>
                )}
              </aside>
            </div>
            {result.mode === "live" &&
              (result.timing || clientTiming.checkMs !== undefined) && (
                <details className="timing-details">
                  <summary>{rt.timingTitle}</summary>
                  <dl>
                    {(
                      [
                        ["timing_prepare", clientTiming.prepareMs],
                        ["timing_extract", clientTiming.extractMs],
                        ["timing_extractServer", clientTiming.extractServerMs],
                        ["timing_review", clientTiming.reviewMs],
                        ["timing_search", result.timing?.searchMs],
                        ["timing_fetch", result.timing?.fetchMs],
                        ["timing_compare", result.timing?.compareMs],
                        ["timing_total", result.elapsedMs || undefined],
                        ["timing_check", clientTiming.checkMs],
                      ] as [ResultCopyKey, number | undefined][]
                    )
                      // A skipped search (official link given) is not shown.
                      .filter(
                        ([key, ms]) =>
                          ms !== undefined &&
                          !(key === "timing_search" && ms === 0),
                      )
                      .map(([key, ms]) => (
                        <div key={key}>
                          <dt>{rt[key]}</dt>
                          <dd>{seconds(ms!, lang)}</dd>
                        </div>
                      ))}
                  </dl>
                  {result.timing && (
                    <p>
                      {rt.timing_calls.replace(
                        "{n}",
                        String(
                          result.timing.modelCalls +
                            (clientTiming.extractCalls || 0),
                        ),
                      )}
                    </p>
                  )}
                </details>
              )}
            <div className="result-bottom">
              <p>
                <Info size={15} />
                {rt.scope}
              </p>
              <div>
                <button className="secondary" onClick={reset}>
                  {rt.newCheck}
                  <ArrowRight size={16} />
                </button>
                <button
                  className="text-button delete-button"
                  onClick={() => setDialog("delete")}
                >
                  <Trash2 size={14} />
                  {rt.deleteResult}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <div>
          <span className="footer-mark">
            <Image
              src="/icons/stillvalid-192.png"
              alt=""
              width={20}
              height={20}
              unoptimized
            />
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
        <p className="footer-copyright" lang="en" dir="ltr">
          <strong>Copyright 2026 Zoogom. All rights reserved.</strong>
        </p>
      </footer>
      {toast && (
        <div
          className="toast"
          role="status"
          lang={toast.lang}
          dir={resultDirection(toast.lang)}
        >
          <CircleCheck size={17} />
          {toast.text}
        </div>
      )}
      {countryOpen && (
        <Modal
          title={t.settings}
          close={closeCountry}
          closeLabel={t.closeLabel}
        >
          <CountryPicker
            value={country}
            setValue={setCountryValue}
            lang={lang}
            setLang={setLang}
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
            setBeforeAutoCrop(null);
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
          closeLabel={t.closeLabel}
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
              <p>{t.privacyAbuse}</p>
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
                  if (!window.confirm(t.deleteAllConfirm)) return;
                  try {
                    const response = await fetch("/api/session", {
                      method: "DELETE",
                    });
                    if (!response.ok) throw new Error("network");
                    reset();
                    setDialog(null);
                    setToast({ text: t.deleted, lang });
                  } catch {
                    setToast({ text: errorText("network", lang), lang });
                  }
                }}
              >
                <Trash2 size={14} />
                {t.deleteAllResults}
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
