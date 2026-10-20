"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { validId, validVersion } from "@/lib/projects.mjs";
import { parseFramework, frameworkError } from "@/lib/framework.mjs";
export type FrameworkState = {
  message: string;
  errors?: Record<string, string>;
};
export async function saveFramework(
  projectId: string,
  itemId: string | null,
  previous: FrameworkState,
  form: FormData,
): Promise<FrameworkState> {
  void previous;
  const { client } = await requireProfile();
  if (!validId(projectId) || (itemId && !validId(itemId)))
    return { message: "Operazione non consentita." };
  const { data, errors } = parseFramework(form);
  if (Object.keys(errors).length)
    return { message: "Controlla i campi indicati.", errors };
  let result;
  if (itemId) {
    const version = form.get("row_version");
    if (!validVersion(version))
      return { message: "Versione non valida. Ricarica la pagina." };
    result = await client
      .from("logical_framework_items")
      .update(data)
      .eq("id", itemId)
      .eq("project_id", projectId)
      .eq("row_version", version)
      .eq("status", "active")
      .select("id")
      .maybeSingle();
  } else {
    result = await client
      .from("logical_framework_items")
      .insert({ ...data, project_id: projectId })
      .select("id")
      .single();
  }
  if (result.error) return { message: frameworkError(result.error.code) };
  if (!result.data)
    return {
      message:
        "Elemento modificato o non più accessibile. Ricarica la pagina prima di riprovare.",
    };
  revalidatePath(`/projects/${projectId}/quadro-logico`);
  redirect(`/projects/${projectId}/quadro-logico?saved=1`);
}
export async function setFrameworkStatus(
  projectId: string,
  itemId: string,
  previous: FrameworkState,
  form: FormData,
): Promise<FrameworkState> {
  void previous;
  const { client } = await requireProfile();
  const status = String(form.get("status"));
  const version = form.get("row_version");
  if (
    !validId(projectId) ||
    !validId(itemId) ||
    !validVersion(version) ||
    !["active", "archived"].includes(status)
  )
    return { message: "Operazione non valida." };
  if (status === "archived") {
    const { data, error } = await client.rpc("archive_framework_branch", {
      target_project: projectId, target_item: itemId, expected_version: Number(version),
    });
    if (error) return { message: frameworkError(error.code) };
    if (!data) return { message: "Elemento modificato o non più accessibile. Ricarica la pagina." };
    revalidatePath(`/projects/${projectId}/quadro-logico`);
    return { message: "Elemento e discendenti archiviati." };
  }
  const { data, error } = await client
    .from("logical_framework_items")
    .update({ status })
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("row_version", version)
    .neq("status", status)
    .select("id")
    .maybeSingle();
  if (error) return { message: frameworkError(error.code) };
  if (!data)
    return {
      message: "Elemento modificato o non più accessibile. Ricarica la pagina.",
    };
  revalidatePath(`/projects/${projectId}/quadro-logico`);
  return {
    message:
      status === "active" ? "Elemento riattivato." : "Elemento archiviato.",
  };
}
