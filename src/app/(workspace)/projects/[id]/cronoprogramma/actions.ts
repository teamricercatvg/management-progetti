"use server";
import { requireProfile } from "@/lib/auth";
import { validId, validVersion, validDate } from "@/lib/projects.mjs";
import { revalidatePath } from "next/cache";
export async function scheduleAction(
  projectId: string,
  command: string,
  previous: { message: string },
  form: FormData,
): Promise<{ message: string }> {
  void previous;
  const { client } = await requireProfile();
  const value = (k: string) => String(form.get(k) ?? "").trim();
  if (
    !validId(projectId) ||
    !["create", "period", "publish"].includes(command) ||
    (command !== "create" && !validVersion(form.get("row_version")))
  )
    return { message: "Richiesta non valida. Ricarica la pagina." };
  const payload: Record<string, string> = {};
  if (command === "period") {
    for (const key of [
      "activity_id",
      "period_key",
      "start_date",
      "end_date",
      "title",
      "status",
      "notes",
    ])
      if (value(key)) payload[key] = value(key);
    if (
      !validId(payload.activity_id) ||
      (payload.period_key && !validId(payload.period_key)) ||
      !validDate(payload.start_date) ||
      !validDate(payload.end_date) ||
      payload.end_date < payload.start_date ||
      !payload.title ||
      payload.title.length > 240 ||
      (payload.notes?.length ?? 0) > 4000
    )
      return { message: "Verifica attività, titolo e date del periodo." };
  } else {
    payload.reason = value("reason");
    payload.title = value("title");
    if (
      !payload.reason ||
      payload.reason.length > 4000 ||
      (command === "create" && (!payload.title || payload.title.length > 240))
    )
      return { message: "Inserisci titolo e motivazione." };
  }
  const { error } = await client.rpc("edit_schedule", {
    target_project: projectId,
    command,
    expected_version:
      command === "create" ? null : Number(value("row_version")),
    payload,
  });
  if (error)
    return {
      message:
        error.code === "40001"
          ? "La bozza è cambiata. Ricarica prima di salvare: i campi sono conservati."
          : error.code === "23514"
            ? "Controlla i periodi: alla pubblicazione devono rientrare nelle date del progetto e riferirsi ad attività attive. Annulla i periodi non più previsti."
            : error.code === "42501"
              ? "Progetto non modificabile o accesso revocato."
              : "Operazione non riuscita. Verifica i campi e ricarica.",
    };
  revalidatePath(`/projects/${projectId}/cronoprogramma`);
  revalidatePath(`/projects/${projectId}/quadro-logico`);
  return {
    message: command === "publish" ? "Piano pubblicato." : "Bozza salvata.",
  };
}
