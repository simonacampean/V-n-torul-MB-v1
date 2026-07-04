'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type TargetModel, fmt } from '@/lib/models';
import {
  CRITERIA, STATUSES, condOf, verdictOf, scoreWatchlistItem, scoreColor,
  daysOnMarket, currentPrice, priceDropPct, RO_EXTRA,
  CANDIDATE_THRESHOLD, STALE_DAYS_THRESHOLD, parsePrice,
} from '@/lib/scoring';
import {
  addWatchlistItem, updateCriterion, updateStatus, updateCond, addPriceUpdate, deleteWatchlistItem,
} from '@/app/(with-sidebar)/cont/lista/actions';
import PriceSparkline from '@/components/PriceSparkline';

export interface WatchlistItem {
  id: string;
  model_code: string;
  title: string;
  price: number | null;
  url: string | null;
  year: number | null;
  km: number | null;
  cond: string;
  note: string | null;
  status: string;
  criteria: Record<string, boolean>;
  price_history: { price: number; at: string }[];
  created_at: string;
}

type Props = { models: TargetModel[]; items: WatchlistItem[] };

const emptyForm = (defaultModel: string) => ({
  model_code: defaultModel, title: '', price: '', url: '', year: '', km: '', note: '', cond: '2',
});

export default function ListaMea({ models, items }: Props) {
  const router = useRouter();
  const bandOf = useMemo(
    () => Object.fromEntries(models.map((m) => [m.code, { lo: m.band_lo, hi: m.band_hi }])),
    [models]
  );

  const [form, setForm] = useState(emptyForm(models[0]?.code ?? ''));
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState('');
  const [fModel, setFModel] = useState('TOATE');
  const [fStatus, setFStatus] = useState('TOATE');
  const [sort, setSort] = useState<'recent' | 'score' | 'pret' | 'zile'>('recent');
  const [cmp, setCmp] = useState<string[]>([]);
  const [showCmp, setShowCmp] = useState(false);

  const formVerdict = verdictOf(bandOf[form.model_code] ?? null, parsePrice(form.price), form.cond);

  async function refresh() {
    router.refresh();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    const result = await addWatchlistItem(fd);
    setBusy(false);
    if ('error' in result) {
      setFormError(result.error);
      return;
    }
    setForm(emptyForm(form.model_code));
    await refresh();
  }

  async function handleCriterion(itemId: string, critId: string, checked: boolean) {
    await updateCriterion(itemId, critId, checked);
    await refresh();
  }
  async function handleStatus(itemId: string, status: string) {
    await updateStatus(itemId, status);
    await refresh();
  }
  async function handleCond(itemId: string, cond: string) {
    await updateCond(itemId, cond);
    await refresh();
  }
  async function handlePriceUpdate(itemId: string, current: number | null) {
    const v = window.prompt('Prețul actual din anunț (€):', current != null ? String(current) : '');
    if (v == null) return;
    await addPriceUpdate(itemId, v);
    await refresh();
  }
  async function handleDelete(itemId: string) {
    if (!window.confirm('Ștergi acest anunț din Lista mea?')) return;
    await deleteWatchlistItem(itemId);
    setCmp((c) => c.filter((id) => id !== itemId));
    await refresh();
  }
  function toggleCmp(itemId: string, checked: boolean) {
    if (checked) {
      if (cmp.length >= 3) return;
      setCmp((c) => [...c, itemId]);
    } else {
      setCmp((c) => c.filter((id) => id !== itemId));
    }
  }

  let list = items.filter(
    (l) =>
      (fModel === 'TOATE' || l.model_code === fModel) &&
      (fStatus === 'TOATE' || l.status === fStatus) &&
      (!q || `${l.title} ${l.note ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  );
  if (sort === 'score') list = [...list].sort((a, b) => scoreWatchlistItem(b.criteria) - scoreWatchlistItem(a.criteria));
  else if (sort === 'pret')
    list = [...list].sort(
      (a, b) => (currentPrice(a.price_history, a.price) ?? 1e9) - (currentPrice(b.price_history, b.price) ?? 1e9)
    );
  else if (sort === 'zile') list = [...list].sort((a, b) => daysOnMarket(b.created_at) - daysOnMarket(a.created_at));

  const cmpItems = items.filter((l) => cmp.includes(l.id));

  return (
    <div>
      {/* ---- Formular adăugare (F-03 + preview F-04) ---- */}
      <div className="seclabel">▸ Adaugă un anunț găsit</div>
      <form onSubmit={handleAdd} className="card flat">
        <div className="formgrid">
          <select value={form.model_code} onChange={(e) => setForm({ ...form, model_code: e.target.value })}>
            {models.map((m) => (
              <option key={m.code} value={m.code}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
          <select value={form.cond} onChange={(e) => setForm({ ...form, cond: e.target.value })}>
            {['1', '2', '3', '4'].map((id) => (
              <option key={id} value={id}>
                Stare {condOf(id).label}
              </option>
            ))}
          </select>
          <input
            placeholder="Titlu (ex: 300CE-24, Almandinrot, 138.000 km)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div>
            <input
              placeholder="Preț (€)"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            {formVerdict && (
              <div className="pv" style={{ color: formVerdict.key === 'CHILIPIR' ? 'var(--red)' : undefined }}>
                {formVerdict.label} — {formVerdict.desc}{' '}
                <span style={{ color: 'var(--inksoft)' }}>
                  (bandă: {fmt(formVerdict.lo)}–{fmt(formVerdict.hi)} €)
                </span>
              </div>
            )}
          </div>
          <input placeholder="Link anunț" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <input
            placeholder="An fabricație"
            inputMode="numeric"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
          <input
            placeholder="Kilometraj"
            inputMode="numeric"
            value={form.km}
            onChange={(e) => setForm({ ...form, km: e.target.value })}
          />
          <input
            placeholder="Note (stare, vânzător, țară...)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            style={{ gridColumn: '1/-1' }}
          />
        </div>
        {formError && (
          <p role="alert" style={{ color: '#c0392b', marginTop: 8 }}>
            {formError}
          </p>
        )}
        <div className="btnrow">
          <button type="submit" className="btn dark" disabled={busy}>
            + Adaugă în listă
          </button>
        </div>
      </form>

      {/* ---- Toolbar filtre ---- */}
      <div className="seclabel" style={{ marginTop: 24 }}>
        ▸ Anunțuri urmărite ({items.length})
      </div>
      <div className="toolbar">
        <input placeholder="🔍 Caută în listă..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={fModel} onChange={(e) => setFModel(e.target.value)}>
          <option value="TOATE">Toate modelele</option>
          {models.map((m) => (
            <option key={m.code} value={m.code}>
              {m.code}
            </option>
          ))}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="TOATE">Toate statusurile</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="recent">Cele mai recente</option>
          <option value="score">Scor ↓</option>
          <option value="pret">Preț ↑</option>
          <option value="zile">Zile pe piață ↓</option>
        </select>
      </div>

      {!items.length && <div className="empty">Lista e goală.<br />Fă vânătoarea zilnică și adaugă primul candidat.</div>}
      {items.length > 0 && !list.length && <div className="empty">Niciun rezultat pentru filtrele curente.</div>}

      {list.map((l) => {
        const score = scoreWatchlistItem(l.criteria);
        const pVal = currentPrice(l.price_history, l.price);
        const pv = verdictOf(bandOf[l.model_code] ?? null, pVal, l.cond);
        const isChilipir = pv?.key === 'CHILIPIR';
        const totalRO = pVal != null ? pVal + RO_EXTRA : null;
        const days = daysOnMarket(l.created_at);
        const dropPct = priceDropPct(l.price_history, l.price);

        return (
          <article
            key={l.id}
            className="card"
            style={{
              borderLeftColor: isChilipir ? 'var(--red)' : scoreColor(score),
              borderColor: isChilipir ? 'var(--red)' : undefined,
            }}
          >
            <div className="row">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="plate sm">{l.model_code}</span>
                <b style={{ fontSize: 14 }}>{l.title}</b>
                {l.url && (
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--red)' }}>
                    anunț ↗
                  </a>
                )}
              </div>
              <div className="score" style={{ color: scoreColor(score) }}>
                {score}
                <small>/100</small>
              </div>
            </div>

            <div className="lrow" style={{ marginTop: 6 }}>
              {pv && (
                <span className={`chip ${isChilipir ? 'chilipir' : ''}`}>{pv.label}</span>
              )}
              {dropPct > 0 && <span className="chip drop">▼ preț −{dropPct}%</span>}
              {days >= STALE_DAYS_THRESHOLD ? (
                <span className="chip stale">⏳ {days} zile pe piață — negociază agresiv</span>
              ) : days > 0 ? (
                <span className="chip">⏳ {days} zile</span>
              ) : null}
            </div>

            <div className="meta mono" style={{ marginTop: 6 }}>
              {[
                pVal != null && `${fmt(pVal)} €`,
                l.year,
                l.km && `${l.km} km`,
                `stare ${condOf(l.cond).label.split(' ')[0]}`,
                `adăugat ${new Date(l.created_at).toLocaleDateString('ro-RO')}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              {totalRO != null ? ` · la cheie în RO: ${fmt(totalRO)} €` : ''}
            </div>

            {l.price_history.length > 1 && (
              <div className="hist" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <PriceSparkline history={l.price_history} />
                <span>
                  istoric preț: {l.price_history.map((h) => `${fmt(h.price)}€ (${new Date(h.at).toLocaleDateString('ro-RO')})`).join(' → ')}
                </span>
              </div>
            )}
            {l.note && <div style={{ fontSize: 14, color: 'var(--inksoft)', marginTop: 6 }}>{l.note}</div>}

            <div className="crit">
              {CRITERIA.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={!!l.criteria?.[c.id]}
                    onChange={(e) => handleCriterion(l.id, c.id, e.target.checked)}
                  />
                  <span>
                    {c.label} <span className="w">+{c.w}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="lrow">
              <select value={l.status} onChange={(e) => handleStatus(l.id, e.target.value)}>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <select value={l.cond} onChange={(e) => handleCond(l.id, e.target.value)}>
                {['1', '2', '3', '4'].map((id) => (
                  <option key={id} value={id}>
                    {condOf(id).label.split(' — ')[0]}
                  </option>
                ))}
              </select>
              <button type="button" className="btn" onClick={() => handlePriceUpdate(l.id, pVal)}>
                💶 Preț nou
              </button>
              <label className="cmpchk">
                <input
                  type="checkbox"
                  checked={cmp.includes(l.id)}
                  onChange={(e) => toggleCmp(l.id, e.target.checked)}
                />
                compară
              </label>
              {score >= CANDIDATE_THRESHOLD && <span className="candidate">★ CANDIDAT</span>}
              <button type="button" className="btn del" onClick={() => handleDelete(l.id)}>
                Șterge
              </button>
            </div>
          </article>
        );
      })}

      {/* ---- Comparator (max 3) ---- */}
      {cmp.length > 0 && (
        <div className="lrow" style={{ marginTop: 12 }}>
          <span className="meta mono">{cmp.length}/3 selectate pentru comparație</span>
          <button type="button" className="btn" onClick={() => setShowCmp(true)}>
            Compară
          </button>
          <button type="button" className="btn" onClick={() => setCmp([])}>
            Golește selecția
          </button>
        </div>
      )}
      {showCmp && cmpItems.length > 0 && (
        <table className="cmp-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Titlu</th>
              <th>Preț</th>
              <th>Scor</th>
              <th>Km</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {cmpItems.map((l) => (
              <tr key={l.id}>
                <td>{l.model_code}</td>
                <td>
                  <b>{l.title}</b>
                </td>
                <td>{fmt(currentPrice(l.price_history, l.price) ?? 0)} €</td>
                <td>{scoreWatchlistItem(l.criteria)}/100</td>
                <td>{l.km ?? '—'}</td>
                <td>{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
