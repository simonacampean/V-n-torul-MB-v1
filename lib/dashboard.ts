// AD-04 — panou admin: calcule pure pentru estimarea venitului lunar recurent
// (MRR), separate de citirea live din Stripe/DB ca să poată fi testate izolat.

export function estimateMrr(params: {
  monthlyActive: number;
  yearlyActive: number;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
}): number {
  const monthlyTotal = params.monthlyActive * params.monthlyPriceCents;
  const yearlyAmortizedTotal = params.yearlyActive * (params.yearlyPriceCents / 12);
  return Math.round(monthlyTotal + yearlyAmortizedTotal) / 100;
}
