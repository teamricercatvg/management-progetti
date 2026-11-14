import { accountSetup } from "@/lib/account-setup.mjs";
import { requireAdmin, adminAuth } from "@/lib/admin-data";
import { InviteDialog } from "@/components/admin-forms";
import { AdminDirectory, type DirectoryRow } from "@/components/admin-directory";
export const metadata = { title: "Utenti e accessi" };

// Fetch every page before joining/filtering. Never show an incomplete directory.
async function readAll<T>(read: (offset: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < 100_000; offset += 500) {
    const result = await read(offset);
    if (result.error) throw new Error("Directory non disponibile");
    rows.push(...(result.data || []));
    if ((result.data?.length || 0) < 500) return rows;
  }
  throw new Error("Directory troppo estesa");
}
async function readEmails() {
  const auth = await adminAuth();
  const emails = new Map<string, { email: string; setup: string }>();
  for (let page = 1; page <= 1000; page++) {
    const { data, error } = await auth.listUsers({ page, perPage: 100 });
    if (error) throw new Error("Email non disponibili");
    data.users.forEach(user => emails.set(user.id, { email: user.email || "", setup: accountSetup(user) }));
    if (data.users.length < 100) return emails;
  }
  throw new Error("Directory Auth troppo estesa");
}
export default async function Admin() {
  const { client } = await requireAdmin();
  let rows: DirectoryRow[] = [];
  let inviteProjects: { id: string; code: string; title: string }[] = [];
  let unavailable = false;
  try {
    const [profiles, roles, memberships, projects, emails] = await Promise.all([
      readAll(offset => client.from("profiles").select("id,display_name,is_active").order("id").range(offset, offset + 499)),
      readAll(offset => client.from("global_user_roles").select("user_id").order("user_id").range(offset, offset + 499)),
      readAll(offset => client.from("project_memberships").select("id,user_id,project_id").eq("status", "active").order("id").range(offset, offset + 499)),
      readAll(offset => client.from("projects").select("id,code,title,status").order("id").range(offset, offset + 499)),
      readEmails(),
    ]);
    const admins = new Set(roles.map(role => role.user_id));
    const projectById = new Map(projects.map(project => [project.id, project]));
    inviteProjects = projects.filter(project => project.status !== "archived");
    const allProjectsSearchText = projects.map(project => `${project.code} — ${project.title}`).join(" ");
    rows = profiles.map(profile => {
      if (!emails.has(profile.id)) throw new Error("Profilo Auth non disponibile");
      const assigned = memberships.filter(membership => membership.user_id === profile.id).map(membership => {
        const project = projectById.get(membership.project_id);
        if (!project) throw new Error("Progetto non disponibile");
        return { id: project.id, label: `${project.code} — ${project.title}${project.status === "archived" ? " (archiviato)" : ""}` };
      }).sort((a, b) => a.label.localeCompare(b.label, "it", { numeric: true }));
      const isAdmin = admins.has(profile.id);
      return {
        id: profile.id, name: profile.display_name, email: emails.get(profile.id)?.email || "",
        status: profile.is_active ? emails.get(profile.id)!.setup : "Disabilitato",
        role: isAdmin ? "Admin" : assigned.length ? "Manager" : "Nessun ruolo assegnato",
        isAdmin, projects: assigned,
        projectsSearchText: isAdmin ? allProjectsSearchText : "",
        projectsText: [isAdmin ? "Accesso a tutti i progetti" : "", ...assigned.map(project => project.label), !isAdmin && !assigned.length ? "Nessun progetto" : ""].join(" ").trim(),
      };
    });
  } catch { unavailable = true; }
  return <>
    <div className="page-heading"><span className="eyebrow">Amministrazione</span><h1>Utenti e accessi</h1><p>Gestisci profili, inviti e accessi ai progetti.</p></div>
    {!unavailable && <div className="admin-toolbar"><InviteDialog projects={inviteProjects} /></div>}
    <section className="panel"><h2>Utenti</h2>
      {unavailable ? <p role="alert">Impossibile caricare l’elenco completo con email e accessi. Ricarica la pagina; se il problema persiste, verifica il servizio utenti.</p> : <AdminDirectory rows={rows} />}
    </section>
  </>;
}
