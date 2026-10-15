import { createClient } from "@supabase/supabase-js";

/*
  Supabase: פרויקט cultura-GH, משותף לאפליקציות אחרות. מוזה נוגעת רק במה שמתחיל ב-musa.
  musa_generations: קריאה ציבורית. כתיבה רק דרך הפונקציה musa-generate (service role).
  אין כניסה והרשאות: כל מבקר יכול לתרגם. הכפתור שמפעיל את המפתחות מסומן במפתח מאיר.
*/
const URL = import.meta.env.VITE_SUPABASE_URL || "https://ktqmwpbzcnzkhjskqisy.supabase.co";
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0cW13cGJ6Y256a2hqc2txaXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODM4OTgsImV4cCI6MjEwNTc1OTg5OH0.uPKn4hrLk16jhDoajMjPl4OmV5j1b3bMIECVmOdhWGI";

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function listGenerations() {
  const { data, error } = await supabase
    .from("musa_generations")
    .select("id,source,mode,image_url,hebrew_interpretation,visual_prompt,spatial_identity,created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

/* משלים תמונה למחקר שנשמר בלי תמונה. מפעיל את מפתח fal */
export async function completeImage(id) {
  const { data, error } = await supabase.functions.invoke("musa-generate", { body: { imageFor: id } });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data.generation;
}

/* תמונה שהודבקה ידנית: מוקטנת ל-JPEG (עד 2400 פיקסלים) ונשמרת כתמונת המחקר. לא מפעיל מפתח בתשלום */
export async function setImage(id, blob) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const jpeg = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
  const buf = new Uint8Array(await jpeg.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const { data, error } = await supabase.functions.invoke("musa-generate", { body: { setImage: { id, data: btoa(bin), type: "image/jpeg" } } });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data.generation;
}

/* מפעיל את מפתחות Claude ו-fal. fresh: גרסה חדשה גם אם המקור כבר נחקר באותו אופן */
export async function generate(source, mode, fresh = false) {
  const { data, error } = await supabase.functions.invoke("musa-generate", { body: { source, mode, fresh } });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
