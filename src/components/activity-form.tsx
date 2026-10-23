"use client";
import { UiIcon } from "@/components/ui-icon";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  saveActivity,
  changeActivityArchive,
  changeActivityCancellation,
} from "@/app/(workspace)/projects/[id]/quadro-logico/activity-actions";
import type { Activity } from "@/lib/activity-data";
import { activityPriorities } from "@/lib/activities.mjs";
import { Submit } from "@/components/submit";
const fields = [
  ["code", "Codice attività", "text", 80, true],
  ["title", "Titolo attività", "text", 240, true],
  ["stakeholders", "Soggetti coinvolti", "textarea", 2000, false],
  ["actual_start_date", "Inizio effettivo", "date", undefined, false],
  ["actual_end_date", "Fine effettiva", "date", undefined, false],
  ["sort_order", "Ordine attività", "number", undefined, true],
  ["description", "Descrizione attività", "textarea", 10000, false],
  ["output", "Output attività", "textarea", 10000, false],
  ["notes", "Note attività", "textarea", 10000, false],
] as const;
export function ActivityForm({
  projectId,
  activity,
  resultId,
  results,
  parents = [],
}: {
  projectId: string;
  activity?: Activity;
  resultId?: string;
  results: { id: string; code: string; title: string }[];
  parents?: { id: string; code: string; title: string }[];
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(
      fields.map(([name]) => [
        name,
        String(activity?.[name] ?? (name === "sort_order" ? 0 : "")),
      ]),
    ),
    result_id: activity?.result_id ?? resultId ?? "",
    parent_activity_id: activity?.parent_activity_id ?? "",
    category: activity?.category ?? "general",
    priority: activity?.priority ?? "normal",
  }));
  const [state, action] = useActionState(
    saveActivity.bind(null, projectId, activity?.id ?? null),
    { message: "" },
  );
  const update = (name: string, value: string) =>
    setValues((old) => ({ ...old, [name]: value }));
  // React actions reset native controls even on handled validation errors.
  return (
    <form action={action} onReset={(event) => event.preventDefault()}>
      <h2>{activity ? "Modifica attività" : "Nuova attività"}</h2>
      <p>
        Le date previste si gestiscono nei periodi del cronoprogramma. Qui puoi
        registrare le date effettive, anche in ritardo rispetto al piano.
      </p>
      {activity ? (
        <input type="hidden" name="row_version" value={activity.row_version} />
      ) : null}
      <label htmlFor="activity-result">
        Risultato collegato (attività del QL)
      </label>
      <select
        id="activity-result"
        name="result_id"
        value={values.result_id}
        onChange={(e) => update("result_id", e.target.value)}
        aria-invalid={!!state.errors?.result_id}
        aria-describedby={
          state.errors?.result_id ? "activity-result-error" : undefined
        }
      >
        <option value="">Nessuno — attività fuori QL</option>
        {results.map((r) => (
          <option value={r.id} key={r.id}>
            {r.code} — {r.title}
          </option>
        ))}
      </select>
      {state.errors?.result_id ? (
        <span id="activity-result-error" className="field-error">
          {state.errors.result_id}
        </span>
      ) : null}
      <label>
        Sotto-attività di un’attività QL
        <select
          name="parent_activity_id"
          value={values.parent_activity_id}
          onChange={(e) => update("parent_activity_id", e.target.value)}
        >
          <option value="">Nessuna</option>
          {parents
            .filter((p) => p.id !== activity?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.title}
              </option>
            ))}
        </select>
      </label>
      {state.errors?.parent_activity_id && (
        <p role="alert">{state.errors.parent_activity_id}</p>
      )}
      <label>
        Categoria fuori QL
        <select
          name="category"
          value={values.category}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="general">Generale / trasversale</option>
          <option value="preparatory">Propedeutica</option>
          <option value="administrative">Amministrativa</option>
          <option value="subactivity">Sotto-attività</option>
        </select>
      </label>
      <div className="project-fields">
        {fields.map(([name, label, type, max, required]) => (
          <label key={name} className={type === "textarea" ? "full-width" : ""}>
            {label}
            {required ? " *" : ""}
            {type === "textarea" ? (
              <textarea
                name={name}
                rows={4}
                value={values[name]}
                maxLength={max}
                onChange={(e) => update(name, e.target.value)}
                aria-invalid={!!state.errors?.[name]}
                aria-describedby={
                  state.errors?.[name] ? `activity-${name}-error` : undefined
                }
              />
            ) : (
              <input
                name={name}
                type={type}
                required={required}
                maxLength={max}
                min={type === "number" ? 0 : undefined}
                max={type === "number" ? 2147483647 : undefined}
                step={type === "number" ? 1 : undefined}
                value={values[name]}
                onChange={(e) => update(name, e.target.value)}
                aria-invalid={!!state.errors?.[name]}
                aria-describedby={
                  state.errors?.[name] ? `activity-${name}-error` : undefined
                }
              />
            )}
            {state.errors?.[name] ? (
              <span id={`activity-${name}-error`} className="field-error">
                {state.errors[name]}
              </span>
            ) : null}
          </label>
        ))}
      </div>
      <label htmlFor="activity-priority">Priorità</label>
      <select
        id="activity-priority"
        name="priority"
        value={values.priority}
        onChange={(e) => update("priority", e.target.value)}
      >
        {Object.entries(activityPriorities).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      {state.message ? (
        <p className="notice" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="actions">
        <Submit>Salva attività</Submit>
        <Link href={`/projects/${projectId}/cronoprogramma`}>Annulla</Link>
      </div>
    </form>
  );
}
export function ActivityArchive({
  projectId,
  activity,
}: {
  projectId: string;
  activity: Pick<Activity, "id" | "status" | "row_version">;
}) {
  const [state, action] = useActionState(
    changeActivityArchive.bind(null, projectId, activity.id),
    { message: "" },
  );
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          activity.status !== "archived" &&
          !window.confirm(
            "Archiviare questa attività? I dati saranno conservati e potranno essere riattivati.",
          )
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="row_version" value={activity.row_version} />
      <input
        type="hidden"
        name="mode"
        value={activity.status === "archived" ? "restore" : "archive"}
      />
      <Submit
        label={
          activity.status === "archived"
            ? "Riattiva attività"
            : "Archivia attività"
        }
      >
        <UiIcon name={activity.status === "archived" ? "restore" : "trash"} />
      </Submit>
      {state.message ? (
        <p role="status" className="notice">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function ActivityCancellation({
  projectId,
  activity,
}: {
  projectId: string;
  activity: Activity;
}) {
  const [state, action] = useActionState(
    changeActivityCancellation.bind(null, projectId, activity.id),
    { message: "" },
  );
  const [reason, setReason] = useState("");
  if (activity.status === "archived") return null;
  return (
    <details>
      <summary>
        {activity.status === "cancelled"
          ? "Riprendi attività"
          : "Annulla attività"}
      </summary>
      <form action={action} onReset={(e) => e.preventDefault()}>
        <input type="hidden" name="row_version" value={activity.row_version} />
        <input
          type="hidden"
          name="mode"
          value={activity.status === "cancelled" ? "resume" : "cancel"}
        />
        {activity.status === "cancelled" ? (
          <p>
            {activity.cancellation_reason}. Riprendendo, lo stato sarà
            ricalcolato dalle date effettive.
          </p>
        ) : (
          <label>
            Motivazione annullamento
            <input
              name="reason"
              required
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
        <Submit>
          {activity.status === "cancelled"
            ? "Riprendi attività"
            : "Conferma annullamento"}
        </Submit>
        {state.message && <p role="status">{state.message}</p>}
      </form>
    </details>
  );
}
