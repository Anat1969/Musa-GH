import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MODES, MODE_IDS, PROCESS, DIRECTIONS, midjourney } from "../data.js";
import { generate } from "../lib/supabase.js";
import { go, href, parseStudioItem } from "../router.js";
import { ModeTag, Label, PromptCopy } from "./ui.jsx";
import KeyMark from "./KeyMark.jsx";
import PasteFrame from "./PasteFrame.jsx";

const STAGE_MS = [4000, 9000, 9000, 22000];

export default function Studio({ initial, gens, onCreated }) {
  const start = parseStudioItem(initial);
  const [source, setSource] = useState(start.source);
  const [mode, setMode] = useState(start.mode || "board");
  const [phase, setPhase] = useState("idle"); // idle | working | done | error
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const timers = useRef([]);
  const outRef = useRef(null);

  useEffect(() => {
    const st = parseStudioItem(initial);
    if (st.source) setSource(st.source);
    if (st.mode) setMode(st.mode);
    /* קישור חדש לסטודיו מתחיל מסך נקי, גם אם התוצאה הקודמת עוד מוצגת */
    if (initial) { setPhase("idle"); setResult(null); setError(""); }
  }, [initial]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* המקור כבר בארכיון: אילו קריאות כבר נעשו, והאחרונה בכל קריאה */
  const latestOf = id => gens.filter(g => g.source.trim() === source.trim() && g.mode === id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
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
            <Directions onPick={s => setSource(s.replace(", ", "\n"))} />
          </div>

          <div className="field">
            <Label n="B">הקריאה</Label>
            <div className="mode-pick" role="radiogroup" aria-label="הקריאה">
              {MODE_IDS.map(id => {
                const m = MODES[id];
                return (
                  <button type="button" key={id} role="radio" aria-checked={mode === id}
                    className={`mode-opt mode-${id}${mode === id ? " on" : ""}`} onClick={() => setMode(id)} data-mode={id}>
                    <span className="mode-opt-top"><span className="mono">{m.reading}</span>{done.has(id) && <span className="mono done-mark">בארכיון</span>}</span>
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
          {done.size === 3 && phase !== "done" ? (
            <p className="note" data-note="complete">
              שלוש הקריאות של המקור הזה כבר בארכיון.{" "}
              <a className="link" href={href("s", latestOf(mode).id)} onClick={e => { e.preventDefault(); go("s", latestOf(mode).id); }}>לפתיחת {MODES[mode].full}</a>
            </p>
          ) : (
            <p className="muted small">
              {done.has(mode)
                ? `${MODES[mode].full} של המקור הזה כבר בארכיון. התרגום יחזיר אותה, ומשם אפשר לבקש גרסה נוספת.`
                : `תרגום חדש לוקח בערך דקה: קריאה, כתיבת הפרומפט וצילום.${done.size ? ` ${MODES[mode].full} תשלים את הסדרה של המקור הזה.` : ""}`}
            </p>
          )}
        </form>

        <div className="panel studio-out" aria-live="polite" ref={outRef}>
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div key="idle" className="out-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Blueprint mode={mode} />
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
                <Blueprint drawing mode={mode} />
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
                {result.cached && <p className="note">{MODES[g.mode]?.full} של המקור הזה כבר הייתה בארכיון. זו היא.</p>}
                {result.imageError && <p className="note" data-note="image">{result.imageError}</p>}
                <PasteFrame gen={g} onSaved={x => { onCreated(x); setResult(r => ({ ...r, generation: x, imageError: "" })); }} ratio="16 / 10">
                  <figcaption className="glass"><ModeTag mode={g.mode} plain /></figcaption>
                </PasteFrame>
                {g.spatial_identity && <p className="identity">{g.spatial_identity}</p>}
                <blockquote className="interp">{g.hebrew_interpretation}</blockquote>
                <PromptCopy prompt={g.visual_prompt} toMj={midjourney} />
                <div className="row">
                  <a className="btn btn-dark" href={href("s", g.id)} onClick={e => { e.preventDefault(); go("s", g.id); }} data-act="open-study">לפתיחת המחקר</a>
                  {result.cached && <button className="btn" onClick={() => run(true)} data-act="fresh">גרסה נוספת של {MODES[g.mode]?.reading}<KeyMark /></button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* כיווני חשיבה: בוחרים כיוון, מקבלים הנחיה קצרה ושלוש דוגמאות. לחיצה על דוגמה ממלאת את המקור */
function Directions({ onPick }) {
  const [dir, setDir] = useState(DIRECTIONS[0].id);
  const d = DIRECTIONS.find(x => x.id === dir);
  return (
    <div className="directions">
      <div className="dir-head mono muted">כיווני חשיבה</div>
      <div className="chips" role="tablist" aria-label="כיווני חשיבה">
        {DIRECTIONS.map(x => (
          <button type="button" key={x.id} role="tab" aria-selected={x.id === dir}
            className={`chip${x.id === dir ? " on" : ""}`} onClick={() => setDir(x.id)} data-dir={x.id}>{x.name}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={d.id} className="dir-body"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <p className="dir-tip">{d.tip}</p>
          <div className="dir-items">
            {d.items.map(it => (
              <button type="button" key={it} className="dir-item" onClick={() => onPick(it)} data-example>{it}</button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/*
  שרטוט קווי לכל קריאה, באותו סגנון: קווי בנייה דקים, מרידיאן בזהב, ופרט אחד בצבע הקריאה.
  בזמן עבודה הקווים נמתחים אחד אחרי השני (pathLength=1, כך שכל קו נמתח באותו קצב).
  קריאה 1, לוח חומרים: שדה של פרגמנטים, חומר בחתך, גרעין עץ, מחקר אור.
  קריאה 2, המחשה: חתך של חדר עם קשת וחלון, ואור שנופל על הרצפה.
  קריאה 3, מרחב מחודש: פרספקטיבה של חדר עכשווי, פתח לחוץ, ספה נמוכה וגומחה.
*/
const DRAWINGS = {
  board: [
    ["M30 30 H120 V100 H30 Z"],
    ["M38 100 L108 30 M30 92 L92 30 M30 76 L76 30 M30 60 L60 30 M54 100 L120 34 M70 100 L120 50 M86 100 L120 66", "thin"],
    ["M135 30 H198 V70 H135 Z"],
    ["M148 42 h1 M162 42 h1 M176 42 h1 M190 42 h1 M155 52 h1 M169 52 h1 M183 52 h1 M148 62 h1 M162 62 h1 M176 62 h1 M190 62 h1", "dots"],
    ["M135 82 H198 V150 H135 Z"],
    ["M140 96 C158 90 176 102 194 95 M140 112 C160 106 174 118 194 110 M140 128 C156 122 178 134 194 126 M140 142 C160 138 176 146 194 141", "thin"],
    ["M218 30 H290 V115 H218 Z"],
    ["M254 52 a20 20 0 1 1 -0.1 0", "accent"],
    ["M254 82 L254 108 M240 76 L226 98 M268 76 L282 98", "thin"],
    ["M30 114 H120 V150 H30 Z"],
    ["M30 124 H120 M30 134 H120 M30 142 H120", "thin"],
    ["M218 126 H290 V150 H218 Z"],
    ["M207 12 V172", "meridian"],
  ],
  illustration: [
    ["M20 160 H300"],
    ["M40 160 V40 H280 V160"],
    ["M70 160 V95 a35 35 0 0 1 70 0 V160"],
    ["M190 70 H250 V120 H190 Z", "accent"],
    ["M190 95 H250 M220 70 V120", "thin"],
    ["M190 120 L150 160 M250 120 L222 160 M150 160 H222", "light"],
    ["M232 160 V140 H262 V160 M232 140 V122", "plain"],
    ["M40 40 L160 12 L280 40", "thin"],
    ["M160 12 V180", "meridian"],
  ],
  art: [
    ["M110 52 H230 V128 H110 Z"],
    ["M18 14 L110 52 M302 14 L230 52 M18 170 L110 128 M302 170 L230 128", "thin"],
    ["M178 52 V128 M204 52 V128", "accent"],
    ["M204 100 H230 M178 100 H160", "thin"],
    ["M44 72 L76 80 V112 L44 108 Z"],
    ["M60 92 h0.1", "dots"],
    ["M78 160 L96 146 H190 L208 160 Z M96 146 V138 H190 V146"],
    ["M120 152 H170", "thin"],
    ["M160 12 V178", "meridian"],
  ],
};

function Blueprint({ drawing = false, mode = "illustration" }) {
  const paths = DRAWINGS[mode] || DRAWINGS.illustration;
  return (
    <svg className={`blueprint mode-${mode}${drawing ? " drawing" : ""}`} viewBox="0 0 320 180" aria-hidden="true" data-blueprint={mode}>
      {paths.map(([d, cls], k) => (
        <path key={mode + k} d={d} className={cls || undefined} pathLength="1" style={{ "--i": k }} />
      ))}
    </svg>
  );
}
