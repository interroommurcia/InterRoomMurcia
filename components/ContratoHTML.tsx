import type { DatosContratoExclusiva, Firma } from "../lib/contratos";

// -----------------------------------------------------------------
// CSS self-contained para que el componente funcione igual en el
// preview admin, la página de firma pública y el renderizado a PDF
// (donde no hay sistema de módulos CSS: necesitamos HTML+estilos
// embebidos para que Chromium lo pinte igual).
// -----------------------------------------------------------------

const CSS = `
.contrato-canvas{background:#f4f4f1;min-height:100vh;padding:36px 16px 80px;color:#1a1a1a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.contrato-paper{max-width:820px;margin:0 auto;background:#fff;padding:72px 88px 64px;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 20px 60px rgba(0,0,0,0.06);font-weight:300;font-size:10.5pt;line-height:1.65}
.contrato-brand{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #ea6a12;padding-bottom:14px;margin-bottom:56px}
.contrato-brand-name{font-weight:600;font-size:15pt;letter-spacing:-0.015em}
.contrato-brand-accent{color:#ea6a12;font-weight:600}
.contrato-brand-meta{font-size:8.5pt;font-weight:400;color:#666;letter-spacing:0.18em;text-transform:uppercase}
.contrato-eyebrow{font-size:8pt;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:#ea6a12;margin-bottom:14px}
.contrato-title{font-size:22pt;font-weight:300;letter-spacing:-0.02em;line-height:1.15;margin:0 0 10px}
.contrato-sub{font-size:10pt;font-weight:400;color:#666;letter-spacing:0.04em;margin-bottom:40px}
.contrato-date{font-size:10pt;margin-bottom:48px;padding-bottom:20px;border-bottom:1px solid #e5e5e5}
.contrato-h2{font-size:8.5pt;font-weight:500;letter-spacing:0.26em;text-transform:uppercase;margin:44px 0 20px;padding-bottom:10px;border-bottom:1px solid #e5e5e5}
.contrato-p{margin:0 0 10px;font-weight:300}
.contrato-p strong{font-weight:500}
.contrato-prop-list{list-style:none;padding:0;margin:16px 0}
.contrato-prop-item{display:flex;padding:8px 0;border-bottom:1px dashed #e5e5e5;font-weight:300;align-items:baseline;gap:10px}
.contrato-prop-label{min-width:170px;font-weight:400;color:#666;font-size:8.5pt;letter-spacing:0.08em;text-transform:uppercase}
.contrato-prop-value{flex:1}
.contrato-clause{position:relative;margin-bottom:32px}
.contrato-clause-num{position:absolute;left:-62px;top:0;font-size:8.5pt;font-weight:400;color:#ea6a12;letter-spacing:0.08em}
.contrato-clause-title{font-size:9pt;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:12px}
.contrato-clause p{margin:0 0 9px}
.contrato-clause ul{margin:10px 0 10px 20px}
.contrato-clause li{margin-bottom:5px;font-weight:300}
.contrato-inline{display:inline-block;padding:0 4px;font-weight:400;border-bottom:1px solid #1a1a1a}
.contrato-placeholder{display:inline-block;min-width:90px;padding:0 6px;border-bottom:1px solid #1a1a1a;color:transparent;user-select:none}
.contrato-placeholder::before{content:'\\00a0'}
.contrato-signatures{display:grid;grid-template-columns:1fr 1fr;gap:72px;margin-top:80px}
.contrato-sig-box{border-top:1px solid #1a1a1a;padding-top:12px;font-size:8.5pt;font-weight:500;letter-spacing:0.18em;text-transform:uppercase}
.contrato-sig-image{display:block;max-width:100%;max-height:90px;margin:12px 0 8px}
.contrato-sig-typed{font-family:'Caveat','Brush Script MT',cursive;font-size:24pt;color:#1a1a1a;margin:12px 0 4px;line-height:1}
.contrato-sig-meta{display:block;margin-top:10px;font-size:8pt;font-weight:400;color:#999;letter-spacing:0.1em;text-transform:uppercase}
.contrato-sig-meta strong{display:block;color:#1a1a1a;font-weight:500;font-size:9pt;letter-spacing:0.08em;text-transform:none;margin-top:2px}
.contrato-foot{margin-top:56px;padding-top:20px;border-top:1px solid #e5e5e5;font-size:7.5pt;font-weight:400;color:#999;letter-spacing:0.18em;text-transform:uppercase;display:flex;justify-content:space-between}
@media (max-width:760px){.contrato-canvas{padding:16px 0 60px}.contrato-paper{padding:36px 24px 48px;box-shadow:none}.contrato-clause-num{position:static;display:block;margin-bottom:6px}.contrato-signatures{grid-template-columns:1fr;gap:48px}.contrato-brand{flex-direction:column;gap:8px;align-items:flex-start}.contrato-prop-item{flex-direction:column;align-items:stretch;gap:4px}.contrato-prop-label{min-width:0}}
@media print{.contrato-canvas{background:#fff;padding:0}.contrato-paper{box-shadow:none;padding:0;max-width:100%;font-size:10pt}.contrato-brand{margin-bottom:32px}.contrato-clause{page-break-inside:avoid;margin-bottom:24px}.contrato-signatures{page-break-inside:avoid;margin-top:48px}@page{size:A4;margin:20mm 22mm}}
`;

