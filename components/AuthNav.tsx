'use client';

// Componentă client mică, izolată — pagina principală rămâne statică (ISR,
// optimizată pentru Lighthouse M0); doar acest fragment verifică sesiunea
// după hidratare, fără să blocheze randarea conținutului.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AuthNav() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (email === undefined) return null;

  if (email) {
    return (
      <nav className="hdr-nav mono">
        <Link href="/cont">Contul meu</Link>
      </nav>
    );
  }

  return (
    <nav className="hdr-nav mono">
      <Link href="/autentificare">Autentificare</Link>
      <Link href="/inregistrare">Creează cont</Link>
    </nav>
  );
}
