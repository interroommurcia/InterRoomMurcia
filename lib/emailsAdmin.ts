import { getSupabaseAdmin } from "./supabaseAdmin";

export type EmailEnviado = {
  id: string;
  destinatario: string;
  asunto: string;
  contexto: string | null;
  visto: boolean;
  created_at: string;
};

export async function registrarEmailEnviado(
  destinatario: string | string[],
  asunto: string,
  contexto?: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const dest = Array.isArray(destinatario) ? destinatario.join(", ") : destinatario;
  await admin.from("emails_enviados").insert({
    destinatario: dest,
    asunto,
    contexto: contexto ?? null,
  });
}

export async function listarEmailsPendientes(): Promise<EmailEnviado[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("emails_enviados")
    .select("*")
    .eq("visto", false)
    .order("created_at", { ascending: false });
  return (data as EmailEnviado[]) ?? [];
}

export async function marcarTodosVistos(): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from("emails_enviados").update({ visto: true }).eq("visto", false);
}
