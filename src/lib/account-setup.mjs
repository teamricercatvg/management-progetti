// Auth confirmation and last_sign_in_at alone do not prove a password was set.
export function accountSetup(user) {
  if (!user) return "Stato di attivazione non disponibile";
  if (!user.email_confirmed_at) return user.invited_at ? "Invito in attesa" : "Email da confermare";
  return user.app_metadata?.ariadne_password_verified_at
    ? "Attivazione completata · Password verificata"
    : "Email confermata · Password da verificare";
}
