import { UiIcon } from "@/components/ui-icon";
import { CompactText } from "@/components/compact-text";
import Link from "next/link";
import type { Activity } from "@/lib/activity-data";
import { activityStatuses, activityPriorities } from "@/lib/activities.mjs";
import { ActivityArchive } from "@/components/activity-form";
const date = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "Non indicata";
export function ActivityList({
  activities,
  projectId,
  readOnly,
}: {
  activities: Activity[];
  projectId: string;
  readOnly: boolean;
}) {
  if (!activities.length)
    return (
      <p className="activity-empty">
        Nessuna attività collegata a questo risultato.
      </p>
    );
  return (
    <ol className="framework-tree activity-list">
      {activities.map((activity) => (
        <li key={activity.id}>
          <article className="framework-item">
            <p className="eyebrow">Attività</p>
            <h3>
              {activity.code} — {activity.title}
            </h3>
            <span className="badge">
              {
                activityStatuses[
                  activity.status as keyof typeof activityStatuses
                ]
              }
            </span>
            <dl className="activity-dates">
              <div>
                <dt>Inizio previsto</dt>
                <dd>{date(activity.planned_start_date)}</dd>
              </div>
              <div>
                <dt>Fine prevista</dt>
                <dd>{date(activity.planned_end_date)}</dd>
              </div>
              <div>
                <dt>Inizio effettivo</dt>
                <dd>{date(activity.actual_start_date)}</dd>
              </div>
              <div>
                <dt>Fine effettiva</dt>
                <dd>{date(activity.actual_end_date)}</dd>
              </div>
            </dl>
            <p>
              Priorità:{" "}
              {
                activityPriorities[
                  activity.priority as keyof typeof activityPriorities
                ]
              }
            </p>
            {activity.description ? (
              <CompactText text={activity.description} />
            ) : null}
            {activity.output ? (
              <CompactText text={`Output: ${activity.output}`} />
            ) : null}
            {activity.notes ? (
              <CompactText text={`Note: ${activity.notes}`} />
            ) : null}
            {!readOnly ? (
              <div className="actions card-tools">
                {activity.status !== "archived" ? (
                  <Link className="icon-action" title={`Modifica attività ${activity.code}`} aria-label={`Modifica attività ${activity.code}`}
                    href={`/projects/${projectId}/quadro-logico?activity=${activity.id}`}
                  >
                    <UiIcon name="edit" />
                  </Link>
                ) : null}
                <ActivityArchive
                  projectId={projectId}
                  activity={{
                    id: activity.id,
                    status: activity.status,
                    row_version: activity.row_version,
                  }}
                />
              </div>
            ) : null}
          </article>
        </li>
      ))}
    </ol>
  );
}
