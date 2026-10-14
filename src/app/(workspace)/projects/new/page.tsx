import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { ProjectForm } from "@/components/project-form";
export const metadata = { title: "Nuovo progetto" };
export default async function NewProject() {
  const { profile } = await requireProfile();
  if (!profile.is_admin) notFound();
  return (
    <>
      <div className="page-heading">
        <h1>Nuovo progetto</h1>
        <p>Definisci l’anagrafica e il periodo del progetto.</p>
      </div>
      <section>
        <ProjectForm />
      </section>
    </>
  );
}
