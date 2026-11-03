import { NextResponse } from "next/server";
import { getContrato, actualizarCuerpoContrato } from "../../../../../../lib/contratos";
import { renderContenidoEditable } from "../../../../../../lib/contratos-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Limpieza defensiva del HTML que teclea el admin: fuera <script>,
// <style> y manejadores on*. No es un sanitizador completo, pero el
// autor es el propio admin autenticado; esto evita incrustar JS por error.
function limpiarHtml(html: string): string {
  return html
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .slice(0, 100000);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contrato = await getContrato(id);
  if (!contrato) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  const cuerpoHtml = await renderContenidoEditable(contrato);
  return NextResponse.json({
    cuerpoHtml,
    esPersonalizado: Boolean(contrato.cuerpo_html && contrato.cuerpo_html.trim()),
    estado: contrato.estado,
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contrato = await getContrato(id);
  if (!contrato) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });

  if (contrato.estado !== "borrador") {
    return NextResponse.json(
      { error: "Solo se puede editar el contrato mientras está en borrador (antes de generar el enlace de firma)." },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  // restaurar === true limpia el override y vuelve a la plantilla.
  if (body.restaurar === true) {
    await actualizarCuerpoContrato(id, null);
    return NextResponse.json({ ok: true, esPersonalizado: false });
  }

  const html = typeof body.cuerpoHtml === "string" ? limpiarHtml(body.cuerpoHtml).trim() : "";
  if (!html) return NextResponse.json({ error: "El contenido está vacío" }, { status: 400 });

  await actualizarCuerpoContrato(id, html);
  return NextResponse.json({ ok: true, esPersonalizado: true });
}
