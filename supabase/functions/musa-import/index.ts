// MUSA — one-time import from the Lovable prototype (Muse Meridian Studio).
// Done on 2026-10-15: 40 studies in 15 projects, every image copied into musa-media.
// Disabled: returns 410. It read the Lovable Cloud table generations (public read) and copied each image.
Deno.serve(() => new Response(JSON.stringify({ error: "Import finished and disabled" }), {
  status: 410,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
}));
