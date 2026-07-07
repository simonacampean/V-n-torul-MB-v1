'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MENU: { href: string; label: string }[] = [
  { href: '/', label: 'Modele țintă' },
  { href: '/oferte', label: 'Top oferte' },
  { href: '/cont', label: 'Contul meu' },
  { href: '/cont/vanatoare', label: 'Vânătoare zilnică' },
  { href: '/cont/lista', label: 'Lista mea' },
  { href: '/cont/oferte/import', label: 'Importă raport agent' },
  { href: '/cont/oferte/publica', label: 'Publică anunț' },
  { href: '/cont/preferinte', label: 'Preferințe & alerte' },
  { href: '/cont/abonament', label: 'Abonament' },
  { href: '/cont/ghid', label: 'Ghid & RO' },
  { href: '/cont/securitate', label: 'Securitate (2FA)' },
  { href: '/cont/date', label: 'Datele mele' },
];

/** Meniul global al aplicației, accesibil de oriunde din antet (buton ☰ lângă siglă). */
export default function SiteMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Se închide la click în afară sau la Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Se închide după navigare.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="sitemenu" ref={rootRef}>
      <button
        type="button"
        className="sitemenu-btn"
        aria-label="Meniu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="2" y="4" width="16" height="2" rx="1" fill="currentColor" />
          <rect x="2" y="9" width="16" height="2" rx="1" fill="currentColor" />
          <rect x="2" y="14" width="16" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <nav className="sitemenu-drop mono dropdown-in" role="menu">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className={pathname === item.href ? 'on' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
