import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { listarLeads } from "./leads";
import {
  listarClientes,
  listarOperaciones,
  listarOperacionesPorMes,
  listarIngresosPorMes,
  listarGastos,
  listarIngresos,
  balanceTotal,
  netoDeOperacion,
  buscarDocumentosPorOperacion,
  descargarDocumento,
  type OperacionCompraventa,
} from "./contabilidad";
import { calcularPendientes, formatearPendientes } from "./secretaria";
import { telegramSendDocument } from "./telegram";
import { listarConversaciones, getKnowledgeBase, buildSystemPrompt } from "./chat";
import { catalogSnapshot } from "./pisos";
import { crearTarea, listarTareasEntreFechas, type TipoTarea } from "./mesaTrabajo";
import { buscarTrabajadorPorNombre, listarTrabajadores } from "./trabajadores";

const MAX_HISTORIAL = 20;
const MAX_TURNOS_HERRAMIENTA = 5;

type Turno = { role: "user" | "assistant"; text: string };

const SYSTEM = `Eres Gladis, la secretaria interna de InterRoom Murcia. Trabajas por Telegram, para el equipo (hoy el fundador, en el futuro más empleados). Tu trabajo es responder con datos reales usando las herramientas disponibles, nunca inventar cifras, teléfonos o nombres.

Tono: directo, profesional, breve. Respondes en español.

Guía de uso de herramientas:
- Si te piden localizar a alguien (por teléfono, email, nombre o zona/comunidad autónoma), usa buscar_contacto — busca en leads sin convertir y en clientes a la vez.
- Si preguntan qué hay pendiente (leads sin contactar, teléfonos incompletos, alquileres sin cobrar), usa listar_pendientes.
- Si piden un documento/PDF de un cliente u operación, usa buscar_documentos primero; si hay un resultado claro (o el usuario confirma cuál), usa enviar_documento con su id para mandarlo a este mismo chat.
- Si preguntan por dinero, comisiones, beneficio o gastos de un cliente concreto, usa detalle_cliente. Para una operación de compraventa concreta con su desglose completo (bruto, cada movimiento con signo, neto), usa detalle_operacion. Para el balance global del negocio, usa consultar_balance.
- Si preguntan por un mes concreto (ingresos de alquiler o compraventas cerradas ese mes), usa ingresos_del_mes u operaciones_del_mes con formato "YYYY-MM".
- Cuando muestres el desglose de una operación, preséntalo como un asiento contable: primero el bruto (comisión), luego cada movimiento con su signo (+ suma, - resta) y si está liquidado o pendiente, y termina con el neto. No mezcles bruto y neto en una sola cifra sin aclararlo.
- Si preguntan qué se ha hablado con algún cliente en el chat de la web, o quieren revisar conversaciones escaladas, usa buscar_chats.
- Si preguntan "qué respondería Rommi" (el chatbot de la web) ante algo, usa consultar_rommi — simula su respuesta real con el mismo catálogo y base de conocimiento que usa en la web.
- Si te piden anotar/agendar una tarea, cita o visita ("apúntame", "recuérdame", "queda con..."), usa anotar_agenda. Calcula tú la fecha exacta en formato YYYY-MM-DD a partir de la fecha de hoy (indicada más abajo) si dicen "mañana", "el viernes", etc.
- Si preguntan qué hay en la agenda (hoy, esta semana, un día o rango concreto), usa consultar_agenda con fechas en formato YYYY-MM-DD, calculadas a partir de la fecha de hoy.
- Si un miembro del equipo se identifica ("hola Gladis soy Juan", "soy X, qué tengo esta semana") o pregunta por SUS tareas ("qué tengo pendiente esta semana"), usa tareas_del_trabajador con su nombre. Si no dan rango, asume la semana en curso (lunes a domingo) calculada desde hoy. Para saber quiénes son los trabajadores dados de alta puedes usar listar_trabajadores.
- Cuando anotes una tarea que el usuario diga que es "para" o "asignada a" alguien del equipo, incluye el nombre en el campo trabajador de anotar_agenda.
- Si ninguna herramienta resuelve la pregunta, dilo con claridad en vez de inventar una respuesta.

REGLA CRÍTICA — confirmación antes de modificar:
Antes de ejecutar CUALQUIER herramienta que cree, modifique, envíe o elimine datos (anotar_agenda, enviar_documento y todas las futuras herramientas de escritura), NUNCA la llames directamente en el primer turno. En su lugar:
1. Resume en una frase exactamente qué vas a hacer con los datos concretos (tipo, título, fecha, cliente, importe, destinatario…).
2. Pregunta explícitamente: "¿Confirmas?" o "¿Lo hago?" y espera respuesta.
3. Solo cuando el usuario responda con confirmación clara ("sí", "confirma", "hazlo", "adelante", "ok"), ejecuta la herramienta.
Si la respuesta es ambigua o cancela, no ejecutes nada y pide aclaración. Las herramientas de solo lectura (buscar, listar, consultar, detalle…) NO requieren confirmación, úsalas directamente.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_contacto",
    description:
      "Busca un lead (sin convertir) o un cliente ya creado en Contabilidad por teléfono, email, nombre o zona/comunidad autónoma de interés (completo o parcial).",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Teléfono, email, nombre o zona a buscar" } },
      required: ["query"],
    },
  },
  {
    name: "listar_pendientes",
    description:
      "Devuelve leads sin contactar hace más de 3 días, clientes con teléfono incompleto y alquileres del mes actual sin marcar como cobrados.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "buscar_documentos",
    description: "Busca documentos (PDFs) adjuntos a operaciones de compraventa que coincidan con el nombre de un cliente.",
    input_schema: {
      type: "object",
      properties: { nombre: { type: "string", description: "Nombre o parte del nombre del cliente" } },
      required: ["nombre"],
    },
  },
  {
    name: "enviar_documento",
    description: "Envía por Telegram, a esta misma conversación, un documento ya localizado con buscar_documentos.",
    input_schema: {
      type: "object",
      properties: { documento_id: { type: "string", description: "id del documento devuelto por buscar_documentos" } },
      required: ["documento_id"],
    },
  },
  {
    name: "consultar_balance",
    description: "Devuelve el balance global del negocio: comisión bruta y beneficio neto, desglosado en alquileres y compraventas.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "detalle_cliente",
    description:
      "Devuelve el detalle económico de un cliente por nombre: si es alquiler, mensualidad y comisión acumulada; si tiene operaciones de compraventa, precio, comisión y ganancia neta de cada una.",
    input_schema: {
      type: "object",
      properties: { nombre: { type: "string", description: "Nombre o parte del nombre del cliente" } },
      required: ["nombre"],
    },
  },
  {
    name: "buscar_chats",
    description:
      "Busca en las conversaciones reales del chat de la web (Rommi) por nombre, contacto, motivo de escalado o contenido del mensaje. Sin query devuelve las 5 más recientes.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Texto a buscar (nombre, teléfono/email, motivo o parte de un mensaje). Vacío para las recientes." } },
    },
  },
  {
    name: "detalle_operacion",
    description:
      "Devuelve el asiento contable completo de una operación de compraventa: bruto (comisión), cada movimiento con su signo y estado, y el neto final. Busca por nombre del cliente.",
    input_schema: {
      type: "object",
      properties: { nombre: { type: "string", description: "Nombre o parte del nombre del cliente de la operación" } },
      required: ["nombre"],
    },
  },
  {
    name: "ingresos_del_mes",
    description: "Devuelve los ingresos de alquiler (comisión por cliente y total) de un mes concreto.",
    input_schema: {
      type: "object",
      properties: { mes: { type: "string", description: 'Mes en formato "YYYY-MM"' } },
      required: ["mes"],
    },
  },
  {
    name: "operaciones_del_mes",
    description: "Devuelve las operaciones de compraventa cerradas en un mes concreto, cada una con su asiento contable (bruto/neto).",
    input_schema: {
      type: "object",
      properties: { mes: { type: "string", description: 'Mes en formato "YYYY-MM"' } },
      required: ["mes"],
    },
  },
  {
    name: "consultar_rommi",
    description: "Simula la respuesta real que daría Rommi (el chatbot de la web) a una pregunta, usando su mismo catálogo y base de conocimiento.",
    input_schema: {
      type: "object",
      properties: { pregunta: { type: "string", description: "La pregunta tal como se la haría un usuario a Rommi en la web" } },
      required: ["pregunta"],
    },
  },
  {
    name: "anotar_agenda",
    description: "Crea una anotación en la mesa de trabajo/calendario: una tarea, cita o visita, con fecha y hora opcionales, cliente vinculado opcional y trabajador asignado opcional.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["tarea", "cita", "visita"], description: "Tipo de anotación" },
        titulo: { type: "string", description: "Título breve de la anotación" },
        fecha: { type: "string", description: 'Fecha en formato "YYYY-MM-DD", calculada a partir de hoy si es relativa' },
        hora: { type: "string", description: 'Hora en formato "HH:MM", opcional' },
        cliente: { type: "string", description: "Nombre del cliente a vincular, opcional" },
        trabajador: { type: "string", description: "Nombre del trabajador al que se asigna la tarea, opcional" },
        notas: { type: "string", description: "Notas adicionales, opcional" },
      },
      required: ["tipo", "titulo"],
    },
  },
  {
    name: "tareas_del_trabajador",
    description: "Devuelve las tareas/citas/visitas asignadas a un trabajador concreto entre dos fechas. Usar cuando un miembro del equipo pregunte qué tiene pendiente.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre (o parte) del trabajador" },
        desde: { type: "string", description: 'Fecha inicial "YYYY-MM-DD"' },
        hasta: { type: "string", description: 'Fecha final "YYYY-MM-DD"' },
        incluir_hechas: { type: "boolean", description: "Si incluir las tareas ya marcadas como hechas. Por defecto false." },
      },
      required: ["nombre", "desde", "hasta"],
    },
  },
  {
    name: "listar_trabajadores",
    description: "Lista los trabajadores dados de alta en el equipo. Útil si no estás seguro de a quién se refiere el usuario.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "consultar_agenda",
    description: "Devuelve las tareas, citas y visitas anotadas entre dos fechas (formato YYYY-MM-DD). Para un solo día, usa la misma fecha en desde y hasta.",
    input_schema: {
      type: "object",
      properties: {
        desde: { type: "string", description: 'Fecha inicial "YYYY-MM-DD"' },
        hasta: { type: "string", description: 'Fecha final "YYYY-MM-DD"' },
      },
      required: ["desde", "hasta"],
    },
  },
];

function telefonoDigits(s: string) {
  return s.replace(/\D/g, "");
}

async function getHistorial(chatId: string): Promise<Turno[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("gladis_conversaciones").select("mensajes").eq("chat_id", chatId).maybeSingle();
  return (data?.mensajes as Turno[]) ?? [];
}

async function guardarHistorial(chatId: string, mensajes: Turno[]) {
  const admin = getSupabaseAdmin();
  await admin
    .from("gladis_conversaciones")
    .upsert({ chat_id: chatId, mensajes: mensajes.slice(-MAX_HISTORIAL), updated_at: new Date().toISOString() });
}

function contiene(campo: string | null | undefined, q: string, qDigits: string) {
  if (!campo) return false;
  if (campo.toLowerCase().includes(q)) return true;
  return qDigits.length > 0 && telefonoDigits(campo).includes(qDigits);
}

async function formatearOperacion(op: OperacionCompraventa, clienteNombre: string): Promise<string> {
  const gastos = await listarGastos(op.id);
  const neto = netoDeOperacion(op.comision_calculada, gastos);
  const lineas = [
    `OPERACIÓN: ${clienteNombre} · cierre ${op.fecha_cierre} · venta ${op.precio_venta}€`,
    `  BRUTO (comisión ${op.comision_pct}%): +${op.comision_calculada.toFixed(2)}€`,
  ];
  gastos.forEach((g) => lineas.push(`    ${g.es_negativo ? "-" : "+"}${g.importe.toFixed(2)}€ · ${g.concepto} · ${g.pagado ? "liquidado" : "pendiente"}`));
  lineas.push(`  NETO: ${neto.toFixed(2)}€`);
  return lineas.join("\n");
}

async function ejecutarHerramienta(nombre: string, input: Record<string, unknown>, chatId: string): Promise<string> {
  if (nombre === "buscar_contacto") {
    const query = String(input.query ?? "").trim();
    if (!query) return "Búsqueda vacía.";
    const q = query.toLowerCase();
    const qDigits = telefonoDigits(query);
    const [leads, clientes] = await Promise.all([listarLeads(), listarClientes()]);
    const leadsMatch = leads.filter(
      (l) => contiene(l.nombre, q, qDigits) || contiene(l.telefono, q, qDigits) || contiene(l.email, q, qDigits) || contiene(l.direccion, q, qDigits)
    );
    const clientesMatch = clientes.filter(
      (c) =>
        contiene(c.nombre, q, qDigits) ||
        contiene(c.apellidos, q, qDigits) ||
        contiene(c.telefono, q, qDigits) ||
        contiene(c.email, q, qDigits) ||
        contiene(c.zona_interes, q, qDigits)
    );
    if (!leadsMatch.length && !clientesMatch.length) return "Sin coincidencias.";
    const partes: string[] = [];
    leadsMatch.forEach((l) =>
      partes.push(`LEAD (sin convertir): ${l.nombre} · ${l.telefono} · ${l.email ?? "sin email"} · ${l.direccion} · recibido ${new Date(l.created_at).toLocaleDateString("es-ES")}`)
    );
    clientesMatch.forEach((c) =>
      partes.push(
        `CLIENTE: ${c.nombre} ${c.apellidos ?? ""} · ${c.tipo} · ${c.telefono ?? "sin tel"} · ${c.email ?? "sin email"} · zona ${c.zona_interes ?? "—"}${c.mensualidad > 0 ? ` · mensualidad ${c.mensualidad}€` : ""}`
      )
    );
    return partes.join("\n");
  }
  if (nombre === "listar_pendientes") {
    return formatearPendientes(await calcularPendientes());
  }
  if (nombre === "buscar_documentos") {
    const resultados = await buscarDocumentosPorOperacion(String(input.nombre ?? ""));
    if (!resultados.length) return "Sin documentos para esa búsqueda.";
    return resultados.map((r) => `id=${r.documento.id} · ${r.documento.nombre} · cliente ${r.clienteNombre}`).join("\n");
  }
  if (nombre === "enviar_documento") {
    const doc = await descargarDocumento(String(input.documento_id ?? ""));
    if (!doc) return "Documento no encontrado.";
    await telegramSendDocument(chatId, doc.buffer, doc.nombre);
    return `Enviado: ${doc.nombre}`;
  }
  if (nombre === "consultar_balance") {
    const b = await balanceTotal();
    return `Comisión bruta total: ${b.comisionBrutaTotal.toFixed(2)}€ (alquileres ${b.alquileres.comisionBruta.toFixed(2)}€, compraventas ${b.compraventas.comisionBruta.toFixed(2)}€)
