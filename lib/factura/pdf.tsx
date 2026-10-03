import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { EMISOR } from "./emisor";
import type { Factura } from "./tipos";

const ACCENT = "#ea6a12";
const ACCENT_DARK = "#c2410c";
const ACCENT_LIGHT = "#fff4ec";
const INK = "#1c1917";
const INK_SOFT = "#57534e";
const LINE = "#e7e2db";

const fmt = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const euro = (n: number) => `${fmt.format(n)} €`;

const s = StyleSheet.create({
  page: { backgroundColor: "#ffffff", color: INK, fontSize: 10, fontFamily: "Helvetica", paddingBottom: 40 },
  accentRule: { height: 6, backgroundColor: ACCENT },
  inner: { paddingHorizontal: 44, paddingTop: 32 },

  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { flexDirection: "row", alignItems: "center" },
  mark: { width: 40, height: 40, borderRadius: 10, backgroundColor: ACCENT, color: "#fff", textAlign: "center", marginRight: 10 },
  markTxt: { color: "#fff", fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 11 },
  word: { fontSize: 18, fontFamily: "Helvetica-Bold", color: INK },
  wordAccent: { color: ACCENT },
  wordSmall: { fontSize: 8, letterSpacing: 2, color: "#a8a29e", fontFamily: "Helvetica-Bold", marginTop: 2 },
  docTitle: { alignItems: "flex-end" },
  docSub: { fontSize: 8, letterSpacing: 2, color: ACCENT_DARK, fontFamily: "Helvetica-Bold" },
  docH1: { fontSize: 32, fontFamily: "Helvetica-Bold", color: INK },
  contactChip: { fontSize: 10, fontFamily: "Helvetica-Bold", color: INK, marginTop: 2 },

  meta: { flexDirection: "row", marginTop: 26, gap: 12 },
  metaBox: { flex: 1, backgroundColor: ACCENT_LIGHT, borderRadius: 8, padding: 10 },
  metaLbl: { fontSize: 7, letterSpacing: 1, color: ACCENT_DARK, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  metaVal: { fontSize: 11, fontFamily: "Helvetica-Bold" },

  parties: { flexDirection: "row", marginTop: 26, gap: 28 },
  party: { flex: 1 },
  partyTag: { fontSize: 8, letterSpacing: 1.5, color: ACCENT_DARK, fontFamily: "Helvetica-Bold", paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: "#d6cfc6", marginBottom: 8 },
  partyName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  partyLine: { fontSize: 9.5, color: INK_SOFT, marginBottom: 2, lineHeight: 1.4 },

  table: { marginTop: 28 },
  thead: { flexDirection: "row", backgroundColor: INK, borderRadius: 6 },
  th: { color: "#fff", fontSize: 8, letterSpacing: 1, fontFamily: "Helvetica-Bold", padding: 8 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  td: { padding: 8, fontSize: 9.5 },
  colDesc: { flex: 3 },
  colNum: { flex: 1.3, textAlign: "right" },
  tdNum: { fontFamily: "Helvetica-Bold" },

  foot: { flexDirection: "row", marginTop: 26, justifyContent: "space-between" },
  pay: { flex: 1, paddingRight: 20 },
  payTag: { fontSize: 8, letterSpacing: 1.5, color: ACCENT_DARK, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  payLine: { fontSize: 9.5, color: INK_SOFT, marginBottom: 2 },
  iban: { fontSize: 12, fontFamily: "Helvetica-Bold", color: INK, marginTop: 2 },
  qrRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  qrBox: { width: 70, height: 70, marginRight: 10 },
  qrVisit: { fontSize: 10, letterSpacing: 1, color: ACCENT_DARK, fontFamily: "Helvetica-Bold" },
  qrUrl: { fontSize: 9, color: INK_SOFT },

  totals: { width: 220 },
  totLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: LINE },
  totK: { fontSize: 10, color: INK_SOFT },
  totV: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  grand: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1.5, borderColor: ACCENT, borderRadius: 8, padding: 12, marginTop: 12 },
  grandK: { fontSize: 9, letterSpacing: 1, color: ACCENT_DARK, fontFamily: "Helvetica-Bold" },
  grandV: { fontSize: 18, fontFamily: "Helvetica-Bold", color: INK },

  thanks: { textAlign: "center", marginTop: 34, fontSize: 9, letterSpacing: 2, color: ACCENT_DARK, fontFamily: "Helvetica-Bold" },
});

function fechaES(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function FacturaDoc({ f, qrDataUrl }: { f: Factura; qrDataUrl: string | null }) {
  return (
    <Document title={`Factura ${f.numero}`} author={EMISOR.nombre}>
      <Page size="A4" style={s.page}>
        <View style={s.accentRule} />
        <View style={s.inner}>
          <View style={s.head}>
            <View style={s.brand}>
              <View style={s.mark}><Text style={s.markTxt}>iR</Text></View>
              <View>
                <Text style={s.word}>Inter<Text style={s.wordAccent}>Room</Text></Text>
                <Text style={s.wordSmall}>MURCIA</Text>
              </View>
            </View>
            <View style={s.docTitle}>
              <Text style={s.docSub}>DOCUMENTO</Text>
              <Text style={s.docH1}>FACTURA</Text>
              <Text style={s.contactChip}>{EMISOR.telefono_contacto}</Text>
            </View>
          </View>

          <View style={s.meta}>
            <View style={s.metaBox}><Text style={s.metaLbl}>Nº DE FACTURA</Text><Text style={s.metaVal}>{f.numero}</Text></View>
            <View style={s.metaBox}><Text style={s.metaLbl}>FECHA</Text><Text style={s.metaVal}>{fechaES(f.fecha)}</Text></View>
            <View style={s.metaBox}><Text style={s.metaLbl}>CONCEPTO</Text><Text style={s.metaVal}>{f.concepto}</Text></View>
          </View>

          <View style={s.parties}>
            <View style={s.party}>
              <Text style={s.partyTag}>EMISOR</Text>
              <Text style={s.partyName}>{f.emisor_nombre}</Text>
              <Text style={s.partyLine}>NIF: {f.emisor_nif}</Text>
              <Text style={s.partyLine}>{EMISOR.direccion}</Text>
              <Text style={s.partyLine}>{EMISOR.cp_ciudad}</Text>
              <Text style={s.partyLine}>Tel. {EMISOR.telefono}</Text>
              <Text style={s.partyLine}>{EMISOR.email}</Text>
            </View>
            <View style={s.party}>
              <Text style={s.partyTag}>CLIENTE</Text>
              <Text style={s.partyName}>{f.cliente_nombre}</Text>
              {f.cliente_nif ? <Text style={s.partyLine}>DNI/NIF/CIF: {f.cliente_nif}</Text> : null}
              {f.cliente_direccion ? <Text style={s.partyLine}>{f.cliente_direccion}</Text> : null}
              {f.cliente_cp_ciudad ? <Text style={s.partyLine}>{f.cliente_cp_ciudad}</Text> : null}
              {f.cliente_telefono ? <Text style={s.partyLine}>Tel. {f.cliente_telefono}</Text> : null}
            </View>
          </View>

          <View style={s.table}>
            <View style={s.thead}>
              <Text style={[s.th, s.colDesc]}>DESCRIPCIÓN</Text>
              <Text style={[s.th, s.colNum]}>BASE IMPONIBLE</Text>
              <Text style={[s.th, s.colNum]}>IVA ({f.iva_pct}%)</Text>
              <Text style={[s.th, s.colNum]}>IMPORTE</Text>
            </View>
            {f.lineas.map((l, i) => {
              const iva = Math.round(l.base * (f.iva_pct / 100) * 100) / 100;
              return (
                <View style={s.tr} key={i}>
                  <Text style={[s.td, s.colDesc]}>{l.descripcion}</Text>
                  <Text style={[s.td, s.colNum, s.tdNum]}>{euro(l.base)}</Text>
                  <Text style={[s.td, s.colNum, s.tdNum]}>{euro(iva)}</Text>
                  <Text style={[s.td, s.colNum, s.tdNum]}>{euro(l.base + iva)}</Text>
                </View>
              );
            })}
          </View>

          <View style={s.foot}>
            <View style={s.pay}>
              <Text style={s.payTag}>FORMA DE PAGO</Text>
              <Text style={s.payLine}>Transferencia bancaria al número de cuenta:</Text>
              <Text style={s.iban}>{EMISOR.iban}</Text>
              <View style={s.qrRow}>
                {qrDataUrl ? <Image style={s.qrBox} src={qrDataUrl} /> : null}
                <View>
                  <Text style={s.qrVisit}>VISÍTANOS</Text>
                  <Text style={s.qrUrl}>{EMISOR.web}</Text>
                </View>
              </View>
            </View>
            <View style={s.totals}>
              <View style={s.totLine}><Text style={s.totK}>Subtotal (base)</Text><Text style={s.totV}>{euro(f.base)}</Text></View>
              <View style={s.totLine}><Text style={s.totK}>IVA ({f.iva_pct}%)</Text><Text style={s.totV}>{euro(f.iva_importe)}</Text></View>
              {f.irpf_pct > 0 ? (
                <View style={s.totLine}><Text style={s.totK}>Retención IRPF ({f.irpf_pct}%)</Text><Text style={s.totV}>- {euro(f.irpf_importe)}</Text></View>
              ) : null}
              <View style={s.grand}><Text style={s.grandK}>TOTAL A PAGAR</Text><Text style={s.grandV}>{euro(f.total)}</Text></View>
            </View>
          </View>

          <Text style={s.thanks}>GRACIAS POR SU CONFIANZA</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderFacturaPdf(f: Factura): Promise<Buffer> {
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(`https://${EMISOR.web}`, { margin: 0, width: 160 });
  } catch {
    qrDataUrl = null;
  }
  return renderToBuffer(<FacturaDoc f={f} qrDataUrl={qrDataUrl} />);
}
