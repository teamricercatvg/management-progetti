"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { validId, validVersion } from "@/lib/projects.mjs";
import { parseActivity, activityError } from "@/lib/activities.mjs";
export type ActivityState = {
  message: string;
  errors?: Record<string, string>;
};
export async function saveActivity(
  projectId: string,
  activityId: string | null,
  previous: ActivityState,
  form: FormData,
): Promise<ActivityState> {
  void previous;
  const { client } = await requireProfile();
  if (!validId(projectId) || (activityId && !validId(activityId)))
    return { message: "Operazione non consentita." };
  const { data, errors } = parseActivity(form);
  if (Object.keys(errors).length)
    return { message: "Controlla i campi indicati.", errors };
  let result;
  if (activityId) {
    const version = form.get("row_version");
    if (!validVersion(version))
      return { message: "Versione non valida. Ricarica la pagina." };
    result = await client
      .from("activities")
      .update(data)
      .eq("project_id", projectId)
      .eq("id", activityId)
      .eq("row_version", version)
      .neq("status", "archived")
      .select("id")
      .maybeSingle();
  } else
    result = await client
      .from("activities")
      .insert({ ...data, project_id: projectId })
      .select("id")
      .single();
  if (result.error) return { message: activityError(result.error.code) };
  if (!result.data)
    return {
      message:
        "Attività modificata, archiviata o non più accessibile. Ricarica la pagina prima di riprovare.",
    };
  revalidatePath(`/projects/${projectId}/quadro-logico`);
  revalidatePath(`/projects/${projectId}/cronoprogramma`);
  redirect(
    `/projects/${projectId}/${data.result_id ? "quadro-logico" : "cronoprogramma"}?activity_saved=1`,
  );
}
export async function changeActivityArchive(
  projectId: string,
  activityId: string,
  previous: ActivityState,
  form: FormData,
): Promise<ActivityState> {
  void previous;
  const { client } = await requireProfile();
  const mode = String(form.get("mode"));
  const version = form.get("row_version");
  if (
    !validId(projectId) ||
    !validId(activityId) ||
    !validVersion(version) ||
    !["archive", "restore"].includes(mode)
  )
    return { message: "Operazione non valida." };
  let query = client
    .from("activities")
    .update({ status: mode === "archive" ? "archived" : "planned" })
    .eq("project_id", projectId)
    .eq("id", activityId)
    .eq("row_version", version);
  query =
    mode === "archive"
      ? query.neq("status", "archived")
      : query.eq("status", "archived");
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return { message: activityError(error.code) };
  if (!data)
    return {
      message: "Attività modificata o non più accessibile. Ricarica la pagina.",
    };
  revalidatePath(`/projects/${projectId}/quadro-logico`);
  revalidatePath(`/projects/${projectId}/cronoprogramma`);
  return {
    message:
      mode === "archive" ? "Attività archiviata." : "Attività riattivata.",
  };
}

export async function changeActivityCancellation(
  projectId: string,
  activityId: string,
  previous: ActivityState,
  form: FormData,
): Promise<ActivityState> {
  void previous;
  const { client } = await requireProfile();
  const version = form.get("row_version"),
    mode = form.get("mode");
  const reason = String(form.get("reason") ?? "").trim();
  if (
    !validId(projectId) ||
    !validId(activityId) ||
    !validVersion(version) ||
    !["cancel", "resume"].includes(String(mode)) ||
    (mode === "cancel" && (!reason || reason.length > 2000))
  )
    return {
      message: "Verifica la motivazione e ricarica se la versione è cambiata.",
    };
  const { data, error } = await client
    .from("activities")
    .update({
      status: mode === "cancel" ? "cancelled" : "planned",
      cancellation_reason: mode === "cancel" ? reason : null,
    })
    .eq("project_id", projectId)
    .eq("id", activityId)
    .eq("row_version", version)
    .neq("status", "archived")
    .select("id")
    .maybeSingle();
  if (error) return { message: activityError(error.code) };
  if (!data)
    return { message: "Attività modificata o non accessibile. Ricarica." };
  revalidatePath(`/projects/${projectId}/quadro-logico`);
  revalidatePath(`/projects/${projectId}/cronoprogramma`);
  return {
    message:
      "Stato aggiornato. Il piano pubblicato resta invariato: modifica i periodi nella prossima revisione.",
  };
}
