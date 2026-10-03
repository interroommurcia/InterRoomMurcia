"use client";

import { useEffect, useState } from "react";

export default function StickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const formEl = document.getElementById("lead-form");
      if (!formEl) {
        setShow(window.scrollY > 600);
        return;
      }
      const rect = formEl.getBoundingClientRect();
      setShow(window.scrollY > 600 && rect.top > window.innerHeight);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`sticky-cta ${show ? "sticky-cta--visible" : ""}`}>
      <div className="sticky-cta-inner">
        <span className="sticky-cta-text">
          <strong>1,5% + IVA</strong> · Sin permanencia · Valoración gratuita
        </span>
        <a href="#lead-form" className="btn-primary sticky-cta-btn">
          Pedir valoración
        </a>
      </div>
    </div>
  );
}
