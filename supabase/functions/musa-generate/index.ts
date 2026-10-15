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

/* Three readings of one source, each pushed to its extreme:
   1 board: a material composition that stands as a work of art.
   2 illustration: the authentic, archaic place where the source lived, untouched by time.
   3 art: the same DNA translated into radical contemporary minimalism. */
const BRIEFS: Record<Mode, string> = {
  board: `A material composition for [INPUT], made and photographed as a work of art, not as a design board.
Real physical samples, chosen for what they carry of [INPUT]: stone, lime plaster, timber, metal, glass, paper, textile, earth, ash, wax. Each cut, broken or folded so its section and its surface both show.
They are arranged on one ground (a raw plinth, a plaster slab or a worn table) as a single abstract composition, with the discipline of a still life by Giorgio Morandi, the layered planes of a Ben Nicholson relief and the restraint of an Isamu Noguchi garden: a clear centre of gravity, one deliberate tension, generous negative space, a rhythm of large and small, heavy and light.
The colour field is drawn from the emotional register of [INPUT]: two or three tones and one dissonant accent. One gesture belongs only to [INPUT] and is unmistakable.
Light: a single raking museum light from one side, deep soft shadows, every texture legible.
Shot from slightly above, like a sculpture in a catalogue raisonné, medium format, quiet, gallery-grade. It must read as an artwork that could hang in a museum. No labels, no grid, no collage of photographs, no frames.`,
  illustration: `The authentic, archaic place where the world of [INPUT] was actually lived, as if found untouched and photographed today.
Everything is true to the period, region and climate of [INPUT]: vernacular construction, hand-made materials, lime wash over rough stone or earth, smoke-darkened beams, hand-worn thresholds, iron, clay, wool, unbleached linen. Patina everywhere; nothing restored, nothing new, no object later than the time of [INPUT].
Objects that belong to [INPUT] are left mid-use, as if the inhabitant has just stepped out.
Light is only what that time had: daylight from one small deep window, or a single flame. Dust in the air, deep shadow, warm and cold zones in the same room.
Documentary, archival quality: large format camera, natural film grain, honest colour, oblique view at 30 to 45 degrees to the main wall, slightly below eye level, strong foreground texture, depth that falls into darkness.
No people, no modern objects, no restoration gloss, no HDR, no computed symmetry.`,
  art: `A contemporary residence that translates the DNA of [INPUT] into radical minimalism: one idea, built with absolute restraint.
Architecture by reduction: monolithic surfaces in one or two materials only (micro-cement, fine lime plaster, pale stone, bleached oak), concealed details, no visible frames, no skirting, no handles. One frameless full-height opening to the outside, landscape or sky as the only image.
Almost empty: at most one low piece of furniture and one object that carries [INPUT]. The rest is proportion, light and silence, in the spirit of John Pawson and Tadao Ando.
Light: soft directional daylight that turns a wall into a gradient; one precise shadow line.
Photography: medium format, calm, perfectly controlled verticals, a single-point or gentle two-point view, high-key but rich in tone.
Publication ready as a lead image in an architecture monograph. No clutter, no decoration, no people, no HDR, no text.`,
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

const system = (mode: Mode) => `You are an architectural ontologist. You translate a source of inspiration (a book, a song, an author, a person, a philosophical thought) into space. Be total: push the brief below to its extreme, never toward a safe middle.
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
  const image_url = await makeImage(out.visual_prompt, id, errs);

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
