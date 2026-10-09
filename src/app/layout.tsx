import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Ariadne Hub · Accesso",
  description: "Gestione dei progetti non profit",
  robots: { index: false, follow: false },
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>
        <main>
          <header>
            <span className="mark">A</span>
            <span>
              Ariadne Hub<small>Gestione progetti</small>
            </span>
          </header>
          {children}
          <footer>Uno spazio condiviso per accompagnare i progetti.</footer>
        </main>
      </body>
    </html>
  );
}
