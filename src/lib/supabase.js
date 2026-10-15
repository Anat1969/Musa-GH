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
