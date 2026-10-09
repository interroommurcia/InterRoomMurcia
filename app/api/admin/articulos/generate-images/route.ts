import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const maxDuration = 120;

const STYLE_SUFFIX =
  "Style: ultra-realistic professional photography of the Region of Murcia (Spain), 16:9 landscape aspect ratio, 8K, warm Mediterranean golden-hour light, terracotta and ochre palette, palm trees and Levantine architecture when appropriate, no watermarks, no text overlays, no logos, no people";

const DELAY_MS = 3000;
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateImageGemini(prompt: string): Promise<{ buffer: Buffer | null; error?: string; rateLimited?: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { buffer: null, error: "GEMINI_API_KEY no configurada" };

  const styledPrompt = `${prompt}. ${STYLE_SUFFIX}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate a photorealistic image: ${styledPrompt}` }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[gemini-imagen]", res.status, err);
    return { buffer: null, error: `Gemini ${res.status}`, rateLimited: res.status === 429 };
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const imgPart = parts?.find((p: { inlineData?: { data: string } }) => p.inlineData?.data);
  const b64 = imgPart?.inlineData?.data;
  if (!b64) return { buffer: null, error: "Sin imagen en respuesta Gemini" };
  return { buffer: Buffer.from(b64, "base64") };
}

async function generateImagePollinations(prompt: string): Promise<{ buffer: Buffer | null; error?: string }> {
  const styledPrompt = `${prompt}. ${STYLE_SUFFIX}`;
  const encoded = encodeURIComponent(styledPrompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&nologo=true&seed=${Date.now()}`;

  const res = await fetch(url, { redirect: "follow" });

  if (!res.ok) {
    console.error("[pollinations-imagen]", res.status);
    return { buffer: null, error: `Pollinations ${res.status}` };
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length < 1000) {
    return { buffer: null, error: "Pollinations devolvió respuesta demasiado pequeña" };
  }
  return { buffer };
}

async function generateImage(prompt: string): Promise<{ buffer: Buffer | null; error?: string }> {
  if (process.env.GEMINI_API_KEY) {
    const gemini = await generateImageGemini(prompt);
    if (gemini.buffer) return gemini;
    if (!gemini.buffer) {
      console.log("[generate-image] Gemini falló, fallback a Pollinations");
      return generateImagePollinations(prompt);
    }
    return gemini;
  }
  return generateImagePollinations(prompt);
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

  const errors: string[] = [];
  const images: Record<string, string | null> = {};

  for (const job of jobs) {
    const { buffer, error } = await generateImage(job.prompt);
    if (!buffer) {
      errors.push(`${job.key}: ${error || "generación falló"}`);
      images[job.key] = null;
    } else {
      const url = await uploadImage(buffer, job.path);
      if (!url) errors.push(`${job.key}: upload falló`);
      images[job.key] = url;
    }
    if (job !== jobs[jobs.length - 1]) await delay(DELAY_MS);
  }

  if (errors.length) console.warn("[generate-images] errores:", errors);
  return NextResponse.json({ images, errors: errors.length ? errors : undefined });
}
