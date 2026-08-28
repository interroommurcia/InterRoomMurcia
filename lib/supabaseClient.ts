import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});

export const supabasePublic = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, next: { revalidate: 60 } } as RequestInit),
  },
});
