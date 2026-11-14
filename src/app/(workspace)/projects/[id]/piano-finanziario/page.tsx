import { getFinancePage } from "@/lib/finance-page";
import { FinanceDashboard } from "@/components/finance-dashboard";
export default async function FinancialOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { project, data } = await getFinancePage((await params).id);
  return <FinanceDashboard project={project} data={data} />;
}
