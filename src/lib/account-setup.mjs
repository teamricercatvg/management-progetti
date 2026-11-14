// Auth confirmation and last_sign_in_at alone do not prove a password was set.
export function accountSetup(user, isActive = true) {
  if (!isActive) return "Disabilitato";
  if (!user) return "Stato non disponibile";
  return user.email_confirmed_at && user.app_metadata?.ariadne_password_verified_at
    ? "Abilitato"
    : "Da confermare";
}
