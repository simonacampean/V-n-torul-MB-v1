'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { issueBackupCodes, disableTotp } from '@/app/(auth)/mfa-actions';

type Props = {
  initialFactorId: string | null;
};

type Step =
  | { name: 'inactiv' }
  | { name: 'inrolare'; factorId: string; qrCode: string; secret: string }
  | { name: 'coduri-rezerva'; codes: string[] }
  | { name: 'activ'; factorId: string };

export default function TotpPanel({ initialFactorId }: Props) {
  const [step, setStep] = useState<Step>(
    initialFactorId ? { name: 'activ', factorId: initialFactorId } : { name: 'inactiv' }
  );
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setBusy(false);
    if (enrollErr || !data) {
      setError(enrollErr?.message ?? 'Nu s-a putut porni înrolarea.');
      return;
    }
    setStep({ name: 'inrolare', factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmEnroll() {
    if (step.name !== 'inrolare') return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId: step.factorId,
      code,
    });
    if (verifyErr) {
      setBusy(false);
      setError('Cod incorect. Verifică ora telefonului și încearcă din nou.');
      return;
    }
    const result = await issueBackupCodes();
    setBusy(false);
    setCode('');
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setStep({ name: 'coduri-rezerva', codes: result.codes });
  }

  function terminaSetup() {
    if (step.name !== 'coduri-rezerva') return;
    // factorId nu mai e necesar aici — pagina se reîncarcă la navigare ulterioară
    setStep({ name: 'activ', factorId: initialFactorId ?? '' });
  }

  async function handleDisable() {
    if (step.name !== 'activ') return;
    setError(null);
    setBusy(true);
    const result = await disableTotp(step.factorId, code);
    setBusy(false);
    setCode('');
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setStep({ name: 'inactiv' });
  }

  if (step.name === 'inactiv') {
    return (
      <div>
        <p>2FA este dezactivat pe acest cont.</p>
        {error && <p role="alert" style={{ color: '#c0392b' }}>{error}</p>}
        <button type="button" onClick={startEnroll} disabled={busy} style={{ marginTop: 12 }}>
          Activează 2FA
        </button>
      </div>
    );
  }

  if (step.name === 'inrolare') {
    return (
      <div>
        <p>Scanează codul QR cu Google Authenticator, Duo sau Authy:</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step.qrCode} alt="Cod QR pentru activarea 2FA" width={200} height={200} />
        <p className="mono" style={{ fontSize: 12 }}>
          Cod manual: {step.secret}
        </p>
        <label style={{ display: 'block', marginTop: 12 }}>
          Cod de 6 cifre din aplicație
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        {error && <p role="alert" style={{ color: '#c0392b' }}>{error}</p>}
        <button type="button" onClick={confirmEnroll} disabled={busy || code.length !== 6} style={{ marginTop: 12 }}>
          Confirmă și activează
        </button>
      </div>
    );
  }

  if (step.name === 'coduri-rezerva') {
    return (
      <div>
        <p>
          <b>Salvează aceste 10 coduri de rezervă</b> — le poți folosi dacă pierzi accesul la
          aplicația de autentificare. Fiecare cod se poate folosi o singură dată. Nu vor mai fi
          afișate din nou.
        </p>
        <ul className="mono" style={{ listStyle: 'none', marginTop: 12, display: 'grid', gap: 4 }}>
          {step.codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button type="button" onClick={terminaSetup} style={{ marginTop: 16 }}>
          Le-am salvat — continuă
        </button>
      </div>
    );
  }

  return (
    <div>
      <p>2FA este activ pe acest cont.</p>
      <label style={{ display: 'block', marginTop: 12 }}>
        Pentru dezactivare, introdu codul curent din aplicație
        <input
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      {error && <p role="alert" style={{ color: '#c0392b' }}>{error}</p>}
      <button type="button" onClick={handleDisable} disabled={busy || code.length !== 6} style={{ marginTop: 12 }}>
        Dezactivează 2FA
      </button>
    </div>
  );
}
