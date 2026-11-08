"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, adminAuth } from "@/lib/admin-data";
import { validId } from "@/lib/projects.mjs";
import { validEmail, appOrigin } from "@/lib/validation.mjs";
export type AdminState = { message: string; ok?: boolean; userId?: string };
const failed = { message: "Operazione non riuscita. Ricarica e verifica i permessi, l’ultimo Admin attivo e lo stato del progetto." };

export async function changeUser(_: AdminState, form: FormData): Promise<AdminState> {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const command = String(form.get("command") ?? "");
  if (!validId(id)) return { message: "Utente non valido." };
  const { data: target, error: targetError } = await client.from("profiles").select("id,is_active").eq("id", id).maybeSingle();
  if (targetError || !target) return failed;
  const enabled = form.get("enabled") === "true";
  let error;
  if (command === "name") {
    const name = String(form.get("display_name") ?? "").trim();
    const version = Number(form.get("row_version"));
    if (!name || name.length > 120 || !Number.isSafeInteger(version) || version < 1) return { message: "Inserisci un nome di massimo 120 caratteri." };
    const result = await client.from("profiles").update({ display_name: name }).eq("id", id).eq("row_version", version).select("id");
    if (!result.error && !result.data?.length) return { message: "Il profilo è cambiato. Ricarica prima di salvare." };
    error = result.error;
  } else if (command === "active" || command === "admin") {
    if (!["true", "false"].includes(String(form.get("enabled")))) return failed;
    const result = await client.rpc(command === "active" ? "set_profile_active" : "set_admin_role", command === "active" ? { target_user: id, active: enabled } : { target_user: id, enabled });
    error = result.error;
  } else if (command === "membership") {
    const projectId = String(form.get("project_id") ?? "");
    if (!validId(projectId) || !["true", "false"].includes(String(form.get("enabled")))) return failed;
    const { data: project, error: projectError } = await client.from("projects").select("id,status").eq("id", projectId).maybeSingle();
    if (projectError || !project || project.status === "archived") return { message: "Per modificare gli accessi riapri prima il progetto archiviato." };
    if (enabled && !target.is_active) return { message: "Riattiva il profilo prima di assegnare un progetto." };
    const { data: membership, error: readError } = await client.from("project_memberships").select("id,row_version").eq("project_id", projectId).eq("user_id", id).maybeSingle();
    if (readError) return failed;
    const status = enabled ? "active" : "inactive";
    if (membership) {
      const result = await client.from("project_memberships").update({ status }).eq("id", membership.id).eq("row_version", membership.row_version).select("id");
      if (!result.error && !result.data?.length) return { message: "Assegnazione modificata contemporaneamente. Ricarica e riprova." };
      error = result.error;
    } else if (enabled) {
      const result = await client.from("project_memberships").insert({ project_id: projectId, user_id: id, role: "manager", status }).select("id");
      error = result.error;
      if (!error && !result.data?.length) return failed;
    } else return { message: "Assegnazione non trovata. Ricarica la pagina." };
  } else return failed;
  if (error) return failed;
  revalidatePath("/admin", "layout");
  revalidatePath("/projects", "layout");
  return { message: "Modifica salvata.", ok: true };
}

export async function inviteUser(_: AdminState, form: FormData): Promise<AdminState> {
  const { client } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("display_name") ?? "").trim();
  let email = String(form.get("email") ?? "").trim().toLowerCase();
  if (id && !validId(id)) return failed;
  if (!id && (!validEmail(email) || !name || name.length > 120)) return { message: "Inserisci nome ed email validi." };
  const role = String(form.get("role") ?? "");
  const projectIds = [...new Set(form.getAll("project_ids").map(String))];
  if (!id) {
    if (!["admin", "manager"].includes(role)) return { message: "Seleziona un ruolo valido." };
    if (role === "manager") {
      if (!projectIds.length || projectIds.length > 100 || projectIds.some(value => !validId(value))) return { message: "Seleziona da 1 a 100 progetti validi per il Manager." };
      const { data, error } = await client.from("projects").select("id,status").in("id", projectIds);
      if (error || data?.length !== projectIds.length || data.some(project => project.status === "archived")) return { message: "Uno dei progetti non è disponibile. Ricarica e controlla le assegnazioni." };
    }
  }
  let invitedId: string | undefined;
  try {
    const auth = await adminAuth();
    if (id) {
      const [{ data, error }, profile] = await Promise.all([
        auth.getUserById(id),
        client.from("profiles").select("is_active").eq("id", id).maybeSingle(),
      ]);
      if (error || profile.error || !profile.data?.is_active || !data.user?.email || data.user.email_confirmed_at || !data.user.invited_at) return { message: "Reinvio disponibile solo per inviti in attesa di utenti attivi." };
      const sentAt = data.user.confirmation_sent_at || data.user.invited_at;
      if (Date.now() - Date.parse(sentAt) < 60_000) return { message: "Attendi almeno un minuto prima di reinviare." };
      email = data.user.email;
    }
    if (!id) {
      // Auth has no exact-email lookup: exhaust pages before creating an invitation.
      // Existing accounts (including disabled/unconfirmed ones) must use their detail page.
      let complete = false;
      for (let page = 1; page <= 1000; page++) {
        const { data, error } = await auth.listUsers({ page, perPage: 100 });
        if (error) return { message: "Impossibile verificare gli utenti esistenti. Riprova." };
        if (data.users.some(user => user.email?.toLowerCase() === email)) return { message: "Invito non inviato: email già presente. Apri il profilo esistente per gestire l’accesso o reinviare l’invito." };
        if (data.users.length < 100) { complete = true; break; }
      }
      if (!complete) return { message: "Verifica utenti incompleta. Contatta l’amministratore tecnico." };
    }
    if (!process.env.APP_URL) return { message: "Indirizzo dell’applicazione non configurato." };
    const { data: invitation, error } = await auth.inviteUserByEmail(email, {
      redirectTo: `${appOrigin(process.env.APP_URL)}/auth/accept`,
      ...(id ? {} : { data: { display_name: name } }),
    });
    if (error) return { message: "Invito non inviato: verifica se l’email è già registrata oppure attendi prima di riprovare. Per un utente già confermato usa il recupero password." };
    invitedId = invitation.user?.id || id || undefined;
    if (!invitedId) return { message: "Invito elaborato, ma il profilo non è verificabile. Controlla l’elenco utenti prima di riprovare." };
    if (!id) {
      const accessResult = role === "admin"
        ? await client.rpc("set_admin_role", { target_user: invitedId, enabled: true })
        : await client.from("project_memberships").insert(projectIds.map(project_id => ({ project_id, user_id: invitedId, role: "manager", status: "active" }))).select("id");
      if (accessResult.error || (role === "manager" && accessResult.data?.length !== projectIds.length)) {
        revalidatePath("/admin", "layout");
        return { message: "Invito inviato, ma gli accessi richiesti non sono stati completati. Apri il profilo per verificarli e completarli; non inviare un nuovo invito.", userId: invitedId };
      }
    }
    revalidatePath("/admin", "layout");
    return { userId: invitedId, message: "Invito inviato. Se il vecchio link è scaduto, usa quello della nuova email.", ok: true };
  } catch {
    if (invitedId) {
      revalidatePath("/admin", "layout");
      return { message: "Invito inviato, ma non è stato possibile verificare gli accessi. Apri il profilo per completarli.", userId: invitedId };
    }
    return { message: "Servizio inviti non disponibile. Controlla l’elenco utenti prima di riprovare." };
  }
}