Beneficio neto total: ${b.beneficioNetoTotal.toFixed(2)}€
Compraventas: bruto ${b.compraventas.comisionBruta.toFixed(2)}€, gastos ${b.compraventas.gastos.toFixed(2)}€, neto ${b.compraventas.neto.toFixed(2)}€`;
  }
  if (nombre === "detalle_cliente") {
    const query = String(input.nombre ?? "").toLowerCase();
    const clientes = await listarClientes();
    const encontrados = clientes.filter((c) => `${c.nombre} ${c.apellidos ?? ""}`.toLowerCase().includes(query));
    if (!encontrados.length) return "Cliente no encontrado.";
    const partes: string[] = [];
    for (const c of encontrados.slice(0, 3)) {
      partes.push(`CLIENTE: ${c.nombre} ${c.apellidos ?? ""} (${c.tipo}) · ${c.telefono ?? "sin tel"} · ${c.email ?? "sin email"}`);
      if (c.mensualidad > 0 || c.tieneIngresos) {
        const ingresos = await listarIngresos(c.id);
        const totalComision = ingresos.reduce((s, i) => s + i.comision_calculada, 0);
        const pendientes = ingresos.filter((i) => !i.cobrado).length;
        partes.push(`  Alquiler: mensualidad ${c.mensualidad}€, comisión acumulada ${totalComision.toFixed(2)}€, meses sin cobrar: ${pendientes}`);
      }
      const operaciones = (await listarOperaciones()).filter((o) => o.cliente_id === c.id);
      for (const op of operaciones) {
        partes.push(await formatearOperacion(op, `${c.nombre} ${c.apellidos ?? ""}`.trim()));
      }
    }
    return partes.join("\n");
  }
  if (nombre === "detalle_operacion") {
    const query = String(input.nombre ?? "").toLowerCase();
    const clientes = await listarClientes();
    const encontrados = clientes.filter((c) => `${c.nombre} ${c.apellidos ?? ""}`.toLowerCase().includes(query));
    if (!encontrados.length) return "Cliente no encontrado.";
    const idsMatch = new Set(encontrados.map((c) => c.id));
    const operaciones = (await listarOperaciones()).filter((o) => idsMatch.has(o.cliente_id));
    if (!operaciones.length) return "Ese cliente no tiene operaciones de compraventa.";
    const nombrePorId = new Map(encontrados.map((c) => [c.id, `${c.nombre} ${c.apellidos ?? ""}`.trim()]));
    const partes: string[] = [];
    for (const op of operaciones) partes.push(await formatearOperacion(op, nombrePorId.get(op.cliente_id) ?? "—"));
    return partes.join("\n\n");
  }
  if (nombre === "ingresos_del_mes") {
    const mes = String(input.mes ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(mes)) return 'Formato de mes inválido, usa "YYYY-MM".';
    const ingresos = await listarIngresosPorMes(mes);
    if (!ingresos.length) return `Sin ingresos de alquiler registrados en ${mes}.`;
    const total = ingresos.reduce((s, i) => s + i.comision_calculada, 0);
    const lineas = ingresos.map((i) => `- ${i.clienteNombre}: ingreso ${i.ingreso_bruto}€, comisión ${i.comision_calculada.toFixed(2)}€ (${i.cobrado ? "cobrado" : "pendiente"})`);
    return [`Ingresos de alquiler ${mes}:`, ...lineas, `TOTAL comisión: ${total.toFixed(2)}€`].join("\n");
  }
  if (nombre === "operaciones_del_mes") {
    const mes = String(input.mes ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(mes)) return 'Formato de mes inválido, usa "YYYY-MM".';
    const operaciones = await listarOperacionesPorMes(mes);
    if (!operaciones.length) return `Sin operaciones de compraventa cerradas en ${mes}.`;
    const clientes = await listarClientes();
    const nombrePorId = new Map(clientes.map((c) => [c.id, `${c.nombre} ${c.apellidos ?? ""}`.trim()]));
    const partes: string[] = [];
    for (const op of operaciones) partes.push(await formatearOperacion(op, nombrePorId.get(op.cliente_id) ?? "—"));
    return partes.join("\n\n");
  }
  if (nombre === "buscar_chats") {
    const query = String(input.query ?? "").trim().toLowerCase();
    const conversaciones = await listarConversaciones();
    const encontradas = query
      ? conversaciones.filter(
          (c) =>
            (c.nombre ?? "").toLowerCase().includes(query) ||
            (c.contacto ?? "").toLowerCase().includes(query) ||
            (c.motivo_escalado ?? "").toLowerCase().includes(query) ||
            c.mensajes.some((m) => m.text.toLowerCase().includes(query))
        )
      : conversaciones.slice(0, 5);
    if (!encontradas.length) return "Sin conversaciones que coincidan.";
    return encontradas
      .slice(0, 5)
      .map((c) => {
        const resumen = c.mensajes.slice(-6).map((m) => `${m.role === "user" ? "Usuario" : "Rommi"}: ${m.text}`).join("\n");
        return `--- ${c.estado}${c.motivo_escalado ? ` (motivo: ${c.motivo_escalado})` : ""} · ${c.nombre ?? "sin nombre"} ${c.contacto ?? ""} · ${new Date(c.updated_at).toLocaleString("es-ES")}\n${resumen}`;
      })
      .join("\n\n");
  }
  if (nombre === "consultar_rommi") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return "Falta ANTHROPIC_API_KEY.";
    const anthropic = new Anthropic({ apiKey });
    const [catalogo, kb] = await Promise.all([catalogSnapshot(), getKnowledgeBase()]);
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: buildSystemPrompt(catalogo, kb),
      messages: [{ role: "user", content: String(input.pregunta ?? "") }],
    });
    const texto = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return texto || "(Rommi no generó respuesta)";
  }
  if (nombre === "anotar_agenda") {
    const tipo = String(input.tipo ?? "tarea") as TipoTarea;
    const titulo = String(input.titulo ?? "").trim();
    if (!titulo) return "Falta el título de la anotación.";
    let cliente_id: string | undefined;
    const nombreCliente = String(input.cliente ?? "").trim();
    if (nombreCliente) {
      const clientes = await listarClientes();
      const encontrado = clientes.find((c) => `${c.nombre} ${c.apellidos ?? ""}`.toLowerCase().includes(nombreCliente.toLowerCase()));
      cliente_id = encontrado?.id;
    }
    let asignado_a: string | undefined;
    const nombreTrabajador = String(input.trabajador ?? "").trim();
    if (nombreTrabajador) {
      const trab = await buscarTrabajadorPorNombre(nombreTrabajador);
      asignado_a = trab?.id;
    }
    const tarea = await crearTarea({
      tipo,
      titulo,
      fecha: input.fecha ? String(input.fecha) : undefined,
      hora: input.hora ? String(input.hora) : undefined,
      cliente_id,
      asignado_a,
      notas: input.notas ? String(input.notas) : undefined,
    });
    return `Anotado: ${tipo} "${titulo}"${tarea.fecha ? ` el ${tarea.fecha}` : ""}${tarea.hora ? ` a las ${tarea.hora}` : ""}${nombreCliente && !cliente_id ? " (cliente no encontrado)" : ""}${nombreTrabajador && !asignado_a ? " (trabajador no encontrado)" : asignado_a ? ` · asignado a ${nombreTrabajador}` : ""}.`;
  }
  if (nombre === "listar_trabajadores") {
    const trs = await listarTrabajadores();
    if (!trs.length) return "No hay trabajadores dados de alta todavía.";
    return trs.map((t) => `- ${t.nombre}${t.activo ? "" : " (inactivo)"}`).join("\n");
  }
  if (nombre === "tareas_del_trabajador") {
    const nombreT = String(input.nombre ?? "").trim();
    const desde = String(input.desde ?? "").trim();
    const hasta = String(input.hasta ?? "").trim();
    if (!nombreT) return "Falta el nombre del trabajador.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return 'Formato de fecha inválido, usa "YYYY-MM-DD".';
    const trab = await buscarTrabajadorPorNombre(nombreT);
    if (!trab) return `No encuentro a "${nombreT}" en el equipo. Comprueba el nombre o dime que lo dé de alta.`;
    const incluirHechas = input.incluir_hechas === true;
    const tareas = (await listarTareasEntreFechas(desde, hasta, trab.id)).filter((t) => incluirHechas || t.estado === "pendiente");
    if (!tareas.length) return `${trab.nombre} no tiene ${incluirHechas ? "" : "pendientes "}entre ${desde} y ${hasta}.`;
    const lineas = tareas.map((t) => `- [${t.tipo}] ${t.fecha}${t.hora ? ` ${t.hora.slice(0, 5)}` : ""} · ${t.titulo}${t.clienteNombre ? ` · ${t.clienteNombre}` : ""} · ${t.estado}`);
    return [`Tareas de ${trab.nombre} (${desde} → ${hasta}):`, ...lineas].join("\n");
  }
  if (nombre === "consultar_agenda") {
    const desde = String(input.desde ?? "").trim();
    const hasta = String(input.hasta ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return 'Formato de fecha inválido, usa "YYYY-MM-DD".';
    const tareas = await listarTareasEntreFechas(desde, hasta);
    if (!tareas.length) return `Sin nada anotado entre ${desde} y ${hasta}.`;
    return tareas
      .map((t) => `- [${t.tipo}] ${t.fecha}${t.hora ? ` ${t.hora.slice(0, 5)}` : ""} · ${t.titulo}${t.clienteNombre ? ` · ${t.clienteNombre}` : ""} · ${t.estado}`)
      .join("\n");
  }
  return "Herramienta desconocida.";
}

export async function responderGladis(chatId: string, mensajeUsuario: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "Falta configurar ANTHROPIC_API_KEY.";
  const anthropic = new Anthropic({ apiKey });

  const historial = await getHistorial(chatId);
  const messages: Anthropic.MessageParam[] = historial.map((t) => ({ role: t.role, content: t.text }));
  messages.push({ role: "user", content: mensajeUsuario });

  const hoy = new Date().toISOString().slice(0, 10);
  const systemConFecha = `${SYSTEM}\n\nHoy es ${hoy} (formato YYYY-MM-DD).`;

  let respuestaFinal = "";
  for (let i = 0; i < MAX_TURNOS_HERRAMIENTA; i++) {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: systemConFecha,
      tools: TOOLS,
      messages,
    });

    respuestaFinal = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (res.stop_reason !== "tool_use") break;

    messages.push({ role: "assistant", content: res.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type === "tool_use") {
        const resultado = await ejecutarHerramienta(block.name, block.input as Record<string, unknown>, chatId);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultado });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  const nuevoHistorial: Turno[] = [
    ...historial,
    { role: "user", text: mensajeUsuario },
    { role: "assistant", text: respuestaFinal || "(sin respuesta)" },
  ];
  await guardarHistorial(chatId, nuevoHistorial);

  return respuestaFinal || "No he podido generar una respuesta.";
}
