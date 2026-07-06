'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/(auth)/actions';

const LINKS = [
  { href: '/cont', label: 'Contul meu' },
  { href: '/cont/vanatoare', label: 'Vânătoare zilnică' },
  { href: '/cont/lista', label: 'Lista mea' },
  { href: '/oferte', label: 'Top oferte' },
  { href: '/cont/oferte/import', label: 'Importă raport agent' },
  { href: '/cont/oferte/publica', label: 'Publică anunț' },
  { href: '/cont/povestea-mea', label: 'Povestea mea' },
  { href: '/cont/preferinte', label: 'Preferințe & alerte' },
  { href: '/cont/abonament', label: 'Abonament' },
  { href: '/cont/ghid', label: 'Ghid & RO' },
  { href: '/cont/securitate', label: 'Securitate (2FA)' },
  { href: '/cont/date', label: 'Datele mele' },
];

const ADMIN_LINKS = [
  { href: '/admin', label: 'Dashboard admin' },
  { href: '/admin/oferte', label: 'Moderare anunțuri' },
  { href: '/admin/povesti', label: 'Moderare povești' },
  { href: '/admin/agenti', label: 'AI Agents' },
  { href: '/admin/publicitate', label: 'Publicitate' },
  { href: '/admin/modele', label: 'Modele țintă' },
  { href: '/admin/platforme', label: 'Platforme' },
];

export default function ContSidebar({ email, isAdmin }: { email: string | null; isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="cont-sidebar">
      {email ? (
        <div className="cont-sidebar-email mono">{email}</div>
      ) : (
        <div className="cont-sidebar-email mono">
          <Link href="/autentificare">Autentificare</Link> · <Link href="/inregistrare">Creează cont</Link>
        </div>
      )}
      <nav>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? 'on' : ''}>
            {l.label}
          </Link>
        ))}
      </nav>
      {isAdmin && (
        <>
          <div className="cont-sidebar-section mono">▸ ADMINISTRARE</div>
          <nav>
            {ADMIN_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={pathname === l.href ? 'on admin' : 'admin'}>
                {l.label}
              </Link>
            ))}
          </nav>
        </>
      )}
      {email && (
        <form action={signOut}>
          <button type="submit" className="btn" style={{ width: '100%', marginTop: 16 }}>
            Deconectează-te
          </button>
        </form>
      )}
    </aside>
  );
}
