import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MODES, MODE_IDS, PROCESS, SUGGESTIONS, splitSource } from "../data.js";
import { generate } from "../lib/supabase.js";
import { go, href } from "../router.js";
import { Frame, ModeTag, Label } from "./ui.jsx";
import KeyMark from "./KeyMark.jsx";

const STAGE_MS = [4000, 9000, 9000, 22000];

export default function Studio({ initial, gens, onCreated }) {
  const [source, setSource] = useState(initial || "");
  const [mode, setMode] = useState("illustration");
  const [phase, setPhase] = useState("idle"); // idle | working | done | error
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const timers = useRef([]);
  const outRef = useRef(null);

  useEffect(() => { if (initial) setSource(initial); }, [initial]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* המקור כבר בארכיון: אילו אופנים כבר נחקרו */
  const done = useMemo(() => {
    const key = source.trim();
    return new Set(gens.filter(g => g.source.trim() === key).map(g => g.mode));
  }, [gens, source]);

  async function run(fresh = false) {
    const src = source.trim();
    if (!src || phase === "working") return;
    setPhase("working"); setError(""); setResult(null); setStage(0);
    /* בטור אחד הפאנל של התוצאה נמצא מתחת לטופס: גוללים אליו כדי לראות את התהליך */
    if (window.innerWidth <= 1040) requestAnimationFrame(() => outRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    timers.current.forEach(clearTimeout);
    let acc = 0;
    timers.current = STAGE_MS.map((ms, k) => { acc += ms; return setTimeout(() => setStage(k + 1), acc); });
    try {
      const data = await generate(src, mode, fresh);
      timers.current.forEach(clearTimeout);
      setStage(PROCESS.length);
      setResult(data);
      onCreated(data.generation);
      setPhase("done");
    } catch (e) {
      timers.current.forEach(clearTimeout);
      setError(e.message || "משהו השתבש. נסו שוב.");
      setPhase("error");
    }
  }

  const g = result?.generation;
  const ready = source.trim().length > 0;

  return (
    <div className="page studio">
      <header className="page-head">
        <Label n="01">סטודיו</Label>
        <h1>ממילה למרחב</h1>
        <p className="lead">כותבים מקור, בוחרים אופן תרגום, ומקבלים צילום אדריכלי ופרשנות. כל מחקר נשמר בארכיון.</p>
      </header>

      <div className="studio-grid">
        <form className="panel studio-form" onSubmit={e => { e.preventDefault(); run(false); }}>
          <div className="field">
            <Label n="A">מקור ההשראה</Label>
            <textarea
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder={"ספר, שיר, יוצר או מחשבה.\nבשורה השנייה אפשר לכתוב את שם היוצר."}
              rows={4}
              maxLength={600}
              dir="auto"
              data-act="source"
              aria-label="מקור ההשראה"
            />
            <div className="chips" aria-label="דוגמאות">
              {SUGGESTIONS.map(s => (
                <button type="button" key={s} className="chip" onClick={() => setSource(s.replace(", ", "\n"))}>{s}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <Label n="B">אופן התרגום</Label>
            <div className="mode-pick" role="radiogroup" aria-label="אופן התרגום">
              {MODE_IDS.map(id => {
                const m = MODES[id];
                return (
                  <button type="button" key={id} role="radio" aria-checked={mode === id}
                    className={`mode-opt mode-${id}${mode === id ? " on" : ""}`} onClick={() => setMode(id)} data-mode={id}>
                    <span className="mode-opt-top"><span className="mono">{m.n}</span>{done.has(id) && <span className="mono done-mark">בארכיון</span>}</span>
                    <span className="mode-opt-name">{m.name}</span>
                    <span className="mode-opt-line">{m.line}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button className="btn btn-dark btn-lg btn-go" type="submit" disabled={!ready || phase === "working"} data-act="generate">
            {phase === "working" ? "מתרגם למרחב" : "תרגום למרחב"}<KeyMark />
          </button>
          <p className="muted small">
            {done.has(mode)
              ? "המקור הזה כבר נחקר באופן הזה. התרגום יחזיר את המחקר מהארכיון, ומשם אפשר לבקש גרסה נוספת."
              : "תרגום חדש לוקח בערך דקה: קריאה, כתיבת הפרומפט וצילום."}
          </p>
        </form>

        <div className="panel studio-out" aria-live="polite" ref={outRef}>
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div key="idle" className="out-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Blueprint />
                <Label>מה יקרה</Label>
                <ol className="mini-steps">
                  <li><b>קריאה.</b> Claude מזקק את הזהות המרחבית של המקור במשפט אחד.</li>
                  <li><b>פרומפט.</b> נכתב תיאור חזותי לפי האופן שבחרתם: חומר, אור, מצלמה, קומפוזיציה.</li>
                  <li><b>צילום.</b> נוצרת תמונה אדריכלית, ונשמרת בארכיון עם פרשנות בעברית.</li>
                </ol>
              </motion.div>
            )}

            {phase === "working" && (
              <motion.div key="work" className="out-work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Blueprint drawing />
                <ol className="process">
                  {PROCESS.map((t, k) => (
                    <li key={t} className={k < stage ? "is-done" : k === stage ? "is-now" : ""}>
                      <span className="mono">{String(k + 1).padStart(2, "0")}</span>{t}
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}

            {phase === "error" && (
              <motion.div key="err" className="out-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Label>התרגום לא הושלם</Label>
                <p role="alert">{error}</p>
                <button className="btn" onClick={() => run(false)}>לנסות שוב</button>
              </motion.div>
            )}

            {phase === "done" && g && (
              <motion.div key={g.id} className="out-done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {result.cached && <p className="note">המקור הזה כבר נחקר באופן הזה. זה המחקר מהארכיון.</p>}
                {result.imageError && <p className="note" data-note="image">{result.imageError}</p>}
                <Frame src={g.image_url} alt={splitSource(g.source).title} ratio="16 / 10" eager>
                  <figcaption className="glass"><ModeTag mode={g.mode} plain /></figcaption>
                </Frame>
                {g.spatial_identity && <p className="identity">{g.spatial_identity}</p>}
                <blockquote className="interp">{g.hebrew_interpretation}</blockquote>
                <div className="row">
                  <a className="btn btn-dark" href={href("s", g.id)} onClick={e => { e.preventDefault(); go("s", g.id); }} data-act="open-study">לפתיחת המחקר</a>
                  {result.cached && <button className="btn" onClick={() => run(true)} data-act="fresh">גרסה נוספת<KeyMark /></button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* שרטוט קווי: חתך של חדר עם קשת וחלון. בזמן עבודה הקווים נמתחים */
function Blueprint({ drawing = false }) {
  return (
    <svg className={`blueprint${drawing ? " drawing" : ""}`} viewBox="0 0 320 180" aria-hidden="true">
      <path d="M20 160 H300" />
      <path d="M40 160 V40 H280 V160" />
      <path d="M70 160 V95 a35 35 0 0 1 70 0 V160" />
      <path d="M190 70 H250 V120 H190 Z" />
      <path d="M190 95 H250 M220 70 V120" className="thin" />
      <path d="M40 40 L160 12 L280 40" className="thin" />
      <path d="M160 12 V180" className="meridian" />
    </svg>
  );
}
