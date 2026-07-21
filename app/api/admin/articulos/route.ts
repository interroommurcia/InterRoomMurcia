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

  const { data, error } = await supabaseAdmin
    .from("articulos")
    .select("id, slug, meta_title, h1, keyword, estado, created_at, hero_image_thumb, views, cta_clicks, mostrar_en_listado")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const body = await req.json();
  const {
    slug, meta_title, meta_description, h1, intro, sections, cta, faq,
    hero_image, hero_image_thumb, hero_image_credit, hero_image_credit_url,
    hero_image_source, keyword, mostrar_en_listado,
  } = body;

  if (!slug || !h1) return NextResponse.json({ error: "slug y h1 requeridos" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("articulos")
    .upsert(
      {
        slug, meta_title, meta_description, h1, intro,
        sections: sections ?? [], cta,
        faq: faq ?? [],
        hero_image, hero_image_thumb, hero_image_credit,
        hero_image_credit_url, hero_image_source, keyword,
        estado: "borrador",
        mostrar_en_listado: mostrar_en_listado ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

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
