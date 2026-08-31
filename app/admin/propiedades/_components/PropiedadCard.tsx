"use client";

import { useState } from "react";
import { Bloque, Cliente, FONT, Field, Habitacion, Propiedad, ServicioTag, descripcionConServicios, inputStyle, totalConGaraje } from "./shared";
import { ClienteBuscador } from "./ClienteBuscador";
import { EstadisticasPropietario } from "./EstadisticasPropietario";
import { MediaGrid, UploadRow } from "./MediaGrid";
import { PublicarBloque } from "./PublicarBloque";

export function PropiedadCard({
  p,
  clientes,
  abierta,
  onToggle,
  onEliminar,
  onActualizar,
  onCrearHab,
  onActualizarHab,
  onEliminarHab,
  onSubir,
  onEliminarMedia,
  subiendoKey,
}: {
  p: Propiedad;
  clientes: Cliente[];
  abierta: boolean;
  onToggle: () => void;
  onEliminar: () => void;
  onActualizar: (patch: Partial<Propiedad>) => void;
  onCrearHab: (nombre: string) => void;
  onActualizarHab: (id: string, patch: Partial<Habitacion>) => void;
  onEliminarHab: (id: string) => void;
  onSubir: (file: File, tipo: "foto" | "video", habitacion_id?: string | null) => void;
  onEliminarMedia: (id: string) => void;
  subiendoKey: string | null;
}) {
  const [nuevaHab, setNuevaHab] = useState("");
  const [borrador, setBorrador] = useState<Partial<Propiedad>>({});
  const dirty = Object.keys(borrador).length > 0;
  function set<K extends keyof Propiedad>(k: K, v: Propiedad[K]) {
    setBorrador((b) => ({ ...b, [k]: v }));
  }
  function val<K extends keyof Propiedad>(k: K): Propiedad[K] {
    return (k in borrador ? borrador[k] : p[k]) as Propiedad[K];
  }
  async function guardar() {
    if (!dirty) return;
    if (!confirm("¿Estás seguro de que quieres guardar los cambios?")) return;
    await onActualizar(borrador);
    setBorrador({});
  }
  const propView = { ...p, ...borrador };
  const mediaGeneral = p.media.filter((m) => !m.habitacion_id);
  const portada = mediaGeneral.find((m) => m.tipo === "foto") ?? p.media.find((m) => m.tipo === "foto");

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", fontFamily: FONT }}>
      <div style={{ display: "flex", gap: 20, padding: 20, cursor: "pointer", flexWrap: "wrap" }} onClick={onToggle}>
        <div style={{ width: "100%", maxWidth: 180, height: 130, borderRadius: 8, background: "#f3f4f6", overflow: "hidden", flexShrink: 0 }}>
          {portada ? (
            <img src={portada.url} alt={propView.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: 13 }}>Sin foto</div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#111827" }}>{propView.nombre}{dirty && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--orange)", fontWeight: 500 }}>· sin guardar</span>}</h3>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, textTransform: "capitalize" }}>
              {propView.tipo === "venta_activo" ? "Venta de Activo" : propView.tipo} · {propView.num_habitaciones} hab · {propView.num_banos} baños
              {propView.precio_total ? ` · ${totalConGaraje(propView)}€${propView.tipo === "venta_activo" ? "" : "/mes"}` : ""}
              {propView.tiene_garaje && propView.precio_garaje ? ` (piso ${propView.precio_total}€ + garaje ${propView.precio_garaje}€)` : ""}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {propView.servicio_wifi && <ServicioTag label="Wifi" />}
              {propView.servicio_limpieza && <ServicioTag label="Limpieza" />}
              {propView.servicio_luz && <ServicioTag label="Luz" />}
              {propView.servicio_agua && <ServicioTag label="Agua" />}
              {propView.tiene_garaje && <ServicioTag label="Garaje" />}
              {propView.libre_enero && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#fef3c7", color: "#92400e", fontWeight: 500 }}>Libre en Enero</span>}
              {propView.asignado_nombre && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#e0e7ff", color: "#3730a3", fontWeight: 500 }}>{propView.asignado_nombre}</span>}
            </div>
            {propView.direccion && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{propView.direccion}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {p.habitaciones.map((h) => (
              <span key={h.id} style={{
                padding: "3px 10px", borderRadius: 999, fontSize: 12,
                background: h.cliente_id ? "#fef3c7" : "#d1fae5",
                color: h.cliente_id ? "#92400e" : "#065f46",
              }}>
                {h.nombre}{h.precio ? ` · ${h.precio}€` : ""}{h.cliente_id ? ` · ${h.clienteNombre}` : " · libre"}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {abierta && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); guardar(); }}
              disabled={!dirty}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: dirty ? "var(--orange)" : "#e5e7eb",
                color: dirty ? "#fff" : "#9ca3af",
                cursor: dirty ? "pointer" : "not-allowed",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: FONT,
              }}
            >
              {dirty ? "Guardar cambios" : "Sin cambios"}
            </button>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onEliminar(); }} title="Eliminar" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20, padding: 4 }}>×</button>
          <span style={{ color: "#9ca3af", fontSize: 12 }}>{abierta ? "▲ cerrar" : "▼ abrir"}</span>
        </div>
      </div>

      {abierta && (
        <div style={{ padding: 20, borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label="Nombre">
              <input value={val("nombre")} onChange={(e) => set("nombre", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Dirección">
              <input value={val("direccion") ?? ""} onChange={(e) => set("direccion", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Habitaciones">
              <input type="number" min={0} value={val("num_habitaciones")} onChange={(e) => set("num_habitaciones", Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Baños">
              <input type="number" min={0} value={val("num_banos")} onChange={(e) => set("num_banos", Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label={val("tipo") === "venta_activo" ? "Precio de venta (€)" : "Precio total (€/mes)"}>
              <input type="number" min={0} step="0.01" value={val("precio_total") ?? ""} onChange={(e) => set("precio_total", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
            </Field>
            <Field label="Tipo">
              <select value={val("tipo")} onChange={(e) => set("tipo", e.target.value)} style={inputStyle}>
                <option value="piso">Piso</option>
                <option value="casa">Casa</option>
                <option value="estudio">Estudio</option>
                <option value="chalet">Chalet</option>
                <option value="venta_activo">Venta de Activo</option>
              </select>
            </Field>
          </div>
          <div style={{ marginBottom: 20 }}>
            <Field label="Notas">
              <textarea value={val("notas") ?? ""} onChange={(e) => set("notas", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} />
            </Field>
          </div>

          <div style={{ marginBottom: 20, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Servicios incluidos</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { key: "servicio_wifi" as const, label: "Wifi" },
                { key: "servicio_limpieza" as const, label: "Limpieza" },
                { key: "servicio_luz" as const, label: "Luz" },
                { key: "servicio_agua" as const, label: "Agua" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={val(key)} onChange={(e) => set(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Características</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={val("tiene_garaje")}
                  onChange={(e) => {
                    set("tiene_garaje", e.target.checked);
                    if (!e.target.checked) set("precio_garaje", null);
                  }}
                />
                Tiene garaje
              </label>
              {val("tiene_garaje") && (
                <Field label="Precio plaza garaje (€/mes)">
                  <input type="number" min={0} step="0.01" value={val("precio_garaje") ?? ""} onChange={(e) => set("precio_garaje", e.target.value ? Number(e.target.value) : null)} style={{ ...inputStyle, width: 180 }} />
                </Field>
              )}
              {val("tiene_garaje") && val("precio_garaje") && val("precio_total") && (
                <div style={{ fontSize: 13, color: "#065f46", background: "#d1fae5", padding: "6px 12px", borderRadius: 6, fontWeight: 500 }}>
                  Total con garaje: {totalConGaraje(propView)}€/mes
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={val("libre_enero")} onChange={(e) => set("libre_enero", e.target.checked)} />
                Se queda libre en Enero (rotación completa)
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 20, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Propietario y rentabilidad</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, alignItems: "end" }}>
              <Field label="Cliente propietario">
                <ClienteBuscador
                  clientes={clientes.filter((c) => c.tipo === "propietario")}
                  value={val("propietario_id")}
                  onChange={(id) => set("propietario_id", id)}
                  placeholderVacio="Sin asignar"
                />
              </Field>
              <Field label="Valor de compra (€) — para rentabilidad">
                <input type="number" min={0} step="1" value={val("valor_compra") ?? ""} onChange={(e) => set("valor_compra", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
              </Field>
            </div>
            {val("propietario_id") && !dirty && <EstadisticasPropietario propiedadId={p.id} />}
            {dirty && val("propietario_id") && <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>Guarda los cambios para ver las estadísticas actualizadas.</div>}
          </div>

          <Bloque titulo="Fotos generales" sub="Fachada, cocina, salón, exterior…">
            <MediaGrid media={mediaGeneral.filter((m) => m.tipo === "foto")} onDelete={onEliminarMedia} />
          </Bloque>
          <Bloque titulo="Vídeos generales">
            <MediaGrid media={mediaGeneral.filter((m) => m.tipo === "video")} onDelete={onEliminarMedia} />
          </Bloque>
          <UploadRow subiendo={subiendoKey === p.id} onFoto={(f) => onSubir(f, "foto", null)} onVideo={(f) => onSubir(f, "video", null)} />
          {mediaGeneral.length > 0 && (
            <PublicarBloque
              propiedadId={p.id}
              sugerencias={{ titulo: propView.nombre, precio: totalConGaraje(propView) || (propView.precio_total ?? 0), direccion: propView.direccion ?? "", descripcion: descripcionConServicios(propView) }}
              habitacionId={null}
              label="Publicar propiedad entera en el catálogo"
              tipoProp={propView.tipo}
              habitaciones={p.habitaciones}
              media={p.media}
            />
          )}

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "#111827" }}>Habitaciones</div>
            {p.habitaciones.length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, margin: "8px 0" }}>Sin habitaciones definidas.</p>}
            {p.habitaciones.map((h) => {
              const mediaHab = p.media.filter((m) => m.habitacion_id === h.id);
              const estudiantes = clientes.filter((c) => c.tipo === "estudiante");
              return (
                <div key={h.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, alignItems: "end", marginBottom: 10 }}>
                    <Field label="Habitación">
                      <input defaultValue={h.nombre} onBlur={(e) => e.target.value !== h.nombre && onActualizarHab(h.id, { nombre: e.target.value })} style={inputStyle} />
                    </Field>
                    <Field label="Precio (€)">
                      <input type="number" min={0} step="0.01" defaultValue={h.precio ?? ""} onBlur={(e) => onActualizarHab(h.id, { precio: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
                    </Field>
                    <Field label="Ocupada por (estudiante)">
                      <ClienteBuscador
                        clientes={estudiantes}
                        value={h.cliente_id}
                        onChange={(id) => onActualizarHab(h.id, { cliente_id: id })}
                        placeholderVacio="Libre"
                      />
                    </Field>
                    <button type="button" onClick={() => onEliminarHab(h.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20, padding: 4, alignSelf: "center" }}>×</button>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", marginBottom: 10, cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked={h.libre_enero} onChange={(e) => onActualizarHab(h.id, { libre_enero: e.target.checked })} />
                    Se queda libre en Enero (rotación)
                  </label>
                  <Bloque titulo="Fotos" sub={mediaHab.filter((m) => m.tipo === "foto").length === 0 ? "Sin fotos aún." : undefined}>
                    <MediaGrid media={mediaHab.filter((m) => m.tipo === "foto")} onDelete={onEliminarMedia} pequenio />
                  </Bloque>
                  <Bloque titulo="Vídeos" sub={mediaHab.filter((m) => m.tipo === "video").length === 0 ? "Sin vídeos aún." : undefined}>
                    <MediaGrid media={mediaHab.filter((m) => m.tipo === "video")} onDelete={onEliminarMedia} pequenio />
                  </Bloque>
                  <UploadRow
                    subiendo={subiendoKey === p.id + h.id}
                    onFoto={(f) => onSubir(f, "foto", h.id)}
                    onVideo={(f) => onSubir(f, "video", h.id)}
                    labelFoto="+ Foto de esta habitación"
                    labelVideo="+ Vídeo"
                  />
                  {!h.cliente_id && mediaHab.length > 0 && (
                    <PublicarBloque
                      propiedadId={p.id}
                      habitacionId={h.id}
                      sugerencias={{ titulo: `${h.nombre} en ${propView.nombre}`, precio: h.precio ?? 0, direccion: propView.direccion ?? "", descripcion: propView.notas ?? "" }}
                      label="Publicar esta habitación en el catálogo"
                    />
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={nuevaHab} onChange={(e) => setNuevaHab(e.target.value)} placeholder="Nueva habitación (ej. Master, H1)" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => { onCrearHab(nuevaHab); setNuevaHab(""); }} style={{ padding: "8px 16px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontFamily: FONT }}>Añadir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
