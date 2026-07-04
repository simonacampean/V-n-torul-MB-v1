'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ro">
      <body>
        <main style={{ padding: 48, textAlign: 'center', fontFamily: 'system-ui' }}>
          <h1>A apărut o eroare neașteptată.</h1>
          <p>Am fost notificați automat. Încearcă să reîncarci pagina.</p>
        </main>
      </body>
    </html>
  );
}
