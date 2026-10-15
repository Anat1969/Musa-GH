import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MODES, MODE_IDS, STEPS, splitSource, groupProjects, fmtDate } from "../data.js";
import { go, href } from "../router.js";
import { Frame, ModeTag, Label, Loading } from "./ui.jsx";

const EASE = [0.2, 0.7, 0.2, 1];

/* השער: המילה מימין, המרחב משמאל, והמרידיאן ביניהם */
export default function Home({ gens, status }) {
  const projects = useMemo(() => groupProjects(gens), [gens]);
  const show = useMemo(
    () => projects
      .map(p => p.items.find(g => g.mode === "illustration" && g.image_url) || p.items.find(g => g.image_url))
      .filter(Boolean).slice(0, 8),
    [projects]
  );
  /* פרויקטים שיש להם תמונה בכל שלושת האופנים: הבסיס להשוואה של מקור אחד בשלוש קריאות */
  const triads = useMemo(() => projects
    .map(p => {
      const by = {};
      for (const id of MODE_IDS) by[id] = p.items.find(g => g.mode === id && g.image_url);
      return MODE_IDS.every(id => by[id]) ? { source: p.source, by } : null;
    })
    .filter(Boolean).slice(0, 6), [projects]);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-top">
        <div className="hero-head">
          <Label>סטודיו לתרגום השראה למרחב אדריכלי</Label>
          <h1 className="hero-title">כל טקסט מחזיק<br />בתוכו חדר.</h1>
          <p className="hero-lead">
            מוזה קוראת ספר, שיר, יוצר או מחשבה, ומתרגמת אותם למרחב: צילום אדריכלי ופרשנות קצרה שמסבירה למה דווקא החומר הזה, האור הזה והשקט הזה.
          </p>
          <div className="hero-cta">
            <a className="btn btn-dark btn-lg" href={href("studio")} onClick={e => { e.preventDefault(); go("studio"); }} data-act="to-studio">לכתוב מקור השראה</a>
            <a className="btn btn-lg" href={href("archive")} onClick={e => { e.preventDefault(); go("archive"); }} data-act="to-archive">לארכיון הפרויקטים</a>
          </div>
        </div>
        {gens.length > 0 && (
          <dl className="hero-stats" aria-label="הארכיון במספרים">
            <div><dt>מחקרים</dt><dd>{String(gens.length).padStart(2, "0")}</dd></div>
            <div><dt>פרויקטים</dt><dd>{String(projects.length).padStart(2, "0")}</dd></div>
            <div><dt>אופני תרגום</dt><dd>03</dd></div>
          </dl>
        )}
        </div>
        {status === "loading" && !gens.length ? <Loading /> : show.length ? <Meridian items={show} /> : null}
      </section>

      <section className="about" aria-labelledby="about-t">
        <div className="about-grid">
          <div>
            <Label n="I">מה זה</Label>
            <h2 id="about-t">קריאה אדריכלית של טקסט</h2>
          </div>
          <div className="about-body">
            <p>
              כל יצירה טובה מחזיקה מרחב: חומר, אור, קנה מידה, מרחק בין גוף לקיר. מוזה מחלצת את המרחב הזה ומצלמת אותו. היא לא מאיירת את העלילה ולא מציירת את היוצר. היא שואלת איפה המקור הזה היה גר, ממה החדר שלו בנוי, ומאיזה כיוון נכנס אליו האור.
            </p>
            <p className="muted">
              השימוש: לוחות השראה לפרויקט, שיחה עם לקוח על אווירה, הוראה, או פשוט דרך אחרת לקרוא ספר אהוב. התמונות נוצרות בבינה מלאכותית ומשמשות השראה, לא תיעוד של מקום אמיתי.
            </p>
          </div>
        </div>
      </section>

      <section className="steps" aria-labelledby="steps-t">
        <Label n="II">איך זה עובד</Label>
        <h2 id="steps-t">ארבעה שלבים, ממילה למרחב</h2>
        <ol className="step-list">
          {STEPS.map((s, i) => (
            <motion.li key={s.n} className="step"
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}>
              <span className="step-n">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {triads.length > 0 && <SameSource triads={triads} />}
      {projects.length > 2 && <SameMode projects={projects} />}

      {projects.length > 0 && (
        <section className="recent" aria-labelledby="recent-t">
          <div className="section-head">
            <div>
              <Label n="V">מהארכיון</Label>
              <h2 id="recent-t">פרויקטים אחרונים</h2>
            </div>
            <a className="btn" href={href("archive")} onClick={e => { e.preventDefault(); go("archive"); }}>כל {projects.length} הפרויקטים</a>
          </div>
          <div className="recent-grid">
            {projects.slice(0, 6).map(p => {
              const g = p.items.find(x => x.image_url) || p.items[0], s = splitSource(p.source);
              return (
                <a key={p.source} className="recent-card" href={href("s", g.id)} onClick={e => { e.preventDefault(); go("s", g.id); }}>
                  <Frame src={g.image_url} alt={s.title} ratio="3 / 2" lines={false} />
                  <span className="recent-meta">
                    <span className="recent-title">{s.title}</span>
                    <span className="mono muted">{p.items.length} מחקרים · {fmtDate(p.latest)}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <footer className="foot">
        <span className="mono">MUSE MERIDIAN</span>
        <span className="muted">אטלייה לאונטולוגיה אדריכלית · אד׳ ענת שטיבלמן</span>
      </footer>
    </div>
  );
}

function Meridian({ items }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const g = items[i % items.length];
  const s = splitSource(g.source);

  useEffect(() => {
    if (hold || items.length < 2) return;
    const t = setTimeout(() => setI(x => (x + 1) % items.length), 6500);
    return () => clearTimeout(t);
  }, [i, hold, items.length]);

  return (
    <div className="meridian" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <div className="meridian-word">
        <span className="mono muted">המילה</span>
        <AnimatePresence mode="wait">
          <motion.div key={g.id} className="meridian-src"
            initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.55, ease: EASE }}>
            <div className="meridian-title">{s.title}</div>
            {s.by && <div className="meridian-by">{s.by}</div>}
            <p className="meridian-interp">{g.hebrew_interpretation}</p>
            <a className="link" href={href("s", g.id)} onClick={e => { e.preventDefault(); go("s", g.id); }}>לפתיחת המחקר</a>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="meridian-line" aria-hidden="true">
        <span className="meridian-dot" />
        <span className="meridian-cap mono">MERIDIAN</span>
      </div>

      <div className="meridian-space">
        <span className="mono muted">המרחב</span>
        <div className="meridian-stage">
          <AnimatePresence initial={false}>
            <motion.div key={g.id} className="meridian-img"
              initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: EASE }}>
              <Frame src={g.image_url} alt={`${s.title}: מרחב`} ratio="16 / 10" eager>
                <figcaption className="glass"><ModeTag mode={g.mode} plain /></figcaption>
              </Frame>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="ticks" role="tablist" aria-label="דוגמאות מהארכיון">
          {items.map((it, k) => (
            <button key={it.id} role="tab" aria-selected={k === i % items.length} aria-label={splitSource(it.source).title}
              className={`tick${k === i % items.length ? " on" : ""}`} onClick={() => setI(k)}>
              <span />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* III. מקור אחד, שלוש קריאות: ההשראה קבועה, רק האופן משתנה. כך רואים מה כל אופן עושה */
function SameSource({ triads }) {
  const [i, setI] = useState(0);
  const t = triads[Math.min(i, triads.length - 1)];
  const s = splitSource(t.source);
  return (
    <section className="compare same-source" aria-labelledby="same-source-t">
      <Label n="III">שלוש קריאות</Label>
      <h2 id="same-source-t">אותו מקור, שלוש קריאות</h2>
      <p className="compare-lead">
        ההשראה קבועה, ורק הקריאה משתנה. קריאה 1 אוספת את החומרים, קריאה 2 מראה את המקום שבו המקור חי, וקריאה 3 מתרגמת אותו לבית של היום.
      </p>
      <div className="compare-pick">
        <span className="mono muted">המקור</span>
        <div className="chips" role="tablist" aria-label="בחירת מקור">
          {triads.map((x, k) => (
            <button key={x.source} role="tab" aria-selected={k === i} className={`chip${k === i ? " on" : ""}`} onClick={() => setI(k)} data-triad={k}>
              {splitSource(x.source).title}
            </button>
          ))}
        </div>
      </div>
      <div className="compare-title">
        <span className="compare-src">{s.title}</span>
        {s.by && <span className="compare-by">{s.by}</span>}
      </div>
      <div className="compare-axis" aria-hidden="true">
        {MODE_IDS.map(id => <span key={id} className={`axis-stop mode-${id}`}><i />{MODES[id].axis}</span>)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={t.source} className="compare-grid"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
          {MODE_IDS.map(id => {
            const m = MODES[id], g = t.by[id];
            return (
              <a key={id} className={`ccard mode-${id}`} href={href("s", g.id)} onClick={e => { e.preventDefault(); go("s", g.id); }} data-mode-card={id}>
                <Frame src={g.image_url} alt={`${m.name}: ${s.title}`} ratio="4 / 3" />
                <span className="ccard-top"><span className="mono">{m.reading}</span><span className="mono muted" dir="ltr">{m.en}</span></span>
                <span className="ccard-name">{m.name}</span>
                <span className="ccard-line">{m.line}</span>
                <span className="ccard-interp">{g.hebrew_interpretation}</span>
                <span className="ccard-when"><b>מתי</b> {m.when}</span>
              </a>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/* IV. קריאה אחת, כל המקורות: הקריאה קבועה, ולכן ההבדל בין התמונות הוא ההבדל בין המקורות.
   קרוסלה של כל המקורות שיש להם תמונה בקריאה הזאת: גלילה במגע ימינה ושמאלה, גרירה בעכבר, או "הקודם" ו"הבא".
   הכרטיסים חולקים שורות (subgrid), כך שהם מיושרים לכל אורך הרצועה. */
function SameMode({ projects }) {
  const [mode, setMode] = useState("illustration");
  const [pos, setPos] = useState({ first: 1, last: 3 });
  const track = useRef(null);
  const drag = useRef(null);
  const items = useMemo(() => projects
    .map(p => p.items.filter(g => g.mode === mode && g.image_url).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0])
    .filter(Boolean), [projects, mode]);
  const m = MODES[mode];

  /* אילו כרטיסים נראים עכשיו, לפי מיקום הגלילה */
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const seen = [...el.children].map((c, k) => {
      const r = c.getBoundingClientRect();
      return r.left >= box.left - 4 && r.right <= box.right + 4 ? k : -1;
    }).filter(k => k >= 0);
    if (seen.length) setPos({ first: seen[0] + 1, last: seen[seen.length - 1] + 1 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: 0 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { el.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [mode, items.length, measure]);

  /* עמוד אחד קדימה או אחורה. ב-RTL "הבא" נמצא משמאל, ולכן הגלילה שלילית */
  function page(dir) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: -dir * el.clientWidth, behavior: "smooth" });
  }

  /* גרירה בעכבר. במגע הדפדפן גולל לבד */
  function onDown(e) {
    if (e.pointerType !== "mouse") return;
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
  }
  function onMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    track.current.scrollLeft = d.left - dx;
  }
  function onUp() { setTimeout(() => { drag.current = null; }, 0); }

  return (
    <section className="compare same-mode" aria-labelledby="same-mode-t">
      <Label n="IV">כל המקורות</Label>
      <h2 id="same-mode-t">אותה קריאה, כל המקורות</h2>
      <p className="compare-lead">
        עכשיו הקריאה קבועה, ולכן ההבדל בין התמונות הוא ההבדל בין המקורות עצמם: החומר, האור והשקט של כל אחד. גוללים ימינה ושמאלה בין כל המקורות שבארכיון.
      </p>
      <div className="compare-pick">
        <span className="mono muted">הקריאה</span>
        <div className="chips" role="tablist" aria-label="בחירת קריאה">
          {MODE_IDS.map(id => (
            <button key={id} role="tab" aria-selected={id === mode} className={`chip chip-mode mode-${id}${id === mode ? " on" : ""}`} onClick={() => setMode(id)} data-same-mode={id}>
              <i aria-hidden="true" />{MODES[id].full}
            </button>
          ))}
        </div>
      </div>
      <div className="carousel-bar">
        <span className="mono muted" data-carousel-pos>{items.length ? `${pos.first}–${pos.last} מתוך ${items.length} מקורות` : ""}</span>
        <div className="row">
          <button className="btn btn-sm" onClick={() => page(-1)} disabled={pos.first <= 1} data-act="prev">הקודם</button>
          <button className="btn btn-sm" onClick={() => page(1)} disabled={pos.last >= items.length} data-act="next">הבא</button>
        </div>
      </div>
      <div className={`carousel mode-${mode}`} ref={track} data-carousel
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        {items.map(g => {
          const s = splitSource(g.source);
          return (
            <a key={g.id} className={`ccard mode-${mode}`} href={href("s", g.id)} draggable={false}
              onClick={e => { e.preventDefault(); if (drag.current?.moved) return; go("s", g.id); }} data-source-card>
              <Frame src={g.image_url} alt={`${m.full}: ${s.title}`} ratio="4 / 3" />
              <span className="ccard-top"><span className="mono">{m.full}</span><span className="mono muted">{fmtDate(g.created_at)}</span></span>
              <span className="ccard-name">{s.title}</span>
              <span className="ccard-line">{s.by || "\u00a0"}</span>
              <span className="ccard-interp">{g.hebrew_interpretation}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
