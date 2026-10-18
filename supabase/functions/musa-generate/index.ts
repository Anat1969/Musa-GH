// MUSA (Muse Meridian) — translates a source of inspiration into an architectural image.
// Text: Claude (ANTHROPIC_API_KEY) reads the spatial identity of the source and writes
// the visual prompt and a Hebrew interpretation. Image: fal.ai (FAL_API_KEY), copied
// into the musa-media bucket so it never expires. Open to every visitor (no login).
// The fal key is read from FAL_API_KEY or any secret whose name contains "fal" (in cultura-GH: FAL_LM_API_KEY).
// Without an image the study is still saved (reading, interpretation, prompt) with image_url null,
// and { imageFor: id } completes the image later. { setImage: { id, data, type } } saves an image pasted by hand.
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

/* Three readings of one source, each specific to it and pushed to its extreme:
   1 board: an inspiration board composed and photographed as a work of art.
   2 illustration ("yesterday"): the real place where the source lived and worked, authentic and nostalgic,
     photographed as a fine photograph of its own era.
   3 art ("tomorrow"): the same life, longed for and upgraded, as a pragmatic contemporary space.
   Generic rooms are the failure mode: the model must first fix concrete anchors (typology, place, period,
   daily activity, signature object) and build the image from them. */
const BRIEFS: Record<Mode, string> = {
  board: `An inspiration board for [INPUT], composed and photographed as a work of art.
Every fragment is traceable to a concrete fact of [INPUT] (its place, its trade, its objects, its landscape, its colours), never a generic sample: real materials cut to show section and surface, found objects of its world, a plant or mineral of its landscape, a fragment of a period photograph or map with no legible text, one light study.
All of it arranged on one ground as a single abstract composition, with the discipline of a Giorgio Morandi still life, the layered planes of a Ben Nicholson relief and the restraint of an Isamu Noguchi garden: a clear centre of gravity, one deliberate tension, generous negative space.
Colour field drawn from [INPUT]: two or three tones and one dissonant accent.
Light: a single raking museum light, deep soft shadows. Shot from slightly above, medium format, gallery-grade, photogenic and moving. No labels, no grid, no frames, no text.`,
  illustration: `Yesterday: the real place where [INPUT] lived or worked, authentic and nostalgic, as it was in its time.
Build it from the anchors, not from a stock room. The building type is whatever truly belongs to [INPUT]: a studio, a rehearsal room, a newsroom, a café table, a ship cabin, a kibbutz dining hall, a rooftop, a shop, a classroom, a stage wing, a field tent, a garden. The city or landscape, the decade and the daily activity are specific, and the space is organised by that activity: its furniture, tools, worn paths and traces are evidence of a working life, so particular that no other source could share this image.
Materials, objects, climate and light exactly of that place and decade; honest patina, not staged.
Photograph it as a great photographer of that era would have: the camera, film stock, colour or black and white, grain and tonality of the decade (for example 1930s large-format black and white, 1960s Kodachrome, 1980s Fujichrome). One decisive composition, photogenic, emotional, nostalgic.
No people (presence only implied), no anachronisms, no text.`,
  art: `Tomorrow: the space [INPUT]'s world longs for, built as a precise contemporary upgrade of the same life.
Start from the same anchors as yesterday (building type, place, daily activity) and design their next-decade version: the same activity made easier, lighter and more generous, with real furniture and equipment for it, plus one longing of [INPUT] made real (the sea at the window, silence, a stage, a library, a garden, height, light).
Pragmatic and livable, not an empty gallery. Warm, refined contemporary architecture; today's materials and technology used with restraint; one signature element that could only belong to [INPUT].
Photography: aspirational editorial architecture photography of now, medium format digital, crisp and luminous, golden hour or blue hour, inspiring and moving.
No people, no clutter, no text.`,
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["anchors", "spatial_identity", "visual_prompt", "hebrew_interpretation"],
  properties: {
    anchors: {
      type: "object",
      additionalProperties: false,
      required: ["typology", "place", "period", "activity", "signature"],
      properties: {
        typology: { type: "string" },
        place: { type: "string" },
        period: { type: "string" },
        activity: { type: "string" },
        signature: { type: "string" },
      },
    },
    spatial_identity: { type: "string" },
    visual_prompt: { type: "string" },
    hebrew_interpretation: { type: "string" },
  },
};

