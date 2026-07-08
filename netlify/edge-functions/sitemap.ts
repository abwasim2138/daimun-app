import type { Config } from "https://edge.netlify.com";
import { SITE_URL, fetchMosques } from "../edge-lib/shared.ts";

// Static, indexable content routes (in priority order).
const STATIC_PATHS: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/qibla", priority: "0.6", changefreq: "monthly" },
  { path: "/etiquette", priority: "0.5", changefreq: "monthly" },
  { path: "/eid-times", priority: "0.6", changefreq: "monthly" },
  { path: "/eid-guide", priority: "0.5", changefreq: "monthly" },
  { path: "/zakat-al-fitr", priority: "0.5", changefreq: "monthly" },
  { path: "/itikaf-guide", priority: "0.5", changefreq: "monthly" },
  { path: "/volunteers", priority: "0.5", changefreq: "weekly" },
  { path: "/charity", priority: "0.5", changefreq: "monthly" },
  { path: "/join", priority: "0.6", changefreq: "monthly" },
  { path: "/whats-new", priority: "0.4", changefreq: "weekly" },
];

function urlEntry(loc: string, priority: string, changefreq: string, lastmod?: string): string {
  return (
    `  <url>\n` +
    `    <loc>${loc}</loc>\n` +
    (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : "") +
    `    <changefreq>${changefreq}</changefreq>\n` +
    `    <priority>${priority}</priority>\n` +
    `  </url>`
  );
}

export default async function handler(): Promise<Response> {
  const mosques = await fetchMosques();

  const urls: string[] = STATIC_PATHS.map((s) =>
    urlEntry(`${SITE_URL}${s.path === "/" ? "/" : s.path}`, s.priority, s.changefreq),
  );

  for (const m of mosques) {
    const loc = `${SITE_URL}/?masjid=${encodeURIComponent(m.id)}`;
    const lastmod = m.updatedAt ? new Date(m.updatedAt).toISOString().slice(0, 10) : undefined;
    urls.push(urlEntry(loc, "0.8", "daily", lastmod));
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

export const config: Config = { path: "/sitemap.xml" };
