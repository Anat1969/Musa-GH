import { useEffect, useMemo, useState } from "react";
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
  /* דוגמה לכל אופן, כל אחת מפרויקט אחר */
  const sample = useMemo(() => {
    const out = {}, used = new Set();
    for (const id of MODE_IDS) {
      const g = gens.find(x => x.mode === id && x.image_url && !used.has(x.source.trim())) || gens.find(x => x.mode === id && x.image_url);
      if (g) { out[id] = g; used.add(g.source.trim()); }
    }
    return out;
  }, [gens]);

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

      <section className="modes" aria-labelledby="modes-t">
        <Label n="III">שלושה אופני תרגום</Label>
        <h2 id="modes-t">אותו מקור, שלוש קריאות</h2>
        <div className="mode-cards">
          {MODE_IDS.map((id, i) => {
            const m = MODES[id], g = sample[id];
            return (
              <motion.article key={id} className={`mode-card mode-${id}`}
                initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: EASE }}>
                <Frame src={g?.image_url} alt={g ? `${m.name}: ${splitSource(g.source).title}` : ""} ratio="4 / 3" />
                <div className="mode-card-body">
                  <div className="mode-card-top"><span className="mono">{m.n}</span><span className="mono muted" dir="ltr">{m.en}</span></div>
                  <h3>{m.name}</h3>
                  <p className="mode-line">{m.line}</p>
                  <p className="muted">{m.body}</p>
                  <p className="mode-when"><b>מתי</b> {m.when}</p>
                  {g && <a className="link" href={href("s", g.id)} onClick={e => { e.preventDefault(); go("s", g.id); }}>דוגמה: {splitSource(g.source).title}</a>}
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {projects.length > 0 && (
        <section className="recent" aria-labelledby="recent-t">
          <div className="section-head">
            <div>
              <Label n="IV">מהארכיון</Label>
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
