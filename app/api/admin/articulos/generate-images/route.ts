import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const maxDuration = 60;

async function generateImageGemini(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const styledPrompt = `${prompt}. Style: ultra-realistic professional photography, 8K, natural lighting, no watermarks, no text overlays, no logos, no people`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: styledPrompt }],
        parameters: { sampleCount: 1, aspectRatio: "16:9", safetyFilterLevel: "block_few" },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[gemini-imagen]", res.status, err);
    return null;
  }
  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) return null;
  return Buffer.from(b64, "base64");
}

async function uploadImage(buffer: Buffer, path: string): Promise<string | null> {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.storage.createBucket("blog-imagenes", { public: true }).catch(() => {});
  const { error } = await supabaseAdmin.storage
    .from("blog-imagenes")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
  if (error) {
    console.error("[upload-image]", error.message);
    return null;
  }
  const { data } = supabaseAdmin.storage.from("blog-imagenes").getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 });
  }

  const { slug, heroImagePrompt, sectionPrompts } = await req.json();
  if (!slug || !heroImagePrompt) {
    return NextResponse.json({ error: "slug y heroImagePrompt requeridos" }, { status: 400 });
  }

  const ts = Date.now();
  const jobs: Array<{ prompt: string; path: string; key: string }> = [
    { prompt: heroImagePrompt, path: `${slug}/${ts}-hero.jpg`, key: "hero" },
    ...((sectionPrompts as string[]) ?? []).slice(0, 3).map((p: string, i: number) => ({
      prompt: p,
      path: `${slug}/${ts}-s${i}.jpg`,
      key: `s${i}`,
    })),
  ];

  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const buffer = await generateImageGemini(job.prompt);
      if (!buffer) return { key: job.key, url: null };
      const url = await uploadImage(buffer, job.path);
      return { key: job.key, url };
    })
  );

  const images: Record<string, string | null> = {};
  for (const r of results) {
    if (r.status === "fulfilled") images[r.value.key] = r.value.url;
  }

  return NextResponse.json({ images });
}
