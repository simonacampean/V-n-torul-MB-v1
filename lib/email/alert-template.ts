// S-03 — șablon HTML pentru alertele de ofertă, în stilul Datenkarte.
// Email-urile nu pot folosi variabile CSS extern-linkate în siguranță (mulți
// clienți nu le suportă) — culorile sunt cele exacte din design/tokens.css,
// scrise direct ca valori hex.
//
// S-04 — un singur șablon de „digest" (o listă de 1..N oferte): planul
// gratuit primește un digest zilnic (toate alertele acumulate grupate într-un
// email); planul premium ar primi instant același șablon, cu un singur item.
const COLORS = {
  ink: '#22262B',
  inksoft: '#4A5058',
  paper: '#EDEFF1',
  panel: '#FAFBFC',
  line: '#C9CED4',
  red: '#B3121B',
  green: '#2E6B4F',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const fmt = (n: number) => n.toLocaleString('ro-RO');

export interface AlertOfferItem {
  offerTitle: string;
  modelCode: string;
  score: number;
  price: number;
  totalRo: number | null;
  offerUrl: string | null;
  reason: 'excellent' | 'price_drop';
  dropPct?: number;
  fullOptions: boolean;
  historyVerified: boolean;
}

function reasonLabel(p: AlertOfferItem): string {
  if (p.reason === 'price_drop' && p.dropPct) {
    return `Prețul a scăzut cu ${p.dropPct}% — semnal de negociere sau achiziție rapidă.`;
  }
  return `Scorul calitate-preț a trecut pragul de excelență — printre cele mai bune oferte pentru ${p.modelCode} de acum.`;
}

function renderOfferCardHtml(p: AlertOfferItem): string {
  const title = escapeHtml(p.offerTitle);
  const badge = p.reason === 'excellent' ? 'OFERTĂ EXCELENTĂ' : 'SCĂDERE DE PREȚ';

  return `
    <div style="background:${COLORS.panel};border:1px solid ${COLORS.line};padding:20px;margin-bottom:14px;border-radius:2px;">
      <div style="display:inline-block;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:1px;color:#fff;background:${COLORS.red};padding:4px 10px;border-radius:2px;margin-bottom:14px;">
        ${badge}
      </div>
      <h2 style="font-size:16px;margin:0 0 6px;color:${COLORS.ink};">${title}</h2>
      <div style="font-family:monospace;font-size:12px;color:${COLORS.inksoft};margin-bottom:12px;">
        Model ${escapeHtml(p.modelCode)}
      </div>

      <div style="font-family:monospace;font-size:28px;font-weight:700;color:${COLORS.green};margin-bottom:4px;">
        ${p.score}<span style="font-size:13px;color:${COLORS.inksoft};">/100</span>
      </div>

      <table role="presentation" style="width:100%;border-collapse:collapse;margin:12px 0;font-family:monospace;font-size:13px;">
        <tr>
          <td style="padding:4px 0;color:${COLORS.inksoft};">Preț</td>
          <td style="padding:4px 0;text-align:right;font-weight:700;color:${COLORS.ink};">${fmt(p.price)} €</td>
        </tr>
        ${
          p.totalRo != null
            ? `<tr>
          <td style="padding:4px 0;color:${COLORS.inksoft};">La cheie în RO</td>
          <td style="padding:4px 0;text-align:right;font-weight:700;color:${COLORS.ink};">${fmt(p.totalRo)} €</td>
        </tr>`
            : ''
        }
      </table>

      <div style="margin-bottom:12px;">
        ${p.fullOptions ? `<span style="display:inline-block;font-family:monospace;font-size:10px;font-weight:700;background:${COLORS.ink};color:#fff;padding:3px 7px;border-radius:2px;margin-right:6px;">FULL OPTIONS</span>` : ''}
        ${p.historyVerified ? `<span style="display:inline-block;font-family:monospace;font-size:10px;font-weight:700;background:#E4F0EA;color:${COLORS.green};padding:3px 7px;border-radius:2px;">✓ ISTORIC VERIFICAT</span>` : ''}
      </div>

      <p style="font-size:13px;line-height:1.5;color:${COLORS.inksoft};margin:0 0 14px;">
        ${escapeHtml(reasonLabel(p))}
      </p>

      ${
        p.offerUrl
          ? `<a href="${escapeHtml(p.offerUrl)}" style="display:inline-block;background:${COLORS.red};color:#fff;text-decoration:none;font-family:monospace;font-weight:700;font-size:13px;padding:10px 18px;border-radius:2px;">Deschide anunțul →</a>`
          : ''
      }
    </div>`;
}

export function renderDigestEmailHtml(offers: AlertOfferItem[], unsubscribeUrl: string): string {
  const heading = offers.length > 1 ? `${offers.length} oferte noi de urmărit` : 'O ofertă nouă de urmărit';

  return `<!doctype html>
<html lang="ro">
<body style="margin:0;padding:0;background:${COLORS.paper};font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:${COLORS.ink};padding:16px 20px;border-radius:3px 3px 0 0;">
      <div style="font-family:monospace;font-size:9px;letter-spacing:2px;color:#9FA6AE;">INVESTIȚII AUTO CLASICE</div>
      <div style="font-size:20px;font-weight:800;color:${COLORS.panel};letter-spacing:0.5px;">VÂNĂTORUL <span style="color:${COLORS.red}">MB</span></div>
    </div>
    <div style="background:${COLORS.paper};border:1px solid ${COLORS.line};border-top:none;padding:20px;">
      <h1 style="font-size:16px;margin:0 0 16px;color:${COLORS.ink};">${heading}</h1>
      ${offers.map(renderOfferCardHtml).join('\n')}
      <p style="font-size:11px;color:${COLORS.inksoft};margin-top:16px;line-height:1.5;">
        Verifică întotdeauna anunțul la sursă — platforma analizează, decizia și inspecția rămân ale tale.
      </p>
    </div>
    <div style="text-align:center;padding:16px 0;font-family:monospace;font-size:10px;color:#9FA6AE;">
      Vânătorul MB · <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9FA6AE;">Dezabonează-te de la aceste alerte</a>
    </div>
  </div>
</body>
</html>`;
}

export function renderDigestEmailText(offers: AlertOfferItem[], unsubscribeUrl: string): string {
  const blocks = offers.map((p) => {
    const lines = [
      p.reason === 'excellent' ? 'OFERTĂ EXCELENTĂ' : 'SCĂDERE DE PREȚ',
      p.offerTitle,
      `Model ${p.modelCode} · Scor ${p.score}/100`,
      `Preț: ${fmt(p.price)} €${p.totalRo != null ? ` · La cheie în RO: ${fmt(p.totalRo)} €` : ''}`,
      reasonLabel(p),
    ];
    if (p.offerUrl) lines.push(`Deschide anunțul: ${p.offerUrl}`);
    return lines.join('\n');
  });
  return [...blocks, '', `Dezabonează-te: ${unsubscribeUrl}`].join('\n\n');
}
