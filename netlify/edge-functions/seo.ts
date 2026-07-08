import type { Context, Config } from "https://edge.netlify.com";
import {
  SITE_URL,
  fetchMosque,
  fetchMosques,
  parseAddress,
  jumuahTimes,
  offeredPrayerLabels,
  escapeHtml,
  jsonLdSafe,
  type Mosque,
} from "./_shared.ts";

// Static content pages get hand-written, keyword-aware meta.
const STATIC_META: Record<string, { title: string; description: string }> = {
  "/qibla": {
    title: "Qibla Direction Finder — Tampa Bay | Daimun",
    description:
      "Find the exact Qibla direction toward the Kaaba from anywhere in Tampa Bay. A simple, accurate compass for your daily prayers.",
  },
  "/etiquette": {
    title: "Masjid Etiquette & Adab — Daimun",
    description:
      "A friendly guide to masjid etiquette (adab): how to enter, pray, and behave in the mosque. Perfect for new Muslims and visitors in Tampa Bay.",
  },
  "/volunteers": {
    title: "Volunteer at Tampa Bay Masjids — Daimun",
    description:
      "Volunteer opportunities at masjids across Tampa Bay. Give back to your local Muslim community.",
  },
  "/charity": {
    title: "Give Sadaqah & Zakat — Tampa Bay Masjids | Daimun",
    description:
      "Support masjids and Islamic charities across Tampa Bay. Donate sadaqah and zakat to your local community.",
  },
  "/zakat-al-fitr": {
    title: "Zakat al-Fitr Guide — Tampa Bay | Daimun",
    description:
      "How much is Zakat al-Fitr this year and where to pay it in Tampa Bay. A simple guide before Eid al-Fitr.",
  },
  "/itikaf-guide": {
    title: "I'tikaf Guide — Last 10 Nights of Ramadan | Daimun",
    description:
      "Everything you need to know about I'tikaf during the last ten nights of Ramadan, plus which Tampa Bay masjids offer I'tikaf.",
  },
  "/eid-guide": {
    title: "Eid Guide — Prayer, Sunnah & Etiquette | Daimun",
    description:
      "Your complete guide to Eid al-Fitr and Eid al-Adha: the Eid prayer, sunnahs of the day, and etiquette.",
  },
  "/eid-times": {
    title: "Eid Prayer Times — Tampa Bay Masjids | Daimun",
    description:
      "Eid al-Fitr and Eid al-Adha salah times for masjids across Tampa Bay. Find the Eid prayer nearest you.",
  },
  "/whats-new": {
    title: "What's New — Daimun",
    description: "The latest features and updates to Daimun.",
  },
  "/roadmap": {
    title: "Roadmap — Daimun",
    description: "What we're building next for Tampa Bay's masjids and Muslim community.",
  },
  "/join": {
    title: "Add Your Masjid to Daimun",
    description:
      "Are you a masjid admin in Tampa Bay? Add your masjid to Daimun so the community can find your prayer and iqama times.",
  },
  "/android": {
    title: "Daimun for Android — Early Access",
    description:
      "Get early access to the Daimun Android app for Tampa Bay prayer and iqama times.",
  },
  "/get-app": {
    title: "Get the Daimun App",
    description:
      "Download Daimun for prayer and iqama times across Tampa Bay masjids.",
  },
};

/** Replace or insert a tag's attribute value in the HTML head. */
function setMetaContent(html: string, matcher: RegExp, replacement: string): string {
  if (matcher.test(html)) return html.replace(matcher, replacement);
  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function applyMeta(
  html: string,
  opts: { title: string; description: string; canonical: string; ogImage?: string },
): string {
  const { title, description, canonical } = opts;
  const ogImage = opts.ogImage ?? `${SITE_URL}/og-image.png`;
  const t = escapeHtml(title);
  const d = escapeHtml(description);

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  html = setMetaContent(
    html,
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${d}" />`,
  );
  html = setMetaContent(
    html,
    /<link\s+rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${canonical}" />`,
  );
  html = setMetaContent(
    html,
    /<meta\s+property="og:title"[^>]*>/,
    `<meta property="og:title" content="${t}" />`,
  );
  html = setMetaContent(
    html,
    /<meta\s+property="og:description"[^>]*>/,
    `<meta property="og:description" content="${d}" />`,
  );
  html = setMetaContent(
    html,
    /<meta\s+property="og:url"[^>]*>/,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
  );
  html = setMetaContent(
    html,
    /<meta\s+property="og:image"[^>]*>/,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
  );
  html = setMetaContent(
    html,
    /<meta\s+name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${t}" />`,
  );
  html = setMetaContent(
    html,
    /<meta\s+name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${d}" />`,
  );
  return html;
}

/** Inject markup right before </head> (JSON-LD) or </body> (crawlable text). */
function injectHead(html: string, markup: string): string {
  return html.replace("</head>", `${markup}\n  </head>`);
}
function injectBody(html: string, markup: string): string {
  return html.replace("</body>", `${markup}\n  </body>`);
}

function mosqueSeo(html: string, m: Mosque): string {
  const { streetAddress, city, region, postalCode } = parseAddress(m.address);
  const cityLabel = city ? `${city}, ${region}` : region;
  const canonical = `${SITE_URL}/?masjid=${encodeURIComponent(m.id)}`;

  const title = `${m.name} — Prayer & Iqama Times · ${cityLabel} | Daimun`;
  const prayers = offeredPrayerLabels(m);
  const jumuah = jumuahTimes(m.iqamaTimes);
  const description =
    `Today's prayer and iqama times for ${m.name} in ${cityLabel}. ` +
    `${prayers.join(", ")}${jumuah.length ? ` and Jummah at ${jumuah.join(", ")}` : ""}. ` +
    `Salah schedule, announcements and events, updated by the masjid.`;

  html = applyMeta(html, { title, description, canonical });

  // ── JSON-LD: Mosque / PlaceOfWorship ──────────────────────────────
  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": ["Mosque", "PlaceOfWorship"],
    name: m.name,
    url: canonical,
    address: {
      "@type": "PostalAddress",
      streetAddress: streetAddress || undefined,
      addressLocality: city || undefined,
      addressRegion: region,
      postalCode: postalCode || undefined,
      addressCountry: "US",
    },
    areaServed: cityLabel,
  };
  if (typeof m.latitude === "number" && typeof m.longitude === "number" && (m.latitude || m.longitude)) {
    ld.geo = { "@type": "GeoCoordinates", latitude: m.latitude, longitude: m.longitude };
  }
  if (m.website) ld.sameAs = [m.website];
  html = injectHead(html, `<script type="application/ld+json">${jsonLdSafe(ld)}</script>`);

  // ── Crawlable content mirror (visually hidden, truthful) ──────────
  const jumuahLine = jumuah.length
    ? `<p>Jummah (Friday) prayer: ${escapeHtml(jumuah.join(", "))}.</p>`
    : "";
  const crawlBlock = `<div id="seo-content" aria-hidden="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0">
      <h1>${escapeHtml(m.name)} — Prayer &amp; Iqama Times</h1>
      <p>${escapeHtml(m.address)}</p>
      <p>Daily salah and iqama times for ${escapeHtml(m.name)}, a masjid in ${escapeHtml(cityLabel)}. Prayers held: ${escapeHtml(prayers.join(", "))}.</p>
      ${jumuahLine}
    </div>`;
  return injectBody(html, crawlBlock);
}

