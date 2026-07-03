// Testează handler-ul GET /api/cron/notifications direct (fără server HTTP
// pornit) — autorizare prin CRON_SECRET, comportament corect fără date.
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/cron/notifications/route';

const secret = process.env.CRON_SECRET;
const canRun = Boolean(secret && process.env.SUPABASE_SERVICE_ROLE_KEY);

function makeRequest(authHeader?: string) {
  return new NextRequest('http://localhost/api/cron/notifications', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe.runIf(canRun)('GET /api/cron/notifications', () => {
  it('respinge fără token', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('respinge cu token greșit', async () => {
    const res = await GET(makeRequest('Bearer token-gresit-evident'));
    expect(res.status).toBe(401);
  });

  it('rulează cu succes cu token corect (indiferent dacă există oferte/preferințe)', async () => {
    const res = await GET(makeRequest(`Bearer ${secret}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

if (!canRun) {
  describe.skip('GET /api/cron/notifications (necesită CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY)', () => {
    it('sărit', () => {});
  });
}
