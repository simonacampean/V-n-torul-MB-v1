'use client';

import { useFormStatus } from 'react-dom';

/** Feedback de încărcare pe formulare cu `action` nativ (fără JS de submit
 * propriu) — fără el, butonul rămâne cu același text în timpul round-trip-ului
 * server, riscând dublu-click sau senzația de „nu s-a întâmplat nimic”. */
export default function SubmitButton({
  children,
  pendingLabel,
  className = 'btn primary',
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
