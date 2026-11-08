"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { directoryColumns, selectDirectoryRows } from "@/lib/admin-directory.mjs";
export type DirectoryRow = {
  id: string; name: string; email: string; status: string; role: string;
  projectsText: string; isAdmin: boolean;
  projects: { id: string; label: string }[];
};
export function AdminDirectory({ rows }: { rows: DirectoryRow[] }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const filtered: DirectoryRow[] = useMemo(() => selectDirectoryRows(rows, query, filters, sort, direction), [rows, query, filters, sort, direction]);
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 25, currentPage * 25);
  return <>
    <form className="admin-search" onSubmit={event => { event.preventDefault(); setPage(1); }}>
      <label>Cerca per nome, email o progetto<input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} maxLength={254} type="search" /></label>
      <button type="submit">Cerca</button>
      <button type="button" onClick={() => { setQuery(""); setFilters({}); setPage(1); }}>Azzera filtri</button>
    </form>
    <p role="status">{filtered.length} utenti trovati</p>
    <div className="admin-table-scroll"><table className="admin-table">
      <thead><tr>{directoryColumns.map(([key, label]) => <th key={key} scope="col" aria-sort={sort === key ? direction === "asc" ? "ascending" : "descending" : "none"}>
        <button type="button" className="admin-sort" onClick={() => { setSort(key); setDirection(sort === key && direction === "asc" ? "desc" : "asc"); setPage(1); }}>{label}<span aria-hidden="true"> {sort === key ? direction === "asc" ? "↑" : "↓" : "↕"}</span></button>
      </th>)}</tr>
      <tr>{directoryColumns.map(([key, label]) => <td key={key}><input type="search" aria-label={`Filtra ${label}`} placeholder={`Filtra ${label.toLowerCase()}`} value={filters[key] || ""} maxLength={254} onChange={event => { setFilters(previous => ({ ...previous, [key]: event.target.value })); setPage(1); }} /></td>)}</tr></thead>
      <tbody>{visible.map(user => <tr key={user.id}>
        <th scope="row"><Link href={`/admin/${user.id}`}>{user.name}</Link></th>
        <td className="admin-email">{user.email || "Email non presente"}</td>
        <td><span className="badge">{user.status}</span></td><td>{user.role}</td>
        <td>{user.isAdmin && <p>Accesso a tutti i progetti</p>}{user.projects.length ? <ul>{user.projects.map(project => <li key={project.id}><Link href={`/projects/${project.id}`}>{project.label}</Link></li>)}</ul> : !user.isAdmin && "Nessun progetto"}</td>
      </tr>)}</tbody>
    </table></div>
    {!filtered.length && <p>Nessun utente corrisponde ai filtri.</p>}
    <nav className="admin-pagination" aria-label="Pagine utenti"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Precedente</button><span>Pagina {currentPage} di {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Successiva</button></nav>
  </>;
}
