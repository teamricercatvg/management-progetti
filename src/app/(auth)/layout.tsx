export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-layout">
      <header className="brand">
        <span className="mark">A</span>
        <span>
          Ariadne Hub<small>Gestione progetti</small>
        </span>
      </header>
      {children}
      <footer>Uno spazio condiviso per accompagnare i progetti.</footer>
    </main>
  );
}
