import { NextRequest, NextResponse } from "next/server";
import { subirImagenPiso } from "../../../../lib/pisosAdmin";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
  }
  try {
    const url = await subirImagenPiso(file);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Error subiendo archivo", err);
    return NextResponse.json({ error: "No se pudo subir el archivo" }, { status: 500 });
  }
}
