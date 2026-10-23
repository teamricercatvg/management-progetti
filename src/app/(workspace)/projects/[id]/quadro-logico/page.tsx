import { UiIcon } from "@/components/ui-icon";
import { CompactText } from "@/components/compact-text";
import { FrameworkBranch, FrameworkTreeControls } from "@/components/framework-tree-controls";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/project-data";
import { getFramework, type FrameworkItem } from "@/lib/framework-data";
import { frameworkTypes, readFrameworkRisks } from "@/lib/framework.mjs";
import { FrameworkForm, FrameworkStatus } from "@/components/framework-form";
import { getActivities } from "@/lib/activity-data";
import { ActivityForm } from "@/components/activity-form";
import { ActivityList } from "@/components/activity-list";
export const metadata = { title: "Quadro logico" };
export default async function FrameworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { project, client } = await getProject((await params).id);
  const [items, activities, search] = await Promise.all([
    getFramework(client, project.id),
    getActivities(client, project.id),
    searchParams,
  ]);
  const base = `/projects/${project.id}/quadro-logico`;
  const readOnly = project.status === "archived";
  const editing =
    typeof search.edit === "string"
      ? items.find((i) => i.id === search.edit)
      : undefined;
  if (search.edit && !editing) notFound();
  const resultParent = typeof search.new_result === "string"
    ? items.find((item) => item.id === search.new_result && item.type === "specific_objective" && item.status === "active")
    : undefined;
  if (search.new_result && !resultParent) notFound();
  const showForm =
    !readOnly &&
    (search.new === "1" || resultParent || (editing && editing.status === "active"));
  const editingActivity =
    typeof search.activity === "string"
      ? activities.find((a) => a.id === search.activity)
      : undefined;
  if (search.activity && !editingActivity) notFound();
  const newResult =
    typeof search.new_activity === "string"
      ? items.find(
          (i) =>
            i.id === search.new_activity &&
            i.type === "expected_result" &&
            i.status === "active",
        )
      : undefined;
  if (search.new_activity && !newResult) notFound();
  const showActivityForm =
    !readOnly &&
    (newResult || (editingActivity && editingActivity.status !== "archived"));
  const activityGroups = new Map<string, typeof activities>();
  for (const activity of activities) {
    if (!activity.result_id) continue;
    const group = activityGroups.get(activity.result_id) ?? [];
    group.push(activity);
    activityGroups.set(activity.result_id, group);
  }
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
            <FrameworkBranch id={item.id} code={item.code}
              count={(children.get(item.id)?.length ?? 0) + (activityGroups.get(item.id)?.length ?? 0)}
              summary={<article className="framework-item">
              <p className="eyebrow">
                {frameworkTypes[item.type as keyof typeof frameworkTypes]}
              </p>
              <h2>
                {item.code} — {item.title}
              </h2>
              <Link href={`/projects/${project.id}/indicatori?item=${item.id}&archived=1`} aria-label={`Indicatori di ${item.code}`}>Indicatori</Link>
              {item.status === "archived" ? (
                <span className="badge">Archiviato</span>
              ) : null}
              {item.description ? (
                <CompactText text={item.description} />
              ) : null}
              {item.assumptions ? (
                <details className="framework-risks">
                  <summary>Rischi e azioni di mitigazione</summary>
                  <ol>{readFrameworkRisks(item.assumptions).map((entry, index) => (
                    <li key={index}>
                      <CompactText text={`Rischio: ${entry.risk}`} />
                      <CompactText text={`Mitigazione: ${entry.mitigation || "Non ancora indicata"}`} />
                    </li>
                  ))}</ol>
                </details>
              ) : null}
              {!readOnly ? (
                <div className="actions card-tools">
                  {item.status === "active" ? (
                    <Link className="icon-action" title={`Modifica ${item.code}`} aria-label={`Modifica ${item.code}`} href={`${base}?edit=${item.id}`}>
                      <UiIcon name="edit" />
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
                  {!readOnly && item.type === "expected_result" &&
                  item.status === "active" ? (
                    <Link
                      className="icon-action add-activity-action"
                      title={`Aggiungi attività a ${item.code}`} aria-label={`Aggiungi attività a ${item.code}`}
                      href={`${base}?new_activity=${item.id}`}
                    >
                      <UiIcon name="plus" />
                    </Link>
                  ) : null}
              {!readOnly && item.type === "specific_objective" && item.status === "active" ? (
                <Link className="icon-action add-activity-action"
                  title={`Aggiungi risultato a ${item.code}`} aria-label={`Aggiungi risultato a ${item.code}`}
                  href={`${base}?new_result=${item.id}`}>
                  <UiIcon name="plus" />
                </Link>
              ) : null}
            </article>}>
            {item.type === "expected_result" ? (
              <ActivityList
                activities={activityGroups.get(item.id) ?? []}
                projectId={project.id}
                readOnly={readOnly}
              />
            ) : null}
            {tree(item.id, depth + 1)}
            </FrameworkBranch>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="framework-page">
      <div className="page-heading">
        <Link href={`/projects/${project.id}`}>
          ← {project.code} · Dettaglio progetto
        </Link>
        <h1>Quadro logico</h1>
        <Link href={`/projects/${project.id}/indicatori`}>Indicatori del progetto</Link>
        <p>{project.title}</p>
        <p>
          Obiettivi generali → obiettivi specifici → risultati attesi →
          attività.
        </p>
      </div>
      {readOnly ? (
        <p className="notice">
          Progetto archiviato: quadro logico in sola lettura.
        </p>
      ) : (
        <details className="framework-help"><summary>Come archiviare e riattivare gli elementi</summary><p>
          L’archiviazione di un elemento comprende tutti i figli, gli indicatori e le attività
          collegate, previa conferma. Per riattivarlo, riattiva prima il genitore. Gli elementi archiviati restano visibili.
        </p></details>
      )}
      {search.saved === "1" ? (
        <p role="status" className="notice">
          Elemento salvato.
        </p>
      ) : null}
      {search.activity_saved === "1" ? (
        <p className="notice" role="status">
          Attività salvata.
        </p>
      ) : null}
      {showActivityForm ? (
        <section className="admin-card">
          <ActivityForm
            key={editingActivity?.id ?? newResult?.id}
            projectId={project.id}
            activity={editingActivity}
            resultId={newResult?.id}
            results={items
              .filter(
                (i) => i.type === "expected_result" && i.status === "active",
              )
              .map(({ id, code, title }) => ({ id, code, title }))}
          />
        </section>
      ) : null}
      {showForm ? (
        <section className="admin-card">
          <FrameworkForm
            key={editing?.id ?? resultParent?.id ?? "new"}
            projectId={project.id}
            item={editing}
            resultParentId={resultParent?.id}
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
        <FrameworkTreeControls branchIds={items.filter((item) => children.has(item.id) || activityGroups.has(item.id)).map((item) => item.id)}>
          {tree(null)}
        </FrameworkTreeControls>
      ) : (
        <section className="empty-state">
          <h2>Il quadro logico è ancora vuoto</h2>
          <p>
            Inizia da un obiettivo generale, poi aggiungi gli obiettivi
            specifici e i risultati attesi.
          </p>
        </section>
      )}
    </div>
  );
}
