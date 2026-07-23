import Link from "next/link";

const ITEMS = [
  { href: "/admin", label: "Leads" },
  { href: "/admin/pisos", label: "Catálogo" },
  { href: "/admin/articulos", label: "Artículos" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/chats", label: "Chats" },
] as const;

export function AdminNav({ active }: { active: (typeof ITEMS)[number]["href"] }) {
  return (
    <div className="admin-nav">
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={`admin-nav-item${item.href === active ? " active" : ""}`}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
