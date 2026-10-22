/**
 * POST /api/admin/posthog/recordings/[id]/share
 *
 * Habilita el share público para una grabación de PostHog y devuelve
 * la URL pública (`/shared/<token>`) que podemos embeber en un iframe
 * dentro del panel admin, sin que el admin tenga que loguearse en
 * PostHog cada vez.
 */
import { NextResponse } from "next/server";

const PH_API = "https://eu.posthog.com";
const PH_KEY = process.env.POSTHOG_PERSONAL_API_KEY ?? "";
const PH_PROJ = process.env.POSTHOG_PROJECT_ID ?? "";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!PH_KEY || !PH_PROJ) {
    return NextResponse.json({ error: "POSTHOG_PERSONAL_API_KEY o POSTHOG_PROJECT_ID no configurados" }, { status: 503 });
  }
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Falta id de la grabación" }, { status: 400 });

  try {
    const res = await fetch(
      `${PH_API}/api/projects/${PH_PROJ}/session_recordings/${encodeURIComponent(id)}/sharing/`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${PH_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        {
          error: `PostHog ${res.status}: ${txt.slice(0, 300)}`,
          // Fallback: devolvemos la URL privada por si el share no está
          // disponible (plan free limitado, feature deshabilitada, etc.).
          fallback_url: `${PH_API}/project/${PH_PROJ}/replay/${id}`,
        },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      return NextResponse.json(
        { error: "PostHog no devolvió access_token", fallback_url: `${PH_API}/project/${PH_PROJ}/replay/${id}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ shared_url: `${PH_API}/shared/${data.access_token}` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
