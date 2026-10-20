import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/project-data";
import { getFramework } from "@/lib/framework-data";
import { getIndicators } from "@/lib/indicator-data";
import {
  indicatorStatuses,
  indicatorTypes,
  indicatorValue,
  indicatorTextFields,
  aggregations,
} from "@/lib/indicators.mjs";
import { IndicatorForm, IndicatorArchive } from "@/components/indicator-form";
export const metadata = { title: "Indicatori" };
export default async function IndicatorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { project, client } = await getProject((await params).id);
  const query = await searchParams;
  const [items, indicators] = await Promise.all([
    getFramework(client, project.id),
    getIndicators(client, project.id),
  ]);
  const archived = project.status === "archived";
  const selected =
    typeof query.edit === "string"
      ? indicators.find((i) => i.id === query.edit)
      : undefined;
  if (query.edit && !selected) notFound();
  const showArchived = query.archived === "1";
  const visible = indicators.filter(
    (i) =>
      (showArchived || i.status !== "archived") &&
      (!query.item || i.framework_item_id === query.item),
  );
  const activeItems = items.filter((i) => i.status === "active");
  return (
    <>
      <div className="page-heading">
        <Link href={`/projects/${project.id}`}>
          ← {project.code} — {project.title}
        </Link>
        <h1>Indicatori</h1>
        <p>
          Definizioni, baseline, target e fonti collegate al quadro logico. Le
          rilevazioni dei valori correnti saranno disponibili in una milestone
          successiva.
        </p>
      </div>
      <div className="actions">
        <Link href={`/projects/${project.id}/quadro-logico`}>
          Quadro logico
        </Link>
        {!archived && activeItems.length ? (
          <Link
            className="button-link"
            href={`/projects/${project.id}/indicatori?new=1${typeof query.item === "string" ? `&item=${encodeURIComponent(query.item)}` : ""}`}
          >
            Nuovo indicatore
          </Link>
        ) : null}
      </div>
      {query.indicator_saved === "1" ? (
        <p className="notice" role="status">
          Indicatore salvato.
        </p>
      ) : null}
      {archived ? (
        <p className="notice">
          Progetto archiviato: indicatori in sola lettura.
        </p>
      ) : null}
      {!archived && !activeItems.length ? (
        <p>
          Crea o riattiva un obiettivo o risultato nel quadro logico per
          aggiungere indicatori.
        </p>
      ) : null}
      {!archived &&
      ((selected && selected.status !== "archived") || query.new === "1") &&
      activeItems.length ? (
        <section>
          <IndicatorForm
            key={selected?.id ?? "new"}
            projectId={project.id}
            indicator={selected}
            items={activeItems}
            itemId={typeof query.item === "string" ? query.item : undefined}
          />
        </section>
      ) : null}
      <form method="get">
        <div className="project-fields">
          <label>
            Elemento del quadro logico
            <select
              name="item"
              defaultValue={typeof query.item === "string" ? query.item : ""}
            >
              <option value="">Tutti gli obiettivi e risultati</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Archivio
            <select name="archived" defaultValue={showArchived ? "1" : "0"}>
              <option value="0">Nascondi archiviati</option>
              <option value="1">Mostra anche archiviati</option>
            </select>
          </label>
        </div>
        <button type="submit">Filtra indicatori</button>
      </form>
      {!visible.length ? <p>Nessun indicatore per questa selezione.</p> : null}
      {items
        .filter((item) => visible.some((i) => i.framework_item_id === item.id))
        .map((item) => (
          <section key={item.id}>
            <h2>
              {item.code} — {item.title}
            </h2>
            {visible
              .filter((i) => i.framework_item_id === item.id)
              .map((i) => (
                <article className="admin-card" key={i.id}>
                  <h3>
                    {i.code} — {i.title}
                  </h3>
                  <p>
                    <span className="badge">
                      {
                        indicatorStatuses[
                          i.status as keyof typeof indicatorStatuses
                        ]
                      }
                    </span>{" "}
                    {indicatorTypes[i.type as keyof typeof indicatorTypes]} ·{" "}
                    {i.unit} ·{" "}
                    {i.direction === "decrease" ? "Diminuzione" : "Aumento"}
                  </p>
                  <dl>
                    <dt>Baseline</dt>
                    <dd>
                      {indicatorValue(i, "baseline")}{" "}
                      {i.baseline_date
                        ? `(${i.baseline_date.split("-").reverse().join("/")})`
                        : ""}
                    </dd>
                    <dt>Target</dt>
                    <dd>
                      {indicatorValue(i, "target")}{" "}
                      {i.target_date
                        ? `(${i.target_date.split("-").reverse().join("/")})`
                        : ""}
                    </dd>
                    <dt>Aggregazione</dt>
                    <dd>
                      {
                        aggregations[
                          i.aggregation_method as keyof typeof aggregations
                        ]
                      }
                    </dd>
                  </dl>
                  <details>
                    <summary>Definizione, fonti e dettagli</summary>
                    <dl>
                      {Object.entries(indicatorTextFields).map(
                        ([key, label]) =>
                          i[key as keyof typeof i] ? (
                            <div key={key}>
                              <dt>{label}</dt>
                              <dd className="prose-text">
                                {String(i[key as keyof typeof i])}
                              </dd>
                            </div>
                          ) : null,
                      )}
                      {i.type === "ratio" ? (
                        <>
                          <dt>Valori del rapporto conservati</dt>
                          <dd>
                            Baseline: {i.baseline_numerator ?? "—"} /{" "}
                            {i.baseline_denominator ?? "—"}; target:{" "}
                            {i.target_numerator ?? "—"} /{" "}
                            {i.target_denominator ?? "—"}; scala:{" "}
                            {i.ratio_scale}.
                          </dd>
                        </>
                      ) : null}
                    </dl>
                  </details>
                  {!archived ? (
                    <div className="actions">
                      {i.status !== "archived" ? (
                        <Link
                          href={`/projects/${project.id}/indicatori?edit=${i.id}`}
                        >
                          Modifica indicatore
                        </Link>
                      ) : null}
                      <IndicatorArchive projectId={project.id} indicator={i} />
                    </div>
                  ) : null}
                </article>
              ))}
          </section>
        ))}
    </>
  );
}
