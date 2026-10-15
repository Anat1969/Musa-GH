// MUSA (Muse Meridian) — translates a source of inspiration into an architectural image.
// Text: Claude (ANTHROPIC_API_KEY) reads the spatial identity of the source and writes
// the visual prompt and a Hebrew interpretation. Image: fal.ai (FAL_API_KEY), copied
// into the musa-media bucket so it never expires. Open to every visitor (no login).
// Without a fal key it falls back to the old Lovable function (see legacyImage). If that fails too, the study is still saved (reading, interpretation, prompt) with image_url null,
// and { imageFor: id } completes the image later.
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB_HEADERS = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };
const BUCKET = "musa-media";
const MODES = ["board", "illustration", "art"] as const;
type Mode = typeof MODES[number];

const SUFFIX = "Documentary realism, professional architecture photography. No text, no words, no writing, no frame divisions.";

const BRIEFS: Record<Mode, string> = {
  board: `Architectural mood board for [INPUT].
A curated constellation of visual fragments, not a collage but a field: material swatches, light studies, spatial atmospheres, tectonic details. Each element chosen for its cognitive resonance with the inner world of [INPUT], not for decorative harmony.
Color palette extracted from its emotional register: two to three dominant tones, one dissonant accent. Materials shown in cross-section and surface: how they age, how they receive light, how they resist touch.
Spatial references appear as fragments: a threshold, a ceiling angle, a window aperture. Scale references embedded naturally: a hand, a shadow, a horizon line.
One tactile detail at the center of gravity, where the human and the material meet without ceremony.
Editorial direction: the board reads as one breathing surface, medium format clarity, analogue warmth, slight grain. One dominant material or light study anchors the center; secondary fragments orbit at considered distances. The eye travels from tactile and warm to atmospheric and pale. One consistent light temperature across all fragments, chosen to match the register of [INPUT].
Publication ready as an editorial spread in Wallpaper, Apartamento or Pin-Up. No labels, no grid lines.`,
  illustration: `Architectural living space that embodies the cognitive and philosophical world of [INPUT], as it was lived.
The space is intimate and unheroic. Materials carry memory: nothing purchased for effect. Objects that belong to the world of [INPUT] are placed, not displayed, mid-thought. The palette, period, climate and light are drawn from the time and place of [INPUT].
Light from a single dominant directional source, never visible itself, only its consequence on surface and volume. The space holds a particular silence: inhabited by something just finished or about to begin. Small contradictions: the orderly and the abandoned, the tender and the worn.
Photography: large format, 35mm equivalent, oblique camera at 30 to 45 degrees to the dominant wall, slightly below standing eye level. Strong foreground anchor, mid-ground carries the spatial narrative, background dissolves into controlled depth.
Publication ready as a full-bleed cover of Wallpaper, Domus or El Croquis. No HDR, no computed symmetry, no people.`,
  art: `A newly designed residential interior for a discerning client, drawn from the DNA of [INPUT] and translated into contemporary precision, built for life today.
Not a reconstruction: a translation. The same emotional frequency, built with contemporary craft. Clean but not cold; the room breathes without performing.
Materials selected for what they carry: plaster, oiled wood, stone, linen, chosen to echo [INPUT]. Furniture sparse, grounded, close to the floor. One considered alcove at human scale holding one meaningful object.
The space opens to the outside through a large aperture; the boundary between inside and outside deliberately soft.
Photography: medium format, seated eye level, 25 degrees off the main wall axis, never frontal. Late afternoon single directional light; the light does not illuminate, it selects.
Publication ready as an AD or Wallpaper spread and as the first image of a client presentation. No people, no HDR, no computed symmetry.`,
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["spatial_identity", "visual_prompt", "hebrew_interpretation"],
  properties: {
    spatial_identity: { type: "string" },
    visual_prompt: { type: "string" },
    hebrew_interpretation: { type: "string" },
  },
};

const system = (mode: Mode) => `You are an architectural ontologist. You translate a source of inspiration (a book, a song, an author, a person, a philosophical thought) into space.
1. spatial_identity: one Hebrew sentence, up to 20 words, naming the spatial essence of the source: which space, matter and light it is.
2. visual_prompt: one vivid English paragraph an image model can render directly, following the brief below. Replace [INPUT] with the actual source; never output the token [INPUT]. Every detail must contribute to the image.
3. hebrew_interpretation: natural, precise Hebrew, up to 30 words, that links the specific source to the chosen spatial and material elements. Not flowery, no exclamation marks.

BRIEF:
${BRIEFS[mode]}`;

function falKey(): string | undefined {
  const direct = Deno.env.get("FAL_API_KEY")?.trim();
  if (direct) return direct;
  for (const name of Object.keys(Deno.env.toObject())) {
    if (!/fal/i.test(name) || /^SUPABASE_/i.test(name)) continue;
    const v = Deno.env.get(name)?.trim();
    if (v) return v;
  }
}

/* Temporary route while cultura-GH has no fal secret: the old Lovable "generate" function still
   holds Anat's fal keys. The study's own visual prompt goes in as the source, so the image follows it.
   Once FAL_API_KEY is set this is never reached; if the Lovable project is deleted it simply fails. */
const LEGACY_URL = "https://fzpgcgbyhnximfmxicvi.supabase.co";
const LEGACY_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6cGdjZ2J5aG54aW1mbXhpY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzA3NzYsImV4cCI6MjA5MTA0Njc3Nn0.Ol0ORgB1kktgsQJ-ggA2dwoCNU1gXo0k55XdKVbAZ7Q";

