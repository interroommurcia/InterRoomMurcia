import Link from "next/link";
import { getSesion, type Rol } from "../lib/auth";
import { LogoutButton } from "./LogoutButton";
import LeadsBadge from "./LeadsBadge";
import { BackofficeRecording } from "./BackofficeRecording";

type NavLink = {
  href: string;
  label: string;
  roles: Rol[];
  badge?: "leads";
};

type NavSection = {
  label: string;
  emoji: string;
  items: NavLink[];
};

const TODOS: Rol[] = ["admin", "comercial", "direccion"];
const GESTION: Rol[] = ["admin", "direccion"];
const SOLO_ADMIN: Rol[] = ["admin"];

// Menú agrupado en secciones principales con sus subsecciones siempre
// desplegadas. Pensado para ir anidando más niveles en el futuro.
const SECTIONS: NavSection[] = [
  {
    label: "Inicio",
    emoji: "🏠",
    items: [
      { href: "/admin", label: "Home", roles: TODOS },
      { href: "/admin/propiedades", label: "Propiedades", roles: TODOS },
      { href: "/admin/mesa-trabajo", label: "Mesa de trabajo", roles: TODOS },
    ],
  },
  {
    label: "Marketing",
    emoji: "📣",
    items: [
      { href: "/admin/analytics", label: "Analytics", roles: GESTION },
      { href: "/admin/leads", label: "Leads", roles: TODOS, badge: "leads" },
      { href: "/admin/leads-alquiler", label: "Leads casas", roles: TODOS },
      { href: "/admin/leads-busco-habitacion", label: "Busco Habitación", roles: TODOS },
      { href: "/admin/articulos", label: "Blog", roles: GESTION },
    ],
  },
  {
    label: "Gestión de usuarios",
    emoji: "👥",
    items: [
      { href: "/admin/clientes", label: "Clientes", roles: TODOS },
      { href: "/admin/pisos", label: "Catálogo", roles: TODOS },
      { href: "/admin/chats", label: "Chats", roles: TODOS },
    ],
  },
  {
    label: "Contabilidad",
    emoji: "💶",
    items: [
      { href: "/admin/contabilidad", label: "Contabilidad", roles: GESTION },
      { href: "/admin/facturas", label: "Facturas", roles: GESTION },
      { href: "/admin/documentos", label: "Documentos", roles: TODOS },
    ],
  },
  {
    label: "Administración",
    emoji: "🔒",
    items: [
      { href: "/admin/seguridad", label: "Seguridad", roles: SOLO_ADMIN },
      { href: "/admin/usuarios", label: "Usuarios", roles: SOLO_ADMIN },
    ],
  },
];

export async function AdminNav({ active }: { active: string }) {
  const session = await getSesion();
  const rol = session?.rol ?? "admin"; // fallback para HTTP Basic

  const secciones = SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((it) => it.roles.includes(rol)) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="admin-nav">
      {secciones.map((sec) => (
        <div key={sec.label} className="admin-nav-section">
          <div className="admin-nav-section-title">
            <span className="admin-nav-section-emoji">{sec.emoji}</span>
            {sec.label}
          </div>
          {sec.items.map((item) => (
            <Link key={item.href} href={item.href} className={`admin-nav-item${item.href === active ? " active" : ""}`}>
              {item.label}
              {item.badge === "leads" && <LeadsBadge />}
            </Link>
          ))}
        </div>
      ))}
      {session && (
        <div className="admin-nav-user">
          <span className="admin-nav-name">{session.nombre}</span>
          <LogoutButton />
        </div>
      )}
      {session && <BackofficeRecording rol={session.rol} userId={session.id} nombre={session.nombre} />}
    </div>
  );
}
