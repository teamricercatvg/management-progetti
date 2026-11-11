import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, adminAuth, type AdminProfile } from "@/lib/admin-data";
import { validId } from "@/lib/projects.mjs";
import { AccessForm, InviteForm, ProfileNameForm } from "@/components/admin-forms";
export const metadata = { title: "Profilo e accessi" };
export default async function AdminUser({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (!validId(id)) notFound();
  const search = await searchParams;
  const q = (search.q || "").trim().slice(0, 120);
  const page = Math.min(100000, Math.max(1, Math.floor(Number(search.page) || 1)));
  let projectQuery = client.from("projects").select("id,code,title,status", { count: "exact" }).order("code").order("id").range((page - 1) * 25, page * 25 - 1);
  if (q) {
    // Quote PostgREST operands and treat wildcard characters as literal text.
    const pattern = JSON.stringify(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
    projectQuery = projectQuery.or(`code.ilike.${pattern},title.ilike.${pattern}`);
  }
  const [profileResult, roles, projects, authResult] = await Promise.all([
    client.from("profiles").select("id,display_name,is_active,row_version").eq("id", id).maybeSingle(),
    client.from("global_user_roles").select("user_id").eq("user_id", id),
    projectQuery,
    adminAuth().then(auth => auth.getUserById(id)).catch(() => null),
  ]);
  if (profileResult.error || roles.error || projects.error) throw new Error("Impossibile caricare il profilo e gli accessi.");
  if (!profileResult.data) notFound();
  const profile = profileResult.data as AdminProfile;
  const isAdmin = Boolean(roles.data?.length);
  const projectIds = (projects.data || []).map(project => project.id);
  const memberships = projectIds.length ? await client.from("project_memberships").select("project_id,status").eq("user_id", id).in("project_id", projectIds) : { data: [], error: null };
  if (memberships.error) throw new Error("Impossibile caricare le assegnazioni.");
  const statuses = new Map((memberships.data || []).map(m => [m.project_id, m.status]));
  const authUser = authResult?.data?.user;
  return <>
    <Link href="/admin">← Utenti e accessi</Link>
    <div className="page-heading"><h1>{profile.display_name}</h1><p>{profile.is_active ? "Profilo attivo" : "Profilo disabilitato"} · {isAdmin ? "Amministratore" : "Accesso tramite assegnazioni ai progetti"}</p></div>
    <section className="panel"><h2>Profilo</h2><ProfileNameForm key={profile.row_version} profile={profile} />
      {authUser ? <><p>Email: {authUser.email || "Non disponibile"}</p><p>{authUser.email_confirmed_at ? "Email confermata" : authUser.invited_at ? "Invito in attesa di accettazione" : "Email non confermata"}</p>
        {authUser.invited_at && <p>Invito: {new Date(authUser.confirmation_sent_at || authUser.invited_at).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</p>}
        {!authUser.email_confirmed_at && authUser.invited_at && profile.is_active && <><p>Se il collegamento è scaduto, reinvia l’invito. La scadenza è verificata al momento dell’accettazione.</p><InviteForm id={id} /></>}
      </> : <p role="alert">Dati dell’invito non disponibili. Le impostazioni di accesso restano consultabili.</p>}
    </section>
    <section className="panel"><h2>Accesso alla piattaforma</h2><p>La disabilitazione conserva dati, ruoli e assegnazioni; la riattivazione ripristina gli accessi precedenti. L’ultimo Admin attivo è protetto.</p>
      <AccessForm id={id} command="active" enabled={!profile.is_active} label={profile.is_active ? "Disabilita utente" : "Riattiva utente"} />
      <AccessForm id={id} command="admin" enabled={!isAdmin} label={isAdmin ? "Revoca ruolo Admin" : "Assegna ruolo Admin"} disabled={!profile.is_active && !isAdmin} />
    </section>
    <section className="panel"><h2>Assegnazioni Manager</h2><p>Un Admin accede a tutti i progetti anche senza assegnazioni. I progetti archiviati richiedono la riapertura prima di modificare gli accessi.</p>
      <form><label>Cerca progetto per codice o titolo <input name="q" defaultValue={q} maxLength={120} /></label><button type="submit">Cerca</button></form>
      <ul className="admin-users">{(projects.data || []).map(project => {
        const active = statuses.get(project.id) === "active";
        return <li key={project.id}><div><Link href={`/projects/${project.id}`}>{project.code} — {project.title}</Link><p>{active ? "Manager assegnato" : "Non assegnato"}{project.status === "archived" ? " · Progetto archiviato" : ""}</p></div><AccessForm id={id} projectId={project.id} command="membership" enabled={!active} label={`${active ? "Revoca" : "Assegna"} Manager — ${project.code}`} disabled={project.status === "archived" || (!active && !profile.is_active)} /></li>;
      })}</ul>
      {!projects.data?.length && <p>Nessun progetto trovato.</p>}
      <nav aria-label="Pagine progetti">{page > 1 && <Link href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>Precedente</Link>} <span>Pagina {page}</span> {page * 25 < (projects.count || 0) && <Link href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>Successiva</Link>}</nav>
    </section>
  </>;
}
