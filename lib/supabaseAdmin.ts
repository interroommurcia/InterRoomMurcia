import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Se crea de forma perezosa: si se instanciara al importar el módulo, un build
// sin SUPABASE_SERVICE_ROLE_KEY (por ejemplo antes de configurarla en Vercel)
// rompería "next build" al recolectar datos de las rutas /api/admin.
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
      global: {
        // Next.js cachea fetch() por defecto; sin esto, la primera lectura de
        // cada endpoint /api/admin/* queda pegada en memoria y no refleja
        // escrituras posteriores (mismo bug ya visto en lib/articulos.ts).
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    });
  }
  return client;
}
