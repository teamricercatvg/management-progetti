import { ActivityTrash } from "@/components/activity-trash";
import { ProjectNavigation } from "@/components/project-navigation";
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
import { ScheduleDetails } from "@/components/schedule-details";
import { UiIcon } from "@/components/ui-icon";
import { ActivityList } from "@/components/activity-list";
export const metadata = { title: "Cronoprogramma" };
export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { project, client, profile } = await getProject((await params).id);
  const [allActivities, framework, schedule, search] = await Promise.all([
    getActivities(client, project.id, true),
    getFramework(client, project.id),
    getSchedule(client, project.id),
    searchParams,
  ]);
  const activities = allActivities.filter((a) => !a.deleted_at);
  const { revisions, periods, state } = schedule;
  const draft = revisions.find((r) => r.status === "draft");
  const current = revisions.find((r) => r.id === state?.current_revision_id);
  const initial = revisions.find((r) => r.id === state?.initial_revision_id);
  const latest = draft ?? current;
  const archivedRevisions = revisions.filter((r) => r.id !== latest?.id && r.status === "approved").sort((a, b) => b.revision_number - a.revision_number);
  const selected =
    typeof search.revision === "string"
      ? revisions.find((r) => r.id === search.revision)
      : latest;
  if (search.revision && !selected) notFound();
  const editable = project.status !== "archived";
  const base = `/projects/${project.id}/cronoprogramma`;
  const selectedPeriods = periods.filter((p) => p.revision_id === selected?.id);
  const initialPeriods = periods.filter((p) => p.revision_id === initial?.id);
  const changes = periodChanges(initialPeriods, selectedPeriods) as { period: Period; change: string }[];
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
    { id: "subactivity", title: "Azioni del QL" },
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
      <ProjectNavigation projectId={project.id} current="cronoprogramma" />
      <nav className="actions" aria-label="Azioni cronoprogramma">
        {editable && (
          <Link className="button-link" href={`${base}?new=1`}>
            Nuova attività
          </Link>
        )}
        <Link href={base}>Piano di lavoro</Link>
      </nav>
      {editable &&
        (search.new === "1" || (editing && editing.status !== "archived")) && (
          <section id="activity-editor">
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
        <div className="schedule-version-header">
          <div>
            <h2>Versione aggiornata</h2>
            {latest ? (
              <Link href={base} aria-current={selected?.id === latest.id ? "page" : undefined}>
                {latest.revision_number}. {latest.title} — {latest.status === "draft" ? "Bozza" : "Pubblicato"}
              </Link>
            ) : <p>Nessun piano disponibile.</p>}
          </div>
          {archivedRevisions.length > 0 && (
            <details className="schedule-history">
              <summary aria-label="Versioni archiviate" title="Versioni archiviate">
                <UiIcon name="clock" />
              </summary>
              <nav aria-label="Versioni archiviate">
                <h3>Versioni archiviate</h3>
                <ul>
                  {archivedRevisions.map((r) => (
                    <li key={r.id}>
                      <Link href={`${base}?revision=${r.id}`} aria-current={selected?.id === r.id ? "page" : undefined}>
                        {r.revision_number}. {r.title} — Pubblicato
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>
          )}
        </div>
        {selected && selected.id !== latest?.id && (
          <p className="notice">
            Stai consultando la versione archiviata n. {selected.revision_number}.{" "}
            <Link href={base}>Torna alla versione aggiornata</Link>
          </p>
        )}
        {selected && (
          <p>
            {selected.reason}
            {selected.approved_at
              ? ` · Pubblicato il ${date(selected.approved_at.slice(0, 10))}`
              : ""}
          </p>
        )}
        {editable && !draft && (
          <details>
            <summary>{current ? "Crea nuova revisione" : "Crea primo piano"}</summary>
            <RevisionForm projectId={project.id} />
          </details>
        )}
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
            Legenda: <span className="schedule-key planned">P previsto</span> ·{" "}
            <span className="schedule-key actual">E effettivo</span>.
            Le due barre mostrano il previsto del piano selezionato in alto e l’effettivo in basso. Le interruzioni indicano mesi senza attività prevista. Un’attività iniziata senza fine effettiva è mostrata fino a oggi.
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
                  <th>Attività</th>
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
                          const actual = allActivities.find((x) => x.id === a.id);
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
                                {editable && actual && !actual.deleted_at && actual.status !== "archived" ? (
                                  <Link href={`${base}?revision=${selected.id}&activity=${a.id}#activity-editor`}>
                                    {a.code} — {a.title}
                                  </Link>
                                ) : <span>{a.code} — {a.title}</span>}
                                <ScheduleDetails key={`${selected.id}-${a.id}`} label={a.code}>
                                  {actual?.deleted_at && <p>Attività nel cestino; dati del piano pubblicato conservati.</p>}
                                  {a.description && <p>{a.description}</p>}
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
                                  <small>Effettivo: {date(actual?.actual_start_date ?? null)} – {actual?.actual_start_date && !actual.actual_end_date ? "in corso" : date(actual?.actual_end_date ?? null)}</small>
                                  {a.output && <p>Output: {a.output}</p>}
                                  {a.notes && <p>Note: {a.notes}</p>}
                                  <ul className="schedule-periods">
                                    {changes.filter(({ period }) => period.activity_id === a.id).map(({ period: p, change }) => (
                                      <li key={p.id}>
                                        <strong>{a.code} — {p.title}</strong>
                                        <p>{date(p.start_date)} – {date(p.end_date)} · {p.status === "cancelled" ? "Annullato" : change}
                                          {p.start_date < project.start_date || p.end_date > project.end_date ? " · Fuori dalle date attuali del progetto" : ""}
                                        </p>
                                        {p.notes && <p>{p.notes}</p>}
                                        {editable && selected.id === draft?.id && (
                                          <Link href={`${base}?revision=${selected.id}&period=${p.period_key}#period-editor`}>Modifica / annulla periodo</Link>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </ScheduleDetails>
                              </th>
                              {months.map((m, monthIndex) => {
                                const hit = (list: typeof periods, index: number) =>
                                  !!months[index] && list.some(
                                    (p) =>
                                      p.activity_id === a.id &&
                                      p.status === "planned" &&
                                      intersects(p.start_date, p.end_date, months[index]),
                                  );
                                const actualHit = (index: number) =>
                                  !!months[index] && !!actual?.actual_start_date &&
                                  intersects(
                                    actual.actual_start_date,
                                    actual.actual_end_date ?? new Date().toISOString().slice(0, 10),
                                    months[index],
                                  );
                                const lanes = [
                                  { kind: "planned", label: "Previsto", letter: "P", active: (index: number) => hit(selectedPeriods, index) },
                                  { kind: "actual", label: "Effettivo", letter: "E", active: actualHit },
                                ];
                                return (
                                  <td key={m.start} className="schedule-month">
                                    <span className="schedule-cell">
                                      {lanes.map((lane) => {
                                        const active = lane.active(monthIndex);
                                        const starts = active && !lane.active(monthIndex - 1);
                                        const ends = active && !lane.active(monthIndex + 1);
                                        return (
                                          <span
                                            key={lane.kind}
                                            className={`schedule-track${active ? ` schedule-bar ${lane.kind}` : ""}${starts ? " bar-start" : ""}${ends ? " bar-end" : ""}`}
                                            title={active ? `${lane.label} · ${m.calendar}` : undefined}
                                            aria-label={active ? `${lane.label} · ${m.calendar}` : undefined}
                                            aria-hidden={!active || undefined}
                                          >
                                            {starts ? lane.letter : null}
                                          </span>
                                        );
                                      })}
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
          {editable && selected.id === draft?.id && (
            <details id="period-editor" open={!!editingPeriod}>
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
      <ActivityTrash projectId={project.id} activities={allActivities.filter((a) => a.deleted_at)} isAdmin={profile.is_admin} readOnly={project.status === "archived"} />
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
