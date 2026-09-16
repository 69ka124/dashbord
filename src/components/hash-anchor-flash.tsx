"use client";

import { useEffect } from "react";

export function HashAnchorFlash() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const target = document.querySelector(hash);
    if (!(target instanceof HTMLElement)) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add("search-flash");
    const timer = window.setTimeout(() => target.classList.remove("search-flash"), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
