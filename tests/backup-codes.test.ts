import { describe, it, expect } from 'vitest';
import {
  generateBackupCodes,
  normalizeBackupCode,
  hashBackupCode,
  looksLikeBackupCode,
} from '../lib/auth/backup-codes';

describe('A-02 — coduri de rezervă', () => {
  it('generează 10 coduri unice în formatul XXXX-XXXX', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    codes.forEach((c) => expect(c).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/));
  });

  it('normalizează indiferent de spații, liniuță sau capitalizare', () => {
    expect(normalizeBackupCode(' ab12-cd34 ')).toBe('AB12CD34');
    expect(normalizeBackupCode('AB12CD34')).toBe('AB12CD34');
  });

  it('hash-ul e stabil pentru variante echivalente ale aceluiași cod', () => {
    expect(hashBackupCode('ab12-cd34')).toBe(hashBackupCode('AB12CD34'));
    expect(hashBackupCode('ab12-cd34')).not.toBe(hashBackupCode('ab12-cd35'));
  });

  it('recunoaște un cod de rezervă vs un cod TOTP de 6 cifre', () => {
    expect(looksLikeBackupCode('AB12-CD34')).toBe(true);
    expect(looksLikeBackupCode('123456')).toBe(false);
  });
});
