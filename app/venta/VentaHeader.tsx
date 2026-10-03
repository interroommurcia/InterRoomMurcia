"use client";

import { useEffect } from "react";

export default function VentaHeader() {
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    header.classList.add("header-transparent");

    const hero = document.querySelector(".venta-hero");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          header.classList.add("header-transparent");
        } else {
          header.classList.remove("header-transparent");
        }
      },
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" }
    );

    observer.observe(hero);
    return () => {
      observer.disconnect();
      header.classList.remove("header-transparent");
    };
  }, []);

  return null;
}