async function legacyImage(prompt: string, mode: string, id: string, imageErrors: string[]): Promise<string | null> {
  try {
    const r = await fetch(`${LEGACY_URL}/functions/v1/generate`, {
      method: "POST",
      headers: { apikey: LEGACY_KEY, Authorization: `Bearer ${LEGACY_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: `${prompt} ${SUFFIX}`, mode }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.image_url) { imageErrors.push(`legacy ${r.status} ${JSON.stringify(data).slice(0, 160)}`); return null; }
    return await store(data.image_url, id);
  } catch (e) { imageErrors.push(`legacy ${e}`); return null; }
}

/* Copies an image into musa-media so it never expires */
async function store(url: string, id: string): Promise<string> {
  const img = await fetch(url);
  if (!img.ok) return url;
  const type = img.headers.get("content-type") ?? "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const path = `studies/${id}.${ext}`;
  const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Content-Type": type, "x-upsert": "true", "Cache-Control": "31536000" },
    body: await img.arrayBuffer(),
  });
  return up.ok ? `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}` : url;
}

async function makeImage(prompt: string, id: string, imageErrors: string[], mode: string): Promise<string | null> {
  const key = falKey();
  if (!key) {
    imageErrors.push("FAL_API_KEY is not configured");
    return await legacyImage(prompt, mode, id, imageErrors);
  }
  const full = `${prompt} ${SUFFIX}`;
  for (const [endpoint, body] of [
    ["https://fal.run/fal-ai/nano-banana-2", { prompt: full, image_size: "landscape_16_9" }],
    ["https://fal.run/fal-ai/flux/schnell", { prompt: full, image_size: "landscape_16_9", num_inference_steps: 4, num_images: 1 }],
  ] as const) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { imageErrors.push(`${endpoint.split("/").pop()} ${r.status} ${(await r.text()).slice(0, 160)}`); continue; }
      const data = await r.json();
      const url = data?.images?.[0]?.url;
      if (!url) { imageErrors.push(`${endpoint.split("/").pop()} no image`); continue; }
      return await store(url, id);
    } catch (e) { imageErrors.push(`${endpoint.split("/").pop()} ${e}`); }
  }
  console.error("musa image failed", imageErrors);
  return null;
}

function noImage(errs: string[]): string {
  return errs.some(e => e.includes("FAL_API_KEY")) && !errs.some(e => e.startsWith("legacy"))
    ? "מפתח התמונות (FAL_API_KEY) עדיין לא מוגדר בפרויקט. הקריאה והפרומפט נשמרו, והתמונה תושלם כשהמפתח יוגדר."
    : "יצירת התמונה נכשלה. הקריאה והפרומפט נשמרו, ואפשר להשלים את התמונה מדף המחקר.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { source?: string; mode?: string; fresh?: boolean; imageFor?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // Complete the image of a saved study that has none.
  if (body.imageFor) {
    if (!/^[0-9a-f-]{36}$/i.test(body.imageFor)) return json({ error: "Invalid id" }, 400);
    const q = await fetch(`${SB_URL}/rest/v1/musa_generations?select=*&id=eq.${body.imageFor}`, { headers: SB_HEADERS });
    const [row] = q.ok ? await q.json() : [];
    if (!row) return json({ error: "המחקר לא נמצא." }, 404);
    if (row.image_url) return json({ generation: row });
    const errs: string[] = [];
    const image_url = await makeImage(row.visual_prompt, row.id, errs, row.mode);
    if (!image_url) return json({ error: noImage(errs), detail: errs }, 502);
    const up = await fetch(`${SB_URL}/rest/v1/musa_generations?id=eq.${row.id}`, {
      method: "PATCH",
      headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ image_url }),
    });
    const [saved] = up.ok ? await up.json() : [{ ...row, image_url }];
    return json({ generation: saved });
  }
  const source = String(body.source ?? "").trim().slice(0, 600);
  const mode = (MODES as readonly string[]).includes(String(body.mode)) ? body.mode as Mode : null;
  if (!source) return json({ error: "צריך לכתוב מקור השראה." }, 400);
  if (!mode) return json({ error: "אופן התרגום לא מוכר." }, 400);

  // Same source and mode already studied: return it, unless a fresh version was asked for.
  if (!body.fresh) {
    const q = await fetch(
      `${SB_URL}/rest/v1/musa_generations?select=*&source=eq.${encodeURIComponent(source)}&mode=eq.${mode}&order=created_at.desc&limit=1`,
      { headers: SB_HEADERS },
    );
    const rows = q.ok ? await q.json() : [];
    if (rows.length) return json({ generation: rows[0], cached: true });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
  const client = new Anthropic({ apiKey });

  let out: { spatial_identity: string; visual_prompt: string; hebrew_interpretation: string };
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: system(mode),
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: `מקור ההשראה: ${source}` }],
    } as never);
    if (response.stop_reason === "refusal") return json({ error: "הבקשה נדחתה. נסו ניסוח אחר." }, 422);
    const text = response.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
    out = JSON.parse(text);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "עומס זמני, נסו שוב בעוד דקה." }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `Claude API ${err.status}: ${err.message}` }, 502);
    return json({ error: String(err) }, 500);
  }

  const id = crypto.randomUUID();
  const errs: string[] = [];
  const image_url = await makeImage(out.visual_prompt, id, errs, mode);

  const row = { id, source, mode, image_url, ...out };
  const ins = await fetch(`${SB_URL}/rest/v1/musa_generations`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!ins.ok) return json({ error: `שמירה נכשלה: ${await ins.text()}` }, 500);
  const [saved] = await ins.json();
  return json({ generation: saved, cached: false, ...(image_url ? {} : { imageError: noImage(errs), detail: errs }) });
});
