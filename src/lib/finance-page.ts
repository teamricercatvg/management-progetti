import "server-only";
import { cache } from "react";
import { requireProfile } from "./auth";
import { getProject } from "./project-data";
import { getFinancialData } from "./finance-data";
export const getFinancePage = cache(async (id: string) => {
  const { client } = await requireProfile();
  const [context, data] = await Promise.all([getProject(id), getFinancialData(client, id)]);
  return { ...context, data };
});
