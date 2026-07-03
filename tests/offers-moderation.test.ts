// I-03/AD-02 — criteriul de acceptare M2: „un anunț nativ trece prin moderare
// și apare public". Testat live pe Supabase Cloud, exercitând RLS-ul real
// (nu doar logica din server actions).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && anonKey && serviceKey);

describe.runIf(canRun)('I-03 — anunț nativ: pending → invizibil public → aprobat → vizibil public', () => {
  let admin: SupabaseClient;
  let seller: SupabaseClient;
  let otherUser: SupabaseClient;
  let anon: SupabaseClient;

  const stamp = Date.now();
  const sellerCreds = { email: `test-offers-seller-${stamp}@vanatorul-mb.test`, password: 'Test-Parola-Seller-1' };
  const otherCreds = { email: `test-offers-other-${stamp}@vanatorul-mb.test`, password: 'Test-Parola-Other-2' };

  let sellerId = '';
  let otherId = '';
  let offerId = '';

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: createdSeller, error: e1 } = await admin.auth.admin.createUser({
      email: sellerCreds.email, password: sellerCreds.password, email_confirm: true,
    });
    if (e1 || !createdSeller.user) throw e1 ?? new Error('nu s-a putut crea userul vânzător');
    sellerId = createdSeller.user.id;

    const { data: createdOther, error: e2 } = await admin.auth.admin.createUser({
      email: otherCreds.email, password: otherCreds.password, email_confirm: true,
    });
    if (e2 || !createdOther.user) throw e2 ?? new Error('nu s-a putut crea al doilea user');
    otherId = createdOther.user.id;

    seller = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    await seller.auth.signInWithPassword(sellerCreds);

    otherUser = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    await otherUser.auth.signInWithPassword(otherCreds);

    anon = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  });

  afterAll(async () => {
    if (offerId) await admin.from('offers').delete().eq('id', offerId);
    if (sellerId) await admin.auth.admin.deleteUser(sellerId);
    if (otherId) await admin.auth.admin.deleteUser(otherId);
  });

  it('vânzătorul își publică anunțul (RLS: submitted_by=self, moderation forțat pending)', async () => {
    const { data, error } = await seller
      .from('offers')
      .insert({
        model_code: 'W124',
        title: `Anunț test moderare ${stamp}`,
        price: 9500,
        country: 'RO',
        submitted_by: sellerId,
        moderation: 'pending',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    offerId = data!.id;
  });

  it('vânzătorul nu se poate auto-aproba (RLS: USING trece — e proprietarul — dar WITH CHECK respinge noua valoare)', async () => {
    const { error } = await seller.from('offers').update({ moderation: 'approved' }).eq('id', offerId);
    expect(error).not.toBeNull();
  });

  it('anunțul pending NU e vizibil public (anon) și nici altui utilizator obișnuit', async () => {
    const { data: anonView } = await anon.from('offers').select('id').eq('id', offerId);
    expect(anonView ?? []).toHaveLength(0);

    const { data: otherView } = await otherUser.from('offers').select('id').eq('id', offerId);
    expect(otherView ?? []).toHaveLength(0);
  });

  it('vânzătorul ÎȘI vede propriul anunț, chiar pending (ca să știe stadiul)', async () => {
    const { data } = await seller.from('offers').select('id,moderation').eq('id', offerId);
    expect(data).toHaveLength(1);
    expect(data![0].moderation).toBe('pending');
  });

  it('un utilizator obișnuit NU poate aproba anunțul altcuiva (RLS: USING exclude rândul — 0 rânduri afectate, fără eroare)', async () => {
    const { data, error } = await otherUser
      .from('offers')
      .update({ moderation: 'approved' })
      .eq('id', offerId)
      .select('id');
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: check } = await admin.from('offers').select('moderation').eq('id', offerId).single();
    expect(check?.moderation).toBe('pending');
  });

  it('adminul aprobă anunțul → devine vizibil public', async () => {
    // simulăm decizia de admin direct (echivalent cu moderateOffer, care rulează
    // prin sesiunea reală a unui admin — aici verificăm doar rezultatul RLS-ului).
    const { error: approveErr } = await admin.from('offers').update({ moderation: 'approved' }).eq('id', offerId);
    expect(approveErr).toBeNull();

    const { data: anonView } = await anon.from('offers').select('id,moderation').eq('id', offerId);
    expect(anonView).toHaveLength(1);
    expect(anonView![0].moderation).toBe('approved');
  });
});

if (!canRun) {
  describe.skip('I-03 — anunț nativ: moderare (necesită SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
