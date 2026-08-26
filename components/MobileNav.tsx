"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "/#catalogo", label: "Catálogo" },
  { href: "/blog", label: "Blog" },
  { href: "/contacto", label: "Contacto" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        className={`mobile-burger ${open ? "mobile-burger-open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
      >
        <span className="mobile-burger-line" />
        <span className="mobile-burger-line" />
        <span className="mobile-burger-line" />
      </button>

      <div
        className={`mobile-overlay ${open ? "mobile-overlay-visible" : ""}`}
        onClick={() => setOpen(false)}
      >
        <nav
          className="mobile-nav-inner"
          onClick={(e) => e.stopPropagation()}
        >
          {links.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              className="mobile-nav-link"
              style={{ transitionDelay: open ? `${80 + i * 60}ms` : "0ms" }}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/#catalogo"
            className="mobile-nav-cta"
            style={{ transitionDelay: open ? `${80 + links.length * 60}ms` : "0ms" }}
            onClick={() => setOpen(false)}
          >
            Ver habitaciones
          </a>
        </nav>
      </div>
    </>
  );
}
