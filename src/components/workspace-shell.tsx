"use client";
import { useState, type ReactNode } from "react";
import { UiIcon } from "@/components/ui-icon";
export function WorkspaceShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <div className={`workspace ${expanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
    <a className="skip-link" href="#content">Vai al contenuto</a>
    <aside className="sidebar">
      <button type="button" className="sidebar-toggle" aria-label={expanded ? "Comprimi menu" : "Espandi menu"} title={expanded ? "Comprimi menu" : "Espandi menu"} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><UiIcon name="menu" /></button>
      {sidebar}
    </aside>
    {children}
  </div>;
}
