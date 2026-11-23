import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Los vídeos del hand-off por QR (bucket "tiktok-videos") son temporales: solo
// sirven para pasar el vídeo al móvil escaneando el QR. Este cron borra los que
// tengan más de DIAS días para que el bucket no se acumule.
const BUCKET = "tiktok-videos";
const DIAS = 7;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) {
    // El bucket puede no existir aún (nadie ha generado un QR): no es un fallo.
    return NextResponse.json({ ok: true, borrados: 0, nota: error.message });
  }

  const limite = Date.now() - DIAS * 86400000;
  const viejos = (data ?? [])
    .filter((f) => {
      const t = f.created_at ? new Date(f.created_at).getTime() : 0;
      return t > 0 && t < limite;
    })
    .map((f) => f.name);

  if (viejos.length === 0) return NextResponse.json({ ok: true, borrados: 0 });

  const { error: delErr } = await admin.storage.from(BUCKET).remove(viejos);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, borrados: viejos.length });
}
