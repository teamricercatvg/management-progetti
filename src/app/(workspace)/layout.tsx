import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/actions";
import { Submit } from "@/components/submit";
import { WorkspaceNav } from "@/components/workspace-nav";

export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();
  return (
    <div className="workspace">
      <a className="skip-link" href="#content">
        Vai al contenuto
      </a>
      <aside className="sidebar">
        <Link
          className="brand"
          href="/overview"
          aria-label="Ariadne Hub, panoramica"
        >
          <span className="mark">A</span>
          <span>
            Ariadne Hub<small>Gestione progetti</small>
          </span>
        </Link>
        <WorkspaceNav isAdmin={profile.is_admin} />
        <div className="sidebar-account">
          <span className="identity">{profile.display_name}</span>
          <small>
            {profile.is_admin ? "Amministratore" : "Utente abilitato"}
          </small>
          <form action={logout}>
            <Submit>Esci</Submit>
          </form>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <span>Il tuo spazio di lavoro</span>
          <span className="badge">Ariadne Hub</span>
        </header>
        <main id="content" className="workspace-content" tabIndex={-1}>
          {children}
        </main>
        <footer>Uno spazio condiviso per accompagnare i progetti.</footer>
      </div>
    </div>
  );
}
