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
  { href: '/cont/ghid', label: 'Ghid & RO' },
  { href: '/cont/securitate', label: 'Securitate (2FA)' },
  { href: '/cont/date', label: 'Datele mele' },
];

const ADMIN_LINKS = [{ href: '/admin/oferte', label: 'Moderare anunțuri' }];

export default function ContSidebar({ email, isAdmin }: { email: string | null; isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, ...ADMIN_LINKS] : LINKS;

  return (
    <aside className="cont-sidebar">
      {email && <div className="cont-sidebar-email mono">{email}</div>}
      <nav>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? 'on' : ''}>
            {l.label}
          </Link>
        ))}
      </nav>
      <form action={signOut}>
        <button type="submit" className="btn" style={{ width: '100%', marginTop: 16 }}>
          Deconectează-te
        </button>
      </form>
    </aside>
  );
}
