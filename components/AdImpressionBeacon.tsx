'use client';

import { useEffect } from 'react';

/** AD-03 — trimite un beacon de afișare o singură dată, la montarea sloturi cu campanie directă. */
export default function AdImpressionBeacon({ campaignId }: { campaignId: string }) {
  useEffect(() => {
    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId }),
      keepalive: true,
    }).catch(() => {});
  }, [campaignId]);

  return null;
}
