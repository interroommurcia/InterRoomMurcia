"use client";

import { FONT, Media } from "./shared";

export function MediaGrid({ media, onDelete, pequenio }: { media: Media[]; onDelete: (id: string) => void; pequenio?: boolean }) {
  if (media.length === 0) return <div style={{ fontSize: 12, color: "#9ca3af", padding: "8px 0" }}>Sin archivos aún.</div>;
  const size = pequenio ? 72 : 100;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
      {media.map((m) => (
        <div key={m.id} style={{ position: "relative", width: size, height: size, borderRadius: 6, overflow: "hidden", background: "#000" }}>
          {m.tipo === "foto" ? (
            <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <video src={m.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
          )}
          <div style={{ position: "absolute", top: 2, right: 2, display: "flex", gap: 2 }}>
            <a
              href={`/api/admin/propiedades/media/${m.id}/download`}
              title="Descargar"
              style={{ background: "rgba(255,255,255,0.95)", borderRadius: 999, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", fontSize: 12, textDecoration: "none" }}
            >↓</a>
            <button
              type="button"
              onClick={() => onDelete(m.id)}
              title="Eliminar"
              style={{ background: "rgba(255,255,255,0.95)", border: "none", borderRadius: 999, width: 22, height: 22, cursor: "pointer", color: "var(--orange)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
            >×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function UploadRow({
  subiendo,
  onFoto,
  onVideo,
  labelFoto = "+ Foto",
  labelVideo = "+ Vídeo",
}: {
  subiendo: boolean;
  onFoto: (f: File) => void;
  onVideo: (f: File) => void;
  labelFoto?: string;
  labelVideo?: string;
}) {
  const btn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: subiendo ? "wait" : "pointer",
    fontSize: 13,
    color: "#374151",
    fontFamily: FONT,
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <label style={btn}>
        {subiendo ? "Subiendo…" : labelFoto}
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onFoto(e.target.files[0])} disabled={subiendo} />
      </label>
      <label style={btn}>
        {subiendo ? "Subiendo…" : labelVideo}
        <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onVideo(e.target.files[0])} disabled={subiendo} />
      </label>
    </div>
  );
}
