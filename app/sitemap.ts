import type { MetadataRoute } from 'next';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';
}

/** SEO — doar paginile publice, indexabile (restul au robots noindex explicit). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/oferte`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/termeni`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/confidentialitate`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];
}
