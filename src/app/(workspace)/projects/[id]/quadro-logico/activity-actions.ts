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
  redirect(`/projects/${projectId}/quadro-logico?activity_saved=1`);
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
  return {
    message:
      mode === "archive" ? "Attività archiviata." : "Attività riattivata.",
  };
}
