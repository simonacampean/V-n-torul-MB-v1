// „Vânători Reușite" — RLS live pe Supabase Cloud: un user trimite propria
// poveste (forțat „pending"), alți useri/anon NU o văd până nu e aprobată,
// proprietarul își vede mereu propria poveste, iar odată aprobată devine
// public vizibilă. Mirror exact al tests/offers-moderation.test.ts (I-03/AD-02).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && anonKey && serviceKey);

describe.runIf(canRun)('„Vânători Reușite" — RLS: pending → invizibil public → aprobat → vizibil public', () => {
  let admin: SupabaseClient;
  let vanator: SupabaseClient;
  let otherUser: SupabaseClient;
  let anon: SupabaseClient;

  const stamp = Date.now();
  const vanatorCreds = { email: `test-story-vanator-${stamp}@vanatorul-mb.test`, password: 'Test-Parola-Vanator-1' };
  const otherCreds = { email: `test-story-other-${stamp}@vanatorul-mb.test`, password: 'Test-Parola-Other-2' };

  let vanatorId = '';
  let otherId = '';
  let storyId = '';

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: createdVanator, error: e1 } = await admin.auth.admin.createUser({
      email: vanatorCreds.email, password: vanatorCreds.password, email_confirm: true,
    });
    if (e1 || !createdVanator.user) throw e1 ?? new Error('nu s-a putut crea userul vânător');
    vanatorId = createdVanator.user.id;

    const { data: createdOther, error: e2 } = await admin.auth.admin.createUser({
      email: otherCreds.email, password: otherCreds.password, email_confirm: true,
    });
    if (e2 || !createdOther.user) throw e2 ?? new Error('nu s-a putut crea al doilea user');
    otherId = createdOther.user.id;

    vanator = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    await vanator.auth.signInWithPassword(vanatorCreds);

    otherUser = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
    await otherUser.auth.signInWithPassword(otherCreds);

    anon = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  });

  afterAll(async () => {
    if (storyId) await admin.from('success_stories').delete().eq('id', storyId);
    if (vanatorId) await admin.auth.admin.deleteUser(vanatorId);
    if (otherId) await admin.auth.admin.deleteUser(otherId);
  });

  it('vânătorul își trimite propria poveste (RLS: user_id=self, moderation forțat pending)', async () => {
    const { data, error } = await vanator
      .from('success_stories')
      .insert({
        user_id: vanatorId,
        model_code: 'W201',
        an_fabricatie: 1991,
        pret_achizitie: 8500,
        pret_mediu_piata_atunci: 10900,
        nume_afisat: 'TEST-STORY Alin din Cluj',
        text_poveste: 'Am primit alerta la timp și am prins o ofertă bună înainte să fie listată în masă.',
        moderation: 'pending',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    storyId = data!.id;
  });

  it('userul nu se poate auto-aproba (WITH CHECK respinge insert direct cu moderation=approved)', async () => {
    const { error } = await vanator.from('success_stories').insert({
      user_id: vanatorId,
      model_code: 'W201',
      pret_achizitie: 5000,
      text_poveste: 'Încercare de auto-aprobare, text suficient de lung.',
      moderation: 'approved',
    });
    expect(error).not.toBeNull();
  });

  it('povestea pending NU e vizibilă public (anon) și nici altui utilizator obișnuit', async () => {
    const { data: anonView } = await anon.from('success_stories').select('id').eq('id', storyId);
    expect(anonView ?? []).toHaveLength(0);

    const { data: otherView } = await otherUser.from('success_stories').select('id').eq('id', storyId);
    expect(otherView ?? []).toHaveLength(0);
  });

  it('vânătorul își vede propria poveste, chiar pending (ca să știe stadiul)', async () => {
    const { data } = await vanator.from('success_stories').select('id,moderation').eq('id', storyId);
    expect(data).toHaveLength(1);
    expect(data![0].moderation).toBe('pending');
  });

  it('un utilizator obișnuit NU poate aproba povestea altcuiva (RLS blochează update)', async () => {
    await otherUser.from('success_stories').update({ moderation: 'approved' }).eq('id', storyId);
    // fie eroare RLS, fie 0 rânduri afectate — în ambele cazuri, statusul rămâne neschimbat
    const { data: check } = await admin.from('success_stories').select('moderation').eq('id', storyId).single();
    expect(check?.moderation).toBe('pending');
  });

  it('adminul aprobă povestea → devine vizibilă public', async () => {
    const { error: approveErr } = await admin.from('success_stories').update({ moderation: 'approved' }).eq('id', storyId);
    expect(approveErr).toBeNull();

    const { data: anonView } = await anon.from('success_stories').select('id,moderation').eq('id', storyId);
    expect(anonView).toHaveLength(1);
    expect(anonView![0].moderation).toBe('approved');
  });
});

if (!canRun) {
  describe.skip('„Vânători Reușite" — RLS (necesită SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
