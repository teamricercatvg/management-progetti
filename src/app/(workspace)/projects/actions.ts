"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import {
  parseProject,
  projectError,
  validId,
  validVersion,
  statuses,
  organizationRoles,
} from "@/lib/projects.mjs";
export type ProjectState = { message: string; errors?: Record<string, string> };
export async function saveProject(
  id: string | null,
  previous: ProjectState,
  form: FormData,
): Promise<ProjectState> {
  void previous;
  const { client, profile } = await requireProfile();
  if ((!id && !profile.is_admin) || (id && !validId(id)))
    return { message: "Operazione non consentita." };
  const { data, errors } = parseProject(form);
  if (Object.keys(errors).length)
    return { message: "Controlla i campi indicati.", errors };
  let savedId: string;
  if (id) {
    const version = form.get("row_version");
    if (!validVersion(version))
      return { message: "Versione non valida. Ricarica la pagina." };
    const result = await client
      .from("projects")
      .update(data)
      .eq("id", id)
      .eq("row_version", version)
      .neq("status", "archived")
      .select("id")
      .maybeSingle();
    if (result.error) return { message: projectError(result.error.code) };
    if (!result.data)
      return {
        message:
          "Progetto modificato da un altro utente, archiviato o non più accessibile. Ricarica la pagina prima di riprovare.",
      };
    savedId = result.data.id;
  } else {
    const result = await client
      .from("projects")
      .insert({ ...data, status: "draft" })
      .select("id")
      .single();
    if (result.error) return { message: projectError(result.error.code) };
    savedId = result.data.id;
  }
  revalidatePath("/projects");
  revalidatePath(`/projects/${savedId}`);
  redirect(`/projects/${savedId}?saved=1`);
}
export async function changeStatus(
  id: string,
  previous: ProjectState,
  form: FormData,
): Promise<ProjectState> {
  void previous;
  const { client } = await requireProfile();
  const status = String(form.get("status") ?? "");
  const version = form.get("row_version");
  if (
    !validId(id) ||
    !validVersion(version) ||
    !Object.hasOwn(statuses, status)
  )
    return { message: "Stato o versione non validi." };
  const { data, error } = await client
    .from("projects")
    .update({ status })
    .eq("id", id)
    .eq("row_version", version)
    .neq("status", status)
    .select("id")
    .maybeSingle();
  if (error) return { message: projectError(error.code) };
  if (!data)
    return {
      message:
        "Nessuna modifica: progetto aggiornato o non più accessibile. Ricarica la pagina.",
    };
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { message: "Stato aggiornato." };
}
export async function linkOrganization(
  id: string,
  previous: ProjectState,
  form: FormData,
): Promise<ProjectState> {
  void previous;
  const { client } = await requireProfile();
  const organization_id = String(form.get("organization_id") ?? "");
  const role = String(form.get("role") ?? "");
  if (
    !validId(id) ||
    !validId(organization_id) ||
    !Object.hasOwn(organizationRoles, role)
  )
    return { message: "Seleziona ente e ruolo validi." };
  const { error } = await client
    .from("project_organizations")
    .insert({ project_id: id, organization_id, role });
  if (error) return { message: projectError(error.code) };
  revalidatePath(`/projects/${id}`);
  return { message: "Ente associato." };
}
export async function removeOrganization(
  id: string,
  previous: ProjectState,
  form: FormData,
): Promise<ProjectState> {
  void previous;
  const { client } = await requireProfile();
  const link = String(form.get("link_id") ?? "");
  if (!validId(id) || !validId(link))
    return { message: "Associazione non valida." };
  const { error } = await client.rpc("remove_draft_project_organization", {
    target_project: id,
    target_link: link,
  });
  if (error) return { message: projectError(error.code) };
  revalidatePath(`/projects/${id}`);
  return { message: "Associazione rimossa." };
}
