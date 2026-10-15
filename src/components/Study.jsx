import { useMemo, useState } from "react";
import { MODES, splitSource, fmtDate, midjourney, readingsOf } from "../data.js";
import { generate, completeImage } from "../lib/supabase.js";
import { go, href, studioItem } from "../router.js";
import { ModeTag, Label, Loading, PromptCopy } from "./ui.jsx";
import KeyMark from "./KeyMark.jsx";
import PasteFrame from "./PasteFrame.jsx";
import Series from "./Series.jsx";

export default function Study({ id, gens, status, onCreated }) {
  const g = gens.find(x => x.id === id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const family = useMemo(() => (g ? gens.filter(x => x.source.trim() === g.source.trim()) : []), [g, gens]);
  const order = useMemo(() => gens.map(x => x.id), [gens]);

  if (!g) {
    if (status === "loading") return <div className="page"><Loading text="טוען את המחקר" /></div>;
    return (
      <div className="page">
        <div className="state">המחקר לא נמצא בארכיון.
          <a className="btn" href={href("archive")} onClick={e => { e.preventDefault(); go("archive"); }}>לארכיון</a>
        </div>
      </div>
    );
  }

  const s = splitSource(g.source);
  const m = MODES[g.mode] || MODES.board;
  const at = order.indexOf(g.id);
  const newer = at > 0 ? order[at - 1] : null;
  const older = at >= 0 && at < order.length - 1 ? order[at + 1] : null;

  async function fillImage() {
    setBusy(true); setError("");
    try { onCreated(await completeImage(g.id), true); }
    catch (e) { setError(e.message || "משהו השתבש."); }
    finally { setBusy(false); }
  }

  async function fresh() {
    setBusy(true); setError("");
    try {
      const data = await generate(g.source, g.mode, true);
      onCreated(data.generation);
      go("s", data.generation.id);
    } catch (e) { setError(e.message || "משהו השתבש."); }
    finally { setBusy(false); }
  }

  return (
    <article className="page study">
      <nav className="crumbs" aria-label="מיקום">
        <a href={href("archive")} onClick={e => { e.preventDefault(); go("archive"); }}>ארכיון</a>
        <span>{s.title}</span>
        <span>{m.full}</span>
      </nav>

      <PasteFrame gen={g} onSaved={x => onCreated(x)} ratio="16 / 9" className="study-hero-wrap">
        <figcaption className="glass study-cap">
          <ModeTag mode={g.mode} plain />
          <span className="mono">{fmtDate(g.created_at)}</span>
        </figcaption>
      </PasteFrame>

      <div className="study-grid">
        <div className="study-main">
          <Label>מקור</Label>
          <h1 className="study-title">{s.title}</h1>
          {s.by && <div className="study-by">{s.by}</div>}

          {g.spatial_identity && (
            <div className="block">
              <Label>הזהות המרחבית</Label>
              <p className="identity">{g.spatial_identity}</p>
            </div>
          )}

          <div className="block">
            <Label>פרשנות</Label>
            <blockquote className="interp interp-lg">{g.hebrew_interpretation}</blockquote>
          </div>

          <div className="block">
            <Label>הקריאה</Label>
            <p><b>{m.full}.</b> {m.body}</p>
          </div>
        </div>

        <aside className="study-side">
          <div className="panel prompt-box">
            <Label>הפרומפט</Label>
            <p className="muted small">מעתיקים למידג׳רני, יוצרים שם תמונה, ומדביקים אותה במסגרת למעלה.</p>
            <PromptCopy prompt={g.visual_prompt} toMj={midjourney} />
          </div>

          <div className="panel actions">
            {!g.image_url && (
              <button className="btn btn-dark" onClick={fillImage} disabled={busy} data-act="fill-image">{busy ? "מצלם את המרחב" : "השלמת התמונה"}<KeyMark /></button>
            )}
            {readingsOf(family).missing.map(id => {
              const to = studioItem(g.source, id);
              return <a key={id} className={`btn${g.image_url ? " btn-dark" : ""}`} href={href("studio", to)} onClick={e => { e.preventDefault(); go("studio", to); }} data-act="complete">השלמת {MODES[id].full}</a>;
            })}
            <button className="btn" onClick={fresh} disabled={busy} data-act="fresh">{busy ? "יוצר גרסה, בערך דקה" : `גרסה נוספת של ${m.reading}`}<KeyMark /></button>
            {g.image_url && <a className="btn" href={g.image_url} target="_blank" rel="noopener">פתיחת התמונה בגודל מלא</a>}
            {error && <p className="err" role="alert">{error}</p>}
          </div>

          <div className="pager">
            {newer ? <a className="btn btn-sm" href={href("s", newer)} onClick={e => { e.preventDefault(); go("s", newer); }} data-act="newer">מחקר חדש יותר</a> : <span />}
            {older ? <a className="btn btn-sm" href={href("s", older)} onClick={e => { e.preventDefault(); go("s", older); }} data-act="older">מחקר קודם</a> : <span />}
          </div>
        </aside>
      </div>

      <section className="siblings">
        <Label>שלוש הקריאות של המקור</Label>
        <Series items={family} currentId={g.id} hover={false} />
      </section>
    </article>
  );
}
