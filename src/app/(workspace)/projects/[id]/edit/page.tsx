import Link from "next/link";
import { getProject } from "@/lib/project-data";
import { ProjectForm } from "@/components/project-form";
export const metadata = { title: "Modifica progetto" };
export default async function EditProject({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project } = await getProject((await params).id);
  return (
    <>
      <div className="page-heading">
        <Link href={`/projects/${project.id}`}>← Dettaglio progetto</Link>
        <h1>Modifica progetto</h1>
        <p>{project.title}</p>
      </div>
      <section>
        {project.status === "archived" ? (
          <p>
            Progetto archiviato: riaprilo dal dettaglio prima di modificarlo.
          </p>
        ) : (
          <ProjectForm project={project} />
        )}
      </section>
    </>
  );
}
