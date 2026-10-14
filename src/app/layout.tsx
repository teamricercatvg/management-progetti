import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Ariadne Hub", template: "%s · Ariadne Hub" },
  description: "Gestione dei progetti non profit",
  robots: { index: false, follow: false },
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
