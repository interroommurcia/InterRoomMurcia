import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Next.js cachea en disco cualquier fetch() por defecto, incluso en rutas
// "force-dynamic". Sin esto, el listado público sirve datos obsoletos hasta
// que caduca la cache o se borra manualmente .next/cache.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});
