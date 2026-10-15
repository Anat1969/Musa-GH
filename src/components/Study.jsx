import { useMemo, useState } from "react";
import { MODES, splitSource, fmtDate, midjourney } from "../data.js";
import { generate, completeImage } from "../lib/supabase.js";
import { go, href } from "../router.js";
import { Frame, ModeTag, Label, Loading } from "./ui.jsx";
import KeyMark from "./KeyMark.jsx";

export default function Study({ id, gens, status, onCreated }) {
  const g = gens.find(x => x.id === id);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const siblings = useMemo(() => (g ? gens.filter(x => x.source.trim() === g.source.trim() && x.id !== g.id) : []), [g, gens]);
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

  async function copy(kind) {
    try { await navigator.clipboard.writeText(kind === "mj" ? midjourney(g.visual_prompt) : g.visual_prompt); } catch {}
    setCopied(kind); setTimeout(() => setCopied(""), 1800);
  }

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
        <span>{m.name}</span>
      </nav>

      <Frame src={g.image_url} alt={`${m.name}: ${s.title}`} ratio="16 / 9" eager className="study-hero">
        <figcaption className="glass study-cap">
          <ModeTag mode={g.mode} plain />
          <span className="mono">{fmtDate(g.created_at)}</span>
        </figcaption>
      </Frame>

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
            <Label>האופן</Label>
            <p><b>{m.name}.</b> {m.body}</p>
          </div>
        </div>

        <aside className="study-side">
          <div className="panel prompt-box">
            <div className="prompt-head">
              <Label>הפרומפט החזותי</Label>
              <button className="btn btn-sm" onClick={() => copy("p")} data-act="copy-prompt">{copied === "p" ? "הועתק" : "העתקה"}</button>
            </div>
            <p className="prompt" dir="ltr">{g.visual_prompt}</p>
            <button className="btn btn-sm btn-mj" onClick={() => copy("mj")} data-act="copy-mj">{copied === "mj" ? "הועתק, מוכן למידג׳רני" : "העתקה כפרומפט למידג׳רני"}</button>
          </div>

          <div className="panel actions">
            {!g.image_url && (
              <button className="btn btn-dark" onClick={fillImage} disabled={busy} data-act="fill-image">{busy ? "מצלם את המרחב" : "השלמת התמונה"}<KeyMark /></button>
            )}
            <a className={`btn${g.image_url ? " btn-dark" : ""}`} href={href("studio", g.source)} onClick={e => { e.preventDefault(); go("studio", g.source); }} data-act="add-study">מחקר נוסף לפרויקט</a>
            <button className="btn" onClick={fresh} disabled={busy} data-act="fresh">{busy ? "יוצר גרסה, בערך דקה" : "גרסה נוספת באופן הזה"}<KeyMark /></button>
            {g.image_url && <a className="btn" href={g.image_url} target="_blank" rel="noopener">פתיחת התמונה בגודל מלא</a>}
            {error && <p className="err" role="alert">{error}</p>}
          </div>

          <div className="pager">
            {newer ? <a className="btn btn-sm" href={href("s", newer)} onClick={e => { e.preventDefault(); go("s", newer); }} data-act="newer">מחקר חדש יותר</a> : <span />}
            {older ? <a className="btn btn-sm" href={href("s", older)} onClick={e => { e.preventDefault(); go("s", older); }} data-act="older">מחקר קודם</a> : <span />}
          </div>
        </aside>
      </div>

      {siblings.length > 0 && (
        <section className="siblings">
          <Label>עוד בפרויקט הזה</Label>
          <div className="study-row">
            {siblings.map(x => (
              <a key={x.id} className="study-card" href={href("s", x.id)} onClick={e => { e.preventDefault(); go("s", x.id); }} data-sibling={x.id}>
                <Frame src={x.image_url} alt={`${MODES[x.mode]?.name}: ${s.title}`} ratio="4 / 3" lines={false} />
                <span className="study-meta"><ModeTag mode={x.mode} /><span className="mono muted">{fmtDate(x.created_at)}</span></span>
              </a>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
