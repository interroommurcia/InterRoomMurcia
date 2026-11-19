import { NextRequest, NextResponse } from "next/server";
import { listarSubidas, crearSubida } from "../../../../../lib/factura/subidas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const anioParam = req.nextUrl.searchParams.get("anio");
    const anio = anioParam ? Number(anioParam) : undefined;
    return NextResponse.json(await listarSubidas(anio));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const fecha = String(form.get("fecha") || "").slice(0, 10);
    const concepto = String(form.get("concepto") || "").trim();
    const importeRaw = String(form.get("importe") || "").replace(",", ".");
    const notas = String(form.get("notas") || "").trim();

    if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    if (!fecha) return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
    if (!concepto) return NextResponse.json({ error: "Falta el concepto" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const subida = await crearSubida({
      fecha,
      concepto,
      importe: importeRaw ? Number(importeRaw) || null : null,
      notas: notas || null,
      nombreArchivo: file.name || "factura",
      contentType: file.type || "application/octet-stream",
      buffer,
    });
    return NextResponse.json(subida);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
