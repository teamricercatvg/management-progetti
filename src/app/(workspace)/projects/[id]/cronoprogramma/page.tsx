import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/project-data";
import { activityStatuses } from "@/lib/activities.mjs";
import { getActivities } from "@/lib/activity-data";
import { getFramework } from "@/lib/framework-data";
import { getSchedule, type Period } from "@/lib/schedule-data";
import {
  scheduleMonths,
  intersects,
  overlappingPeriods,
  periodChanges,
} from "@/lib/schedule.mjs";
import { RevisionForm, PeriodForm } from "@/components/schedule-forms";
import { ActivityForm } from "@/components/activity-form";
import { ActivityList } from "@/components/activity-list";
export const metadata = { title: "Cronoprogramma" };
export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { project, client } = await getProject((await params).id);
  const [activities, framework, schedule, search] = await Promise.all([
    getActivities(client, project.id),
    getFramework(client, project.id),
    getSchedule(client, project.id),
    searchParams,
  ]);
  const { revisions, periods, state } = schedule;
  const draft = revisions.find((r) => r.status === "draft");
  const current = revisions.find((r) => r.id === state?.current_revision_id);
  const initial = revisions.find((r) => r.id === state?.initial_revision_id);
  const selected =
    typeof search.revision === "string"
      ? revisions.find((r) => r.id === search.revision)
      : (draft ?? current);
  if (search.revision && !selected) notFound();
  const editable = project.status !== "archived";
  const base = `/projects/${project.id}/cronoprogramma`;
  const selectedPeriods = periods.filter((p) => p.revision_id === selected?.id);
  const initialPeriods = periods.filter((p) => p.revision_id === initial?.id);
  const currentPeriods = periods.filter((p) => p.revision_id === current?.id);
  const selectedActivities =
    selected?.status === "approved" ? selected.activity_snapshot : activities;
  const months = scheduleMonths(
    selected?.project_snapshot?.start_date ?? project.start_date,
    selected?.project_snapshot?.end_date ?? project.end_date,
  );
  const editing = activities.find((a) => a.id === search.activity);
  const editingPeriod = selectedPeriods.find(
    (p) => p.period_key === search.period,
  );
  if ((search.activity && !editing) || (search.period && !editingPeriod))
    notFound();
  const groups = [
    ...framework
      .filter((f) => f.type === "expected_result")
      .map((f) => ({ id: f.id, title: `${f.code} — ${f.title}` })),
    { id: "preparatory", title: "Attività propedeutiche" },
    { id: "subactivity", title: "Sotto-attività del QL" },
    { id: "general", title: "Attività generali e trasversali" },
    { id: "administrative", title: "Gestione amministrativa" },
  ];
  const groupOf = (a: (typeof activities)[number]) =>
    a.result_id ?? (a.parent_activity_id ? "subactivity" : a.category);
  const date = (s: string | null) =>
    s ? s.split("-").reverse().join("/") : "—";
  return (
    <>
      <Link href={`/projects/${project.id}`}>← Progetto</Link>
      <h1>Cronoprogramma</h1>
      <p>
        {project.code} — {project.title}
      </p>
      <p>
        Attività del quadro logico, fasi collegate e attività autonome. M1
        indica il mese di avvio; le date esatte sono riportate nei periodi. Il
        consuntivo deriva dalle date effettive delle attività.
      </p>
      <nav className="actions">
        <Link href={`/projects/${project.id}/quadro-logico`}>
          Quadro logico
        </Link>
        {editable && (
          <Link className="button-link" href={`${base}?new=1`}>
            Nuova attività
          </Link>
        )}
        <Link href={base}>Piano di lavoro</Link>
      </nav>
      {editable &&
        (search.new === "1" || (editing && editing.status !== "archived")) && (
          <section>
            <ActivityForm
              key={editing?.id ?? "new"}
              projectId={project.id}
              activity={editing}
              results={framework.filter(
                (f) => f.type === "expected_result" && f.status === "active",
              )}
              parents={activities.filter(
                (a) => a.result_id && a.status !== "archived",
              )}
            />
          </section>
        )}
      <section>
        <h2>Revisioni</h2>
        <p>
          Piano iniziale:{" "}
          {initial ? `n. ${initial.revision_number}` : "non ancora pubblicato"}{" "}
          · Piano corrente:{" "}
          {current ? `n. ${current.revision_number}` : "non ancora pubblicato"}
        </p>
        <div className="actions">
          {revisions
            .sort((a, b) => a.revision_number - b.revision_number)
            .map((r) => (
              <Link key={r.id} href={`${base}?revision=${r.id}`}>
                {r.revision_number}. {r.title} —{" "}
                {r.status === "draft" ? "Bozza" : "Pubblicato"}
              </Link>
            ))}
        </div>
        {selected && (
          <p>
            {selected.reason}
            {selected.approved_at
              ? ` · Pubblicato il ${date(selected.approved_at.slice(0, 10))}`
              : ""}
          </p>
        )}
        {editable && !draft && <RevisionForm projectId={project.id} />}
        {editable && draft && selected?.id === draft.id && (
          <>
            <p className="notice">
              Bozza non ufficiale. Verifica tutti i periodi prima della
              pubblicazione. Le modifiche non alterano il piano corrente.
            </p>
            <RevisionForm key={draft.id} projectId={project.id} draft={draft} />
          </>
        )}
      </section>
      {selected && (
        <section>
          <h2>
            {selected.status === "draft" ? "Bozza" : "Piano pubblicato"} n.{" "}
            {selected.revision_number}
          </h2>
          <p>
            Legenda: <span className="schedule-key initial">I iniziale</span> ·{" "}
            <span className="schedule-key current">C corrente</span> ·{" "}
            <span className="schedule-key selected">S selezionato</span> ·{" "}
            <span className="schedule-key actual">E effettivo</span>.
            Un’attività iniziata senza fine effettiva è mostrata fino a oggi.
          </p>
          {overlappingPeriods(selectedPeriods).length > 0 && (
            <p className="notice">
              Sono presenti periodi sovrapposti per la stessa attività: sono
              ammessi, verifica che siano intenzionali.
            </p>
          )}
          <div
            className="schedule-scroll"
            tabIndex={0}
            role="region"
            aria-label="Cronoprogramma mensile"
          >
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Attività / soggetti coinvolti</th>
                  {months.map((m) => (
                    <th key={m.start}>
                      {m.label}
                      <br />
                      {m.calendar}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const rows = selectedActivities.filter(
                    (a) => groupOf(a) === g.id,
                  );
                  return (
                    rows.length > 0 && (
                      <GroupedRows
                        key={g.id}
                        title={g.title}
                        colSpan={months.length + 1}
                        rows={rows.map((a) => {
                          const actual = activities.find((x) => x.id === a.id);
                          const own = selectedPeriods.filter(
                            (p) =>
                              p.activity_id === a.id && p.status === "planned",
                          );
                          const first = own.map((p) => p.start_date).sort()[0];
                          const last = own
                            .map((p) => p.end_date)
                            .sort()
                            .at(-1);
                          return (
                            <tr key={a.id}>
                              <th scope="row">
                                {a.code} — {a.title}
                                <small>
                                  {a.stakeholders || "Soggetti da indicare"}
                                  {a.parent_activity_id
                                    ? ` · Collegata a ${activities.find((x) => x.id === a.parent_activity_id)?.code ?? a.parent_activity_id}`
                                    : ""}
                                </small>
                                <small>
                                  {own.length} periodi
                                  {first
                                    ? ` · ${date(first)} – ${date(last ?? null)} (intervallo complessivo, incluse pause)`
                                    : ""}
                                </small>
                                <small>
                                  Stato attuale:{" "}
                                  {activityStatuses[
                                    actual?.status as keyof typeof activityStatuses
                                  ] ?? "—"}
                                </small>
                              </th>
                              {months.map((m) => {
                                const hit = (list: typeof periods) =>
                                  list.some(
                                    (p) =>
                                      p.activity_id === a.id &&
                                      p.status === "planned" &&
                                      intersects(p.start_date, p.end_date, m),
                                  );
                                return (
                                  <td key={m.start}>
                                    <span className="schedule-cell">
                                      {hit(initialPeriods) && (
                                        <b
                                          className="initial"
                                          title="Piano iniziale"
                                        >
                                          I
                                        </b>
                                      )}
                                      {hit(currentPeriods) && (
                                        <b
                                          className="current"
                                          title="Piano corrente"
                                        >
                                          C
                                        </b>
                                      )}
                                      {hit(selectedPeriods) && (
                                        <b
                                          className="selected"
                                          title="Piano selezionato"
                                        >
                                          S
                                        </b>
                                      )}
                                      {actual?.actual_start_date &&
                                        intersects(
                                          actual.actual_start_date,
                                          actual.actual_end_date ??
                                            new Date()
                                              .toISOString()
                                              .slice(0, 10),
                                          m,
                                        ) && (
                                          <b
                                            className="actual"
                                            title="Effettivo"
                                          >
                                            E
                                          </b>
                                        )}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      />
                    )
                  );
                })}
              </tbody>
            </table>
          </div>
          <h3>Periodi e confronto con il piano iniziale</h3>
          <ul className="project-list">
            {periodChanges(initialPeriods, selectedPeriods).map(
              ({ period: p, change }: { period: Period; change: string }) => (
                <li key={p.id}>
                  <div>
                    <strong>
                      {
                        selectedActivities.find((a) => a.id === p.activity_id)
                          ?.code
                      }{" "}
                      — {p.title}
                    </strong>
                    <p>
                      {date(p.start_date)} – {date(p.end_date)} ·{" "}
                      {p.status === "cancelled" ? "Annullato" : change}
                      {p.start_date < project.start_date ||
                      p.end_date > project.end_date
                        ? " · Fuori dalle date attuali del progetto"
                        : ""}
                    </p>
                    {p.notes && <p>{p.notes}</p>}
                    {editable && selected.id === draft?.id && (
                      <Link href={`${base}?period=${p.period_key}`}>
                        Modifica / annulla periodo
                      </Link>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
          {editable && selected.id === draft?.id && (
            <details open={!!editingPeriod}>
              <summary>
                {editingPeriod ? "Modifica periodo" : "Aggiungi periodo"}
              </summary>
              <PeriodForm
                key={editingPeriod?.id ?? "new"}
                projectId={project.id}
                draft={draft!}
                activities={activities}
                period={editingPeriod}
              />
            </details>
          )}
        </section>
      )}
      <details>
        <summary>
          Gestione attività e date effettive ({activities.length})
        </summary>
        <ActivityList
          activities={activities}
          projectId={project.id}
          readOnly={!editable}
        />
      </details>
    </>
  );
}
function GroupedRows({
  title,
  colSpan,
  rows,
}: {
  title: string;
  colSpan: number;
  rows: React.ReactNode[];
}) {
  return (
    <>
      <tr className="schedule-group">
        <th colSpan={colSpan}>{title}</th>
      </tr>
      {rows}
    </>
  );
}
