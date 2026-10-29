import { AdminNav } from "../../../components/AdminNav";
import { SeguridadManager } from "./SeguridadManager";

export default function SeguridadPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/seguridad" />
        <div className="section-head">
          <h2>Seguridad</h2>
          <p>Monitor de accesos y amenazas en tiempo real.</p>
        </div>
        <SeguridadManager />
      </div>
    </section>
  );
}
