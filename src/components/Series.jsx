import { MODES, MODE_IDS, readingsOf, splitSource, fmtDate } from "../data.js";
import { go, href, studioItem } from "../router.js";
import { Frame, ModeTag } from "./ui.jsx";

/*
  שלוש הקריאות של מקור אחד, תמיד באותו סדר: קריאה 1 לוח השראה, קריאה 2 מרחב של אתמול, קריאה 3 מרחב של מחר.
  קריאה שחסרה מוצגת כמסגרת ריקה עם "השלמת קריאה". כשיש את שלושתן, אין כפתור.
*/
export default function Series({ items, currentId, hover = true }) {
  const r = readingsOf(items);
  const source = items[0]?.source || "";
  const title = splitSource(source).title;
  return (
    <div className="series">
      {MODE_IDS.map(id => {
        const m = MODES[id], slot = r[id], g = slot.latest;
        if (!g) {
          const to = studioItem(source, id);
          return (
            <div key={id} className={`study-card is-missing mode-${id}`} data-missing={id}>
              <Frame src={null} ratio="4 / 3" lines={false} emptyText={`${m.reading} עוד לא נעשתה`} />
              <span className="study-meta"><ModeTag mode={id} /></span>
              <a className="btn btn-sm" href={href("studio", to)} onClick={e => { e.preventDefault(); go("studio", to); }} data-act="complete">השלמת {m.full}</a>
            </div>
          );
        }
        const here = g.id === currentId;
        return (
          <a key={id} className={`study-card mode-${id}${here ? " is-here" : ""}`} href={href("s", g.id)} onClick={e => { e.preventDefault(); go("s", g.id); }} data-study={g.id} aria-current={here ? "page" : undefined}>
            <Frame src={g.image_url} alt={`${m.full}: ${title}`} ratio="4 / 3" lines={false}>
              {hover && <span className="study-hover"><span>{g.hebrew_interpretation}</span></span>}
              {here && <span className="here-tag">המחקר הזה</span>}
            </Frame>
            <span className="study-meta">
              <ModeTag mode={id} />
              <span className="mono muted">{slot.count > 1 ? `${slot.count} גרסאות · ` : ""}{fmtDate(g.created_at)}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

/* כמה קריאות יש מתוך שלוש */
export function seriesCount(items) {
  return 3 - readingsOf(items).missing.length;
}
