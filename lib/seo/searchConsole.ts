import { SignJWT, importPKCS8 } from "jose";

// ─────────────────────────────────────────────────────────────────
// Google Search Console: datos reales de búsqueda (clics, impresiones,
// CTR y posición media). Autenticación con cuenta de servicio (JWT
// firmado con `jose`, sin dependencias extra). No inventa nada: si no
// hay credenciales o la API falla, devuelve el estado con el motivo.
// ─────────────────────────────────────────────────────────────────

export type GscQuery = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number; // 0-1
  position: number;
};

export type GscPagina = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscResumen = {
  totales: { clicks: number; impressions: number; ctr: number; position: number };
  rango: { desde: string; hasta: string };
  topQueries: GscQuery[];
  porPagina: Record<string, GscPagina>; // clave: slug (último segmento de la URL)
};

export type SearchConsoleEstado = {
  conectado: boolean;
  motivo: string;
  datos?: GscResumen;
};

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URI = "https://oauth2.googleapis.com/token";
const API = "https://searchconsole.googleapis.com/webmasters/v3";

function fecha(offsetDias: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDias);
  return d.toISOString().slice(0, 10);
}

function slugDeUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    const seg = path.split("/").filter(Boolean).pop();
    return seg || null;
  } catch {
    return null;
  }
}

async function accessToken(clientEmail: string, privateKeyRaw: string): Promise<string> {
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const key = await importPKCS8(privateKey, "RS256");
  const jwt = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setAudience(TOKEN_URI)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`token ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("respuesta de token sin access_token");
  return json.access_token;
}

type Fila = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

async function consultar(
  token: string,
  siteUrl: string,
  body: Record<string, unknown>
): Promise<Fila[]> {
  const res = await fetch(`${API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 403) {
    throw Object.assign(new Error("sin acceso a la propiedad (403)"), { code: 403 });
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`query ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { rows?: Fila[] };
  return json.rows ?? [];
}

export async function obtenerSearchConsole(): Promise<SearchConsoleEstado> {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY;
  const siteUrl = process.env.GSC_SITE_URL;

  if (!clientEmail || !privateKey || !siteUrl) {
    return {
      conectado: false,
      motivo:
        "Sin conectar. Da de alta interroommurcia.com en Google Search Console y añade las credenciales (GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL) para traer búsquedas reales, posición media y CTR.",
    };
  }

  const desde = fecha(30);
  const hasta = fecha(2); // Google acumula datos con 1-2 días de retraso

  try {
    const token = await accessToken(clientEmail, privateKey);

    const [queries, paginas] = await Promise.all([
      consultar(token, siteUrl, { startDate: desde, endDate: hasta, dimensions: ["query"], rowLimit: 25 }),
      consultar(token, siteUrl, { startDate: desde, endDate: hasta, dimensions: ["page"], rowLimit: 1000 }),
    ]);

    const topQueries: GscQuery[] = queries.map((r) => ({
      query: r.keys?.[0] ?? "",
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));

    const porPagina: Record<string, GscPagina> = {};
    let clicks = 0;
    let impressions = 0;
    let posSuma = 0;
    for (const r of paginas) {
      clicks += r.clicks;
      impressions += r.impressions;
      posSuma += r.position * r.impressions;
      const slug = slugDeUrl(r.keys?.[0] ?? "");
      if (slug) porPagina[slug] = { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position };
    }

    const datos: GscResumen = {
      totales: {
        clicks,
        impressions,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position: impressions > 0 ? posSuma / impressions : 0,
      },
      rango: { desde, hasta },
      topQueries,
      porPagina,
    };

    const hayDatos = impressions > 0 || topQueries.length > 0;
    return {
      conectado: true,
      motivo: hayDatos
        ? `Datos reales de Google de los últimos 28 días (${desde} a ${hasta}).`
        : "Conectado correctamente. Aún no hay datos de búsqueda: Google tarda 2-3 días en empezar a mostrar impresiones de una propiedad nueva.",
      datos: hayDatos ? datos : undefined,
    };
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code === 403) {
      return {
        conectado: false,
        motivo:
          "Credenciales detectadas, pero la cuenta de servicio todavía no tiene acceso a la propiedad. En Search Console → Configuración → Usuarios y permisos, añade gsc-reader@… como usuario (permiso Restringido).",
      };
    }
    return {
      conectado: false,
      motivo: `Credenciales detectadas, pero falló la conexión con Search Console: ${
        e instanceof Error ? e.message : "error desconocido"
      }`,
    };
  }
}
