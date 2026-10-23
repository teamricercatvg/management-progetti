"use client";
import { useActionState, useState } from "react";
import { scheduleAction } from "@/app/(workspace)/projects/[id]/cronoprogramma/actions";
import type { Period, Revision } from "@/lib/schedule-data";
import type { Activity } from "@/lib/activity-data";
import { activityStatuses } from "@/lib/activities.mjs";
import { Submit } from "./submit";
export function RevisionForm({
  projectId,
  draft,
}: {
  projectId: string;
  draft?: Revision;
}) {
  const [state, action] = useActionState(
    scheduleAction.bind(null, projectId, draft ? "publish" : "create"),
    { message: "" },
  );
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState(draft?.reason ?? "");
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      onSubmit={(e) => {
        if (
          draft &&
          !window.confirm(
            "Pubblicare questo piano? Lo snapshot diventerà immutabile.",
          )
        )
          e.preventDefault();
      }}
    >
      {draft ? (
        <input type="hidden" name="row_version" value={draft.row_version} />
      ) : (
        <label>
          Titolo revisione
          <input
            name="title"
            required
            maxLength={240}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      )}
      <label>
        Motivazione
        <textarea
          name="reason"
          required
          maxLength={4000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <Submit>
        {draft ? "Pubblica piano" : "Crea bozza dal piano corrente"}
      </Submit>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
export function PeriodForm({
  projectId,
  draft,
  activities,
  period,
}: {
  projectId: string;
  draft: Revision;
  activities: Activity[];
  period?: Period;
}) {
  const [state, action] = useActionState(
    scheduleAction.bind(null, projectId, "period"),
    { message: "" },
  );
  const [v, setV] = useState<Record<string, string>>({
    activity_id: period?.activity_id ?? "",
    title: period?.title ?? "",
    start_date: period?.start_date ?? "",
    end_date: period?.end_date ?? "",
    status: period?.status ?? "planned",
    notes: period?.notes ?? "",
  });
  const set = (key: string, value: string) =>
    setV((old) => ({ ...old, [key]: value }));
  return (
    <form action={action} onReset={(e) => e.preventDefault()}>
      <input type="hidden" name="row_version" value={draft.row_version} />
      {period && (
        <input type="hidden" name="period_key" value={period.period_key} />
      )}
      <label>
        Attività
        <select
          name="activity_id"
          required
          value={v.activity_id}
          onChange={(e) => set("activity_id", e.target.value)}
        >
          <option value="">Seleziona…</option>
          {activities
            .filter((a) => !period || a.id === period.activity_id)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.title} (
                {activityStatuses[a.status as keyof typeof activityStatuses]})
              </option>
            ))}
        </select>
      </label>
      <label>
        Titolo del periodo
        <input
          name="title"
          required
          maxLength={240}
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </label>
      <div className="project-fields">
        {[
          ["start_date", "Inizio previsto"],
          ["end_date", "Fine prevista"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="date"
              name={key}
              required
              value={v[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <label>
        Stato del periodo
        <select
          name="status"
          value={v.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="planned">Previsto</option>
          <option value="cancelled">
            Annullato (conservato nello storico)
          </option>
        </select>
      </label>
      <label>
        Note
        <textarea
          name="notes"
          maxLength={4000}
          value={v.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </label>
      <Submit>Salva periodo</Submit>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
