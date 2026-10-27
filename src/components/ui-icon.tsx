export function UiIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    edit: "m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5",
    archive: "M3 7V5h6l2 2h10v13H3Z M12 10v6 M9 13l3 3 3-3",
    plus: "M12 5v14 M5 12h14",
    restore: "M3 4v6h6 M3 10a9 9 0 1 1 1 8",
    overview: "M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z",
    projects: "M3 6h7l2 3h9v12H3Z",
    admin: "m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7Z M8 12l3 3 5-6",
    account: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3",
    menu: "M4 6h16 M4 12h16 M4 18h16",
    logout: "M9 4H3v16h6 M8 12h13 M16 7l5 5-5 5",
  };
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? paths.menu} /></svg>;
}
