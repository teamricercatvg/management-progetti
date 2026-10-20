"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { validId, validVersion } from "@/lib/projects.mjs";
import { parseIndicator, indicatorError } from "@/lib/indicators.mjs";
export type IndicatorState = {
  message: string;
  errors?: Record<string, string>;
};
export async function saveIndicator(
  projectId: string,
  indicatorId: string | null,
  previous: IndicatorState,
  form: FormData,
): Promise<IndicatorState> {
  void previous;
  const { client } = await requireProfile();
  if (!validId(projectId) || (indicatorId && !validId(indicatorId)))
    return { message: "Operazione non consentita." };
  const { data, errors } = parseIndicator(form);
  if (Object.keys(errors).length)
    return { message: "Controlla i campi indicati.", errors };
  let result;
  if (indicatorId) {
    const version = form.get("row_version");
    if (!validVersion(version))
      return { message: "Versione non valida. Ricarica la pagina." };
    result = await client
      .from("indicators")
      .update(data)
      .eq("project_id", projectId)
      .eq("id", indicatorId)
      .eq("row_version", version)
      .neq("status", "archived")
      .select("id")
      .maybeSingle();
  } else
    result = await client
      .from("indicators")
      .insert({ ...data, project_id: projectId })
      .select("id")
      .single();
  if (result.error) return { message: indicatorError(result.error.code) };
  if (!result.data)
    return {
      message:
        "Indicatore modificato, archiviato o non più accessibile. Ricarica la pagina prima di riprovare.",
    };
  revalidatePath(`/projects/${projectId}/indicatori`);
  redirect(`/projects/${projectId}/indicatori?indicator_saved=1`);
}
export async function changeIndicatorArchive(
  projectId: string,
  indicatorId: string,
  previous: IndicatorState,
  form: FormData,
): Promise<IndicatorState> {
  void previous;
  const { client } = await requireProfile();
  const mode = String(form.get("mode"));
  const version = form.get("row_version");
  if (
    !validId(projectId) ||
    !validId(indicatorId) ||
    !validVersion(version) ||
    !["archive", "restore"].includes(mode)
  )
    return { message: "Operazione non valida." };
  let query = client
    .from("indicators")
    .update({ status: mode === "archive" ? "archived" : "draft" })
    .eq("project_id", projectId)
    .eq("id", indicatorId)
    .eq("row_version", version);
  query =
    mode === "archive"
      ? query.neq("status", "archived")
      : query.eq("status", "archived");
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return { message: indicatorError(error.code) };
  if (!data)
    return {
      message:
        "Indicatore modificato o non più accessibile. Ricarica la pagina.",
    };
  revalidatePath(`/projects/${projectId}/indicatori`);
  return {
    message:
      mode === "archive"
        ? "Indicatore archiviato."
        : "Indicatore ripristinato in bozza.",
  };
}