async function homeSeo(html: string): Promise<string> {
  const mosques = await fetchMosques();
  if (!mosques.length) return html;

  // ItemList of every masjid page — gives crawlers a clean, keyword-rich map.
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Masjids in the Tampa Bay area on Daimun",
    numberOfItems: mosques.length,
    itemListElement: mosques.map((m, i) => {
      const { city } = parseAddress(m.address);
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Mosque",
          name: m.name,
          url: `${SITE_URL}/?masjid=${encodeURIComponent(m.id)}`,
          address: city ? `${city}, FL` : "FL",
        },
      };
    }),
  };
  html = injectHead(html, `<script type="application/ld+json">${jsonLdSafe(itemList)}</script>`);

  const links = mosques
    .map((m) => {
      const { city } = parseAddress(m.address);
      const loc = city ? ` — ${escapeHtml(city)}, FL` : "";
      return `<li><a href="/?masjid=${encodeURIComponent(m.id)}">${escapeHtml(m.name)} prayer &amp; iqama times${loc}</a></li>`;
    })
    .join("");
  const crawlBlock = `<div id="seo-content" aria-hidden="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0">
      <h1>Prayer &amp; Iqama Times for Tampa Bay Masjids</h1>
      <p>Daimun lists accurate daily prayer times and iqama times for masjids across the Tampa Bay area, including Tampa, Brandon, Clearwater, Sarasota, Wesley Chapel and more.</p>
      <ul>${links}</ul>
    </div>`;
  return injectBody(html, crawlBlock);
}

export default async function handler(request: Request, context: Context): Promise<Response> {
  const res = await context.next();
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return res;

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  let html = await res.text();

  try {
    const masjidId = url.searchParams.get("masjid");

    if (pathname === "/" && masjidId) {
      const m = await fetchMosque(masjidId);
      if (m) html = mosqueSeo(html, m);
    } else if (pathname.startsWith("/mosque/")) {
      const id = decodeURIComponent(pathname.slice("/mosque/".length));
      const m = await fetchMosque(id);
      if (m) html = mosqueSeo(html, m);
    } else if (pathname.startsWith("/timetable/")) {
      const id = decodeURIComponent(pathname.slice("/timetable/".length));
      const m = await fetchMosque(id);
      if (m) {
        const { city } = parseAddress(m.address);
        const cityLabel = city ? `${city}, FL` : "FL";
        html = applyMeta(html, {
          title: `${m.name} — Printable Prayer Timetable · ${cityLabel} | Daimun`,
          description: `Printable monthly prayer and iqama timetable for ${m.name} in ${cityLabel}.`,
          canonical: `${SITE_URL}/timetable/${encodeURIComponent(m.id)}`,
        });
      }
    } else if (pathname === "/") {
      html = await homeSeo(html);
    } else if (STATIC_META[pathname]) {
      const { title, description } = STATIC_META[pathname];
      html = applyMeta(html, { title, description, canonical: `${SITE_URL}${pathname}` });
    }
  } catch {
    // On any failure, serve the untouched shell — SEO is best-effort.
  }

  // Rebuild headers: the body length/encoding changed, so the originals
  // (content-length, content-encoding) no longer apply.
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.set("content-type", "text/html; charset=utf-8");

  return new Response(html, { status: res.status, headers });
}

export const config: Config = {
  path: "/*",
  excludedPath: [
    "/assets/*",
    "/*.png", "/*.jpg", "/*.jpeg", "/*.gif", "/*.svg", "/*.ico", "/*.webp",
    "/*.js", "/*.mjs", "/*.css", "/*.map",
    "/*.json", "/*.xml", "/*.txt", "/*.webmanifest",
    "/admin", "/edit/*", "/tv/*",
  ],
};
