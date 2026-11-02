import Link from "next/link";

export function ProjectNavigation({ projectId, current }: {
  projectId: string;
  current: "" | "quadro-logico" | "cronoprogramma" | "indicatori" | "edit";
}) {
  return (
    <nav className="actions project-navigation" aria-label="Sezioni del progetto">
      {[
        ["", "Dettaglio progetto"],
        ["quadro-logico", "Quadro logico"],
        ["cronoprogramma", "Cronoprogramma"],
        ["indicatori", "Indicatori"],
      ].filter(([path]) => path !== current).map(([path, label]) => (
        <Link key={path} className="button-link" href={`/projects/${projectId}${path ? `/${path}` : ""}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
