/**
 * Supabase Auth trimite erorile de link (confirmare email, resetare parolă)
 * direct către Site URL configurat în proiect — NU către /auth/callback — de
 * aceea nu putem prinde asta doar în ruta de callback; trebuie detectat
 * oriunde ar putea ateriza (vezi AuthErrorHandler, montat în layout-ul global).
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  otp_expired: 'Linkul de confirmare a expirat sau a fost deja folosit. Trimite-ți unul nou mai jos.',
  otp_disabled: 'Confirmarea prin email este dezactivată momentan. Contactează suportul.',
  access_denied: 'Linkul de confirmare este invalid sau a expirat. Trimite-ți unul nou mai jos.',
};

export function authErrorMessage(errorCode: string | null): string {
  if (!errorCode) return 'Linkul este invalid sau a expirat. Trimite-ți unul nou mai jos.';
  return AUTH_ERROR_MESSAGES[errorCode] ?? 'Linkul este invalid sau a expirat. Trimite-ți unul nou mai jos.';
}
