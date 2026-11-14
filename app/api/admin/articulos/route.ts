import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const { data, error } = await supabaseAdmin.from("articulos").select("*").eq("id", id).single();
    if (error || !data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(data);
  }

  const COLS = "id, slug, meta_title, h1, keyword, estado, created_at, hero_image_thumb, views, cta_clicks, mostrar_en_listado, template";
  // Intenta con origen_generacion; si la migración aún no se ha corrido, reintenta
  // sin esa columna para no romper el listado del admin.
  const q1 = await supabaseAdmin
    .from("articulos")
    .select(`${COLS}, origen_generacion`)
    .order("created_at", { ascending: false });
  let data = q1.data as unknown[] | null;
  let error = q1.error;
  if (error && /column .* does not exist/i.test(error.message)) {
    const q2 = await supabaseAdmin
      .from("articulos")
      .select(COLS)
      .order("created_at", { ascending: false });
    data = q2.data as unknown[] | null;
    error = q2.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const body = await req.json();
  const {
    slug, meta_title, meta_description, h1, intro, sections, cta, faq, fuentes,
    hero_image, hero_image_thumb, hero_image_credit, hero_image_credit_url,
    hero_image_source, keyword, mostrar_en_listado, template, origen_generacion,
  } = body;

  if (!slug || !h1) return NextResponse.json({ error: "slug y h1 requeridos" }, { status: 400 });

  const origen = origen_generacion === "masa" ? "masa" : "unitario";
  const base = {
    slug, meta_title, meta_description, h1, intro,
    sections: sections ?? [], cta,
    faq: faq ?? [],
    fuentes: fuentes ?? [],
    hero_image, hero_image_thumb, hero_image_credit,
    hero_image_credit_url, hero_image_source, keyword,
    estado: "borrador",
    mostrar_en_listado: mostrar_en_listado ?? true,
    template: template ?? "clasico",
    updated_at: new Date().toISOString(),
  };

  // Incluye origen_generacion; si la migración aún no se ha corrido, reintenta
  // sin esa columna para no romper la generación.
  let { data, error } = await supabaseAdmin
    .from("articulos")
    .upsert({ ...base, origen_generacion: origen }, { onConflict: "slug" })
    .select()
    .single();
  if (error && /column .* does not exist/i.test(error.message)) {
    ({ data, error } = await supabaseAdmin
      .from("articulos")
      .upsert(base, { onConflict: "slug" })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const { id, estado } = await req.json();
  if (!id || !estado) return NextResponse.json({ error: "id y estado requeridos" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("articulos")
    .update({ estado, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("articulos")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const { id } = await req.json();
  const { error } = await supabaseAdmin.from("articulos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
