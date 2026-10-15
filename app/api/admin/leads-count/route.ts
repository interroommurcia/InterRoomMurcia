import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getSesion } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSesion();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);

  const since = url.searchParams.get("since");
  const supabase = getSupabaseAdmin();

  let query = supabase.from("leads_propietarios").select("seccion", { count: "exact", head: false });
  if (since) {
    query = query.gt("created_at", since);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of data ?? []) {
    const s = row.seccion || "propietarios";
    counts[s] = (counts[s] || 0) + 1;
    total++;
  }

  return NextResponse.json({ total, counts });
}
