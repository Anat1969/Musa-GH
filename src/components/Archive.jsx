import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MODES, MODE_IDS, splitSource, groupProjects, fmtDate } from "../data.js";
import { go, href } from "../router.js";
import { Frame, ModeTag, Label, Loading } from "./ui.jsx";

export default function Archive({ gens, status, filter, retry }) {
  const [q, setQ] = useState("");
  const mode = MODE_IDS.includes(filter) ? filter : "";

  const projects = useMemo(() => {
    const term = q.trim();
    const list = gens.filter(g => (!mode || g.mode === mode) && (!term || g.source.includes(term) || g.hebrew_interpretation.includes(term)));
    return groupProjects(list);
  }, [gens, mode, q]);

  return (
    <div className="page archive">
      <header className="page-head">
        <Label n="02">ארכיון</Label>
        <h1>פרויקטים ומחקרים</h1>
        <p className="lead">כל מקור הוא פרויקט. בכל פרויקט, המחקרים שנעשו עליו בשלושת אופני התרגום.</p>
      </header>

      <div className="toolbar">
        <div className="chips" role="tablist" aria-label="סינון לפי אופן">
          <a role="tab" aria-selected={!mode} className={`chip${!mode ? " on" : ""}`} href={href("archive")} onClick={e => { e.preventDefault(); go("archive"); }}>הכול</a>
          {MODE_IDS.map(id => (
            <a key={id} role="tab" aria-selected={mode === id} className={`chip chip-mode mode-${id}${mode === id ? " on" : ""}`}
              href={href("archive", id)} onClick={e => { e.preventDefault(); go("archive", id); }} data-filter={id}>
              <i aria-hidden="true" />{MODES[id].name}
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
          {gens.length ? "אין מחקרים שמתאימים לסינון." : "הארכיון עדיין ריק."}
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
                  <span className="mono muted">פרויקט {String(projects.length - i).padStart(2, "0")}</span>
                  <h2>{s.title}</h2>
                  {s.by && <span className="project-by">{s.by}</span>}
                </div>
                <div className="project-side">
                  <span className="mono muted">{p.items.length} מחקרים · {fmtDate(p.latest)}</span>
                  <a className="btn" href={href("studio", p.source)} onClick={e => { e.preventDefault(); go("studio", p.source); }} data-act="add-study">מחקר נוסף</a>
                </div>
              </header>
              <div className="study-row">
                {p.items.map(g => (
                  <a key={g.id} className="study-card" href={href("s", g.id)} onClick={e => { e.preventDefault(); go("s", g.id); }} data-study={g.id}>
                    <Frame src={g.image_url} alt={`${MODES[g.mode]?.name}: ${s.title}`} ratio="4 / 3" lines={false}>
                      <span className="study-hover"><span>{g.hebrew_interpretation}</span></span>
                    </Frame>
                    <span className="study-meta"><ModeTag mode={g.mode} /><span className="mono muted">{fmtDate(g.created_at)}</span></span>
                  </a>
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
