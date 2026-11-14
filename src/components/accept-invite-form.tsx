"use client";
import { useRef, useState } from "react";

// A native POST does not set useFormStatus.pending. Lock synchronously so
// repeated clicks/Enter cannot consume the same one-use token twice.
export function AcceptInviteForm({ tokenHash, type }: { tokenHash: string; type: "invite" | "recovery" }) {
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  return <form action="/auth/confirm" method="post" onSubmit={event => {
    if (submitting.current) { event.preventDefault(); return; }
    submitting.current = true;
    setPending(true);
  }}>
    <input type="hidden" name="token_hash" value={tokenHash} />
    <input type="hidden" name="type" value={type} />
    <button type="submit" disabled={pending}>{pending ? "Attendi…" : "Continua"}</button>
  </form>;
}
