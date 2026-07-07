import type { FairValueEticheta } from '@/lib/agents/evaluator-fair-value';
import { fmt } from '@/lib/models';

const CLASA: Record<FairValueEticheta, string> = {
  'Foarte Ieftin': 'foarte-ieftin',
  Ieftin: 'ieftin',
  Moderat: 'moderat',
  Scump: 'scump',
  'Foarte Scump': 'foarte-scump',
};

/** Etichetă Fair-Value — vezi lib/agents/evaluator-fair-value.ts. Absentă
 * complet dacă nu există încă destule anunțuri comparabile (nicio etichetă
 * fabricată din puține date — aceeași regulă ca la CommunityStats/Vânători
 * Reușite). */
export default function FairValueBadge({
  eticheta,
  fairValuePret,
  deviatieProcentuala,
  compsFolosite,
}: {
  eticheta: FairValueEticheta | null | undefined;
  fairValuePret: number | null | undefined;
  deviatieProcentuala: number | null | undefined;
  compsFolosite: number | null | undefined;
}) {
  if (!eticheta || fairValuePret == null) return null;

  const semn = (deviatieProcentuala ?? 0) > 0 ? '+' : '';

  return (
    <span
      className={`fvbadge ${CLASA[eticheta]}`}
      title={`Preț de referință: ${fmt(fairValuePret)} € (comparat cu ${compsFolosite ?? 0} anunțuri similare)`}
    >
      {eticheta}
      {deviatieProcentuala != null && ` (${semn}${deviatieProcentuala}%)`}
    </span>
  );
}
