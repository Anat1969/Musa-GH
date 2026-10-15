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
