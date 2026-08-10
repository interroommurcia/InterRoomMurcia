import Link from "next/link";
import { getSesion, type Rol } from "../lib/auth";
import { LogoutButton } from "./LogoutButton";

type NavItem = {
  href: string;
  label: string;
  roles: Rol[];
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Home", roles: ["admin", "comercial"] },
  { href: "/admin/propiedades", label: "Propiedades", roles: ["admin", "comercial"] },
  { href: "/admin/leads", label: "Leads", roles: ["admin", "comercial"] },
  { href: "/admin/pisos", label: "Catálogo", roles: ["admin", "comercial"] },
  { href: "/admin/clientes", label: "Clientes", roles: ["admin", "comercial"] },
  { href: "/admin/mesa-trabajo", label: "Mesa de trabajo", roles: ["admin", "comercial"] },
  { href: "/admin/chats", label: "Chats", roles: ["admin", "comercial"] },
  { href: "/admin/contabilidad", label: "Contabilidad", roles: ["admin"] },
  { href: "/admin/articulos", label: "Artículos", roles: ["admin"] },
  { href: "/admin/analytics", label: "Analytics", roles: ["admin"] },
  { href: "/admin/usuarios", label: "Usuarios", roles: ["admin"] },
];

export async function AdminNav({ active }: { active: string }) {
  const session = await getSesion();
  const rol = session?.rol ?? "admin"; // fallback para HTTP Basic

  const visibles = ITEMS.filter((item) => item.roles.includes(rol));

  return (
    <div className="admin-nav">
      {visibles.map((item) => (
        <Link key={item.href} href={item.href} className={`admin-nav-item${item.href === active ? " active" : ""}`}>
          {item.label}
        </Link>
      ))}
      {session && (
        <div className="admin-nav-user">
          <span className="admin-nav-name">{session.nombre}</span>
          <LogoutButton />
        </div>
      )}
    </div>
  );
}
