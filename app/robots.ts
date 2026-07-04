import type { MetadataRoute } from 'next';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cont', '/admin', '/api', '/autentificare', '/inregistrare', '/verifica-2fa', '/verifica-email', '/reseteaza-parola', '/dezaboneaza'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
