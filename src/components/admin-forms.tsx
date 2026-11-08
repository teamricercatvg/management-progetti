"use client";
import { useActionState, useState, useRef } from "react";
import { changeUser, inviteUser } from "@/app/(workspace)/admin/actions";
import { Submit } from "./submit";
import type { AdminProfile } from "@/lib/admin-data";

export type InviteProject = { id: string; code: string; title: string };
export function InviteDialog({ projects }: { projects: InviteProject[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [generation, setGeneration] = useState(0);
  return <>
    <button type="button" onClick={() => { setGeneration(value => value + 1); dialog.current?.showModal(); }}>Invita un utente</button>
    <dialog ref={dialog} className="invite-dialog" aria-labelledby="invite-title">
      <div className="invite-dialog-heading"><h2 id="invite-title">Invita un utente</h2><button type="button" aria-label="Chiudi invito" onClick={() => dialog.current?.close()}>Chiudi</button></div>
      <p>Invia un’email per impostare la password e scegli gli accessi del nuovo utente.</p>
      <InviteForm key={generation} projects={projects} />
    </dialog>
  </>;
}
export function InviteForm({ id, projects = [] }: { id?: string; projects?: InviteProject[] }) {
  const [state, action] = useActionState(inviteUser, { message: "" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manager");
  const [selected, setSelected] = useState<string[]>([]);
  return <form action={action} >
    {id ? <input type="hidden" name="id" value={id} /> : <>
      <label>Nome <input name="display_name" value={name} onChange={event => setName(event.target.value)} required maxLength={120} autoComplete="name" /></label>
      <label>Email <input name="email" value={email} onChange={event => setEmail(event.target.value)} type="email" required maxLength={254} autoComplete="email" /></label>
      <label>Ruolo <select name="role" value={role} onChange={event => setRole(event.target.value)}><option value="manager">Manager</option><option value="admin">Admin</option></select></label>
      {role === "admin" ? <p>L’Admin può gestire tutti gli utenti e accedere a tutti i progetti.</p> : <fieldset className="invite-projects"><legend>Progetti da assegnare</legend><p>Seleziona almeno un progetto per il Manager.</p>
        {projects.length ? projects.map(project => <label key={project.id}><input type="checkbox" name="project_ids" value={project.id} checked={selected.includes(project.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, project.id] : previous.filter(value => value !== project.id))} />{project.code} — {project.title}</label>) : <p>Nessun progetto disponibile per l’assegnazione.</p>}
      </fieldset>}
    </>}
    {state.ok || state.userId ? <p><a href={`/admin/${state.userId}`}>Apri il profilo dell’utente</a></p> : <Submit>{id ? "Reinvia invito" : "Invia invito"}</Submit>}
    {state.message && <p role="status">{state.message}</p>}
  </form>;
}
export function ProfileNameForm({ profile }: { profile: AdminProfile }) {
  const [state, action] = useActionState(changeUser, { message: "" });
  return <form action={action} >
    <input type="hidden" name="id" value={profile.id} />
    <input type="hidden" name="command" value="name" />
    <input type="hidden" name="row_version" value={profile.row_version} />
    <label>Nome <input name="display_name" defaultValue={profile.display_name} required maxLength={120} /></label>
    <Submit>Salva nome</Submit>{state.message && <p role="status">{state.message}</p>}
  </form>;
}
export function AccessForm({ id, command, enabled, label, projectId, disabled = false }: {
  id: string; command: "active" | "admin" | "membership"; enabled: boolean; label: string; projectId?: string; disabled?: boolean;
}) {
  const [state, action] = useActionState(changeUser, { message: "" });
  return <form className="admin-access" action={action} onSubmit={(event) => { if (!window.confirm(`${label}? La modifica avrà effetto sulle successive operazioni dell’utente.`)) event.preventDefault(); }}>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="command" value={command} />
    <input type="hidden" name="enabled" value={String(enabled)} />
    {projectId && <input type="hidden" name="project_id" value={projectId} />}
    <fieldset disabled={disabled}><Submit>{label}</Submit></fieldset>
    {state.message && <p role="status">{state.message}</p>}
  </form>;
}
