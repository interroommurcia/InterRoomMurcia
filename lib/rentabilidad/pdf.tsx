import React from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { calcularRentabilidad, fmtEuro, fmtPct, type EntradaRentabilidad, type ResultadoRentabilidad } from "./calculo";

// Mismo diseño que el PDF de /rentabilidad/express, generado en servidor (Gladis → Telegram).
// Fuentes estándar (Helvetica): usar "-" en vez de "−" (no está en WinAnsi).

const ORANGE = "#ea6a12";
const ORANGE_DARK = "#c2410c";
const PAPER = "#fff4ea";
const INK = "#1a1a1a";
const INK_SOFT = "#4b4b4b";
const LINE = "#e5e5e5";
const NEG = "#b91c1c";

const s = StyleSheet.create({
  page: { backgroundColor: "#fff", color: INK, fontFamily: "Helvetica", fontSize: 10 },
  head: {
    backgroundColor: INK, paddingVertical: 22, paddingHorizontal: 36, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center", borderBottomWidth: 5, borderBottomColor: ORANGE,
  },
  logo: { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#fff" },
  logoAcc: { color: ORANGE },
  tag: { fontSize: 8, color: "#bdbdbd", marginTop: 5 },
  doc: { fontSize: 8, letterSpacing: 1.5, color: ORANGE, fontFamily: "Helvetica-Bold", textAlign: "right" },
  date: { fontSize: 9, color: "#d4d4d4", marginTop: 3, textAlign: "right" },

  body: { paddingHorizontal: 36, paddingTop: 22, flexGrow: 1 },
  title: { fontSize: 19, fontFamily: "Helvetica-Bold", marginBottom: 14 },
  titleAcc: { color: ORANGE },

  data: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginBottom: 10 },
  dataItem: { width: "33.333%", paddingHorizontal: 4, marginBottom: 8 },
  dataBox: { backgroundColor: PAPER, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  dataK: { fontSize: 6.5, letterSpacing: 0.8, color: INK_SOFT, fontFamily: "Helvetica-Bold" },
  dataV: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3 },

  hero: {
    backgroundColor: ORANGE_DARK, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 22,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12,
  },
  heroK: { fontSize: 7.5, letterSpacing: 1, color: "#fff", fontFamily: "Helvetica-Bold" },
  heroV: { fontSize: 34, fontFamily: "Helvetica-Bold", color: "#fff", marginTop: 6 },
  heroV2: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#fff", marginTop: 4, textAlign: "right" },
  heroPct: { fontSize: 8, color: "#fff", fontFamily: "Helvetica-Bold", marginTop: 6, textAlign: "right" },

  box: { borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 12 },
  boxH: { fontSize: 7.5, letterSpacing: 1, color: ORANGE_DARK, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  rowL: { fontSize: 9.5, color: INK_SOFT },
  rowR: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  rowNeg: { color: NEG },
  rowTot: { borderTopWidth: 1, borderTopColor: LINE, marginTop: 4, paddingTop: 6 },
  rowTotTxt: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: INK },

  prop: { backgroundColor: PAPER, borderLeftWidth: 3, borderLeftColor: ORANGE, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  propP: { fontSize: 8.5, lineHeight: 1.5, color: "#333", marginBottom: 5 },
  b: { fontFamily: "Helvetica-Bold", color: INK },

  reforma: {
    marginTop: "auto", flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
  },
  reformaT: { flex: 1, fontSize: 11, color: "#fff", lineHeight: 1.3, paddingRight: 12 },
  reformaB: { fontFamily: "Helvetica-Bold" },
  reformaS: { backgroundColor: "#fff", color: ORANGE_DARK, fontFamily: "Helvetica-Bold", fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  ctas: { flexDirection: "row", marginTop: 10, marginBottom: 14 },
  cta: { flex: 1, backgroundColor: INK, borderRadius: 12, padding: 14 },
  ctaAlt: { backgroundColor: PAPER, borderWidth: 1.2, borderColor: ORANGE, marginLeft: 10 },
  ctaT: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#fff", lineHeight: 1.3 },
  ctaTAlt: { color: INK },
  ctaAcc: { color: ORANGE },
  ctaS: { fontSize: 8.5, color: "#e5e5e5", marginTop: 5 },
  ctaSAlt: { color: INK_SOFT },

  foot: { marginHorizontal: 36, borderTopWidth: 1, borderTopColor: LINE, paddingVertical: 10, textAlign: "center", fontSize: 8, color: INK_SOFT },
});

function Row({ l, r, neg, total }: { l: string; r: string; neg?: boolean; total?: boolean }) {
  return (
    <View style={total ? [s.row, s.rowTot] : s.row}>
      <Text style={total ? s.rowTotTxt : s.rowL}>{l}</Text>
      <Text style={total ? s.rowTotTxt : neg ? [s.rowR, s.rowNeg] : s.rowR}>{r}</Text>
    </View>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.dataItem}>
      <View style={s.dataBox}>
        <Text style={s.dataK}>{k.toUpperCase()}</Text>
        <Text style={s.dataV}>{v}</Text>
      </View>
    </View>
  );
}

function InformeDoc({ c, fecha }: { c: ResultadoRentabilidad; fecha: string }) {
  const f = fmtEuro;
  return (
    <Document title="Informe de rentabilidad · InterRoom Murcia" author="InterRoom Murcia">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.logo}>
              Inter<Text style={s.logoAcc}>Room</Text> Murcia
            </Text>
            <Text style={s.tag}>Gestión inmobiliaria integral en Murcia y Cartagena</Text>
          </View>
          <View>
            <Text style={s.doc}>INFORME DE RENTABILIDAD</Text>
            <Text style={s.date}>{fecha}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.title}>
            Lo que te deja tu piso alquilado <Text style={s.titleAcc}>por habitaciones</Text>.
          </Text>

          <View style={s.data}>
            <Dato k="Habitaciones" v={String(c.N)} />
            <Dato k="Precio por habitación" v={`${f(c.Rh)} al mes`} />
            <Dato k="Meses alquilados" v={`${c.Mh} al año`} />
            <Dato k="Limpieza" v={c.conLimpieza ? `${f(c.Cl)} al mes` : "No incluida"} />
            <Dato k="Suministros + wifi" v={c.conSuministros ? `${f(c.Gf)} al mes` : "Los paga el inquilino"} />
            {c.Vp > 0 ? <Dato k="Valor del piso" v={f(c.Vp)} /> : null}
          </View>

          <View style={s.hero}>
            <View>
              <Text style={s.heroK}>NETO PARA TI CADA MES</Text>
              <Text style={s.heroV}>{f(c.neto)}</Text>
            </View>
            <View>
              <Text style={[s.heroK, { textAlign: "right" }]}>NETO ANUAL ({c.Mh} MESES)</Text>
              <Text style={s.heroV2}>{f(c.anual)}</Text>
              {c.rentNeta !== null ? <Text style={s.heroPct}>Rentabilidad neta {fmtPct(c.rentNeta)}</Text> : null}
            </View>
          </View>

          <View style={s.box}>
            <Text style={s.boxH}>DESGLOSE MENSUAL</Text>
            <Row l={`Ingreso bruto (${c.N} × ${f(c.Rh)})`} r={f(c.bruto)} />
            <Row l="Comisión InterRoom (15% + IVA)" r={`-${f(c.com)}`} neg />
            {c.conLimpieza ? <Row l="Limpieza" r={`-${f(c.Cl)}`} neg /> : null}
            {c.conSuministros ? <Row l="Suministros + wifi" r={`-${f(c.Gf)}`} neg /> : null}
            <Row l="Neto mensual" r={f(c.neto)} total />
            {c.rentBruta !== null ? <Row l="Rentabilidad bruta anual" r={fmtPct(c.rentBruta)} /> : null}
            {c.rentNeta !== null ? <Row l="Rentabilidad neta anual" r={fmtPct(c.rentNeta)} total /> : null}
          </View>

          <View style={s.prop}>
            <Text style={s.boxH}>PROPUESTA ECONÓMICA</Text>
            <Text style={s.propP}>
              <Text style={s.b}>Honorarios: 15 % + IVA</Text> sobre las rentas de alquiler, excluidos los suministros.
              Corresponde a la gestión integral del alquiler por habitaciones. Con los datos de este informe:{" "}
              <Text style={s.b}>{f(c.com)} al mes</Text> (15 % + IVA de {f(c.bruto)}).
            </Text>
            <Text style={[s.propP, { marginBottom: 0 }]}>
              <Text style={s.b}>Suministros:</Text> se fija una cuota mensual adicional a la renta de cada habitación. Si
              el consumo supera el importe previsto, regularizamos la diferencia con los inquilinos según lo pactado en
              sus contratos. Esta gestión la hacemos nosotros y los suministros no forman parte de la base de cálculo de
              nuestros honorarios.
            </Text>
          </View>

          <View style={s.reforma}>
            <Text style={s.reformaT}>
              Aprovecha nuestra <Text style={s.reformaB}>Integración 360</Text> y pídenos presupuesto para tu reforma
            </Text>
            <Text style={s.reformaS}>interroommurcia@gmail.com</Text>
          </View>

          <View style={s.ctas}>
            <View style={s.cta}>
              <Text style={s.ctaT}>
                ¿Hablamos de <Text style={s.ctaAcc}>tu piso concreto</Text>?
              </Text>
              <Text style={s.ctaS}>Valoración gratis en 48 h · WhatsApp 613 096 518</Text>
            </View>
            <View style={[s.cta, s.ctaAlt]}>
              <Text style={[s.ctaT, s.ctaTAlt]}>
                Vendemos tu casa por solo el <Text style={s.ctaAcc}>1,5% de comisión</Text>
              </Text>
              <Text style={[s.ctaS, s.ctaSAlt]}>¡Llámanos! 613 096 518</Text>
            </View>
          </View>
        </View>

        <Text style={s.foot}>
          InterRoom Murcia · interroommurcia.com · interroommurcia@gmail.com · 613 096 518
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInformeRentabilidadPdf(
  entrada: EntradaRentabilidad
): Promise<{ buffer: Buffer; resultado: ResultadoRentabilidad }> {
  const resultado = calcularRentabilidad(entrada);
  const fecha = new Date().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
  const buffer = await renderToBuffer(<InformeDoc c={resultado} fecha={fecha} />);
  return { buffer, resultado };
}
