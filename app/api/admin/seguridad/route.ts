import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 200);
  const severity = req.nextUrl.searchParams.get("severity");

  const admin = getSupabaseAdmin();
  let query = admin
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (severity) {
    query = query.eq("severity", severity);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count: totalToday } = await admin
    .from("security_events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { count: highToday } = await admin
    .from("security_events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .in("severity", ["high", "critical"]);

  return NextResponse.json({
    events: data ?? [],
    stats: {
      totalToday: totalToday ?? 0,
      highToday: highToday ?? 0,
    },
  });
}
