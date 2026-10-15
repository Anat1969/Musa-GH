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
    id: "board", n: "01", reading: "קריאה 1", full: "קריאה 1: לוח חומרים", name: "לוח חומרים", en: "Material board", axis: "חומר",
    line: "קומפוזיציה של חומרים, כמו יצירת אמנות.",
    body: "דוגמאות חומר אמיתיות, בחתך ובפני השטח, מסודרות על משטח אחד כקומפוזיציה מופשטת: מרכז כובד, מתח אחד, הרבה חלל ריק ואור מוזיאלי מצד אחד.",
    when: "בשלב הרעיון, לפני שיש מרחב.",
  },
  illustration: {
    id: "illustration", n: "02", reading: "קריאה 2", full: "קריאה 2: המחשה", name: "המחשה", en: "Illustration", axis: "מקום",
    line: "המקום האותנטי שבו המקור חי, כאילו נמצא שלם.",
    body: "בנייה עממית וחומרים בעבודת יד, אמיתיים לתקופה ולמקום. פטינה בכל מקום, שום דבר משוחזר או חדש. אור של התקופה בלבד: חלון קטן או להבה אחת.",
    when: "כדי להבין את העולם של היוצר.",
  },
  art: {
    id: "art", n: "03", reading: "קריאה 3", full: "קריאה 3: מרחב מחודש", name: "מרחב מחודש", en: "Renewed space", axis: "תרגום",
    line: "אותו DNA, במינימליזם עכשווי.",
    body: "צמצום עד הסוף: משטחים מונוליתיים בחומר אחד או שניים, פרטים נסתרים, פתח אחד בלי מסגרת אל הנוף. כמעט ריק: רהיט נמוך אחד וחפץ אחד שנושא את המקור.",
    when: "כשצריך כיוון לתכנון עכשווי.",
  },
};
export const MODE_IDS = ["board", "illustration", "art"];

export const STEPS = [
  { n: "01", t: "מקור", d: "כותבים שם של ספר, שיר, יוצר או מחשבה. כמה מילים מספיקות. שם היוצר ליד שם היצירה מדייק את הקריאה." },
  { n: "02", t: "קריאה", d: "Claude קורא את המקור כמו שאדריכלית קוראת אתר: איזה חומר, איזה אור, איזה קנה מידה ואיזה שקט יש בו." },
  { n: "03", t: "תרגום", d: "כל מקור נקרא בשלוש קריאות: קריאה 1, לוח חומרים. קריאה 2, המחשה. קריאה 3, מרחב מחודש. בכל קריאה נכתב פרומפט חזותי ונוצר צילום אדריכלי." },
  { n: "04", t: "ארכיון", d: "המקור נשמר כסדרה של שלוש הקריאות, עם הזהות המרחבית, הפרשנות והפרומפט. קריאה שחסרה מסומנת, ואפשר להשלים אותה." },
];

/*
  כיווני חשיבה למקור השראה: כל כיוון הוא דרך אחרת להיכנס למרחב.
  בכל דוגמה: היצירה, ואחרי פסיק היוצר. מקומות בשם עברי ובשם המלא בלועזית, כדי שאפשר יהיה למצוא אותם.
*/
export const DIRECTIONS = [
  {
    id: "lit", name: "ספרות",
    tip: "בחרו יצירה שהמקום בה הוא כמעט דמות: בית, עיר, חדר שחוזרים אליו.",
    items: ["הר הקסמים, תומאס מאן", "מאה שנים של בדידות, גבריאל גרסיה מרקס", "סיפור פשוט, ש״י עגנון"],
  },
  {
    id: "poem", name: "שירה",
    tip: "שיר קצר נותן חומר אחד ואור אחד. מספיקה שורה שנשארת.",
    items: ["לכל איש יש שם, זלדה", "ואולי, רחל", "ירושלים 1967, יהודה עמיחי"],
  },
  {
    id: "music", name: "מוזיקה",
    tip: "קצב הופך למקצב של עמודים וחלונות. הפסקה הופכת לחלל.",
    items: ["הסוויטות לצ׳לו, יוהאן סבסטיאן באך", "ג׳ימנופדיות, אריק סאטי", "Kind of Blue, מיילס דייוויס"],
  },
  {
    id: "idea", name: "מושג ופילוסופיה",
    tip: "מושג מופשט מבקש תרגום לחומר מוחשי. זה המבחן הקשה והמעניין.",
    items: ["הפואטיקה של המרחב, גסטון בשלאר", "לבנות, לשכון, לחשוב, מרטין היידגר", "מָה (間), המרווח היפני"],
  },
  {
    id: "art", name: "אמנות",
    tip: "צבע, קומפוזיציה ואור עוברים כמעט ישר לחדר.",
    items: ["טבע דומם, ג׳ורג׳ו מורנדי", "קפלת רותקו (Rothko Chapel, Houston), מרק רותקו", "שמש בחדר ריק, אדוארד הופר"],
  },
  {
    id: "place", name: "מקום",
    tip: "מקום אמיתי נקרא דרך הזיכרון, לא דרך הגלויה. כתבו גם את השעה או העונה.",
    items: ["נמל יפו (Jaffa Port), בשעת שקיעה", "עין הוד (Ein Hod Artists' Village), בחורף", "ריואן־ג׳י, קיוטו (Ryōan-ji, Kyoto)"],
  },
  {
    id: "maker", name: "יוצר",
    tip: "יוצר שלם הוא עולם. הוסיפו תקופה או יצירה אחת כדי לדייק.",
    items: ["פרידה קאלו, הבית הכחול", "לאונרד כהן, הידרה בשנות השישים", "פינה באוש, קפה מילר"],
  },
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

/* שלוש הקריאות של מקור אחד: לכל אופן הגרסה האחרונה, ומספר הגרסאות */
export function readingsOf(items) {
  const out = {};
  for (const id of MODE_IDS) {
    const list = items.filter(g => g.mode === id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    out[id] = { latest: list[0] || null, count: list.length };
  }
  out.missing = MODE_IDS.filter(id => !out[id].latest);
  return out;
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
