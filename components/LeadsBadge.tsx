"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "irm_leads_last_seen";

export function getLastSeen(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function markLeadsSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {}
}

export default function LeadsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const since = getLastSeen();
    const url = since ? `/api/admin/leads-count?since=${encodeURIComponent(since)}` : `/api/admin/leads-count`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setCount(d.total ?? 0))
      .catch(() => {});
  }, []);

  if (count <= 0) return null;

  return <span className="leads-badge">{count > 99 ? "99+" : count}</span>;
}
