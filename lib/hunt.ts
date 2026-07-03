// ============================================================
// F-02 — Vânătoare zilnică. Sursa primară: tabela `platforms` (Supabase).
// Fallback: valorile exacte din seed.sql — folosit când env Supabase lipsește.
// ============================================================
import { createClient } from '@supabase/supabase-js';

export type PlatformGroup = 'major' | 'med' | 'collect';

export interface Platform {
  name: string;
  country: string;
  grp: PlatformGroup;
  negotiability: 'DA' | 'PARTIAL' | 'NU' | 'REF';
  note: string | null;
  url_template: string | null;
}

/** Etichetele grupelor — text fix din v5, nu vine din DB (ca STATUSES/CONDS). */
export const GROUP_META: Record<PlatformGroup, { label: string; note: string | null }> = {
  major: { label: 'Piețe majore (volum mare, anunțuri noi zilnic)', note: null },
  med: {
    label: 'Mediterana — climat blând, fără sare pe drumuri',
    note: 'Caroserii mult mai sănătoase (fără rugină de sare), dar verifică: interioare arse de soare, chedere/cauciucuri degradate, rugină salină la mașinile de coastă. Ideal: garaj, interiorul țării.',
  },
  collect: {
    label: 'Colecționari & licitații (calitate ridicată, documentație)',
    note: 'La licitații prețul NU se negociază — îl stabilesc bid-urile; avantajul e că vezi prețul REAL de piață. La dealerii de clasice marja de negociere e de obicei 5–10%.',
  },
};
export const GROUP_ORDER: PlatformGroup[] = ['major', 'med', 'collect'];

export const NEG_LABEL: Record<Platform['negotiability'], string> = {
  DA: 'NEGOCIABIL', PARTIAL: 'NEG. PARȚIAL', NU: 'LICITAȚIE — FIX', REF: 'DATE PREȚ',
};

