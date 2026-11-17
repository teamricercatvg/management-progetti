import { getProject } from "@/lib/project-data";
import { getInforEuro } from "@/lib/inforeuro-server";
export async function GET(request: Request, { params }: { params: Promise<{id: string}> }) {
 const { project } = await getProject((await params).id);
 if (project.currency_code !== "EUR") return Response.json({error:"InforEuro automatico disponibile per progetti rendicontati in EUR."}, {status:400});
 const url = new URL(request.url);
 try { return Response.json(await getInforEuro(url.searchParams.get("currency") ?? "", url.searchParams.get("month") ?? ""), {headers:{"Cache-Control":"private, no-store"}}); }
 catch { return Response.json({error:"Cambio InforEuro non disponibile per il mese e la valuta richiesti. Riprova o usa l’inserimento manuale."}, {status:502}); }
}
