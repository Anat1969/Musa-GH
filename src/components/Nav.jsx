import { LINKS, PROJECT } from "../data.js";
import { go, href } from "../router.js";
import AIMenu from "./AIMenu.jsx";

const TABS = [
  { id: "home", page: "", n: "00", t: "שער" },
  { id: "studio", page: "studio", n: "01", t: "סטודיו" },
  { id: "archive", page: "archive", n: "02", t: "ארכיון" },
];

// Project links (repo, Supabase, deploy) as items of the A&I logo button.
const MENU_ITEMS = PROJECT.filter(p => p.href).map(p => ({
  label: p.k,
  hint: p.v,
  onSelect: () => { window.open(p.href, "_blank", "noopener"); },
}));

export default function Nav({ current }) {
  return (
    <nav className="topbar" aria-label="ניווט ראשי">
      <div className="topbar-row">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); go(""); }}>
          <img className="app-mark" src="/icons/icon.svg" alt="" width="40" height="40" />
          <span className="brand-text">
            <span className="brand-name">מוזה</span>
            <span className="brand-sub">Muse Meridian · סטודיו לתרגום השראה למרחב</span>
          </span>
        </a>

        <div className="tabs" role="tablist">
          {TABS.map(t => (
            <a key={t.id} role="tab" aria-selected={current === t.id} className={`tab${current === t.id ? " on" : ""}`}
              href={href(t.page)} onClick={e => { e.preventDefault(); go(t.page); }}>
              <span className="tab-n">{t.n}</span>{t.t}
            </a>
          ))}
        </div>

        <div className="settings">
          <AIMenu chat={LINKS.dev} research={LINKS.research} items={MENU_ITEMS} />
        </div>
      </div>
    </nav>
  );
}