const system = (mode: Mode) => `You are an architectural ontologist. You translate a source of inspiration (a book, a song, an author, a person, a place, a philosophical thought) into space. Be total: push the brief to its extreme, never toward a safe middle.

Every source must get a different space. Before writing, fix the anchors from facts about the source (for a fictional work, from its world):
- typology: the specific building or room type, and why it belongs to this source.
- place: city, region or landscape.
- period: the decade or year.
- activity: what was actually done there every day.
- signature: one object or spatial element that only this source could have.
Never fall back on stock interiors. Do not use any of these unless they are factually specific to this source: a whitewashed room with one small window, a guitar leaning on a wall, stacks of books, a ceramic mug on a sill, a linen sofa, an olive-wood table, travertine, a micro-cement box, reel-to-reel recorders, dust in a light beam.

Then write:
1. spatial_identity: one Hebrew sentence, up to 22 words, naming the typology, the place and the time concretely.
2. visual_prompt: one vivid English paragraph an image model can render directly, built from the anchors and following the brief below. Replace [INPUT] with the actual source; never output the token [INPUT]. Every detail must contribute to the image.
3. hebrew_interpretation: natural, precise Hebrew, up to 35 words. Pragmatic: name the concrete spatial decisions and the fact about the source that justifies each one. No poetic generalities, no exclamation marks.

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

async function makeImage(prompt: string, id: string, imageErrors: string[]): Promise<string | null> {
  const key = falKey();
  if (!key) { imageErrors.push("FAL_API_KEY is not configured"); return null; }
  const full = `${prompt} ${SUFFIX}`;
  for (const [endpoint, body] of [
    // nano-banana takes aspect_ratio (it ignores image_size); flux takes image_size
    ["https://fal.run/fal-ai/nano-banana-2", { prompt: full, aspect_ratio: "16:9", num_images: 1 }],
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
  return errs.some(e => e.includes("FAL_API_KEY"))
    ? "מפתח התמונות (FAL_API_KEY) עדיין לא מוגדר בפרויקט. הקריאה והפרומפט נשמרו, והתמונה תושלם כשהמפתח יוגדר."
    : "יצירת התמונה נכשלה. הקריאה והפרומפט נשמרו, ואפשר להשלים את התמונה מדף המחקר.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { source?: string; mode?: string; fresh?: boolean; imageFor?: string; setImage?: { id?: string; data?: string; type?: string } };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // An image pasted by a visitor (from Midjourney, for example) replaces the study's image.
  if (body.setImage) {
    const { id = "", data = "", type = "" } = body.setImage;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid id" }, 400);
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: "רק תמונות JPG, PNG או WEBP." }, 400);
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)); } catch { return json({ error: "התמונה לא נקראה." }, 400); }
    if (bytes.byteLength < 1000 || bytes.byteLength > 8_000_000) return json({ error: "התמונה גדולה מדי או ריקה." }, 400);
    const q = await fetch(`${SB_URL}/rest/v1/musa_generations?select=id&id=eq.${id}`, { headers: SB_HEADERS });
    if (!(q.ok && (await q.json()).length)) return json({ error: "המחקר לא נמצא." }, 404);
    const ext = type.endsWith("png") ? "png" : type.endsWith("webp") ? "webp" : "jpg";
    const path = `studies/${id}-pasted-${Date.now()}.${ext}`;
    const up = await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { ...SB_HEADERS, "Content-Type": type, "Cache-Control": "31536000" },
      body: bytes,
    });
    if (!up.ok) return json({ error: `העלאה נכשלה: ${await up.text()}` }, 500);
    const image_url = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    const p = await fetch(`${SB_URL}/rest/v1/musa_generations?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ image_url }),
    });
    if (!p.ok) return json({ error: `שמירה נכשלה: ${await p.text()}` }, 500);
    const [saved] = await p.json();
    return json({ generation: saved });
  }

  // Complete the image of a saved study that has none.
  if (body.imageFor) {
    if (!/^[0-9a-f-]{36}$/i.test(body.imageFor)) return json({ error: "Invalid id" }, 400);
    const q = await fetch(`${SB_URL}/rest/v1/musa_generations?select=*&id=eq.${body.imageFor}`, { headers: SB_HEADERS });
    const [row] = q.ok ? await q.json() : [];
    if (!row) return json({ error: "המחקר לא נמצא." }, 404);
    if (row.image_url) return json({ generation: row });
    const errs: string[] = [];
    const image_url = await makeImage(row.visual_prompt, row.id, errs);
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

  let out: { anchors: Record<string, string>; spatial_identity: string; visual_prompt: string; hebrew_interpretation: string };
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
  const image_url = await makeImage(out.visual_prompt, id, errs);

  const { anchors: _anchors, ...reading } = out;
  const row = { id, source, mode, image_url, ...reading };
  const ins = await fetch(`${SB_URL}/rest/v1/musa_generations`, {
    method: "POST",
    headers: { ...SB_HEADERS, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!ins.ok) return json({ error: `שמירה נכשלה: ${await ins.text()}` }, 500);
  const [saved] = await ins.json();
  return json({ generation: saved, cached: false, ...(image_url ? {} : { imageError: noImage(errs), detail: errs }) });
});
