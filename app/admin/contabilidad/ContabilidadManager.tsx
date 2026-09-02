"use client";

import { useEffect, useState } from "react";

type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  tipo: "propietario" | "estudiante" | "comprador" | "creditos";
  zona_interes: string | null;
  operacion: "alquiler" | "venta" | null;
  origen: "manual" | "lead" | "autocompletado";
  datos_completados: boolean;
  token: string;
  mensualidad: number;
  comision_pct_alquiler: number;
  alquiler_fecha_inicio: string | null;
  alquiler_fecha_fin: string | null;
  tieneIngresos: boolean;
  created_at: string;
};

type Credito = {
  id: string;
  cliente_id: string;
  fecha: string;
  precio: number;
  cobrado?: boolean;
};

type Ingreso = {
  id: string;
  mes: string;
  ingreso_bruto: number;
  comision_pct: number;
  comision_calculada: number;
  cobrado: boolean;
};

type Operacion = {
  id: string;
  cliente_id: string;
  fecha_cierre: string;
  precio_venta: number;
  comision_pct: number;
  comision_calculada: number;
  cobrado?: boolean;
};

type Gasto = {
  id: string;
  concepto: string;
  importe: number;
  es_negativo: boolean;
  pagado: boolean;
  categoria?: string;
};

type ClienteGasto = {
  id: string;
  cliente_id: string;
  concepto: string;
  importe: number;
  categoria: string;
  es_recurrente: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  pagado: boolean;
  fecha_pago: string | null;
  notas: string | null;
};

const CATEGORIAS_GASTO: { value: string; label: string }[] = [
  { value: "propietario", label: "Renta al propietario" },
  { value: "comunidad", label: "Comunidad" },
  { value: "ibi", label: "IBI" },
  { value: "seguro", label: "Seguro" },
  { value: "suministros", label: "Suministros" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "obra", label: "Obra" },
  { value: "reforma", label: "Reforma" },
  { value: "notaria", label: "Notaría" },
  { value: "registro", label: "Registro" },
  { value: "impuestos", label: "Impuestos" },
  { value: "comision", label: "Comisión" },
  { value: "otros", label: "Otros" },
];

function labelCategoria(v: string | undefined) {
  const found = CATEGORIAS_GASTO.find((c) => c.value === v);
  return found ? found.label : "Otros";
}

function netoDeOperacion(comisionCalculada: number, gastos: Gasto[]) {
  return comisionCalculada + gastos.filter((g) => g.pagado).reduce((s, g) => s + (g.es_negativo ? -g.importe : g.importe), 0);
}

type Documento = {
  id: string;
  nombre: string;
  created_at: string;
};

type Balance = {
  comisionBrutaTotal: number;
  beneficioNetoTotal: number;
  pendienteTotal: number;
  alquileres: { comisionBruta: number; cobrado: number; pendiente: number; gastos?: number; neto?: number };
  compraventas: { comisionBruta: number; cobrado: number; pendiente: number; gastos: number; neto: number };
  creditos: { bruto: number; cobrado: number; pendiente: number; neto: number };
  gastosFijos?: {
    mensual: number; anualizado: number; acumulado: number; pctSobreBruto: number; pctSobreNetoOperativo: number;
    fijos?: { mensual: number; anualizado: number; acumulado: number; pctSobreNetoOperativo: number };
    impuestos?: { trimestral: number; mensualEquiv: number; anualizado: number; acumulado: number; pctSobreNetoOperativo: number };
  };
};

type MetricasMes = { mes: number; bruto: number; gastos: number; neto: number; alquileres: number; compraventas: number; creditos: number; gastosFijos: number; fijos: number; impuestos: number };

type Metricas = {
  anio: number;
  meses: MetricasMes[];
  mesesAnterior: MetricasMes[];
  trimestres: { trimestre: number; bruto: number; gastos: number; neto: number }[];
  totalAnual: { bruto: number; gastos: number; neto: number; alquileres: number; compraventas: number; creditos: number; gastosFijos: number; fijos: number; impuestos: number; netoTrasFijos: number; pctFijosSobreBruto: number; pctFijosSobreNeto: number; pctImpuestosSobreBruto: number; pctImpuestosSobreNeto: number };
  anioAnterior: { bruto: number; neto: number } | null;
  variacion: { brutoPct: number | null; netoPct: number | null };
  aniosDisponibles: number[];
};

type GastoFijo = {
  id: string;
  concepto: string;
  importe_mensual: number;
  categoria: string;
  tipo: "fijo" | "impuesto";
  fecha_inicio: string;
  fecha_fin: string | null;
  notas: string | null;
  pagado_por: string | null;
  liquidado: boolean;
  fecha_liquidacion: string | null;
};

type GastoEmpresa = {
  id: string;
  concepto: string;
  importe: number;
  fecha: string;
  categoria: string;
  pagado_por: string | null;
  liquidado: boolean;
  fecha_liquidacion: string | null;
  notas: string | null;
};

const NOMBRES_MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function porcentaje(parte: number, total: number) {
  if (!total) return 0;
  return (parte / total) * 100;
}

