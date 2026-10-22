import "server-only";
import { createElement } from "react";
import ContratoHTML from "../components/ContratoHTML";
import { getContrato, subirPdfContrato, type Contrato } from "./contratos";

// -----------------------------------------------------------------
// Pipeline de PDF
//
// 1. Renderizamos ContratoHTML a HTML con React server-rendering.
// 2. Montamos un documento completo con <link> a Google Fonts
//    (Inter + Caveat para la firma electrónica).
// 3. Lanzamos Chromium headless, cargamos el HTML con setContent y
//    esperamos a que las fuentes estén listas.
// 4. page.pdf(A4) → Buffer → subimos a Supabase Storage.
//
// En Vercel usamos @sparticuz/chromium (binario optimizado para
// serverless). En local caemos a chromium del sistema vía
// puppeteer-core apuntando a `executablePath` detectado.
// -----------------------------------------------------------------

type BrowserBundle = {
  launch: () => Promise<{
    newPage: () => Promise<unknown>;
    close: () => Promise<void>;
  }>;
};

async function getBrowserLauncher(): Promise<BrowserBundle> {
  const puppeteer = (await import("puppeteer-core")).default;

  // Detectar entorno Vercel / AWS Lambda → @sparticuz/chromium
  const isServerless =
    !!process.env.AWS_LAMBDA_FUNCTION_VERSION ||
    !!process.env.VERCEL ||
    !!process.env.NEXT_RUNTIME_SERVERLESS;

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return {
      launch: async () => {
        const executablePath = await chromium.executablePath();
        return (await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath,
          headless: chromium.headless,
        })) as unknown as { newPage: () => Promise<unknown>; close: () => Promise<void> };
      },
    };
  }

  // Entorno local: intentamos usar Chrome instalado del sistema.
  const localPath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_PATH ||
    detectarChromeLocal();
  return {
    launch: async () =>
      (await puppeteer.launch({
        headless: true,
        executablePath: localPath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })) as unknown as { newPage: () => Promise<unknown>; close: () => Promise<void> },
  };
}

function detectarChromeLocal(): string | undefined {
  const plat = process.platform;
  if (plat === "darwin") return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (plat === "win32") return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  return "/usr/bin/google-chrome";
}

// -----------------------------------------------------------------
// Render ContratoHTML a documento HTML completo
// -----------------------------------------------------------------

export async function renderContratoHtml(contrato: Contrato): Promise<string> {
  // Lazy-import de react-dom/server: Next.js 14 bloquea el import directo a
  // nivel de módulo porque podría acabar en el bundle cliente. Importándolo
  // aquí dentro, Next lo deja solo en el server.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const body = renderToStaticMarkup(
    createElement(ContratoHTML, {
      datos: contrato.datos,
      firmaPropietario: contrato.firma_propietario,
      firmaAgencia: contrato.firma_agencia,
      showPlaceholders: false,
    }),
  );
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contrato de encargo de venta en exclusiva</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Inter:wght@200;300;400;500;600&display=swap" rel="stylesheet" />
  <style>html,body{margin:0;padding:0;background:#fff}</style>
</head>
<body>${body}</body>
</html>`;
}

// -----------------------------------------------------------------
// Generación efectiva de PDF
// -----------------------------------------------------------------

export async function generarPdfBuffer(contrato: Contrato): Promise<Buffer> {
  const html = await renderContratoHtml(contrato);

  const launcher = await getBrowserLauncher();
  const browser = await launcher.launch();
  let pdfBytes: Buffer;
  try {
    // Tipos de puppeteer-core no se cargan aquí; usamos interface interna.
    const page = (await browser.newPage()) as unknown as {
      setContent: (html: string, opts: { waitUntil: string[] }) => Promise<void>;
      pdf: (opts: Record<string, unknown>) => Promise<Uint8Array | Buffer>;
      close: () => Promise<void>;
      evaluateHandle?: (fn: string) => Promise<unknown>;
    };
    await page.setContent(html, { waitUntil: ["networkidle0", "load", "domcontentloaded"] });
    // Esperamos a que las fuentes estén listas (Caveat suele llegar la última)
    try {
      if (page.evaluateHandle) await page.evaluateHandle("document.fonts.ready");
    } catch {
      // no-op
    }
    const out = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "20mm", right: "22mm", bottom: "20mm", left: "22mm" },
    });
    pdfBytes = Buffer.isBuffer(out) ? out : Buffer.from(out);
    await page.close();
  } finally {
    await browser.close();
  }
  return pdfBytes;
}

/**
 * Genera el PDF del contrato (si ambas partes han firmado) y lo
 * sube al bucket privado 'contratos'. Devuelve el storage path.
 * Idempotente: si ya hay PDF, no vuelve a generar.
 */
export async function generarYSubirPdfSiProcede(contratoId: string): Promise<Buffer | null> {
  const contrato = await getContrato(contratoId);
  if (!contrato) throw new Error("Contrato no encontrado");
  if (contrato.estado !== "firmado") return null;
  if (!contrato.firma_propietario || !contrato.firma_agencia) return null;

  const pdf = await generarPdfBuffer(contrato);
  await subirPdfContrato(contratoId, pdf);
  return pdf;
}
