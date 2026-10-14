"use client";
import { useActionState } from "react";
import {
  changeStatus,
  linkOrganization,
  removeOrganization,
} from "@/app/(workspace)/projects/actions";
import { statuses, organizationRoles } from "@/lib/projects.mjs";
import { Submit } from "@/components/submit";
export function StatusForm({
  id,
  version,
  status,
}: {
  id: string;
  version: number;
  status: string;
}) {
  const [state, action] = useActionState(changeStatus.bind(null, id), {
    message: "",
  });
  return (
    <form action={action}>
      <input type="hidden" name="row_version" value={version} />
      <label>
        Nuovo stato
        <select name="status" defaultValue="" required>
          <option value="" disabled>
            Seleziona uno stato
          </option>
          {Object.entries(statuses)
            .filter(([key]) => key !== status)
            .map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
        </select>
      </label>
      <p>
        {status === "archived"
          ? "Riapri il progetto per modificarlo. La riapertura cambia soltanto lo stato."
          : "L’archiviazione conserva i dati e rende il progetto di sola lettura fino alla riapertura."}
      </p>
      <Submit>
        {status === "archived" ? "Riapri progetto" : "Aggiorna stato"}
      </Submit>
      {state.message ? (
        <p className="notice" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
export function OrganizationForm({
  id,
  organizations,
}: {
  id: string;
  organizations: { id: string; code: string; name: string }[];
}) {
  const [state, action] = useActionState(linkOrganization.bind(null, id), {
    message: "",
  });
  return (
    <form action={action}>
      <label>
        Ente
        <select required name="organization_id" defaultValue="">
          <option value="" disabled>
            Seleziona un ente
          </option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.code} — {o.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ruolo dell’ente
        <select name="role">
          {Object.entries(organizationRoles).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Submit>Associa ente</Submit>
      {state.message ? (
        <p className="notice" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
export function RemoveOrganization({ id, link }: { id: string; link: string }) {
  const [state, action] = useActionState(removeOrganization.bind(null, id), {
    message: "",
  });
  return (
    <form action={action}>
      <input type="hidden" name="link_id" value={link} />
      <Submit>Rimuovi associazione</Submit>
      {state.message ? <p role="status">{state.message}</p> : null}
    </form>
  );
}
