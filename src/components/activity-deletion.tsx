"use client";
import { useActionState } from "react";
import { changeActivityDeletion } from "@/app/(workspace)/projects/[id]/quadro-logico/activity-actions";
import type { Activity } from "@/lib/activity-data";
import { UiIcon } from "./ui-icon";
import { Submit } from "./submit";

export function ActivityDeletion({ projectId, activity, command }: {
  projectId: string;
  activity: Pick<Activity, "id" | "code" | "row_version">;
  command: "trash" | "restore" | "purge";
}) {
  const [state, action] = useActionState(changeActivityDeletion.bind(null, projectId, activity.id), { message: "" });
  const label = command === "trash" ? "Sposta nel cestino" : command === "restore" ? "Ripristina dal cestino" : "Elimina definitivamente";
  return (
    <form action={action} onSubmit={(event) => {
      const message = command === "purge"
        ? `Eliminare definitivamente ${activity.code}? Non sarà recuperabile. L’operazione è bloccata se esistono azioni collegate o riferimenti pubblicati.`
        : command === "trash"
          ? `Spostare ${activity.code} nel cestino? Potrai ripristinarla. I periodi della bozza verranno annullati; le azioni collegate e i piani pubblicati resteranno invariati.`
          : `Ripristinare ${activity.code}? I periodi della bozza dovranno essere verificati separatamente.`;
      if (!window.confirm(message)) event.preventDefault();
    }}>
      <input type="hidden" name="row_version" value={activity.row_version} />
      <input type="hidden" name="command" value={command} />
      <Submit label={`${label} ${activity.code}`}><UiIcon name={command === "restore" ? "restore" : command === "purge" ? "delete" : "trash"} /></Submit>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
