/*
  הכתובת היא המצב: #עמוד/פריט.
  #             השער
  #studio       הסטודיו, #studio/<מקור> עם מקור מוכן
  #archive      הארכיון, #archive/<אופן> מסונן לפי אופן
  #s/<id>       מחקר אחד
*/
export function readHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const cut = raw.indexOf("/");
  const page = decodeURIComponent(cut < 0 ? raw : raw.slice(0, cut));
  const item = cut < 0 ? "" : decodeURIComponent(raw.slice(cut + 1));
  return { page, item };
}

export function href(page, item) {
  return page ? `#${page}${item ? "/" + encodeURIComponent(item) : ""}` : "#";
}

export function go(page, item) {
  const h = href(page, item);
  if (location.hash !== h && !(h === "#" && !location.hash)) history.pushState(null, "", h);
  window.dispatchEvent(new Event("hashchange"));
}

/* הסטודיו עם מקור מוכן, ואם צריך גם קריאה מסוימת: #studio/<קריאה>/<מקור> */
const READINGS = ["board", "illustration", "art"];
export function studioItem(source, mode) {
  return mode ? `${mode}/${source}` : source;
}
export function parseStudioItem(item = "") {
  const cut = item.indexOf("/");
  const head = cut < 0 ? "" : item.slice(0, cut);
  return READINGS.includes(head) ? { mode: head, source: item.slice(cut + 1) } : { mode: "", source: item };
}