type Props = {
  datos: DatosContratoExclusiva;
  firmaPropietario?: Firma | null;
  firmaAgencia?: Firma | null;
  showPlaceholders?: boolean;
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function fmtFechaLarga(iso?: string | null): { dia: string; mes: string; anio: string } {
  if (!iso) return { dia: "", mes: "", anio: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { dia: "", mes: "", anio: "" };
  return {
    dia: String(d.getDate()),
    mes: MESES[d.getMonth()] ?? "",
    anio: String(d.getFullYear()),
  };
}

function fmtPrecio(n: number): string {
  if (!n || isNaN(n)) return "";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function Field({ value, show, min }: { value?: string; show?: boolean; min?: number }) {
  const v = (value ?? "").trim();
  if (v) return <span className="contrato-inline">{v}</span>;
  if (show === false) return <span>&nbsp;</span>;
  return <span className="contrato-placeholder" style={min ? { minWidth: min } : undefined} />;
}

function FirmaRendering({
  firma,
  rol,
}: {
  firma: Firma | null | undefined;
  rol: "El Propietario" | "La Agencia";
}) {
  if (!firma) {
    return (
      <div className="contrato-sig-box">
        {rol}
        <span className="contrato-sig-meta">Pendiente de firma</span>
      </div>
    );
  }
  const fecha = new Date(firma.ts).toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <div className="contrato-sig-box">
      {rol}
      {firma.mode === "draw" && firma.dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="contrato-sig-image" src={firma.dataUrl} alt={`Firma de ${rol}`} />
      ) : (
        <div className="contrato-sig-typed">{firma.nombre_tipeado || firma.nombre}</div>
      )}
      <span className="contrato-sig-meta">
        <strong>{firma.nombre}</strong>
        DNI/CIF: {firma.dni}
        <br />
        Firmado el {fecha}
      </span>
    </div>
  );
}

export default function ContratoHTML({
  datos,
  firmaPropietario,
  firmaAgencia,
  showPlaceholders = true,
}: Props) {
  const { propietario, inmueble, agencia } = datos;
  const show = showPlaceholders;

  const fechaFirmaIso =
    firmaPropietario?.ts || firmaAgencia?.ts || new Date().toISOString();
  const fechaFirma = fmtFechaLarga(fechaFirmaIso);

  const fin = new Date(fechaFirmaIso);
  fin.setMonth(fin.getMonth() + (datos.duracion_meses || 4));
  const fechaFin = fmtFechaLarga(fin.toISOString());

  return (
    <div className="contrato-canvas">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <article className="contrato-paper">
        <header className="contrato-brand">
          <div className="contrato-brand-name">
            Inter<span className="contrato-brand-accent">Room</span> Murcia
          </div>
          <div className="contrato-brand-meta">Agencia inmobiliaria · Murcia</div>
        </header>

        <div className="contrato-eyebrow">Documento legal · Encargo de exclusiva</div>
        <h1 className="contrato-title">Contrato de encargo de venta en exclusiva</h1>
        <div className="contrato-sub">Compraventa de inmueble residencial</div>

        <div className="contrato-date">
          En Murcia, a <Field value={fechaFirma.dia} show={show} /> de{" "}
          <Field value={fechaFirma.mes} show={show} min={120} /> de{" "}
          <Field value={fechaFirma.anio} show={show} min={60} />.
        </div>

        <h2 className="contrato-h2">Reunidos</h2>
        <p className="contrato-p">
          <strong>De una parte,</strong> D./Dª.{" "}
          <Field value={propietario.nombre} show={show} min={280} />, mayor de edad, con DNI nº{" "}
          <Field value={propietario.dni} show={show} min={120} />, y domicilio en{" "}
          <Field value={propietario.direccion} show={show} min={300} />, en adelante{" "}
          <strong>«El Propietario»</strong>.
        </p>
        <p className="contrato-p">
          <strong>Y de otra parte,</strong> <strong>{agencia.nombre}</strong>, con CIF/NIF nº{" "}
          <Field value={agencia.cif} show={show} min={120} />, con domicilio profesional en{" "}
          <Field value={agencia.direccion} show={show} min={300} />, representada en este acto por
          D./Dª. <Field value={agencia.representante} show={show} min={220} />, en adelante{" "}
          <strong>«La Agencia»</strong>.
        </p>
        <p className="contrato-p">
          Ambas partes se reconocen mutuamente capacidad legal suficiente para contratar y
        </p>

        <h2 className="contrato-h2">Exponen</h2>
        <p className="contrato-p">
          <strong>I.</strong> Que El Propietario es dueño en pleno dominio del siguiente inmueble:
        </p>
        <ul className="contrato-prop-list">
          <li className="contrato-prop-item">
            <span className="contrato-prop-label">Dirección</span>
            <span className="contrato-prop-value"><Field value={inmueble.direccion} show={show} /></span>
          </li>
          <li className="contrato-prop-item">
            <span className="contrato-prop-label">Ref. catastral</span>
            <span className="contrato-prop-value"><Field value={inmueble.referencia_catastral} show={show} /></span>
          </li>
          <li className="contrato-prop-item">
            <span className="contrato-prop-label">Datos registrales</span>
            <span className="contrato-prop-value"><Field value={inmueble.datos_registrales} show={show} /></span>
          </li>
          <li className="contrato-prop-item">
            <span className="contrato-prop-label">Superficie</span>
            <span className="contrato-prop-value"><Field value={inmueble.superficie} show={show} /></span>
          </li>
          <li className="contrato-prop-item">
            <span className="contrato-prop-label">Cargas</span>
            <span className="contrato-prop-value"><Field value={inmueble.cargas} show={show} /></span>
          </li>
          <li className="contrato-prop-item">
            <span className="contrato-prop-label">Arrendamiento</span>
            <span className="contrato-prop-value"><Field value={inmueble.estado_arrendaticio} show={show} /></span>
          </li>
        </ul>
        <p className="contrato-p">
          <strong>II.</strong> Que El Propietario desea encomendar a La Agencia la gestión
          profesional para la venta del inmueble descrito, en régimen de exclusiva.
        </p>
        <p className="contrato-p">
          <strong>III.</strong> Que La Agencia acepta el encargo, sujeto a las siguientes
        </p>

        <h2 className="contrato-h2">Cláusulas</h2>

        <section className="contrato-clause">
          <span className="contrato-clause-num">01</span>
          <div className="contrato-clause-title">Objeto</div>
          <p>El Propietario encarga a La Agencia, con carácter de <strong>exclusiva</strong>, la mediación y gestión profesional dirigida a la venta del inmueble descrito en el Expositivo I.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">02</span>
          <div className="contrato-clause-title">Precio de venta</div>
          <p>El precio de salida se fija en <Field value={fmtPrecio(datos.precio_venta)} show={show} min={140} /> €. Cualquier modificación posterior requerirá acuerdo por escrito mediante anexo a este contrato.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">03</span>
          <div className="contrato-clause-title">Duración y exclusividad</div>
          <p>El presente encargo tendrá una duración de <strong>{datos.duracion_meses || 4} meses</strong>, computados desde la fecha de la firma, finalizando el <Field value={fechaFin.dia} show={show} /> de <Field value={fechaFin.mes} show={show} min={120} /> de <Field value={fechaFin.anio} show={show} min={60} />.</p>
          <p>Durante dicho plazo, El Propietario se obliga a no encargar la venta del inmueble a ninguna otra persona física o jurídica, ni a ofrecerlo directamente al público por sí mismo a través de portales inmobiliarios, redes sociales, carteles o cualquier otro medio.</p>
          <p>Llegado el vencimiento, el encargo se extinguirá automáticamente salvo acuerdo expreso y por escrito de prórroga. No se admitirá prórroga tácita.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">04</span>
          <div className="contrato-clause-title">Honorarios</div>
          <p>La Agencia percibirá una cantidad equivalente al <strong>{datos.comision_pct} %</strong> del precio final de venta, más el IVA legalmente aplicable.</p>
          <p>Los honorarios se devengarán en el momento de la firma del contrato privado de compraventa (arras o similar) y serán abonados íntegramente a la firma de la escritura pública ante Notario, mediante cheque bancario o transferencia a la cuenta designada por La Agencia.</p>
          <p>No se devengarán honorarios si la operación de compraventa no llega a perfeccionarse por causa no imputable a El Propietario.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">05</span>
          <div className="contrato-clause-title">Obligaciones de La Agencia</div>
          <ul>
            <li>Reportaje fotográfico profesional y, en su caso, vídeo y tour virtual.</li>
            <li>Publicación y promoción en los principales portales inmobiliarios, redes sociales y canales propios.</li>
            <li>Filtrado de interesados, concertación y acompañamiento de visitas.</li>
            <li>Negociación con posibles compradores bajo las instrucciones de El Propietario.</li>
            <li>Asesoramiento en los trámites hasta la firma de escritura.</li>
            <li>Informe de actividad mensual con visitas realizadas y ofertas recibidas.</li>
          </ul>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">06</span>
          <div className="contrato-clause-title">Obligaciones de El Propietario</div>
          <ul>
            <li>Entregar: nota simple registral actualizada, certificado energético, último recibo de IBI, cédula de habitabilidad, estatutos y certificado de la comunidad, planos e ITE si procede.</li>
            <li>Facilitar el acceso al inmueble para las visitas de forma razonable.</li>
            <li>Comunicar inmediatamente a La Agencia cualquier oferta o contacto directo recibido durante la vigencia del contrato.</li>
            <li>No negociar directamente con compradores presentados por La Agencia sin su conocimiento.</li>
            <li>Mantener la vivienda en el estado y presentación adecuados para su comercialización.</li>
          </ul>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">07</span>
          <div className="contrato-clause-title">Compradores presentados por La Agencia</div>
          <p>Si, durante la vigencia del contrato o en los <strong>seis (6) meses siguientes a su extinción</strong>, El Propietario formalizase la venta a un comprador presentado o puesto en contacto por La Agencia (acreditado mediante hoja de visita firmada o comunicación escrita), se devengarán íntegramente los honorarios pactados en la Cláusula 04.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">08</span>
          <div className="contrato-clause-title">Incumplimiento de la exclusiva</div>
          <p>En caso de que El Propietario venda el inmueble durante la vigencia de la exclusiva a través de otra agencia o por sus propios medios, deberá indemnizar a La Agencia por los gastos efectivamente incurridos y acreditados en la promoción del inmueble, con un <strong>límite máximo del {datos.penalizacion_pct} %</strong> de los honorarios pactados en la Cláusula 04. Esta cantidad sustituye y no se acumula con los honorarios ordinarios.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">09</span>
          <div className="contrato-clause-title">Resolución anticipada</div>
          <p>Cualquiera de las partes podrá resolver el contrato anticipadamente mediante comunicación escrita con <strong>preaviso de 15 días</strong>, cuando concurra incumplimiento grave de las obligaciones de la otra parte y éste no sea subsanado en dicho plazo tras requerimiento fehaciente.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">10</span>
          <div className="contrato-clause-title">Protección de datos</div>
          <p><strong>Responsable:</strong> La Agencia. <strong>Finalidad:</strong> gestión del encargo y comercialización del inmueble. <strong>Base jurídica:</strong> ejecución del contrato. <strong>Destinatarios:</strong> portales inmobiliarios, agencias colaboradoras, notaría y entidades financieras. <strong>Conservación:</strong> durante la vigencia y plazos legales de prescripción. <strong>Derechos:</strong> acceso, rectificación, supresión, limitación, portabilidad y oposición. Reclamación ante la AEPD (www.aepd.es).</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">11</span>
          <div className="contrato-clause-title">Legislación y jurisdicción</div>
          <p>El presente contrato se rige por la legislación española. Para cualquier controversia, las partes se someten a los Juzgados y Tribunales de <strong>Murcia</strong>, con renuncia expresa a cualquier otro fuero.</p>
        </section>

        <div className="contrato-signatures">
          <FirmaRendering firma={firmaPropietario} rol="El Propietario" />
          <FirmaRendering firma={firmaAgencia} rol="La Agencia" />
        </div>

        <footer className="contrato-foot">
          <span>InterRoom Murcia · Agencia inmobiliaria</span>
          <span>Encargo exclusiva</span>
        </footer>
      </article>
    </div>
  );
}
