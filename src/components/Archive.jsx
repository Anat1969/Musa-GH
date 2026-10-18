import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MODES, MODE_IDS, splitSource, groupProjects, fmtDate } from "../data.js";
import { go, href } from "../router.js";
import { Label, Loading } from "./ui.jsx";
import Series, { seriesCount } from "./Series.jsx";

export default function Archive({ gens, status, filter, retry }) {
  const [q, setQ] = useState("");
  const mode = MODE_IDS.includes(filter) ? filter : "";

  const projects = useMemo(() => {
    const term = q.trim();
    const list = gens.filter(g => !term || g.source.includes(term) || g.hebrew_interpretation.includes(term));
    /* הסדרה תמיד שלמה בתצוגה. הסינון בוחר מקורות שיש להם את הקריאה הזאת */
    return groupProjects(list).filter(p => !mode || p.items.some(g => g.mode === mode));
  }, [gens, mode, q]);

  return (
    <div className="page archive">
      <header className="page-head">
        <Label n="02">ארכיון</Label>
        <h1>מקורות וקריאות</h1>
        <p className="lead">כל מקור הוא סדרה של שלוש קריאות: קריאה 1, לוח השראה. קריאה 2, מרחב של אתמול. קריאה 3, מרחב של מחר. קריאה שחסרה מסומנת, ואפשר להשלים אותה.</p>
      </header>

      <div className="toolbar">
        <div className="chips" role="tablist" aria-label="סינון לפי אופן">
          <a role="tab" aria-selected={!mode} className={`chip${!mode ? " on" : ""}`} href={href("archive")} onClick={e => { e.preventDefault(); go("archive"); }}>הכול</a>
          {MODE_IDS.map(id => (
            <a key={id} role="tab" aria-selected={mode === id} className={`chip chip-mode mode-${id}${mode === id ? " on" : ""}`}
              href={href("archive", id)} onClick={e => { e.preventDefault(); go("archive", id); }} data-filter={id}>
              <i aria-hidden="true" />{MODES[id].full}
            </a>
          ))}
        </div>
        <input className="search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש במקורות ובפרשנויות" aria-label="חיפוש" />
      </div>

      {status === "loading" && !gens.length && <Loading />}
      {status === "error" && !gens.length && (
        <div className="state">
          הארכיון לא נטען. <button className="btn" onClick={retry}>לנסות שוב</button>
        </div>
      )}
      {status === "ready" && projects.length === 0 && (
        <div className="state">
          {gens.length ? "אין מקורות שמתאימים לסינון." : "הארכיון עדיין ריק."}
          <a className="btn btn-dark" href={href("studio")} onClick={e => { e.preventDefault(); go("studio"); }}>להתחיל בסטודיו</a>
        </div>
      )}

      <div className="projects">
        {projects.map((p, i) => {
          const s = splitSource(p.source);
          return (
            <motion.section key={p.source} className="project"
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.45, delay: Math.min(i, 4) * 0.05 }}>
              <header className="project-head">
                <div className="project-name">
                  <span className="mono muted">מקור {String(projects.length - i).padStart(2, "0")}</span>
                  <h2>{s.title}</h2>
                  {s.by && <span className="project-by">{s.by}</span>}
                </div>
                <div className="project-side">
                  <span className={`series-count${seriesCount(p.items) === 3 ? " is-full" : ""}`} data-count={seriesCount(p.items)}>
                    {seriesCount(p.items) === 3 ? "שלוש הקריאות" : `${seriesCount(p.items)} מתוך 3 קריאות`}
                  </span>
                  <span className="mono muted">{fmtDate(p.latest)}</span>
                </div>
              </header>
              <Series items={p.items} />
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
