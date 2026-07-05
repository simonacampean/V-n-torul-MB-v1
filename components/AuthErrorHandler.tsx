'use client';

import { useEffect } from 'react';
import { authErrorMessage } from '@/lib/auth-errors';

/**
 * Prinde erorile Supabase Auth (link de confirmare/resetare expirat sau
 * folosit deja) oriunde ar ateriza — Supabase redirecționează către Site URL
 * configurat în proiect, nu către /auth/callback, deci eroarea poate apărea
 * pe orice pagină (de obicei homepage), atât în query cât și în hash
 * (#error=...). Fără asta, userul vedea o pagină goală cu parametri criptici
 * în URL, fără nicio explicație sau cale de recuperare.
 */
export default function AuthErrorHandler() {
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const errorCode = hashParams.get('error_code') ?? queryParams.get('error_code');
    const errorType = hashParams.get('error') ?? queryParams.get('error');
    if (!errorCode && !errorType) return;
    if (window.location.pathname === '/autentificare') return;

    const message = authErrorMessage(errorCode);
    window.location.replace(`/autentificare?expired=1&error=${encodeURIComponent(message)}`);
  }, []);

  return null;
}
