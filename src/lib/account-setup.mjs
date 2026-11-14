// Pending means the invitation/email has not yet been confirmed.
export function accountSetup(user, isActive = true) {
  if (!isActive) return "Disabilitato";
  if (!user) return "Stato non disponibile";
  return user.email_confirmed_at
    ? "Abilitato"
    : "Da confermare";
}
