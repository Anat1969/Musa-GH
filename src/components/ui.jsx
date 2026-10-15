import { useState } from "react";
import { MODES } from "../data.js";

/* תמונה בתוך מסגרת עם קווי בנייה: שלישים, חתך הזהב והמרידיאן. נכנסת בעמעום כשהיא נטענת */
export function Frame({ src, alt = "", ratio = "16 / 9", lines = true, eager = false, className = "", children }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`frame${loaded ? " is-loaded" : ""} ${className}`} style={{ aspectRatio: ratio }}>
      {!failed && src
        ? <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        : <div className="frame-empty">
            <svg viewBox="0 0 320 180" aria-hidden="true">
              <path d="M20 160 H300" /><path d="M40 160 V40 H280 V160" /><path d="M70 160 V95 a35 35 0 0 1 70 0 V160" />
              <path d="M190 70 H250 V120 H190 Z" /><path d="M160 12 V180" className="m" />
            </svg>
            <span>{src ? "התמונה לא נטענה" : "התמונה ממתינה"}</span>
          </div>}
      {lines && (
        <svg className="frame-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="33.333" y1="0" x2="33.333" y2="100" />
          <line x1="66.666" y1="0" x2="66.666" y2="100" />
          <line x1="0" y1="61.8" x2="100" y2="61.8" />
          <line x1="0" y1="38.2" x2="100" y2="38.2" className="faint" />
        </svg>
      )}
      {children}
    </figure>
  );
}

export function ModeTag({ mode, plain = false }) {
  const m = MODES[mode] || MODES.board;
  return (
    <span className={`mode-tag mode-${m.id}${plain ? " plain" : ""}`}>
      <i aria-hidden="true" />{m.name}
    </span>
  );
}

export function Label({ n, children }) {
  return (
    <div className="label">
      {n && <span className="label-n">{n}</span>}
      <span>{children}</span>
    </div>
  );
}

/* הפרומפט שמור בתוך כפתורי העתקה. הטקסט עצמו נפתח רק לפי בקשה */
export function PromptCopy({ prompt, toMj }) {
  const [copied, setCopied] = useState("");
  async function copy(kind) {
    const text = kind === "mj" ? toMj(prompt) : prompt;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch {}
      t.remove();
    }
    setCopied(kind); setTimeout(() => setCopied(""), 1800);
  }
  return (
    <div className="prompt-copy">
      <button className="btn btn-dark" onClick={() => copy("mj")} data-act="copy-mj">{copied === "mj" ? "הועתק. מוכן להדבקה במידג׳רני" : "העתקת הפרומפט למידג׳רני"}</button>
      <button className="btn" onClick={() => copy("p")} data-act="copy-prompt">{copied === "p" ? "הועתק" : "העתקת הפרומפט החזותי"}</button>
      <details className="prompt-peek">
        <summary>הצגת הפרומפט</summary>
        <p className="prompt" dir="ltr">{prompt}</p>
      </details>
    </div>
  );
}

export function Loading({ text = "טוען את הארכיון" }) {
  return <div className="state" role="status"><span className="pulse" />{text}</div>;
}
