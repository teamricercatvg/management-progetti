"use client";
import { createContext, useContext, useId, useState, type ReactNode } from "react";

const TreeContext = createContext({
  closed: new Set<string>(),
  toggle: (_id: string) => { void _id; },
});

export function FrameworkTreeControls({ branchIds, children }: { branchIds: string[]; children: ReactNode }) {
  const [closed, setClosed] = useState(new Set<string>());
  const toggle = (id: string) => setClosed((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return <TreeContext.Provider value={{ closed, toggle }}>
    <div className="actions tree-toolbar" aria-label="Visualizzazione albero">
      <button type="button" onClick={() => setClosed(new Set())}>Espandi tutto</button>
      <button type="button" onClick={() => setClosed(new Set(branchIds))}>Chiudi tutto</button>
    </div>
    {children}
  </TreeContext.Provider>;
}

export function FrameworkBranch({ id, code, count, summary, children }: {
  id: string; code: string; count: number; summary: ReactNode; children: ReactNode;
}) {
  const { closed, toggle } = useContext(TreeContext);
  const regionId = useId();
  const open = !closed.has(id);
  return <>
    <div className="framework-branch">
      {count > 0 ? <button type="button" className="branch-toggle" aria-expanded={open} aria-controls={regionId}
        aria-label={`${open ? "Chiudi" : "Espandi"} figli di ${code}`} onClick={() => toggle(id)}>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span> {count}
      </button> : null}
      {summary}
    </div>
    <div id={regionId} hidden={!open}>{children}</div>
  </>;
}
