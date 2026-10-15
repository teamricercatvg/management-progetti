import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/project-data";
import { getFramework, type FrameworkItem } from "@/lib/framework-data";
import { frameworkTypes } from "@/lib/framework.mjs";
import { FrameworkForm, FrameworkStatus } from "@/components/framework-form";
export const metadata = { title: "Quadro logico" };
export default async function FrameworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { project, client } = await getProject((await params).id);
  const [items, search] = await Promise.all([
    getFramework(client, project.id),
    searchParams,
  ]);
  const base = `/projects/${project.id}/quadro-logico`;
  const readOnly = project.status === "archived";
  const editing =
    typeof search.edit === "string"
      ? items.find((i) => i.id === search.edit)
      : undefined;
  if (search.edit && !editing) notFound();
  const showForm =
    !readOnly &&
    (search.new === "1" || (editing && editing.status === "active"));
  const children = new Map<string | null, FrameworkItem[]>();
  for (const item of items)
    children.set(item.parent_id, [
      ...(children.get(item.parent_id) ?? []),
      item,
    ]);
  function tree(parent: string | null, depth = 0) {
    if (depth > 2 || !children.has(parent)) return null;
    return (
      <ol className="framework-tree">
        {children.get(parent)!.map((item) => (
          <li key={item.id}>
            <article className="framework-item">
              <p className="eyebrow">
                {frameworkTypes[item.type as keyof typeof frameworkTypes]} ·
                Ordine {item.sort_order}
              </p>
              <h2>
                {item.code} — {item.title}
              </h2>
              {item.status === "archived" ? (
                <span className="badge">Archiviato</span>
              ) : null}
              {item.description ? (
                <p className="prose-text">{item.description}</p>
              ) : null}
              {item.assumptions ? (
                <div>
                  <strong>Ipotesi e condizioni</strong>
                  <p className="prose-text">{item.assumptions}</p>
                </div>
              ) : null}
              {!readOnly ? (
                <div className="actions">
                  {item.status === "active" ? (
                    <Link href={`${base}?edit=${item.id}`}>
                      Modifica {item.code}
                    </Link>
                  ) : null}
                  <FrameworkStatus
                    projectId={project.id}
                    item={{
                      id: item.id,
                      status: item.status,
                      row_version: item.row_version,
                    }}
                  />
                </div>
              ) : null}
            </article>
            {tree(item.id, depth + 1)}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <>
      <div className="page-heading">
        <Link href={`/projects/${project.id}`}>
          ← {project.code} · Dettaglio progetto
        </Link>
        <h1>Quadro logico</h1>
        <p>{project.title}</p>
        <p>Obiettivi generali → obiettivi specifici → risultati attesi.</p>
      </div>
      {readOnly ? (
        <p className="notice">
          Progetto archiviato: quadro logico in sola lettura.
        </p>
      ) : (
        <p>
          Per archiviare un elemento, archivia prima i figli attivi. Per
          riattivarlo, riattiva prima il genitore. Gli elementi archiviati
          restano visibili.
        </p>
      )}
      {search.saved === "1" ? (
        <p role="status" className="notice">
          Elemento salvato.
        </p>
      ) : null}
      {showForm ? (
        <section className="admin-card">
          <FrameworkForm
            key={editing?.id ?? "new"}
            projectId={project.id}
            item={editing}
            parents={items.map(({ id, type, code, title, status }) => ({
              id,
              type,
              code,
              title,
              status,
            }))}
          />
        </section>
      ) : !readOnly ? (
        <div className="actions">
          <Link className="button-link" href={`${base}?new=1`}>
            Aggiungi elemento
          </Link>
        </div>
      ) : null}
      {items.length ? (
        tree(null)
      ) : (
        <section className="empty-state">
          <h2>Il quadro logico è ancora vuoto</h2>
          <p>
            Inizia da un obiettivo generale, poi aggiungi gli obiettivi
            specifici e i risultati attesi.
          </p>
        </section>
      )}
    </>
  );
}
