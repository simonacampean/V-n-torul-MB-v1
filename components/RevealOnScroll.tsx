'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Fade+slide subtil când elementul intră în viewport — Intersection Observer,
 * fără librării noi. Se dezactivează complet prin regula globală
 * prefers-reduced-motion (app/globals.css), la fel ca restul micro-animațiilor
 * platformei. `delay` (ms) permite un efect ușor eșalonat pe liste de carduri,
 * fără să întârzie randarea conținutului în sine (doar tranziția vizuală). */
export default function RevealOnScroll({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
