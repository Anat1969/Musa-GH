/*
  מוזה (Muse Meridian): כל הטקסטים הקבועים, הקישורים ופרטי הפרויקט.
  פרטי הפרויקט מוצגים בכרטיס ההגדרות שנפתח מהלוגו של ענת. המפתחות עצמם לא נחשפים: רק השם שלהם ואיפה הם נשמרים.
*/
export const LINKS = {
  dev: "https://claude.ai/code/session_013oyZjACY57e78PidLS997V",
  research: "",
};

export const PROJECT = [
  { k: "ריפו ב-GitHub", v: "Anat1969/Musa-GH", href: "https://github.com/Anat1969/Musa-GH" },
  { k: "פרויקט Supabase", v: "cultura-GH", sub: "ktqmwpbzcnzkhjskqisy · טבלה musa_generations, דלי musa-media", href: "https://supabase.com/dashboard/project/ktqmwpbzcnzkhjskqisy" },
  { k: "פונקציית התרגום", v: "musa-generate", sub: "קריאה ופרשנות: claude-opus-5-5. צילום: fal nano-banana-2 ביחס 16:9, ובגיבוי flux schnell" },
  { k: "מפתחות", v: "ANTHROPIC_API_KEY · FAL_LM_API_KEY", sub: "סודות בפרויקט cultura-GH, לא נחשפים בדפדפן. כל כפתור שמפעיל אותם מסומן במפתח מאיר" },
  { k: "פריסה", v: "Vercel · musa", href: "https://musa-gh.vercel.app" },
  { k: "מקור", v: "Lovable · Muse Meridian Studio", sub: "הארכיון הועבר במלואו: 40 מחקרים ב-15 פרויקטים" },
];

export const MODES = {
  board: {
    id: "board", n: "01", name: "לוח השראה", en: "Inspiration board",
    line: "שדה של חומרים, אור ופרגמנטים מרחביים.",
    body: "לא קולאז׳ אלא שדה: דוגמאות חומר, מחקרי אור, סף, זווית תקרה. הכול נבחר לפי התהודה עם העולם הפנימי של המקור.",
    when: "בשלב הרעיון, לפני שיש מרחב.",
  },
  illustration: {
    id: "illustration", n: "02", name: "המחשה", en: "Illustration",
    line: "המרחב שבו המקור חי, בזמנו ובמקומו.",
    body: "חדר אינטימי ולא הרואי. חומרים שנושאים זיכרון, חפצים שהונחו באמצע מחשבה, אור אחד שמגיע מכיוון אחד.",
    when: "כדי להבין את העולם של היוצר.",
  },
  art: {
    id: "art", n: "03", name: "מרחב מחודש", en: "Renewed space",
    line: "אותו DNA, מתורגם לבית של היום.",
    body: "לא שחזור אלא תרגום: אותו תדר רגשי, בדיוק עכשווי. מרחב מגורים שקט שאפשר להציג כהצעה ללקוח.",
    when: "כשצריך כיוון לתכנון אמיתי.",
  },
};
export const MODE_IDS = ["board", "illustration", "art"];

export const STEPS = [
  { n: "01", t: "מקור", d: "כותבים שם של ספר, שיר, יוצר או מחשבה. כמה מילים מספיקות. שם היוצר ליד שם היצירה מדייק את הקריאה." },
  { n: "02", t: "קריאה", d: "Claude קורא את המקור כמו שאדריכלית קוראת אתר: איזה חומר, איזה אור, איזה קנה מידה ואיזה שקט יש בו." },
  { n: "03", t: "תרגום", d: "בוחרים אופן: לוח השראה, המחשה או מרחב מחודש. מהקריאה נכתב פרומפט חזותי, ונוצר צילום אדריכלי." },
  { n: "04", t: "ארכיון", d: "כל מחקר נשמר בפרויקט לפי המקור, עם הזהות המרחבית, הפרשנות והפרומפט. אפשר להוסיף לו מחקרים באופנים האחרים." },
];

export const SUGGESTIONS = [
  "הנסיך הקטן, אנטואן דה סנט־אכזופרי",
  "לאה גולדברג, אהבתה של תרזה די מון",
  "וואבי־סאבי",
  "יהודה עמיחי, אבי עשה מלחמה",
];

export const PROCESS = [
  "קריאת המקור",
  "זיקוק הזהות המרחבית",
  "כתיבת הפרומפט החזותי",
  "צילום המרחב",
  "שמירה בארכיון",
];

/* פרומפט מוכן למידג'רני: הפרומפט החזותי, הסיומת הקבועה והשלילות */
export function midjourney(prompt = "") {
  const p = prompt.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
  return `${p}. Documentary realism, Professional architecture photography --ar 16:9 --style raw --no text, words, writing, frame divisions`;
}

/* שם היצירה בשורה הראשונה, היוצר בשורה השנייה (אם יש) */
export function splitSource(source = "") {
  const [first, ...rest] = source.split(/\n/).map(s => s.trim()).filter(Boolean);
  return { title: first || source, by: rest.join(" · ") };
}

export function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

/* מקבץ מחקרים לפרויקטים לפי המקור. הפרויקט החדש ביותר ראשון */
export function groupProjects(gens) {
  const map = new Map();
  for (const g of gens) {
    const key = g.source.trim();
    if (!map.has(key)) map.set(key, { source: key, items: [] });
    map.get(key).items.push(g);
  }
  return [...map.values()]
    .map(p => ({ ...p, latest: p.items.reduce((a, g) => (g.created_at > a ? g.created_at : a), "") }))
    .sort((a, b) => (a.latest < b.latest ? 1 : -1));
}