function variacionPct(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function GraficoEvolucion({ meses }: { meses: MetricasMes[] }) {
  const W = 720;
  const H = 220;
  const PAD_L = 40;
  const PAD_B = 28;
  const PAD_T = 12;
  const PAD_R = 12;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const max = Math.max(1, ...meses.map((m) => m.bruto));
  const barW = chartW / 12;
  const barPad = 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }} role="img" aria-label="Evolución mensual apilada">
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = PAD_T + chartH * (1 - f);
        return <line key={f} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#eee" strokeWidth={1} />;
      })}
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = PAD_T + chartH * (1 - f);
        return (
          <text key={`t${f}`} x={PAD_L - 6} y={y + 3} fontSize={9} textAnchor="end" fill="#999">
            {EUR.format(max * f).replace(/,\d{2}\s?€$/, "€")}
          </text>
        );
      })}
      {meses.map((m, i) => {
        const x = PAD_L + i * barW + barPad / 2;
        const w = barW - barPad;
        const hA = (m.alquileres / max) * chartH;
        const hC = (m.compraventas / max) * chartH;
        const hK = (m.creditos / max) * chartH;
        const yA = PAD_T + chartH - hA;
        const yC = yA - hC;
        const yK = yC - hK;
        return (
          <g key={m.mes}>
            {hA > 0 && <rect x={x} y={yA} width={w} height={hA} fill="#3b82f6" rx={2} />}
            {hC > 0 && <rect x={x} y={yC} width={w} height={hC} fill="#10b981" rx={2} />}
            {hK > 0 && <rect x={x} y={yK} width={w} height={hK} fill="#f59e0b" rx={2} />}
            <text x={x + w / 2} y={H - PAD_B + 14} fontSize={10} textAnchor="middle" fill="#666">
              {NOMBRES_MES_CORTO[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function fmt(n: number) {
  return EUR.format(n || 0);
}

function fmtPct(n: number | null) {
  if (n === null) return "—";
  const signo = n > 0 ? "+" : "";
  return `${signo}${n.toFixed(1)}%`;
}

const ACTIVAR_ALQUILER = { cliente_id: "", mensualidad: "", comision_pct: "15", comision_fija: "", fecha_inicio: "", fecha_fin: "" };

function añoActual(mes: string) {
  return new Date(mes).getUTCFullYear();
}

export default function ContabilidadManager() {
  const [tab, setTab] = useState<"metricas" | "creditos" | "alquileres" | "compraventas" | "gastos">("creditos");
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [mostrarNuevoFijo, setMostrarNuevoFijo] = useState(false);
  const [nuevoFijo, setNuevoFijo] = useState({ concepto: "", importe_mensual: "", categoria: "otros", tipo: "fijo" as "fijo" | "impuesto", fecha_inicio: new Date().toISOString().slice(0, 10), pagado_por: "" });
  const [editandoFijo, setEditandoFijo] = useState<string | null>(null);
  const [edicionFijo, setEdicionFijo] = useState({ concepto: "", importe_mensual: "", categoria: "", tipo: "fijo" as "fijo" | "impuesto", pagado_por: "" });

  const [gastosEmpresa, setGastosEmpresa] = useState<GastoEmpresa[]>([]);
  const [mostrarNuevoGastoEmpresa, setMostrarNuevoGastoEmpresa] = useState(false);
  const [nuevoGastoEmpresa, setNuevoGastoEmpresa] = useState({ concepto: "", importe: "", fecha: new Date().toISOString().slice(0, 10), categoria: "otros", pagado_por: "" });
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const [metricasAnio, setMetricasAnio] = useState(new Date().getFullYear());
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);

  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [nuevaOperacionCredito, setNuevaOperacionCredito] = useState({ cliente_id: "", fecha: "", precio: "" });
  const [mostrarNuevaOperacionCredito, setMostrarNuevaOperacionCredito] = useState(false);
  const [creditoGastos, setCreditoGastos] = useState<Record<string, Gasto[]>>({});
  const [creditoDocumentos, setCreditoDocumentos] = useState<Record<string, Documento[]>>({});
  const [creditoAbierto, setCreditoAbierto] = useState<string | null>(null);
  const [nuevoGastoCredito, setNuevoGastoCredito] = useState({ concepto: "", importe: "", categoria: "otros" });
  const [subiendoDocumentoCredito, setSubiendoDocumentoCredito] = useState(false);

  const [activarAlquiler, setActivarAlquiler] = useState(ACTIVAR_ALQUILER);
  const [mostrarActivarAlquiler, setMostrarActivarAlquiler] = useState(false);

  const [ingresos, setIngresos] = useState<Record<string, Ingreso[]>>({});
  const [clienteAbierto, setClienteAbierto] = useState<string | null>(null);
  const [nuevoIngreso, setNuevoIngreso] = useState({ mes: "", ingresoBruto: "", comisionManual: "" });
  const [mostrarAjusteManual, setMostrarAjusteManual] = useState(false);
  const [mensualidadInput, setMensualidadInput] = useState("");
  const [clienteGastos, setClienteGastos] = useState<Record<string, ClienteGasto[]>>({});
  const [mostrarNuevoGastoCliente, setMostrarNuevoGastoCliente] = useState(false);
  const [nuevoGastoCliente, setNuevoGastoCliente] = useState({
    concepto: "",
    importe: "",
    categoria: "propietario",
    esRecurrente: true,
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaPago: "",
    pagado: false,
  });

  const [gastos, setGastos] = useState<Record<string, Gasto[]>>({});
  const [operacionAbierta, setOperacionAbierta] = useState<string | null>(null);
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: "", importe: "", categoria: "otros" });

  const [documentos, setDocumentos] = useState<Record<string, Documento[]>>({});
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);

  const [nuevaOperacion, setNuevaOperacion] = useState({ cliente_id: "", fecha_cierre: "", precio_venta: "", comision_pct: "3" });
  const [mostrarNuevaOperacion, setMostrarNuevaOperacion] = useState(false);
  const [editandoOp, setEditandoOp] = useState<string | null>(null);
  const [edicionOp, setEdicionOp] = useState({ comision_calculada: "", comision_pct: "", precio_venta: "" });

  async function cargarTodo() {
    const [c, o, cr, b, gf, ge] = await Promise.all([
      fetch("/api/admin/clientes").then((r) => r.json()),
      fetch("/api/admin/operaciones").then((r) => r.json()),
      fetch("/api/admin/creditos").then((r) => r.json()),
      fetch("/api/admin/contabilidad/balance").then((r) => r.json()),
      fetch("/api/admin/gastos-fijos").then((r) => r.json()),
      fetch("/api/admin/gastos-empresa").then((r) => r.json()),
    ]);
    setClientes(Array.isArray(c) ? c : []);
    setOperaciones(Array.isArray(o) ? o : []);
    setCreditos(Array.isArray(cr) ? cr : []);
    setBalance(b?.comisionBrutaTotal !== undefined ? b : null);
    setGastosFijos(Array.isArray(gf) ? gf : []);
    setGastosEmpresa(Array.isArray(ge) ? ge : []);
    setLoading(false);
  }

  async function crearGastoFijo(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoFijo.concepto || !nuevoFijo.importe_mensual) return;
    await fetch("/api/admin/gastos-fijos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: nuevoFijo.concepto,
        importe_mensual: Number(nuevoFijo.importe_mensual),
        categoria: nuevoFijo.categoria,
        tipo: nuevoFijo.tipo,
        fecha_inicio: nuevoFijo.fecha_inicio,
        pagado_por: nuevoFijo.pagado_por || null,
      }),
    });
    setNuevoFijo({ concepto: "", importe_mensual: "", categoria: "otros", tipo: "fijo", fecha_inicio: new Date().toISOString().slice(0, 10), pagado_por: "" });
    setMostrarNuevoFijo(false);
    cargarTodo();
  }

  async function guardarEdicionFijo(id: string) {
    await fetch(`/api/admin/gastos-fijos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: edicionFijo.concepto,
        importe_mensual: Number(edicionFijo.importe_mensual),
        categoria: edicionFijo.categoria,
        tipo: edicionFijo.tipo,
        pagado_por: edicionFijo.pagado_por || null,
      }),
    });
    setEditandoFijo(null);
    cargarTodo();
  }

  async function toggleLiquidadoFijo(id: string, liquidado: boolean) {
    await fetch(`/api/admin/gastos-fijos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liquidado }),
    });
    cargarTodo();
  }

  async function crearGastoEmpresaFn(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoGastoEmpresa.concepto || !nuevoGastoEmpresa.importe) return;
    await fetch("/api/admin/gastos-empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: nuevoGastoEmpresa.concepto,
        importe: Number(nuevoGastoEmpresa.importe),
        fecha: nuevoGastoEmpresa.fecha,
        categoria: nuevoGastoEmpresa.categoria,
        pagado_por: nuevoGastoEmpresa.pagado_por || null,
      }),
    });
    setNuevoGastoEmpresa({ concepto: "", importe: "", fecha: new Date().toISOString().slice(0, 10), categoria: "otros", pagado_por: "" });
    setMostrarNuevoGastoEmpresa(false);
    cargarTodo();
  }

  async function toggleLiquidadoEmpresa(id: string, liquidado: boolean) {
    await fetch(`/api/admin/gastos-empresa/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liquidado }),
    });
    cargarTodo();
  }

  async function eliminarGastoEmpresaFn(id: string) {
    if (!confirm("¿Borrar este gasto?")) return;
    await fetch(`/api/admin/gastos-empresa/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  async function terminarGastoFijo(id: string) {
    const fecha = prompt("Fecha de fin (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
    if (!fecha) return;
    await fetch(`/api/admin/gastos-fijos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha_fin: fecha }),
    });
    cargarTodo();
  }

  async function eliminarGastoFijo(id: string) {
    if (!confirm("¿Borrar este gasto fijo?")) return;
    await fetch(`/api/admin/gastos-fijos/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  useEffect(() => {
    (async () => {
      await fetch("/api/admin/contabilidad/generar-mensualidades", { method: "POST" }).catch(() => null);
      cargarTodo();
    })();
  }, []);

  useEffect(() => {
    if (tab !== "metricas") return;
    if (metricas && metricas.anio === metricasAnio) return;
    setCargandoMetricas(true);
    fetch(`/api/admin/contabilidad/metricas?anio=${metricasAnio}`)
      .then((r) => r.json())
      .then((data) => setMetricas(data?.anio !== undefined ? data : null))
      .finally(() => setCargandoMetricas(false));
  }, [tab, metricasAnio, metricas]);

  async function crearOperacionCredito(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaOperacionCredito.cliente_id || !nuevaOperacionCredito.fecha || !nuevaOperacionCredito.precio) return;
    await fetch("/api/admin/creditos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: nuevaOperacionCredito.cliente_id,
        fecha: nuevaOperacionCredito.fecha,
        precio: Number(nuevaOperacionCredito.precio),
      }),
    });
    setNuevaOperacionCredito({ cliente_id: "", fecha: "", precio: "" });
    setMostrarNuevaOperacionCredito(false);
    cargarTodo();
  }

  async function eliminarOperacionCredito(id: string) {
    await fetch(`/api/admin/creditos/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  async function toggleCredito(credito: Credito) {
    const next = creditoAbierto === credito.id ? null : credito.id;
    setCreditoAbierto(next);
    if (next && !creditoGastos[credito.id]) {
      const data = await fetch(`/api/admin/creditos/${credito.id}/gastos`).then((r) => r.json());
      setCreditoGastos((prev) => ({ ...prev, [credito.id]: Array.isArray(data) ? data : [] }));
    }
    if (next && !creditoDocumentos[credito.id]) {
      const data = await fetch(`/api/admin/creditos/${credito.id}/documentos`).then((r) => r.json());
      setCreditoDocumentos((prev) => ({ ...prev, [credito.id]: Array.isArray(data) ? data : [] }));
    }
  }

  async function añadirGastoCredito(operacionId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoGastoCredito.concepto || !nuevoGastoCredito.importe) return;
    await fetch(`/api/admin/creditos/${operacionId}/gastos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto: nuevoGastoCredito.concepto, importe: Number(nuevoGastoCredito.importe), es_negativo: true, categoria: nuevoGastoCredito.categoria }),
    });
    setNuevoGastoCredito({ concepto: "", importe: "", categoria: "otros" });
    const data = await fetch(`/api/admin/creditos/${operacionId}/gastos`).then((r) => r.json());
    setCreditoGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function toggleGastoCreditoPagado(operacionId: string, gastoId: string, pagado: boolean) {
    await fetch(`/api/admin/credito-gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagado }),
    });
    const data = await fetch(`/api/admin/creditos/${operacionId}/gastos`).then((r) => r.json());
    setCreditoGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function eliminarGastoCredito(operacionId: string, gastoId: string) {
    await fetch(`/api/admin/credito-gastos/${gastoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/creditos/${operacionId}/gastos`).then((r) => r.json());
    setCreditoGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function subirDocumentoCredito(operacionId: string, file: File) {
    setSubiendoDocumentoCredito(true);
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/admin/creditos/${operacionId}/documentos`, { method: "POST", body: form });
    const data = await fetch(`/api/admin/creditos/${operacionId}/documentos`).then((r) => r.json());
    setCreditoDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    setSubiendoDocumentoCredito(false);
  }

  async function eliminarDocumentoCredito(operacionId: string, documentoId: string) {
    await fetch(`/api/admin/credito-documentos/${documentoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/creditos/${operacionId}/documentos`).then((r) => r.json());
    setCreditoDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function activarCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!activarAlquiler.cliente_id || !activarAlquiler.mensualidad) return;
    await fetch(`/api/admin/clientes/${activarAlquiler.cliente_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensualidad: Number(activarAlquiler.mensualidad) || 0,
        comision_pct_alquiler: Number(activarAlquiler.comision_pct) || 15,
        comision_fija_alquiler: activarAlquiler.comision_fija ? Number(activarAlquiler.comision_fija) : null,
        alquiler_fecha_inicio: activarAlquiler.fecha_inicio || null,
        alquiler_fecha_fin: activarAlquiler.fecha_fin || null,
      }),
    });
    setActivarAlquiler(ACTIVAR_ALQUILER);
    setMostrarActivarAlquiler(false);
    await fetch("/api/admin/contabilidad/generar-mensualidades", { method: "POST" });
    cargarTodo();
  }

  async function toggleCliente(cliente: Cliente) {
    const next = clienteAbierto === cliente.id ? null : cliente.id;
    setClienteAbierto(next);
    setMostrarAjusteManual(false);
    setMostrarNuevoGastoCliente(false);
    if (next) {
      setMensualidadInput(String(cliente.mensualidad ?? 0));
      const [ings, gs] = await Promise.all([
        fetch(`/api/admin/clientes/${cliente.id}/ingresos`).then((r) => r.json()),
        fetch(`/api/admin/clientes/${cliente.id}/gastos`).then((r) => r.json()),
      ]);
      setIngresos((prev) => ({ ...prev, [cliente.id]: Array.isArray(ings) ? ings : [] }));
      setClienteGastos((prev) => ({ ...prev, [cliente.id]: Array.isArray(gs) ? gs : [] }));
    }
  }

  async function refrescarClienteGastos(clienteId: string) {
    const data = await fetch(`/api/admin/clientes/${clienteId}/gastos`).then((r) => r.json());
    setClienteGastos((prev) => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }));
  }

  async function crearGastoCliente(clienteId: string, e: React.FormEvent) {
    e.preventDefault();
    const g = nuevoGastoCliente;
    if (!g.concepto.trim() || !Number(g.importe)) return;
    await fetch(`/api/admin/clientes/${clienteId}/gastos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: g.concepto.trim(),
        importe: Number(g.importe),
        categoria: g.categoria,
        esRecurrente: g.esRecurrente,
        fechaInicio: g.esRecurrente ? g.fechaInicio : null,
        fechaPago: !g.esRecurrente && g.pagado ? g.fechaPago || new Date().toISOString().slice(0, 10) : null,
        pagado: !g.esRecurrente ? g.pagado : true,
      }),
    });
    setNuevoGastoCliente({ concepto: "", importe: "", categoria: "propietario", esRecurrente: true, fechaInicio: new Date().toISOString().slice(0, 10), fechaPago: "", pagado: false });
    setMostrarNuevoGastoCliente(false);
    await refrescarClienteGastos(clienteId);
    cargarTodo();
  }

  async function toggleGastoClientePagado(clienteId: string, gastoId: string, pagado: boolean) {
    await fetch(`/api/admin/cliente-gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagado }),
    });
    await refrescarClienteGastos(clienteId);
    cargarTodo();
  }

  async function terminarGastoClienteRecurrente(clienteId: string, gastoId: string) {
    const fecha = prompt("Fecha de fin del gasto recurrente (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
    if (!fecha) return;
    await fetch(`/api/admin/cliente-gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fechaFin: fecha }),
    });
    await refrescarClienteGastos(clienteId);
    cargarTodo();
  }

  async function eliminarGastoCliente(clienteId: string, gastoId: string) {
    if (!confirm("¿Borrar este gasto?")) return;
    await fetch(`/api/admin/cliente-gastos/${gastoId}`, { method: "DELETE" });
    await refrescarClienteGastos(clienteId);
    cargarTodo();
  }

  async function borrarAlquiler(clienteId: string) {
    if (!confirm("Esto pondrá la mensualidad a 0 y borrará todos los meses de ingresos registrados. El cliente se mantiene en Clientes. ¿Continuar?")) return;
    await fetch(`/api/admin/clientes/${clienteId}/ingresos`, { method: "DELETE" });
    await fetch(`/api/admin/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensualidad: 0 }),
    });
    cargarTodo();
  }

  async function actualizarMensualidad(clienteId: string) {
    await fetch(`/api/admin/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensualidad: Number(mensualidadInput) || 0 }),
    });
    const data = await fetch(`/api/admin/clientes/${clienteId}/ingresos`).then((r) => r.json());
    setIngresos((prev) => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function toggleIngresoCobrado(clienteId: string, ingresoId: string, cobrado: boolean) {
    await fetch(`/api/admin/ingresos/${ingresoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cobrado }),
    });
    const data = await fetch(`/api/admin/clientes/${clienteId}/ingresos`).then((r) => r.json());
    setIngresos((prev) => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }));
  }

  async function añadirIngreso(clienteId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoIngreso.mes || !nuevoIngreso.ingresoBruto) return;
    await fetch(`/api/admin/clientes/${clienteId}/ingresos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mes: `${nuevoIngreso.mes}-01`,
        ingresoBruto: Number(nuevoIngreso.ingresoBruto),
        comisionManual: nuevoIngreso.comisionManual ? Number(nuevoIngreso.comisionManual) : null,
      }),
    });
    setNuevoIngreso({ mes: "", ingresoBruto: "", comisionManual: "" });
    const data = await fetch(`/api/admin/clientes/${clienteId}/ingresos`).then((r) => r.json());
    setIngresos((prev) => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function eliminarIngreso(clienteId: string, ingresoId: string) {
    await fetch(`/api/admin/ingresos/${ingresoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/clientes/${clienteId}/ingresos`).then((r) => r.json());
    setIngresos((prev) => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function crearOperacion(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaOperacion.cliente_id || !nuevaOperacion.fecha_cierre || !nuevaOperacion.precio_venta) return;
    await fetch("/api/admin/operaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: nuevaOperacion.cliente_id,
        fecha_cierre: nuevaOperacion.fecha_cierre,
        precio_venta: Number(nuevaOperacion.precio_venta),
        comision_pct: Number(nuevaOperacion.comision_pct),
      }),
    });
    setNuevaOperacion({ cliente_id: "", fecha_cierre: "", precio_venta: "", comision_pct: "3" });
    setMostrarNuevaOperacion(false);
    cargarTodo();
  }

  async function eliminarOperacion(id: string) {
    await fetch(`/api/admin/operaciones/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  function abrirEdicionOp(op: Operacion) {
    if (editandoOp === op.id) {
      setEditandoOp(null);
      return;
    }
    setEditandoOp(op.id);
    setEdicionOp({
      comision_calculada: String(op.comision_calculada ?? ""),
      comision_pct: String(op.comision_pct ?? ""),
      precio_venta: String(op.precio_venta ?? ""),
    });
  }

  async function guardarEdicionOp(id: string, modo: "manual" | "recalcular") {
    const body: Record<string, number> = {};
    if (modo === "manual") {
      body.comision_calculada = Number(edicionOp.comision_calculada);
    } else {
      body.precio_venta = Number(edicionOp.precio_venta);
      body.comision_pct = Number(edicionOp.comision_pct);
    }
    await fetch(`/api/admin/operaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditandoOp(null);
    cargarTodo();
  }

  async function toggleOperacion(operacion: Operacion) {
    const next = operacionAbierta === operacion.id ? null : operacion.id;
    setOperacionAbierta(next);
    if (next && !gastos[operacion.id]) {
      const data = await fetch(`/api/admin/operaciones/${operacion.id}/gastos`).then((r) => r.json());
      setGastos((prev) => ({ ...prev, [operacion.id]: Array.isArray(data) ? data : [] }));
    }
    if (next && !documentos[operacion.id]) {
      const data = await fetch(`/api/admin/operaciones/${operacion.id}/documentos`).then((r) => r.json());
      setDocumentos((prev) => ({ ...prev, [operacion.id]: Array.isArray(data) ? data : [] }));
    }
  }

  async function subirDocumento(operacionId: string, file: File) {
    setSubiendoDocumento(true);
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/admin/operaciones/${operacionId}/documentos`, { method: "POST", body: form });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/documentos`).then((r) => r.json());
    setDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    setSubiendoDocumento(false);
  }

  async function eliminarDocumento(operacionId: string, documentoId: string) {
    await fetch(`/api/admin/documentos/${documentoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/documentos`).then((r) => r.json());
    setDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function añadirGasto(operacionId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoGasto.concepto || !nuevoGasto.importe) return;
    await fetch(`/api/admin/operaciones/${operacionId}/gastos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto: nuevoGasto.concepto, importe: Number(nuevoGasto.importe), es_negativo: true, categoria: nuevoGasto.categoria }),
    });
    setNuevoGasto({ concepto: "", importe: "", categoria: "otros" });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/gastos`).then((r) => r.json());
    setGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function toggleGastoPagado(operacionId: string, gastoId: string, pagado: boolean) {
    await fetch(`/api/admin/gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagado }),
    });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/gastos`).then((r) => r.json());
    setGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function eliminarGasto(operacionId: string, gastoId: string) {
    await fetch(`/api/admin/gastos/${gastoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/gastos`).then((r) => r.json());
    setGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  const clienteNombre = (id: string) => {
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombre} ${c.apellidos ?? ""}`.trim() : "—";
  };

  const clientesConAlquiler = clientes.filter((c) => c.tipo === "propietario" && (c.mensualidad > 0 || c.tieneIngresos));
  const propietariosInactivos = clientes.filter((c) => c.tipo === "propietario" && !(c.mensualidad > 0 || c.tieneIngresos));

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      {balance && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Comisión bruta total</h3>
            <div className="analytics-stat-value">{fmt(balance.comisionBrutaTotal)}</div>
            <p>Cobrado {fmt(balance.comisionBrutaTotal - (balance.pendienteTotal ?? 0))} · <b style={{ color: (balance.pendienteTotal ?? 0) > 0 ? "#c2410c" : undefined }}>Pendiente {fmt(balance.pendienteTotal ?? 0)}</b></p>
          </div>
          <div className="analytics-card">
            <h3>Beneficio neto total</h3>
            <div className="analytics-stat-value">{fmt(balance.beneficioNetoTotal)}</div>
            <p>Compraventas netas {fmt(balance.compraventas.neto)} (gastos {fmt(balance.compraventas.gastos)}) · Créditos netos {fmt(balance.creditos.neto)}</p>
          </div>
          <div className="analytics-card" style={{ borderLeft: "3px solid #3b82f6" }}>
            <h3>Alquileres</h3>
            <div className="analytics-stat-value">{fmt(balance.alquileres.comisionBruta)}</div>
            <p>Cobrado {fmt(balance.alquileres.cobrado)} · <b style={{ color: balance.alquileres.pendiente > 0 ? "#c2410c" : undefined }}>Pendiente {fmt(balance.alquileres.pendiente)}</b></p>
          </div>
          <div className="analytics-card" style={{ borderLeft: "3px solid #10b981" }}>
            <h3>Compraventas</h3>
            <div className="analytics-stat-value">{fmt(balance.compraventas.comisionBruta)}</div>
            <p>Cobrado {fmt(balance.compraventas.cobrado)} · <b style={{ color: balance.compraventas.pendiente > 0 ? "#c2410c" : undefined }}>Pendiente {fmt(balance.compraventas.pendiente)}</b></p>
          </div>
          <div className="analytics-card" style={{ borderLeft: "3px solid #8b5cf6" }}>
            <h3>Compra de créditos</h3>
            <div className="analytics-stat-value">{fmt(balance.creditos.bruto)}</div>
            <p>Cobrado {fmt(balance.creditos.cobrado)} · <b style={{ color: balance.creditos.pendiente > 0 ? "#c2410c" : undefined }}>Pendiente {fmt(balance.creditos.pendiente)}</b></p>
          </div>
          {balance.gastosFijos?.fijos && (
            <div className="analytics-card" style={{ borderLeft: "3px solid #ef4444" }}>
              <h3>Gastos fijos empresa</h3>
              <div className="analytics-stat-value">{fmt(balance.gastosFijos.fijos.mensual)}/mes</div>
              <p>
                Anualizado {fmt(balance.gastosFijos.fijos.anualizado)} · Acumulado {fmt(balance.gastosFijos.fijos.acumulado)} ·{" "}
                {balance.gastosFijos.fijos.pctSobreNetoOperativo.toFixed(1)}% del beneficio operativo
              </p>
            </div>
          )}
          {balance.gastosFijos?.impuestos && (
            <div className="analytics-card" style={{ borderLeft: "3px solid #f59e0b" }}>
              <h3>Impuestos trimestre</h3>
              <div className="analytics-stat-value">{fmt(balance.gastosFijos.impuestos.trimestral)}/trim</div>
              <p>
                Media {fmt(balance.gastosFijos.impuestos.mensualEquiv)}/mes · Anual {fmt(balance.gastosFijos.impuestos.anualizado)} · Acumulado {fmt(balance.gastosFijos.impuestos.acumulado)} ·{" "}
                {balance.gastosFijos.impuestos.pctSobreNetoOperativo.toFixed(1)}% del beneficio operativo
              </p>
            </div>
          )}
        </div>
      )}

      <div className="contabilidad-tabs">
        <button type="button" className={`contabilidad-tab${tab === "metricas" ? " active" : ""}`} onClick={() => setTab("metricas")}>
          Métricas
        </button>
        <button type="button" className={`contabilidad-tab${tab === "creditos" ? " active" : ""}`} onClick={() => setTab("creditos")}>
          Compra de Créditos
        </button>
        <button type="button" className={`contabilidad-tab${tab === "alquileres" ? " active" : ""}`} onClick={() => setTab("alquileres")}>
          Alquileres
        </button>
        <button type="button" className={`contabilidad-tab${tab === "compraventas" ? " active" : ""}`} onClick={() => setTab("compraventas")}>
          Compraventas
        </button>
        <button type="button" className={`contabilidad-tab${tab === "gastos" ? " active" : ""}`} onClick={() => setTab("gastos")}>
          Gastos
        </button>
      </div>

      {tab === "metricas" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Métricas {metricasAnio}</h2>
            <label>
              Año
              <select value={metricasAnio} onChange={(e) => setMetricasAnio(Number(e.target.value))} style={{ marginLeft: 8 }}>
                {(metricas?.aniosDisponibles ?? [new Date().getFullYear()]).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>

          {cargandoMetricas || !metricas ? (
            <p className="admin-empty">Cargando métricas...</p>
          ) : (
            <>
              {/* Cards por línea de negocio */}
              <div className="analytics-grid">
                <div className="analytics-card" style={{ borderLeft: "3px solid #3b82f6" }}>
                  <h3>Gestión de alquileres</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.alquileres)}</div>
                  <p>
                    {porcentaje(metricas.totalAnual.alquileres, metricas.totalAnual.bruto).toFixed(1)}% del total ·{" "}
                    {fmtPct(variacionPct(metricas.totalAnual.alquileres, metricas.mesesAnterior.reduce((s, m) => s + m.alquileres, 0)))} vs {metricasAnio - 1}
                  </p>
                </div>
                <div className="analytics-card" style={{ borderLeft: "3px solid #10b981" }}>
                  <h3>Compraventas</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.compraventas)}</div>
                  <p>
                    {porcentaje(metricas.totalAnual.compraventas, metricas.totalAnual.bruto).toFixed(1)}% del total ·{" "}
                    {fmtPct(variacionPct(metricas.totalAnual.compraventas, metricas.mesesAnterior.reduce((s, m) => s + m.compraventas, 0)))} vs {metricasAnio - 1}
                  </p>
                </div>
                <div className="analytics-card" style={{ borderLeft: "3px solid #f59e0b" }}>
                  <h3>Créditos</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.creditos)}</div>
                  <p>
                    {porcentaje(metricas.totalAnual.creditos, metricas.totalAnual.bruto).toFixed(1)}% del total ·{" "}
                    {fmtPct(variacionPct(metricas.totalAnual.creditos, metricas.mesesAnterior.reduce((s, m) => s + m.creditos, 0)))} vs {metricasAnio - 1}
                  </p>
                </div>
              </div>

              {/* Cards totales */}
              <div className="analytics-grid" style={{ marginTop: 12 }}>
                <div className="analytics-card">
                  <h3>Facturación bruta</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.bruto)}</div>
                  <p>
                    {metricas.anioAnterior ? `${fmtPct(metricas.variacion.brutoPct)} vs ${metricasAnio - 1}` : `Sin datos de ${metricasAnio - 1}`}
                  </p>
                </div>
                <div className="analytics-card">
                  <h3>Gastos liquidados</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.gastos)}</div>
                  <p>Imputados al mes en que se pagaron</p>
                </div>
                <div className="analytics-card">
                  <h3>Beneficio neto</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.neto)}</div>
                  <p>
                    {metricas.anioAnterior ? `${fmtPct(metricas.variacion.netoPct)} vs ${metricasAnio - 1}` : `Sin datos de ${metricasAnio - 1}`}
                  </p>
                </div>
              </div>

              <div className="analytics-grid" style={{ marginTop: 12 }}>
                <div className="analytics-card" style={{ borderLeft: "3px solid #ef4444" }}>
                  <h3>Gastos fijos {metricasAnio}</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.fijos)}</div>
                  <p>{metricas.totalAnual.pctFijosSobreBruto.toFixed(1)}% del bruto · {metricas.totalAnual.pctFijosSobreNeto.toFixed(1)}% del beneficio operativo</p>
                </div>
                <div className="analytics-card" style={{ borderLeft: "3px solid #f59e0b" }}>
                  <h3>Impuestos {metricasAnio}</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.impuestos)}</div>
                  <p>{metricas.totalAnual.pctImpuestosSobreBruto.toFixed(1)}% del bruto · {metricas.totalAnual.pctImpuestosSobreNeto.toFixed(1)}% del beneficio operativo</p>
                </div>
                <div className="analytics-card" style={{ borderLeft: "3px solid #059669" }}>
                  <h3>Beneficio tras fijos + impuestos</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.netoTrasFijos)}</div>
                  <p>Neto operativo {fmt(metricas.totalAnual.neto)} − fijos {fmt(metricas.totalAnual.fijos)} − impuestos {fmt(metricas.totalAnual.impuestos)}</p>
                </div>
              </div>

              {/* Gráfico de evolución mensual */}
              <div className="articulos-list-section" style={{ marginTop: 24, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                  <h3 style={{ margin: 0 }}>Evolución mensual (bruto)</h3>
                  <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Alquileres</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Compraventas</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f59e0b", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Créditos</span>
                  </div>
                </div>
                <GraficoEvolucion meses={metricas.meses} />
              </div>

              {/* Trimestres */}
              <h3 style={{ marginTop: 24 }}>Por trimestre</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Trimestre</th>
                      <th>Bruto</th>
                      <th>Gastos</th>
                      <th>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.trimestres.map((t) => (
                      <tr key={t.trimestre}>
                        <td>T{t.trimestre}</td>
                        <td>{fmt(t.bruto)}</td>
                        <td>{fmt(t.gastos)}</td>
                        <td>{fmt(t.neto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mensual con comparativa */}
              <h3 style={{ marginTop: 24 }}>Por mes (con comparativa vs {metricasAnio - 1})</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Alquileres</th>
                      <th>Compraventas</th>
                      <th>Créditos</th>
                      <th>Bruto</th>
                      <th>Bruto {metricasAnio - 1}</th>
                      <th>Δ</th>
                      <th>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.meses.map((m) => {
                      const prev = metricas.mesesAnterior[m.mes - 1];
                      const delta = variacionPct(m.bruto, prev?.bruto ?? 0);
                      return (
                        <tr key={m.mes}>
                          <td>{NOMBRES_MES[m.mes - 1]}</td>
                          <td>{fmt(m.alquileres)}</td>
                          <td>{fmt(m.compraventas)}</td>
                          <td>{fmt(m.creditos)}</td>
                          <td><strong>{fmt(m.bruto)}</strong></td>
                          <td style={{ color: "#999" }}>{fmt(prev?.bruto ?? 0)}</td>
                          <td style={{ color: delta === null ? "#999" : delta >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>{fmtPct(delta)}</td>
                          <td>{fmt(m.neto)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "creditos" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Operaciones de créditos ({creditos.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarNuevaOperacionCredito((v) => !v)}>
              {mostrarNuevaOperacionCredito ? "Cancelar" : "Nueva operación"}
            </button>
          </div>

          {mostrarNuevaOperacionCredito && (
            <form className="piso-form" onSubmit={crearOperacionCredito}>
              <label>
                Cliente
                <select required value={nuevaOperacionCredito.cliente_id} onChange={(e) => setNuevaOperacionCredito({ ...nuevaOperacionCredito, cliente_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos} ({c.tipo})
                    </option>
                  ))}
                </select>
              </label>
              <div className="lead-form-row">
                <label>
                  Fecha
                  <input type="date" required value={nuevaOperacionCredito.fecha} onChange={(e) => setNuevaOperacionCredito({ ...nuevaOperacionCredito, fecha: e.target.value })} />
                </label>
                <label>
                  Precio (€)
                  <input type="number" min={0} required value={nuevaOperacionCredito.precio} onChange={(e) => setNuevaOperacionCredito({ ...nuevaOperacionCredito, precio: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar operación</button>
              </div>
            </form>
          )}

          {creditos.length === 0 ? (
            <p className="admin-empty">Todavía no hay operaciones de compra de créditos.</p>
          ) : (
            creditos.map((cr) => (
              <div key={cr.id} className="pisos-list-item">
                <div className="pisos-list-body" onClick={() => toggleCredito(cr)} style={{ cursor: "pointer" }}>
                  <h4>{clienteNombre(cr.cliente_id)} {cr.cobrado ? <span style={{ marginLeft: 8, padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Cobrado</span> : <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Pendiente</span>}</h4>
                  <div className="loc">
                    Fecha {new Date(cr.fecha).toLocaleDateString("es-ES")} · Bruto (precio) {fmt(cr.precio)}
                  </div>
                  <label style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 4, fontSize: 13 }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={!!cr.cobrado} onChange={async (e) => { await fetch(`/api/admin/creditos/${cr.id}/cobrado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cobrado: e.target.checked }) }); cargarTodo(); }} />
                    Cobrado
                  </label>
                  {creditoAbierto === cr.id && (
                    <div className="loc">Neto {fmt(netoDeOperacion(cr.precio, creditoGastos[cr.id] ?? []))}</div>
                  )}
                </div>
                <div className="lead-form-actions" style={{ padding: "0 16px 12px" }}>
                  <button type="button" className="btn-ghost" onClick={() => eliminarOperacionCredito(cr.id)}>
                    Eliminar operación
                  </button>
                </div>

                {creditoAbierto === cr.id && (
                  <div className="chat-transcript">
                    <form className="lead-form-row" onSubmit={(e) => añadirGastoCredito(cr.id, e)}>
                      <label>
                        Concepto
                        <input required value={nuevoGastoCredito.concepto} onChange={(e) => setNuevoGastoCredito({ ...nuevoGastoCredito, concepto: e.target.value })} placeholder="Coste de gestión, comisión pasarela..." />
                      </label>
                      <label>
                        Importe (€)
                        <input type="number" min={0} required value={nuevoGastoCredito.importe} onChange={(e) => setNuevoGastoCredito({ ...nuevoGastoCredito, importe: e.target.value })} />
                      </label>
                      <label>
                        Categoría
                        <select value={nuevoGastoCredito.categoria} onChange={(e) => setNuevoGastoCredito({ ...nuevoGastoCredito, categoria: e.target.value })}>
                          {CATEGORIAS_GASTO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </label>
                      <button type="submit" className="btn-primary">Añadir gasto</button>
                    </form>
                    {(creditoGastos[cr.id] ?? []).map((g) => (
                      <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <span>{g.concepto} — {g.es_negativo ? "-" : "+"}{fmt(g.importe)} · <span style={{ opacity: 0.6 }}>{labelCategoria(g.categoria)}</span></span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="checkbox" checked={g.pagado} onChange={(e) => toggleGastoCreditoPagado(cr.id, g.id, e.target.checked)} />
                            Liquidado
                          </label>
                          <button type="button" className="btn-ghost" onClick={() => eliminarGastoCredito(cr.id, g.id)}>
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                    {(creditoGastos[cr.id] ?? []).length === 0 && <p className="admin-empty">Sin movimientos registrados todavía.</p>}

                    <div className="lead-form-row" style={{ marginTop: 16 }}>
                      <label style={{ flex: 1 }}>
                        Adjuntar documento (PDF)
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={subiendoDocumentoCredito}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) subirDocumentoCredito(cr.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {(creditoDocumentos[cr.id] ?? []).map((doc) => (
                      <div key={doc.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <a href={`/api/admin/credito-documentos/${doc.id}`} target="_blank" rel="noreferrer">
                          {doc.nombre}
                        </a>
                        <button type="button" className="btn-ghost" onClick={() => eliminarDocumentoCredito(cr.id, doc.id)}>
                          Borrar
                        </button>
                      </div>
                    ))}
                    {(creditoDocumentos[cr.id] ?? []).length === 0 && <p className="admin-empty">Sin documentos adjuntos.</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "alquileres" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Alquileres ({clientesConAlquiler.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarActivarAlquiler((v) => !v)}>
              {mostrarActivarAlquiler ? "Cancelar" : "Activar alquiler"}
            </button>
          </div>

          {mostrarActivarAlquiler && (
            <form className="piso-form" onSubmit={activarCliente}>
              <label>
                Cliente propietario
                <select required value={activarAlquiler.cliente_id} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, cliente_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {propietariosInactivos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos}
                    </option>
                  ))}
                </select>
              </label>
              <div className="lead-form-row">
                <label>
                  Mensualidad (€)
                  <input type="number" min={0} required value={activarAlquiler.mensualidad} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, mensualidad: e.target.value })} />
                </label>
                <label>
                  % Comisión
                  <input type="number" min={0} step="0.1" value={activarAlquiler.comision_pct} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, comision_pct: e.target.value })} />
                </label>
                <label>
                  Comisión € fija (opcional, sobrescribe %)
                  <input type="number" min={0} step="0.01" value={activarAlquiler.comision_fija} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, comision_fija: e.target.value })} placeholder="auto según %" />
                </label>
              </div>
              <div className="lead-form-row">
                <label>
                  Fecha inicio mensualidad
                  <input type="date" value={activarAlquiler.fecha_inicio} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, fecha_inicio: e.target.value })} />
                </label>
                <label>
                  Fecha fin (opcional)
                  <input type="date" value={activarAlquiler.fecha_fin} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, fecha_fin: e.target.value })} />
                </label>
              </div>
              {propietariosInactivos.length === 0 && (
                <p className="admin-empty">Todos los propietarios ya tienen un alquiler activo. Crea el cliente primero en la pestaña Clientes.</p>
              )}
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Activar</button>
              </div>
            </form>
          )}

          {clientesConAlquiler.length === 0 ? (
            <p className="admin-empty">Todavía no hay alquileres activos. Actívalos desde aquí para un propietario ya creado en Clientes.</p>
          ) : (
            clientesConAlquiler.map((cliente) => (
              <div key={cliente.id} className="pisos-list-item">
                <div className="pisos-list-body" onClick={() => toggleCliente(cliente)} style={{ cursor: "pointer" }}>
                  <h4>{cliente.nombre} {cliente.apellidos}</h4>
                  <div className="loc">
                    {cliente.telefono || "sin teléfono"} · {cliente.zona_interes || "sin zona"} · mensualidad {fmt(cliente.mensualidad)}
                    {cliente.alquiler_fecha_inicio && ` · desde ${cliente.alquiler_fecha_inicio}`}
                    {cliente.alquiler_fecha_fin && ` hasta ${cliente.alquiler_fecha_fin}`}
                  </div>
                </div>
                <div className="lead-form-actions" style={{ padding: "0 16px 12px" }}>
                  <button type="button" className="btn-ghost" onClick={() => borrarAlquiler(cliente.id)}>
                    Borrar alquiler
                  </button>
                </div>

                {clienteAbierto === cliente.id && (
                  <div className="chat-transcript">
                    <div className="lead-form-row">
                      <label>
                        Mensualidad activa (€)
                        <input type="number" min={0} value={mensualidadInput} onChange={(e) => setMensualidadInput(e.target.value)} placeholder="0 = pausado" />
                      </label>
                      <button type="button" className="btn-primary" onClick={() => actualizarMensualidad(cliente.id)}>
                        Actualizar mensualidad
                      </button>
                    </div>
                    <p className="admin-empty" style={{ margin: "4px 0 12px" }}>
                      Cada mes se genera solo mientras la mensualidad sea mayor que 0. Ponla a 0 para pausar (por ejemplo, si el inquilino se va).
                    </p>

                    {(() => {
                      const lista = ingresos[cliente.id] ?? [];
                      const año = new Date().getUTCFullYear();
                      const totalAño = lista.filter((i) => añoActual(i.mes) === año).reduce((s, i) => s + i.comision_calculada, 0);
                      const pendientes = lista.filter((i) => !i.cobrado).length;
                      return (
                        <p className="loc" style={{ marginBottom: 12 }}>
                          Comisión {año}: {fmt(totalAño)} · Meses sin cobrar: {pendientes}
                        </p>
                      );
                    })()}

                    {(ingresos[cliente.id] ?? []).map((ing) => (
                      <div key={ing.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <span>
                          <b>Mensualidad {(() => { const d = ing.mes.slice(0, 10).split("-"); return `${d[2]}/${d[1]}/${d[0]}`; })()}</b>
                          {" — "}bruto {fmt(ing.ingreso_bruto)}, comisión {fmt(ing.comision_calculada)}
                          {!ing.cobrado && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11 }}>Pendiente</span>}
                          {ing.cobrado && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11 }}>Cobrado</span>}
                        </span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="checkbox" checked={ing.cobrado} onChange={(e) => toggleIngresoCobrado(cliente.id, ing.id, e.target.checked)} />
                            Cobrado
                          </label>
                          <button type="button" className="btn-ghost" onClick={() => eliminarIngreso(cliente.id, ing.id)}>
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                    {(ingresos[cliente.id] ?? []).length === 0 && <p className="admin-empty">Sin meses registrados todavía.</p>}

                    <div className="lead-form-actions" style={{ marginTop: 12 }}>
                      <button type="button" className="btn-ghost" onClick={() => setMostrarAjusteManual((v) => !v)}>
                        {mostrarAjusteManual ? "Ocultar ajuste manual" : "Ajustar un mes manualmente"}
                      </button>
                    </div>
                    {mostrarAjusteManual && (
                      <form className="lead-form-row" onSubmit={(e) => añadirIngreso(cliente.id, e)}>
                        <label>
                          Mes
                          <input type="month" required value={nuevoIngreso.mes} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, mes: e.target.value })} />
                        </label>
                        <label>
                          Ingreso bruto (€)
                          <input type="number" min={0} required value={nuevoIngreso.ingresoBruto} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, ingresoBruto: e.target.value })} />
                        </label>
                        <label>
                          Comisión € (opcional, sobrescribe %)
                          <input type="number" min={0} step="0.01" value={nuevoIngreso.comisionManual} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, comisionManual: e.target.value })} placeholder="auto según %" />
                        </label>
                        <button type="submit" className="btn-primary">Guardar mes</button>
                      </form>
                    )}

                    {(() => {
                      const gs = clienteGastos[cliente.id] ?? [];
                      const ings = ingresos[cliente.id] ?? [];
                      const año = new Date().getUTCFullYear();
                      const brutoAño = ings.filter((i) => añoActual(i.mes) === año).reduce((s, i) => s + i.comision_calculada, 0);
                      const gastoRecurrenteMes = gs.filter((g) => g.es_recurrente && (!g.fecha_fin || g.fecha_fin >= new Date().toISOString().slice(0, 10))).reduce((s, g) => s + g.importe, 0);
                      const mesesTranscurridos = new Date().getUTCMonth() + 1;
                      const gastoAcumulado = gastoRecurrenteMes * mesesTranscurridos + gs.filter((g) => !g.es_recurrente && g.pagado && g.fecha_pago && g.fecha_pago.startsWith(String(año))).reduce((s, g) => s + g.importe, 0);
                      const netoAño = brutoAño - gastoAcumulado;
                      const meses = Math.max(mesesTranscurridos, 1);
                      const recurrentes = gs.filter((g) => g.es_recurrente);
                      const puntuales = gs.filter((g) => !g.es_recurrente);
                      return (
                        <>
                          <div className="pnl-card">
                            <div><b>{fmt(brutoAño)}</b><span>Bruto {año}</span></div>
                            <div><b>{fmt(gastoAcumulado)}</b><span>Gastos {año}</span></div>
                            <div className={netoAño >= 0 ? "pnl-pos" : "pnl-neg"}><b>{fmt(netoAño)}</b><span>Neto {año}</span></div>
                            <div><b>{fmt(netoAño / meses)}</b><span>Neto/mes</span></div>
                            <div><b>{fmt(gastoRecurrenteMes)}</b><span>Gasto recurrente/mes</span></div>
                          </div>

                          <div className="section-head" style={{ marginTop: 12 }}>
                            <h4 style={{ margin: 0 }}>Partidas presupuestarias</h4>
                            <button type="button" className="btn-ghost" onClick={() => setMostrarNuevoGastoCliente((v) => !v)}>
                              {mostrarNuevoGastoCliente ? "Cancelar" : "+ Añadir partida"}
                            </button>
                          </div>

                          {mostrarNuevoGastoCliente && (
                            <form className="piso-form" onSubmit={(e) => crearGastoCliente(cliente.id, e)}>
                              <div className="lead-form-row">
                                <label>
                                  Concepto
                                  <input required value={nuevoGastoCliente.concepto} onChange={(e) => setNuevoGastoCliente({ ...nuevoGastoCliente, concepto: e.target.value })} placeholder="Renta al propietario" />
                                </label>
                                <label>
                                  Importe (€)
                                  <input type="number" min={0} step="0.01" required value={nuevoGastoCliente.importe} onChange={(e) => setNuevoGastoCliente({ ...nuevoGastoCliente, importe: e.target.value })} />
                                </label>
                                <label>
                                  Categoría
                                  <select value={nuevoGastoCliente.categoria} onChange={(e) => setNuevoGastoCliente({ ...nuevoGastoCliente, categoria: e.target.value })}>
                                    {CATEGORIAS_GASTO.map((c) => (
                                      <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <div className="lead-form-row">
                                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <input type="checkbox" checked={nuevoGastoCliente.esRecurrente} onChange={(e) => setNuevoGastoCliente({ ...nuevoGastoCliente, esRecurrente: e.target.checked })} />
                                  Recurrente (todos los meses)
                                </label>
                                {nuevoGastoCliente.esRecurrente ? (
                                  <label>
                                    Desde
                                    <input type="date" value={nuevoGastoCliente.fechaInicio} onChange={(e) => setNuevoGastoCliente({ ...nuevoGastoCliente, fechaInicio: e.target.value })} />
                                  </label>
                                ) : (
                                  <>
                                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <input type="checkbox" checked={nuevoGastoCliente.pagado} onChange={(e) => setNuevoGastoCliente({ ...nuevoGastoCliente, pagado: e.target.checked })} />
                                      Ya pagado
                                    </label>
                                    <label>
                                      Fecha pago
                                      <input type="date" value={nuevoGastoCliente.fechaPago} onChange={(e) => setNuevoGastoCliente({ ...nuevoGastoCliente, fechaPago: e.target.value })} />
                                    </label>
                                  </>
                                )}
                              </div>
                              <div className="lead-form-actions">
                                <button type="submit" className="btn-primary">Guardar partida</button>
                              </div>
                            </form>
                          )}

                          {recurrentes.length > 0 && (
                            <>
                              <p className="loc" style={{ marginTop: 10, marginBottom: 4 }}><b>Recurrentes mensuales</b></p>
                              {recurrentes.map((g) => (
                                <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                                  <span>
                                    <b>{fmt(g.importe)}/mes</b> · {g.concepto} · <span style={{ opacity: 0.6 }}>{labelCategoria(g.categoria)}</span>
                                    {g.fecha_inicio && <span style={{ opacity: 0.5, marginLeft: 8 }}>desde {g.fecha_inicio}</span>}
                                    {g.fecha_fin && <span style={{ opacity: 0.5, marginLeft: 8 }}>hasta {g.fecha_fin}</span>}
                                  </span>
                                  <span style={{ display: "flex", gap: 8 }}>
                                    {!g.fecha_fin && (
                                      <button type="button" className="btn-ghost" onClick={() => terminarGastoClienteRecurrente(cliente.id, g.id)}>Finalizar</button>
                                    )}
                                    <button type="button" className="btn-ghost" onClick={() => eliminarGastoCliente(cliente.id, g.id)}>Borrar</button>
                                  </span>
                                </div>
                              ))}
                            </>
                          )}

                          {puntuales.length > 0 && (
                            <>
                              <p className="loc" style={{ marginTop: 10, marginBottom: 4 }}><b>Puntuales</b></p>
                              {puntuales.map((g) => (
                                <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                                  <span>
                                    <b>{fmt(g.importe)}</b> · {g.concepto} · <span style={{ opacity: 0.6 }}>{labelCategoria(g.categoria)}</span>
                                    {g.fecha_pago && <span style={{ opacity: 0.5, marginLeft: 8 }}>{g.fecha_pago}</span>}
                                  </span>
                                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                      <input type="checkbox" checked={g.pagado} onChange={(e) => toggleGastoClientePagado(cliente.id, g.id, e.target.checked)} />
                                      Pagado
                                    </label>
                                    <button type="button" className="btn-ghost" onClick={() => eliminarGastoCliente(cliente.id, g.id)}>Borrar</button>
                                  </span>
                                </div>
                              ))}
                            </>
                          )}

                          {gs.length === 0 && <p className="admin-empty" style={{ marginTop: 8 }}>Sin partidas presupuestarias. Añade la renta al propietario, comunidad, IBI, etc.</p>}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "gastos" && (() => {
        const hoy = new Date();
        const deudaPorPersona: Record<string, { total: number; liquidado: number }> = {};
        const sumar = (persona: string | null, importe: number, liq: boolean) => {
          if (!persona) return;
          if (!deudaPorPersona[persona]) deudaPorPersona[persona] = { total: 0, liquidado: 0 };
          deudaPorPersona[persona].total += importe;
          if (liq) deudaPorPersona[persona].liquidado += importe;
        };
        for (const g of gastosFijos) {
          if (!g.pagado_por) continue;
          const inicio = new Date(g.fecha_inicio);
          const fin = g.fecha_fin ? new Date(g.fecha_fin) : hoy;
          const hasta = fin < hoy ? fin : hoy;
          if (hasta < inicio) continue;
          const meses = (hasta.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + (hasta.getUTCMonth() - inicio.getUTCMonth()) + 1;
          const mensual = g.tipo === "impuesto" ? g.importe_mensual / 3 : g.importe_mensual;
          sumar(g.pagado_por, mensual * Math.max(meses, 0), g.liquidado);
        }
        for (const g of gastosEmpresa) {
          sumar(g.pagado_por, g.importe, g.liquidado);
        }
        const personas = Object.entries(deudaPorPersona).map(([nombre, v]) => ({ nombre, total: v.total, liquidado: v.liquidado, pendiente: v.total - v.liquidado })).filter((p) => p.total > 0);

        return (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Gastos ({gastosFijos.filter((g) => !g.fecha_fin).length} fijos activos · {gastosEmpresa.length} puntuales)</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-primary" onClick={() => { setMostrarNuevoFijo((v) => !v); setMostrarNuevoGastoEmpresa(false); }}>
                {mostrarNuevoFijo ? "Cancelar" : "Nuevo gasto fijo"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setMostrarNuevoGastoEmpresa((v) => !v); setMostrarNuevoFijo(false); }}>
                {mostrarNuevoGastoEmpresa ? "Cancelar" : "Gasto puntual"}
              </button>
            </div>
          </div>

          {mostrarNuevoFijo && (
            <form className="piso-form" onSubmit={crearGastoFijo}>
              <div className="lead-form-row">
                <label>
                  Tipo
                  <select value={nuevoFijo.tipo} onChange={(e) => setNuevoFijo({ ...nuevoFijo, tipo: e.target.value as "fijo" | "impuesto" })}>
                    <option value="fijo">Gasto fijo (mensual)</option>
                    <option value="impuesto">Impuesto trimestre</option>
                  </select>
                </label>
                <label>
                  Concepto
                  <input required value={nuevoFijo.concepto} onChange={(e) => setNuevoFijo({ ...nuevoFijo, concepto: e.target.value })} placeholder={nuevoFijo.tipo === "impuesto" ? "IVA Q1, IRPF Q2..." : "Vercel Pro, Anthropic..."} />
                </label>
                <label>
                  {nuevoFijo.tipo === "impuesto" ? "Importe trimestral (€)" : "Importe mensual (€)"}
                  <input type="number" min={0} step="0.01" required value={nuevoFijo.importe_mensual} onChange={(e) => setNuevoFijo({ ...nuevoFijo, importe_mensual: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-row">
                <label>
                  Categoría
                  <select value={nuevoFijo.categoria} onChange={(e) => setNuevoFijo({ ...nuevoFijo, categoria: e.target.value })}>
                    <option value="software">Software / SaaS</option>
                    <option value="hosting">Hosting / Infra</option>
                    <option value="marketing">Marketing / Ads</option>
                    <option value="salarios">Salarios / Freelance</option>
                    <option value="oficina">Oficina</option>
                    <option value="iva">IVA</option>
                    <option value="irpf">IRPF</option>
                    <option value="sociedades">Impuesto sociedades</option>
                    <option value="otros">Otros</option>
                  </select>
                </label>
                <label>
                  Pagado por
                  <input value={nuevoFijo.pagado_por} onChange={(e) => setNuevoFijo({ ...nuevoFijo, pagado_por: e.target.value })} placeholder="Nombre de quien paga" />
                </label>
                <label>
                  Desde
                  <input type="date" value={nuevoFijo.fecha_inicio} onChange={(e) => setNuevoFijo({ ...nuevoFijo, fecha_inicio: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          )}

          {mostrarNuevoGastoEmpresa && (
            <form className="piso-form" onSubmit={crearGastoEmpresaFn}>
              <div className="lead-form-row">
                <label>
                  Concepto
                  <input required value={nuevoGastoEmpresa.concepto} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, concepto: e.target.value })} placeholder="Material, desplazamiento..." />
                </label>
                <label>
                  Importe (€)
                  <input type="number" min={0} step="0.01" required value={nuevoGastoEmpresa.importe} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, importe: e.target.value })} />
                </label>
                <label>
                  Fecha
                  <input type="date" required value={nuevoGastoEmpresa.fecha} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, fecha: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-row">
                <label>
                  Categoría
                  <select value={nuevoGastoEmpresa.categoria} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, categoria: e.target.value })}>
                    <option value="material">Material</option>
                    <option value="desplazamiento">Desplazamiento</option>
                    <option value="comida">Comida / Dietas</option>
                    <option value="software">Software</option>
                    <option value="marketing">Marketing</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="legal">Legal / Asesoría</option>
                    <option value="otros">Otros</option>
                  </select>
                </label>
                <label>
                  Pagado por
                  <input value={nuevoGastoEmpresa.pagado_por} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, pagado_por: e.target.value })} placeholder="Nombre de quien paga" />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar gasto</button>
              </div>
            </form>
          )}

          {/* Resumen */}
          {(() => {
            const activos = gastosFijos.filter((g) => !g.fecha_fin);
            const fijosAct = activos.filter((g) => (g.tipo ?? "fijo") === "fijo");
            const impAct = activos.filter((g) => g.tipo === "impuesto");
            const totalFijoMes = fijosAct.reduce((s, g) => s + Number(g.importe_mensual), 0);
            const totalImpTrim = impAct.reduce((s, g) => s + Number(g.importe_mensual), 0);
            const totalPuntuales = gastosEmpresa.reduce((s, g) => s + Number(g.importe), 0);
            return (
              <div className="pnl-card" style={{ marginBottom: 12 }}>
                <div><b>{fmt(totalFijoMes)}</b><span>Fijos /mes</span></div>
                <div><b>{fmt(totalImpTrim)}</b><span>Impuestos /trim</span></div>
                <div><b>{fmt(totalFijoMes * 12 + totalImpTrim * 4)}</b><span>Anualizado total</span></div>
                <div><b>{fmt(totalPuntuales)}</b><span>Puntuales total</span></div>
              </div>
            );
          })()}

          {/* Gastos fijos e impuestos en grid 2 columnas */}
          {(() => {
            const fijosList = gastosFijos.filter((g) => (g.tipo ?? "fijo") === "fijo");
            const impList = gastosFijos.filter((g) => g.tipo === "impuesto");
            const renderItem = (g: GastoFijo) => {
              const esImpuesto = g.tipo === "impuesto";
              if (editandoFijo === g.id) {
                return (
                  <div key={g.id} className="chat-widget-msg assistant" style={{ padding: 10 }}>
                    <div className="lead-form-row" style={{ marginBottom: 6 }}>
                      <label style={{ flex: 2 }}>
                        Concepto
                        <input value={edicionFijo.concepto} onChange={(e) => setEdicionFijo({ ...edicionFijo, concepto: e.target.value })} />
                      </label>
                      <label style={{ flex: 1 }}>
                        {edicionFijo.tipo === "impuesto" ? "€/trim" : "€/mes"}
                        <input type="number" min={0} step="0.01" value={edicionFijo.importe_mensual} onChange={(e) => setEdicionFijo({ ...edicionFijo, importe_mensual: e.target.value })} />
                      </label>
                    </div>
                    <div className="lead-form-row" style={{ marginBottom: 6 }}>
                      <label style={{ flex: 1 }}>
                        Pagado por
                        <input value={edicionFijo.pagado_por} onChange={(e) => setEdicionFijo({ ...edicionFijo, pagado_por: e.target.value })} placeholder="Nombre" />
                      </label>
                      <label style={{ flex: 1 }}>
                        Categoría
                        <select value={edicionFijo.categoria} onChange={(e) => setEdicionFijo({ ...edicionFijo, categoria: e.target.value })}>
                          <option value="software">Software / SaaS</option>
                          <option value="hosting">Hosting / Infra</option>
                          <option value="marketing">Marketing / Ads</option>
                          <option value="salarios">Salarios / Freelance</option>
                          <option value="oficina">Oficina</option>
                          <option value="iva">IVA</option>
                          <option value="irpf">IRPF</option>
                          <option value="sociedades">Impuesto sociedades</option>
                          <option value="otros">Otros</option>
                        </select>
                      </label>
                    </div>
                    <div className="lead-form-actions">
                      <button type="button" className="btn-primary" onClick={() => guardarEdicionFijo(g.id)}>Guardar</button>
                      <button type="button" className="btn-ghost" onClick={() => setEditandoFijo(null)}>Cancelar</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", opacity: g.fecha_fin ? 0.5 : 1 }}>
                  <span>
                    <b>{fmt(g.importe_mensual)}{esImpuesto ? "/trim" : "/mes"}</b>
                    {esImpuesto && <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 12 }}>(≈{fmt(g.importe_mensual / 3)}/mes)</span>}
                    <br />
                    <span style={{ fontSize: 13 }}>{g.concepto} · <span style={{ opacity: 0.6 }}>{g.categoria}</span></span>
                    {g.pagado_por && <span style={{ fontSize: 12, marginLeft: 6, padding: "1px 6px", background: "#e0e7ff", color: "#3730a3", borderRadius: 4 }}>Paga: {g.pagado_por}</span>}
                    <br />
                    <span style={{ opacity: 0.5, fontSize: 11 }}>desde {g.fecha_inicio}{g.fecha_fin && ` · hasta ${g.fecha_fin}`}</span>
                    {g.liquidado && <span style={{ marginLeft: 6, padding: "1px 6px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11 }}>Liquidado</span>}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button type="button" className="btn-ghost" onClick={() => { setEditandoFijo(g.id); setEdicionFijo({ concepto: g.concepto, importe_mensual: String(g.importe_mensual), categoria: g.categoria, tipo: g.tipo, pagado_por: g.pagado_por || "" }); }}>Editar</button>
                    {g.pagado_por && !g.liquidado && (
                      <button type="button" className="btn-ghost" onClick={() => toggleLiquidadoFijo(g.id, true)}>Liquidar</button>
                    )}
                    {g.liquidado && (
                      <button type="button" className="btn-ghost" onClick={() => toggleLiquidadoFijo(g.id, false)}>Desliquidar</button>
                    )}
                    {!g.fecha_fin && (
                      <button type="button" className="btn-ghost" onClick={() => terminarGastoFijo(g.id)}>Finalizar</button>
                    )}
                    <button type="button" className="btn-ghost" onClick={() => eliminarGastoFijo(g.id)}>Borrar</button>
                  </span>
                </div>
              );
            };
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                  <h3 style={{ marginTop: 0, fontSize: 15, color: "#1e40af" }}>Gastos fijos mensuales ({fijosList.length})</h3>
                  {fijosList.length === 0 ? <p className="admin-empty" style={{ margin: 0 }}>Sin gastos fijos.</p> : fijosList.map(renderItem)}
                </div>
                <div style={{ border: "1px solid #fde68a", borderRadius: 12, padding: 12, background: "#fffbeb" }}>
                  <h3 style={{ marginTop: 0, fontSize: 15, color: "#b45309" }}>Impuestos trimestrales ({impList.length})</h3>
                  {impList.length === 0 ? <p className="admin-empty" style={{ margin: 0 }}>Sin impuestos.</p> : impList.map(renderItem)}
                </div>
              </div>
            );
          })()}

          {/* Gastos puntuales */}
          <div style={{ marginTop: 24, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fafafa" }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Gastos puntuales ({gastosEmpresa.length})</h3>
            {gastosEmpresa.length === 0 ? (
              <p className="admin-empty" style={{ margin: 0 }}>Sin gastos puntuales. Usa el botón "Gasto puntual" para añadir uno.</p>
            ) : (
              gastosEmpresa.map((g) => (
                <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", opacity: g.liquidado ? 0.5 : 1 }}>
                  <span>
                    <b>{fmt(g.importe)}</b> · {g.concepto} · <span style={{ opacity: 0.6 }}>{g.categoria}</span>
                    <br />
                    <span style={{ opacity: 0.5, fontSize: 11 }}>{new Date(g.fecha).toLocaleDateString("es-ES")}</span>
                    {g.pagado_por && <span style={{ fontSize: 12, marginLeft: 6, padding: "1px 6px", background: "#e0e7ff", color: "#3730a3", borderRadius: 4 }}>Paga: {g.pagado_por}</span>}
                    {g.liquidado && <span style={{ marginLeft: 6, padding: "1px 6px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11 }}>Liquidado{g.fecha_liquidacion && ` ${g.fecha_liquidacion}`}</span>}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    {g.pagado_por && !g.liquidado && (
                      <button type="button" className="btn-ghost" onClick={() => toggleLiquidadoEmpresa(g.id, true)}>Liquidar</button>
                    )}
                    {g.liquidado && (
                      <button type="button" className="btn-ghost" onClick={() => toggleLiquidadoEmpresa(g.id, false)}>Desliquidar</button>
                    )}
                    <button type="button" className="btn-ghost" onClick={() => eliminarGastoEmpresaFn(g.id)}>Borrar</button>
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Resumen de deuda por persona */}
          {personas.length > 0 && (
            <div style={{ marginTop: 24, border: "2px solid #c7d2fe", borderRadius: 12, padding: 16, background: "#eef2ff" }}>
              <h3 style={{ marginTop: 0, fontSize: 15, color: "#3730a3" }}>Deuda por persona</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Total pagado</th>
                      <th>Liquidado</th>
                      <th>Pendiente de devolver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personas.map((p) => (
                      <tr key={p.nombre}>
                        <td><b>{p.nombre}</b></td>
                        <td>{fmt(p.total)}</td>
                        <td>{fmt(p.liquidado)}</td>
                        <td style={{ fontWeight: 700, color: p.pendiente > 0 ? "#c2410c" : "#059669" }}>{fmt(p.pendiente)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {tab === "compraventas" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Operaciones ({operaciones.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarNuevaOperacion((v) => !v)}>
              {mostrarNuevaOperacion ? "Cancelar" : "Nueva operación"}
            </button>
          </div>

          {mostrarNuevaOperacion && (
            <form className="piso-form" onSubmit={crearOperacion}>
              <label>
                Cliente
                <select required value={nuevaOperacion.cliente_id} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, cliente_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos} ({c.tipo})
                    </option>
                  ))}
                </select>
              </label>
              <div className="lead-form-row">
                <label>
                  Fecha de cierre
                  <input type="date" required value={nuevaOperacion.fecha_cierre} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, fecha_cierre: e.target.value })} />
                </label>
                <label>
                  Precio de venta (€)
                  <input type="number" min={0} required value={nuevaOperacion.precio_venta} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, precio_venta: e.target.value })} />
                </label>
                <label>
                  % Comisión
                  <input type="number" min={0} step="0.1" value={nuevaOperacion.comision_pct} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, comision_pct: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar operación</button>
              </div>
            </form>
          )}

          {operaciones.length === 0 ? (
            <p className="admin-empty">Todavía no hay operaciones de compraventa.</p>
          ) : (
            operaciones.map((op) => (
              <div key={op.id} className="pisos-list-item" style={{ position: "relative" }}>
                <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 6, zIndex: 2 }}>
                  <button type="button" onClick={() => abrirEdicionOp(op)} title={editandoOp === op.id ? "Cerrar edición" : "Editar bruto"} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "var(--orange)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>
                  <button type="button" onClick={() => { if (confirm(`¿Seguro que quieres eliminar esta operación de ${clienteNombre(op.cliente_id)}? Esta acción no se puede deshacer.`)) eliminarOperacion(op.id); }} title="Eliminar operación" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "var(--orange)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
                <div className="pisos-list-body" onClick={() => toggleOperacion(op)} style={{ cursor: "pointer", paddingLeft: 72 }}>
                  <h4>{clienteNombre(op.cliente_id)} {op.cobrado ? <span style={{ marginLeft: 8, padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Cobrado</span> : <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Pendiente</span>}</h4>
                  <div className="loc">
                    Cierre {new Date(op.fecha_cierre).toLocaleDateString("es-ES")} · Venta {fmt(op.precio_venta)} · Bruto (comisión) {fmt(op.comision_calculada)}
                  </div>
                  <label style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 4, fontSize: 13 }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={!!op.cobrado} onChange={async (e) => { await fetch(`/api/admin/operaciones/${op.id}/cobrado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cobrado: e.target.checked }) }); cargarTodo(); }} />
                    Cobrado
                  </label>
                  {operacionAbierta === op.id && (
                    <div className="loc">Ganancia neta {fmt(netoDeOperacion(op.comision_calculada, gastos[op.id] ?? []))}</div>
                  )}
                </div>

                {editandoOp === op.id && (
                  <div className="chat-transcript">
                    <p className="admin-empty" style={{ marginTop: 0 }}>Edita el bruto directamente, o recalcúlalo cambiando precio y %.</p>
                    <div className="lead-form-row">
                      <label>
                        Bruto (comisión) €
                        <input type="number" min={0} step="0.01" value={edicionOp.comision_calculada} onChange={(e) => setEdicionOp({ ...edicionOp, comision_calculada: e.target.value })} />
                      </label>
                      <button type="button" className="btn-primary" onClick={() => guardarEdicionOp(op.id, "manual")}>Guardar bruto</button>
                    </div>
                    <div className="lead-form-row">
                      <label>
                        Precio de venta €
                        <input type="number" min={0} value={edicionOp.precio_venta} onChange={(e) => setEdicionOp({ ...edicionOp, precio_venta: e.target.value })} />
                      </label>
                      <label>
                        % Comisión
                        <input type="number" min={0} step="0.1" value={edicionOp.comision_pct} onChange={(e) => setEdicionOp({ ...edicionOp, comision_pct: e.target.value })} />
                      </label>
                      <button type="button" className="btn-ghost" onClick={() => guardarEdicionOp(op.id, "recalcular")}>Recalcular bruto</button>
                    </div>
                  </div>
                )}

                {operacionAbierta === op.id && (
                  <div className="chat-transcript">
                    <form className="lead-form-row" onSubmit={(e) => añadirGasto(op.id, e)}>
                      <label>
                        Concepto
                        <input required value={nuevoGasto.concepto} onChange={(e) => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })} placeholder="Certificado energético, reforma..." />
                      </label>
                      <label>
                        Importe (€)
                        <input type="number" min={0} required value={nuevoGasto.importe} onChange={(e) => setNuevoGasto({ ...nuevoGasto, importe: e.target.value })} />
                      </label>
                      <label>
                        Categoría
                        <select value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })}>
                          {CATEGORIAS_GASTO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </label>
                      <button type="submit" className="btn-primary">Añadir gasto</button>
                    </form>
                    {(gastos[op.id] ?? []).map((g) => (
                      <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <span>{g.concepto} — {g.es_negativo ? "-" : "+"}{fmt(g.importe)} · <span style={{ opacity: 0.6 }}>{labelCategoria(g.categoria)}</span></span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="checkbox" checked={g.pagado} onChange={(e) => toggleGastoPagado(op.id, g.id, e.target.checked)} />
                            Liquidado
                          </label>
                          <button type="button" className="btn-ghost" onClick={() => eliminarGasto(op.id, g.id)}>
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                    {(gastos[op.id] ?? []).length === 0 && <p className="admin-empty">Sin movimientos registrados todavía.</p>}

                    <div className="lead-form-row" style={{ marginTop: 16 }}>
                      <label style={{ flex: 1 }}>
                        Adjuntar documento (PDF)
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={subiendoDocumento}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) subirDocumento(op.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {(documentos[op.id] ?? []).map((doc) => (
                      <div key={doc.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <a href={`/api/admin/documentos/${doc.id}`} target="_blank" rel="noreferrer">
                          {doc.nombre}
                        </a>
                        <button type="button" className="btn-ghost" onClick={() => eliminarDocumento(op.id, doc.id)}>
                          Borrar
                        </button>
                      </div>
                    ))}
                    {(documentos[op.id] ?? []).length === 0 && <p className="admin-empty">Sin documentos adjuntos. Súbelos aquí para poder pedírselos luego al bot de Telegram.</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
