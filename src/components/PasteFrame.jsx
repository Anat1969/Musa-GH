import { useEffect, useRef, useState } from "react";
import { setImage } from "../lib/supabase.js";
import { Frame } from "./ui.jsx";

/*
  מסגרת תמונה שמקבלת תמונה מבחוץ (למשל ממידג'רני): הדבקה (Ctrl+V בכל מקום בדף), גרירה, או בחירת קובץ.
  קודם תצוגה מקדימה, ו"שמירה" מחליפה את תמונת המחקר לכל המבקרים.
*/
export default function PasteFrame({ gen, onSaved, ratio, className = "", children }) {
  const [draft, setDraft] = useState(null); // { blob, url }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

  function take(file) {
    if (!file || !/^image\//.test(file.type)) { setError("זו לא תמונה."); return; }
    setError("");
    setDraft(d => { if (d) URL.revokeObjectURL(d.url); return { blob: file, url: URL.createObjectURL(file) }; });
  }

  useEffect(() => {
    const onPaste = e => {
      const file = [...(e.clipboardData?.files || [])].find(f => /^image\//.test(f.type));
      if (!file) return;
      e.preventDefault();
      take(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => () => draft && URL.revokeObjectURL(draft.url), [draft]);

  async function save() {
    if (!draft) return;
    setBusy(true); setError("");
    try {
      const saved = await setImage(gen.id, draft.blob);
      onSaved(saved);
      setDraft(null);
    } catch (e) { setError(e.message || "השמירה נכשלה."); }
    finally { setBusy(false); }
  }

  return (
    <div
      className={`paste-frame${over ? " is-over" : ""}${draft ? " has-draft" : ""} ${className}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
      data-act="paste"
    >
      <Frame src={draft ? draft.url : gen.image_url} alt={gen.source} ratio={ratio} eager key={draft ? draft.url : gen.image_url || "empty"}>
        {!draft && children}
      </Frame>

      <div className="paste-bar">
        {draft ? (
          <>
            <span className="paste-note">תצוגה מקדימה. השמירה מחליפה את תמונת המחקר.</span>
            <button className="btn btn-dark btn-sm" onClick={save} disabled={busy} data-act="save-image">{busy ? "שומר" : "שמירת התמונה"}</button>
            <button className="btn btn-sm" onClick={() => { setDraft(null); setError(""); }} disabled={busy} data-act="cancel-image">ביטול</button>
          </>
        ) : (
          <>
            <span className="paste-note">יש תמונה משלך? הדביקו אותה כאן (Ctrl+V), גררו אותה למסגרת, או</span>
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()} data-act="pick-image">בחירת קובץ</button>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { take(e.target.files?.[0]); e.target.value = ""; }} data-act="file" />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}
