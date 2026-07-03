// Client Supabase pentru Server Components / Server Actions / Route Handlers.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // În Server Components apelul poate eșua (nu se pot seta cookie-uri) —
          // middleware-ul se ocupă de refresh-ul sesiunii în acest caz.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignorat intenționat — vezi comentariul de mai sus
          }
        },
      },
    }
  );
}
