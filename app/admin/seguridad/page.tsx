import { AdminNav } from "../../../components/AdminNav";
import { SeguridadManager } from "./SeguridadManager";

export default function SeguridadPage() {
  return (
    <main className="admin-page">
      <AdminNav active="/admin/seguridad" />
      <div className="admin-content">
        <h1>Seguridad</h1>
        <SeguridadManager />
      </div>
    </main>
  );
}
