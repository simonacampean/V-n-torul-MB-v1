import type { ReactNode } from 'react';
import type { Metadata } from 'next';

// SEO — autentificare/înregistrare nu au valoare de căutare publică.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
