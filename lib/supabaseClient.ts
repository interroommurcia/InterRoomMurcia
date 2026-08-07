import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    // Next.js cachea fetch() en RSC por defecto; sin esto, la lista de pisos
    // (y demás lecturas server-side) queda pegada en memoria y no refleja
    // borrados/altas hasta que el proceso se reinicia.
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});
