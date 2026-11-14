import Link from "next/link";
import { getFinancePage } from "@/lib/finance-page";
import { FinanceNavigation } from "@/components/finance-navigation";
import { ProjectNavigation } from "@/components/project-navigation";
import { dateLabel } from "@/lib/finance.mjs";
export const metadata = { title: "Piano finanziario" };
export default async function FinanceLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { project } = await getFinancePage((await params).id);
  return (
    <div className="finance-page">
      <div className="finance-heading">
        <div>
          <Link className="finance-breadcrumb" href={`/projects/${project.id}`}>
            {project.code} / {project.title}
          </Link>
          <h1>Piano finanziario</h1>
        </div>
        <div className="finance-context">
          <span className="finance-currency">{project.currency_code}</span>
          <span>
            {dateLabel(project.start_date)} — {dateLabel(project.end_date)}
          </span>
        </div>
      </div>
      <ProjectNavigation projectId={project.id} current="piano-finanziario" />
      <FinanceNavigation projectId={project.id} />
      {project.status === "archived" && (
        <p className="finance-callout">
          Progetto archiviato: consultazione in sola lettura.
        </p>
      )}
      {children}
    </div>
  );
}
