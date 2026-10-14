"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorkspaceNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/overview", label: "Panoramica" },
    { href: "/projects", label: "Progetti" },
    ...(isAdmin ? [{ href: "/admin", label: "Amministrazione" }] : []),
    { href: "/account", label: "Account" },
  ];
  return (
    <nav aria-label="Navigazione principale">
      {items.map(({ href, label }) => {
        const active =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (href === "/account" && pathname === "/password");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
