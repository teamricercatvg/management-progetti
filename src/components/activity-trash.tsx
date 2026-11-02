import type { Activity } from "@/lib/activity-data";
import { ActivityDeletion } from "./activity-deletion";

export function ActivityTrash({ projectId, activities, isAdmin, readOnly }: {
  projectId: string; activities: Activity[]; isAdmin: boolean; readOnly: boolean;
}) {
  return (
    <details>
      <summary>Cestino attività e azioni ({activities.length})</summary>
      {activities.length === 0 ? <p>Il cestino è vuoto.</p> : (
        <ul className="project-list">
          {activities.map((a) => (
            <li key={a.id}>
              <div><strong>{a.code} — {a.title}</strong>
                {!readOnly && <div className="actions">
                  <ActivityDeletion projectId={projectId} activity={a} command="restore" />
                  {isAdmin && <ActivityDeletion projectId={projectId} activity={a} command="purge" />}
                </div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
