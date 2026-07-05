// P3 — viteză percepută: /oferte face o interogare Supabase live la fiecare
// cerere; fără acest schelet, un semnal 4G slab ar arăta ecran alb >300ms,
// perceput ca eroare. Formă identică cu .offer, ca tranziția să fie lină.
export default function OferteLoading() {
  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="skeleton" style={{ width: 180, height: 28, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '90%', maxWidth: 760, height: 14, marginBottom: 20 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className="offer skeleton-card">
          <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '40%', height: 12, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '100%', height: 10 }} />
        </div>
      ))}
    </main>
  );
}
