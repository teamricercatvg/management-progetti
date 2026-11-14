"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { financeTabs } from "@/lib/finance.mjs";
export function FinanceNavigation({ projectId }: { projectId: string }) {
  const pathname = usePathname(),
    base = `/projects/${projectId}/piano-finanziario`;
  return (
    <nav className="finance-tabs" aria-label="Piano finanziario">
      {Object.entries(financeTabs).map(([path, label]) => (
        <Link
          key={path}
          href={`${base}${path ? `/${path}` : ""}`}
          aria-current={
            pathname === `${base}${path ? `/${path}` : ""}` ? "page" : undefined
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
