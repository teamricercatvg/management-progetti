import Link from "next/link";
import { getProject } from "@/lib/project-data";
import { statuses, organizationRoles } from "@/lib/projects.mjs";
import {
  StatusForm,
  OrganizationForm,
  RemoveOrganization,
} from "@/components/project-controls";
export const metadata = { title: "Dettaglio progetto" };
export default async function ProjectDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { project, client } = await getProject((await params).id);
  const search = await searchParams;
  const term =
    typeof search.organization === "string"
      ? search.organization.trim().slice(0, 120)
      : "";
  const [links, managers, organizations] = await Promise.all([
    client
      .from("project_organizations")
      .select("id,role,organizations(code,name)")
      .eq("project_id", project.id)
      .order("created_at"),
    client.rpc("project_manager_names", { project_id: project.id }),
    term.length >= 2 && project.status !== "archived"
      ? client.rpc("search_organizations", { query: term })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (links.error || managers.error || organizations.error)
    throw new Error("Impossibile caricare i dati del progetto.");
  const archived = project.status === "archived";
  return (
    <>
      <div className="page-heading">
        <Link href="/projects">← Tutti i progetti</Link>
        <p className="eyebrow">{project.code}</p>
        <h1>{project.title}</h1>
        <span className="badge">
          {statuses[project.status as keyof typeof statuses]}
        </span>
        {!archived ? (
          <div className="actions">
            <Link className="button-link" href={`/projects/${project.id}/edit`}>
              Modifica progetto
            </Link>
          </div>
        ) : null}
      </div>
      <div className="actions">
        <Link
          className="button-link"
          href={`/projects/${project.id}/quadro-logico`}
        >
          Quadro logico
        </Link>
        <Link className="button-link" href={`/projects/${project.id}/indicatori`}>Indicatori</Link>
      </div>
      <Link className="button-link" href={`/projects/${project.id}/cronoprogramma`}>Cronoprogramma</Link>
      {search.saved === "1" ? (
        <p className="notice" role="status">
          Progetto salvato.
        </p>
      ) : null}
      <div className="card-grid">
        <section>
          <h2>Anagrafica</h2>
          <dl>
            <dt>Periodo</dt>
            <dd>
              {project.start_date.split("-").reverse().join("/")} —{" "}
              {project.end_date.split("-").reverse().join("/")}
            </dd>
            <dt>Valuta principale</dt>
            <dd>{project.currency_code}</dd>
            <dt>Finanziatore</dt>
            <dd>{project.donor || "Non indicato"}</dd>
            <dt>Descrizione</dt>
            <dd className="prose-text">
              {project.description || "Non indicata"}
            </dd>
            <dt>Note</dt>
            <dd className="prose-text">{project.notes || "Nessuna nota"}</dd>
            <dt>Manager assegnati</dt>
            <dd>
              {managers.data?.length
                ? managers.data
                    .map((m: { display_name: string }) => m.display_name)
                    .join(", ")
                : "Nessun Manager assegnato"}
            </dd>
          </dl>
        </section>
        <section>
          <h2>{archived ? "Riapertura" : "Stato del progetto"}</h2>
          <StatusForm
            id={project.id}
            version={project.row_version}
            status={project.status}
          />
        </section>
      </div>
      <section className="admin-card">
        <h2>Enti del progetto</h2>
        <p>
          Per attivare o concludere il progetto serve un ente unico oppure un
          capofila con almeno un partner. Le associazioni possono essere rimosse
          solo in bozza.
        </p>
        {links.data?.length ? (
          <ul className="project-list">
            {links.data.map((link) => {
              const entity = link.organizations as unknown as {
                code: string;
                name: string;
              } | null;
              return (
                <li key={link.id}>
                  <div>
                    <strong>
                      {entity
                        ? `${entity.code} — ${entity.name}`
                        : "Ente non disponibile"}
                    </strong>
                    <p>
                      {
                        organizationRoles[
                          link.role as keyof typeof organizationRoles
                        ]
                      }
                    </p>
                    {project.status === "draft" ? (
                      <RemoveOrganization id={project.id} link={link.id} />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>Nessun ente associato.</p>
        )}
        {!archived ? (
          <>
            <form method="get">
              <label>
                Cerca un ente esistente
                <input
                  name="organization"
                  minLength={2}
                  maxLength={120}
                  defaultValue={term}
                  required
                />
              </label>
              <button type="submit">Cerca enti</button>
            </form>
            {term.length >= 2 ? (
              organizations.data?.length ? (
                <OrganizationForm
                  id={project.id}
                  organizations={organizations.data}
                />
              ) : (
                <p className="notice">
                  Nessun ente trovato. L’anagrafica degli enti è gestita
                  dall’amministratore.
                </p>
              )
            ) : null}
          </>
        ) : null}
      </section>
    </>
  );
}
