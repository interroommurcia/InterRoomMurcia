import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { crearLead } from "../../../lib/leads";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const telefono = (formData.get("telefono") as string)?.trim().slice(0, 30) || "";
  const nombre = (formData.get("nombre") as string)?.trim().slice(0, 120) || "";
  const importeMensual = (formData.get("importeMensual") as string)?.trim() || "";
  const comercializadora = (formData.get("comercializadora") as string)?.trim().slice(0, 100) || "";
  const potenciaContratada = (formData.get("potenciaContratada") as string)?.trim() || "";
  const file = formData.get("factura") as File | null;

  if (!telefono) {
    return NextResponse.json({ error: "El teléfono es obligatorio" }, { status: 400 });
  }

  let facturaUrl: string | null = null;

  if (file && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Archivo demasiado grande (máx 10MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const allowed = ["pdf", "jpg", "jpeg", "png", "webp", "heic"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: "Formato no permitido. Usa PDF, JPG o PNG" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    await supabase.storage.createBucket("facturas-luz", { public: false }).catch(() => {});

    const path = `${Date.now()}-${telefono.replace(/\D/g, "")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from("facturas-luz")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) {
      console.error("[comparador-luz] upload error:", uploadErr.message);
    } else {
      facturaUrl = path;
    }
  }

  const mensaje = [
    `Comparador luz`,
    importeMensual ? `Importe: ${importeMensual}€/mes` : null,
    comercializadora ? `Comercializadora: ${comercializadora}` : null,
    potenciaContratada ? `Potencia: ${potenciaContratada} kW` : null,
    facturaUrl ? `Factura: ${facturaUrl}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  try {
    await crearLead({
      nombre,
      telefono,
      direccion: "",
      email: "",
      tipo: "",
      mensaje,
      origen: "comparador-luz",
      seccion: "propietarios",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[comparador-luz] lead error:", err);
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }
}
