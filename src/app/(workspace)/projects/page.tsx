import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { statuses } from "@/lib/projects.mjs";
export const metadata = { title: "Progetti" };
export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { client, profile } = await requireProfile();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const status =
    typeof params.status === "string" && Object.hasOwn(statuses, params.status)
      ? params.status
      : "";
  const page =
    typeof params.page === "string" && /^[1-9]\d{0,5}$/.test(params.page)
      ? Number(params.page)
      : 1;
  let query = client
    .from("projects")
    .select("id,code,title,status,start_date,end_date,currency_code", {
      count: "exact",
    })
    .order("code")
    .order("id");
  // Quoted PostgREST operands prevent filter injection; wildcard characters are literal.
  if (q) {
    const pattern = JSON.stringify(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
    query = query.or(`code.ilike.${pattern},title.ilike.${pattern}`);
  }
  if (status) query = query.eq("status", status);
  const { data, count, error } = await query.range(
    (page - 1) * 20,
    page * 20 - 1,
  );
  if (error) throw new Error("Impossibile caricare i progetti.");
  const pageUrl = (p: number) =>
    `/projects?${new URLSearchParams({ q, status, page: String(p) })}`;
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">Spazio di lavoro</span>
        <h1>Progetti</h1>
        <p>
          {profile.is_admin
            ? "Tutti i progetti della piattaforma."
            : "I progetti a cui sei assegnato come Manager."}
        </p>
        {profile.is_admin ? (
          <Link className="button-link" href="/projects/new">
            Nuovo progetto
          </Link>
        ) : null}
      </div>
      <section>
        <form method="get" className="project-filters">
          <label>
            Cerca per codice o titolo
            <input name="q" defaultValue={q} maxLength={120} />
          </label>
          <label>
            Stato
            <select name="status" defaultValue={status}>
              <option value="">Tutti gli stati</option>
              {Object.entries(statuses).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Filtra</button>
          <Link href="/projects">Azzera filtri</Link>
        </form>
        <p>{count ?? 0} progetti trovati</p>
        {data?.length ? (
          <ul className="project-list">
            {data.map((project) => (
              <li key={project.id}>
                <div>
                  <span className="eyebrow">{project.code}</span>
                  <h2>
                    <Link href={`/projects/${project.id}`}>
                      {project.title}
                    </Link>
                  </h2>
                  <p>
                    {project.start_date.split("-").reverse().join("/")} —{" "}
                    {project.end_date.split("-").reverse().join("/")} ·{" "}
                    {project.currency_code}
                  </p>
                </div>
                <span className="badge">
                  {statuses[project.status as keyof typeof statuses]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="notice">
            {q || status || page > 1
              ? "Nessun progetto corrisponde ai filtri o alla pagina selezionata."
              : profile.is_admin
                ? "Non ci sono ancora progetti. Crea il primo progetto."
                : "Non hai ancora progetti assegnati. Contatta un amministratore."}
          </p>
        )}
        <div className="actions">
          {page > 1 ? <Link href={pageUrl(page - 1)}>← Precedenti</Link> : null}
          <span>Pagina {page}</span>
          {page * 20 < (count ?? 0) ? (
            <Link href={pageUrl(page + 1)}>Successivi →</Link>
          ) : null}
        </div>
      </section>
    </>
  );
}
