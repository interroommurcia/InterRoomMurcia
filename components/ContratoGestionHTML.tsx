import type { DatosContratoGestion, Firma } from "../lib/contratos";

// Reutilizamos los MISMOS estilos de ContratoHTML para que ambos
// contratos tengan línea visual idéntica. Si se tocan los estilos del
// otro componente, tocar aquí también.

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
  datos: DatosContratoGestion;
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

function textoComision(datos: DatosContratoGestion): string {
  if (datos.modelo_comision === "manual") {
    return datos.comision_texto.trim() || `${datos.comision_pct} % + IVA`;
  }
  const pct = datos.modelo_comision === "mensual_15" ? 15 : 10;
  return `${pct} % + IVA`;
}

export default function ContratoGestionHTML({
  datos,
  firmaPropietario,
  firmaAgencia,
  showPlaceholders = true,
}: Props) {
  const { propietario, inmueble, agencia, servicios } = datos;
  const show = showPlaceholders;

  const fechaFirmaIso =
    firmaPropietario?.ts || firmaAgencia?.ts || new Date().toISOString();
  const fechaFirma = fmtFechaLarga(fechaFirmaIso);

  const fin = new Date(fechaFirmaIso);
  fin.setMonth(fin.getMonth() + (datos.duracion_meses || 3));
  const fechaFin = fmtFechaLarga(fin.toISOString());

  const comisionTxt = textoComision(datos);

  // Lista de servicios incluidos; solo renderizamos los marcados.
  const serviciosLista: { k: keyof typeof servicios; label: string }[] = [
    { k: "marketing", label: "Publicación y marketing del inmueble (fotografía, portales inmobiliarios, redes sociales y canales propios de La Agencia)." },
    { k: "scoring", label: "Visitas, filtrado y selección del inquilino con análisis de solvencia (verificación de nómina, aval y referencias)." },
    { k: "redaccion_arrendamiento", label: "Redacción y firma del contrato de arrendamiento y, en su caso, gestión de la fianza ante el organismo autonómico correspondiente." },
    { k: "cobro_mensual", label: "Cobro mensual al inquilino, remesa al propietario, mediación en incidencias y coordinación con proveedores de reparaciones 24/7." },
  ];
  const serviciosActivos = serviciosLista.filter((s) => servicios[s.k]);

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

        <div className="contrato-eyebrow">Documento legal · Gestión de alquiler</div>
        <h1 className="contrato-title">Contrato de gestión integral de arrendamiento</h1>
        <div className="contrato-sub">Encargo de intermediación, selección de inquilino y administración mensual</div>

        <div className="contrato-date">
          En Murcia, a <Field value={fechaFirma.dia} show={show} /> de{" "}
          <Field value={fechaFirma.mes} show={show} min={120} /> de{" "}
          <Field value={fechaFirma.anio} show={show} min={60} />.
        </div>

        <h2 className="contrato-h2">Reunidos</h2>
        <p className="contrato-p">
          <strong>De una parte,</strong> D./Dª.{" "}
          <Field value={propietario.nombre} show={show} min={280} />, mayor de edad, con DNI nº{" "}
          <Field value={propietario.dni} show={show} min={120} />
          {(propietario.direccion ?? "").trim() && (
            <>, y domicilio en <Field value={propietario.direccion} show={show} min={300} /></>
          )}
          , en adelante <strong>«El Propietario»</strong>.
        </p>
        <p className="contrato-p">
          <strong>Y de otra parte,</strong> <strong>{agencia.nombre}</strong>
          {(agencia.cif ?? "").trim() && (
            <>, con CIF/NIF nº <Field value={agencia.cif} show={show} min={120} /></>
          )}
          {(agencia.direccion ?? "").trim() && (
            <>, con domicilio profesional en <Field value={agencia.direccion} show={show} min={300} /></>
          )}
          {(agencia.representante ?? "").trim() && (
            <>, representada en este acto por D./Dª. <Field value={agencia.representante} show={show} min={220} /></>
          )}
          , en adelante <strong>«La Agencia»</strong>.
        </p>
        <p className="contrato-p">
          Ambas partes se reconocen mutuamente capacidad legal suficiente para contratar y
        </p>

        <h2 className="contrato-h2">Exponen</h2>
        <p className="contrato-p">
          <strong>I.</strong> Que El Propietario es titular en pleno dominio, o cuenta con facultades suficientes para arrendar, del siguiente inmueble:
        </p>
        <ul className="contrato-prop-list">
          <li className="contrato-prop-item">
            <span className="contrato-prop-label">Dirección</span>
            <span className="contrato-prop-value"><Field value={inmueble.direccion} show={show} /></span>
          </li>
          {(inmueble.referencia_catastral ?? "").trim() && (
            <li className="contrato-prop-item">
              <span className="contrato-prop-label">Ref. catastral</span>
              <span className="contrato-prop-value"><Field value={inmueble.referencia_catastral} show={show} /></span>
            </li>
          )}
          {(inmueble.datos_registrales ?? "").trim() && (
            <li className="contrato-prop-item">
              <span className="contrato-prop-label">Datos registrales</span>
              <span className="contrato-prop-value"><Field value={inmueble.datos_registrales} show={show} /></span>
            </li>
          )}
          {(inmueble.superficie ?? "").trim() && (
            <li className="contrato-prop-item">
              <span className="contrato-prop-label">Superficie</span>
              <span className="contrato-prop-value"><Field value={inmueble.superficie} show={show} /></span>
            </li>
          )}
          {(inmueble.cargas ?? "").trim() && (
            <li className="contrato-prop-item">
              <span className="contrato-prop-label">Cargas</span>
              <span className="contrato-prop-value"><Field value={inmueble.cargas} show={show} /></span>
            </li>
          )}
          {(inmueble.estado_arrendaticio ?? "").trim() && (
            <li className="contrato-prop-item">
              <span className="contrato-prop-label">Estado actual</span>
              <span className="contrato-prop-value"><Field value={inmueble.estado_arrendaticio} show={show} /></span>
            </li>
          )}
        </ul>
        <p className="contrato-p">
          <strong>II.</strong> Que El Propietario desea encomendar a La Agencia la gestión profesional integral del arrendamiento del inmueble descrito.
        </p>
        <p className="contrato-p">
          <strong>III.</strong> Que La Agencia acepta el encargo con sujeción a las siguientes
        </p>

        <h2 className="contrato-h2">Cláusulas</h2>

        <section className="contrato-clause">
          <span className="contrato-clause-num">01</span>
          <div className="contrato-clause-title">Objeto</div>
          <p>El Propietario encarga a La Agencia la mediación, selección de inquilino y gestión mensual del arrendamiento del inmueble descrito en el Expositivo I. La Agencia actúa como intermediaria profesional y mandataria del Propietario para los fines expresamente recogidos en este contrato.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">02</span>
          <div className="contrato-clause-title">
            {datos.modalidad_alquiler === "habitaciones" ? "Modalidad y renta de referencia" : "Renta mensual de referencia"}
          </div>
          {datos.modalidad_alquiler === "habitaciones" ? (
            <>
              <p>El inmueble se gestionará mediante <strong>alquiler por habitaciones</strong>. Los ingresos mensuales variarán en función del número de habitaciones efectivamente ocupadas en cada mes.</p>
              <p>A efectos informativos, los ingresos estimados con el inmueble al 100 % de ocupación ascenderían a <Field value={fmtPrecio(datos.renta_mensual)} show={show} min={120} /> € mensuales. Esta cifra es orientativa y no constituye garantía de ingresos.</p>
            </>
          ) : (
            <p>El inmueble se gestionará mediante <strong>alquiler tradicional de la vivienda completa</strong>. La renta mensual de referencia, acordada por ambas partes como base de la gestión, se fija en <Field value={fmtPrecio(datos.renta_mensual)} show={show} min={120} /> € mensuales.</p>
          )}
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">03</span>
          <div className="contrato-clause-title">Duración</div>
          <p>El presente contrato tendrá una duración inicial de <strong>{datos.duracion_meses || 3} meses</strong>, computados desde la fecha de la firma, finalizando el <Field value={fechaFin.dia} show={show} /> de <Field value={fechaFin.mes} show={show} min={120} /> de <Field value={fechaFin.anio} show={show} min={60} />.</p>
          <p>Si al vencimiento del plazo inicial la vivienda se encontrara ya arrendada mediante gestión de La Agencia, el presente contrato de gestión se prorrogará automáticamente mientras subsista el arrendamiento del inquilino aportado por La Agencia, aplicándose en lo demás las condiciones económicas aquí pactadas.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">04</span>
          <div className="contrato-clause-title">Honorarios de La Agencia</div>
          <p>En concepto de honorarios por la gestión del arrendamiento, La Agencia percibirá <strong>{comisionTxt}</strong> calculado <strong>sobre los ingresos efectivamente percibidos por El Propietario</strong> por el arrendamiento del inmueble en cada mensualidad.</p>
          {datos.modalidad_alquiler === "habitaciones" ? (
            <p>Por tratarse de alquiler por habitaciones, la base de cálculo de cada mes serán los ingresos reales generados por las habitaciones efectivamente ocupadas en ese mes. Las habitaciones vacías no computan a efectos de honorarios.</p>
          ) : (
            <p>Si en una mensualidad El Propietario percibiese, por cualquier causa, ingresos inferiores a la renta de referencia, la base de cálculo será el importe efectivamente cobrado.</p>
          )}
          <p>Si en una mensualidad el inmueble permaneciera totalmente desocupado y El Propietario no percibiera renta alguna, <strong>no se devengarán honorarios por ese mes</strong>. Esta cláusula aplica expresamente, entre otros, a los periodos de vacancia habituales en alquiler estudiantil (típicamente julio y agosto).</p>
          <p><strong>Flujo de pagos:</strong> los inquilinos abonarán la renta mensual directamente a El Propietario, remitiendo justificante de pago a La Agencia para su control. La Agencia no recibe en ningún caso dinero de los inquilinos. Una vez acreditado el cobro, El Propietario abonará a La Agencia los honorarios devengados ese mes, contra la factura emitida por La Agencia.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">05</span>
          <div className="contrato-clause-title">Servicios incluidos</div>
          {serviciosActivos.length > 0 ? (
            <ul>
              {serviciosActivos.map((s) => (
                <li key={s.k}>{s.label}</li>
              ))}
            </ul>
          ) : (
            <p>Los servicios concretos incluidos en la gestión se detallarán por escrito en anexo a este contrato.</p>
          )}
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">06</span>
          <div className="contrato-clause-title">Exclusividad y comercialización paralela</div>
          <p>Durante la vigencia de este contrato, El Propietario se obliga a no encargar la gestión o alquiler del inmueble a ninguna otra agencia, ni a comercializarlo por sí mismo a través de portales inmobiliarios, redes sociales, carteles o cualquier otro medio.</p>
          <p>No obstante, El Propietario podrá formalizar directamente un arrendamiento siempre que de ello no se derive perjuicio alguno para La Agencia; es decir, siempre que La Agencia continúe percibiendo las mensualidades devengadas conforme a la Cláusula 04 sobre la renta que efectivamente se cobre. En otro caso, se estará a lo dispuesto en la Cláusula 09.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">07</span>
          <div className="contrato-clause-title">Obligaciones de La Agencia</div>
          <ul>
            <li>Actuar con la diligencia profesional debida y conforme a las instrucciones del Propietario.</li>
            <li>Seleccionar al inquilino aplicando criterios objetivos de solvencia, informando al Propietario antes de la formalización del contrato de arrendamiento.</li>
            <li>Remitir al Propietario la liquidación mensual con el detalle de la renta cobrada, honorarios descontados e importe neto a transferir.</li>
            <li>Mantener informado al Propietario de cualquier incidencia relevante en el inmueble y de las comunicaciones del inquilino.</li>
            <li>Custodiar y entregar la fianza y demás garantías conforme a la normativa aplicable.</li>
          </ul>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">08</span>
          <div className="contrato-clause-title">Obligaciones de El Propietario</div>
          <ul>
            <li>Entregar la documentación necesaria para arrendar y para gestionar incidencias: nota simple registral actualizada, certificado energético, último recibo de IBI, última factura de los suministros (luz y agua) y copia de la póliza del seguro del hogar.</li>
            <li>Facilitar el acceso al inmueble para las visitas y mantenerlo en condiciones adecuadas para su alquiler.</li>
            <li>Comunicar inmediatamente a La Agencia cualquier oferta, contacto o visita que haya recibido por su cuenta durante la vigencia de este contrato.</li>
            <li>Abonar los gastos de reparación o mantenimiento que, por naturaleza o legislación, correspondan a la propiedad.</li>
            <li>No sustituir ni interferir en la relación de La Agencia con el inquilino aportado durante la vigencia del arrendamiento.</li>
          </ul>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">09</span>
          <div className="contrato-clause-title">Resolución anticipada</div>
          <p>El presente contrato podrá ser resuelto anticipadamente, sin derecho a indemnización, por El Propietario cuando concurra acreditada mala fe o mala praxis profesional por parte de La Agencia, previa comunicación escrita exponiendo los hechos y plazo razonable para su subsanación.</p>
          <p>Fuera de dicho supuesto, cualquiera de las partes podrá resolver el contrato mediante comunicación escrita con preaviso de 30 días naturales, respetándose en todo caso los honorarios devengados hasta la fecha de resolución y aquellos correspondientes al inquilino que estuviera ya instalado en el inmueble por mediación de La Agencia.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">10</span>
          <div className="contrato-clause-title">Inquilinos aportados por La Agencia</div>
          <p>Si, durante la vigencia del contrato o en los <strong>seis (6) meses siguientes a su extinción</strong>, El Propietario formalizase un arrendamiento con un inquilino presentado o puesto en contacto por La Agencia (acreditado mediante hoja de visita firmada o comunicación escrita), se devengarán íntegramente los honorarios pactados en la Cláusula 04 sobre la renta mensual acordada con ese inquilino.</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">11</span>
          <div className="contrato-clause-title">Protección de datos</div>
          <p><strong>Responsable:</strong> La Agencia. <strong>Finalidad:</strong> gestión del encargo de arrendamiento, selección de inquilinos y administración mensual del contrato. <strong>Base jurídica:</strong> ejecución del contrato. <strong>Destinatarios:</strong> portales inmobiliarios, inquilinos seleccionados, proveedores de servicios y organismos públicos competentes en materia de fianzas. <strong>Conservación:</strong> durante la vigencia y plazos legales de prescripción. <strong>Derechos:</strong> acceso, rectificación, supresión, limitación, portabilidad y oposición. Reclamación ante la AEPD (www.aepd.es).</p>
        </section>

        <section className="contrato-clause">
          <span className="contrato-clause-num">12</span>
          <div className="contrato-clause-title">Legislación y jurisdicción</div>
          <p>El presente contrato se rige por la legislación española. Para cualquier controversia derivada de su interpretación o ejecución, las partes se someten a los Juzgados y Tribunales de <strong>Murcia</strong>, con renuncia expresa a cualquier otro fuero.</p>
        </section>

        <div className="contrato-signatures">
          <FirmaRendering firma={firmaPropietario} rol="El Propietario" />
          <FirmaRendering firma={firmaAgencia} rol="La Agencia" />
        </div>

        <footer className="contrato-foot">
          <span>InterRoom Murcia · Agencia inmobiliaria</span>
          <span>Gestión de alquiler</span>
        </footer>
      </article>
    </div>
  );
}
