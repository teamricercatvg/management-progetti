"use client";
import { useFormStatus } from "react-dom";
export function Submit({ children, label }: { children: React.ReactNode; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button aria-label={label} title={label} disabled={pending} type="submit">
      {pending ? "Attendi…" : children}
    </button>
  );
}
