import "server-only";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { validId } from "@/lib/projects.mjs";
export type Project = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  donor: string | null;
  currency_code: string;
  notes: string | null;
  row_version: number;
};
export async function getProject(id: string) {
  const context = await requireProfile();
  if (!validId(id)) notFound();
  const { data, error } = await context.client
    .from("projects")
    .select(
      "id,code,title,description,status,start_date,end_date,donor,currency_code,notes,row_version",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Impossibile caricare il progetto.");
  if (!data) notFound();
  return { ...context, project: data as Project };
}