/** Valorile exacte din v5 / seed.sql — nu se modifică fără acordul beneficiarului. */
export const SEED_PLATFORMS: Platform[] = [
  { name: 'mobile.de', country: 'DE', grp: 'major', negotiability: 'DA', note: 'Cea mai mare piață din Europa', url_template: 'https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&makeModelVariant1.makeId=17200&makeModelVariant1.modelDescription={query}&maxPrice=20000&minFirstRegistrationDate={yearFrom}-01-01&maxFirstRegistrationDate={yearTo}-12-31' },
  { name: 'AutoScout24', country: 'EU', grp: 'major', negotiability: 'DA', note: 'Filtre bune, anunțuri din toată UE', url_template: 'https://www.autoscout24.ro/lst/mercedes-benz?fregfrom={yearFrom}&fregto={yearTo}&priceto=20000&sort=age&desc=0' },
  { name: 'Kleinanzeigen', country: 'DE', grp: 'major', negotiability: 'DA', note: 'Privați germani — prețuri directe', url_template: 'https://www.kleinanzeigen.de/s-autos/mercedes-{querySlug}/k0c216' },
  { name: 'Autovit.ro', country: 'RO', grp: 'major', negotiability: 'DA', note: 'Local — fără costuri de import', url_template: 'https://www.autovit.ro/autoturisme/mercedes-benz/de-la-{yearFrom}?search%5Bfilter_float_price%3Ato%5D=20000' },
  { name: 'Leboncoin', country: 'FR', grp: 'med', negotiability: 'DA', note: 'Sudul Franței = zona de aur', url_template: 'https://www.leboncoin.fr/recherche?category=2&text=mercedes%20{query}' },
  { name: 'AutoScout24.it', country: 'IT', grp: 'med', negotiability: 'DA', note: 'Nordul Italiei, mașini de garaj', url_template: 'https://www.autoscout24.it/lst/mercedes-benz?fregfrom={yearFrom}&fregto={yearTo}&priceto=20000&sort=age&desc=0' },
  { name: 'Subito.it', country: 'IT', grp: 'med', negotiability: 'DA', note: 'Privați italieni, prețuri mici', url_template: 'https://www.subito.it/annunci-italia/vendita/auto/?q=mercedes%20{query}' },
  { name: 'Coches.net', country: 'ES', grp: 'med', negotiability: 'DA', note: 'Spania interioară = cel mai uscat climat', url_template: 'https://www.coches.net/segunda-mano/?Text=mercedes%20{query}' },
  { name: 'Standvirtual', country: 'PT', grp: 'med', negotiability: 'DA', note: 'Portugalia — piață mică, subevaluată', url_template: 'https://www.standvirtual.com/carros/mercedes-benz?search%5Bfilter_float_price%3Ato%5D=20000' },
  { name: 'Car.gr', country: 'GR', grp: 'med', negotiability: 'DA', note: 'Grecia — atenție la mașinile de coastă', url_template: 'https://www.car.gr/classifieds/cars/?q=mercedes%20{query}' },
  { name: 'Classic Trader', country: 'EU', grp: 'collect', negotiability: 'PARTIAL', note: 'Dealeri de clasice verificați', url_template: 'https://www.classic-trader.com/uk/cars/search?keyword=Mercedes%20{query}&price_to=20000' },
  { name: 'Classic Driver', country: 'EU', grp: 'collect', negotiability: 'PARTIAL', note: 'Segment premium, exemplare top', url_template: 'https://www.classicdriver.com/en/cars?query=mercedes%20{query}' },
  { name: 'Car & Classic', country: 'UK/EU', grp: 'collect', negotiability: 'DA', note: 'Anunțuri + licitații, ofertă mare', url_template: 'https://www.carandclassic.com/search?q=mercedes%20{query}' },
  { name: 'Collecting Cars', country: 'UK/EU', grp: 'collect', negotiability: 'NU', note: 'Licitații — preț real de piață', url_template: 'https://collectingcars.com/search?query=Mercedes%20{query}' },
  { name: 'Catawiki', country: 'NL/EU', grp: 'collect', negotiability: 'NU', note: 'Licitații săptămânale, ofertă variată', url_template: 'https://www.catawiki.com/en/s?q=mercedes%20{query}' },
  { name: 'Classic.com', country: 'GLOBAL', grp: 'collect', negotiability: 'REF', note: 'REFERINȚĂ DE PREȚ: istoricul vânzărilor', url_template: 'https://www.classic.com/search/?q=mercedes%20{query}' },
];

/** Citește platformele din Supabase; fără env configurat sau la eroare → seed local. */
export async function getPlatforms(): Promise<{ platforms: Platform[]; source: 'db' | 'seed' }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { platforms: SEED_PLATFORMS, source: 'seed' };
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('platforms')
      .select('name,country,grp,negotiability,note,url_template')
      .eq('active', true);
    if (error || !data?.length) return { platforms: SEED_PLATFORMS, source: 'seed' };
    return { platforms: data as Platform[], source: 'db' };
  } catch {
    return { platforms: SEED_PLATFORMS, source: 'seed' };
  }
}

export interface HuntModel {
  hunt_query: string;
  year_from: number;
  year_to: number;
}

/** Compune URL-ul de căutare pentru o platformă + un model (v5: build(m)). */
export function buildHuntUrl(platform: Platform, model: HuntModel): string | null {
  if (!platform.url_template) return null;
  const slug = model.hunt_query.toLowerCase().replace(/\s+/g, '-');
  return platform.url_template
    .replaceAll('{query}', encodeURIComponent(model.hunt_query))
    .replaceAll('{querySlug}', encodeURIComponent(slug))
    .replaceAll('{yearFrom}', String(model.year_from))
    .replaceAll('{yearTo}', String(model.year_to));
}

export function groupPlatforms(platforms: Platform[]): { grp: PlatformGroup; items: Platform[] }[] {
  return GROUP_ORDER.map((grp) => ({ grp, items: platforms.filter((p) => p.grp === grp) })).filter(
    (g) => g.items.length > 0
  );
}
