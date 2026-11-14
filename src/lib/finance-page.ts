import "server-only";
import { cache } from "react";
import { getProject } from "./project-data";
import { getFinancialData } from "./finance-data";
export const getFinancePage = cache(async (id: string) => {
  const context = await getProject(id);
  const data = await getFinancialData(context.client, id);
  return { ...context, data };
});
