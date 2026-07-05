/** Zile consecutive de vânătoare, numărate invers de la azi (v5 nu are asta —
 * datele existau deja în user_prefs.daily_hunt_log, doar nu erau afișate).
 * Dacă azi nu e încă bifată, pornim de la ieri — streak-ul nu s-a rupt încă,
 * doar nu a fost extins azi (Goal Gradient: nu penaliza înainte de miezul nopții). */
export function computeStreak(log: string[], todayIso: string): number {
  const set = new Set(log);
  let cursor = new Date(`${todayIso}T00:00:00Z`);
  if (!set.has(todayIso)) {
    cursor = new Date(cursor.getTime() - 86400000);
  }
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}
