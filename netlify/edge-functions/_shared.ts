// Shared helpers for the SEO + sitemap edge functions.
// (Netlify ignores files beginning with "_", so this is not a function itself.)

export const SITE_URL = "https://daimun.app";

const SUPABASE_PROJECT = "qwydfsqcarkfkyeeuonr";
export const API_URL = `https://${SUPABASE_PROJECT}.supabase.co/functions/v1/server`;
// Public anon key — same one shipped in the client bundle, safe to expose.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3eWRmc3FjYXJrZmt5ZWV1b25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDI0MTIsImV4cCI6MjA4MzkxODQxMn0.5m6P1SkaUDCrAk-hRt7pnuy2xX72D4Rzfqb7sxfhEN8";

const AUTH_HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

export interface Mosque {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  temporarilyHidden?: boolean;
  offeredPrayers?: string[];
  updatedAt?: string;
  iqamaTimes?: Record<string, any>;
}

/** Fetch the full masjid list (visible ones only). Never throws. */
export async function fetchMosques(): Promise<Mosque[]> {
  try {
    const res = await fetch(`${API_URL}/mosques`, { headers: AUTH_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const list: Mosque[] = Array.isArray(data) ? data : data?.mosques ?? [];
    return list.filter((m) => m && m.id && !m.temporarilyHidden);
  } catch {
    return [];
  }
}

/** Fetch a single masjid by id. Never throws. */
export async function fetchMosque(id: string): Promise<Mosque | null> {
  try {
    const res = await fetch(`${API_URL}/mosques/${encodeURIComponent(id)}`, {
      headers: AUTH_HEADERS,
    });
    if (res.ok) {
      const data = await res.json();
      const m = data?.mosque ?? data;
      if (m && m.id) return m;
    }
  } catch {
    /* fall through to list lookup */
  }
  // Fallback: some deployments only expose the list endpoint.
  const all = await fetchMosques();
  return all.find((m) => m.id === id) ?? null;
}

// Every city Daimun currently serves in the Tampa Bay area. Matching against a
// known list is far more reliable than parsing wildly inconsistent addresses.
const KNOWN_CITIES = [
  "St. Petersburg", "St Petersburg", "Saint Petersburg", "Tarpon Springs",
  "Wesley Chapel", "Spring Hill", "Land O Lakes", "New Port Richey",
  "Pinellas Park", "Palm Harbor", "Plant City", "Apollo Beach",
  "Thonotosassa", "Gibsonton", "Clearwater", "Bradenton", "Zephyrhills",
  "Riverview", "Seffner", "Valrico", "Brandon", "Sarasota", "Dunedin",
  "Bartow", "Ruskin", "Largo", "Lutz", "Tampa",
];

export interface ParsedAddress {
  streetAddress: string;
  city: string;
  region: string;
  postalCode: string;
}

/** Best-effort parse of a free-form US address into structured parts. */
export function parseAddress(address: string): ParsedAddress {
  const region = "FL";
  // A ZIP is a 5-digit group; the street number can also be 5 digits, so take
  // the LAST one (the ZIP always trails the street number).
  const zipMatches = address.match(/\b\d{5}\b/g);
  const postalCode = zipMatches ? zipMatches[zipMatches.length - 1] : "";

  // City: prefer a known Tampa Bay city name found anywhere in the string.
  let city = "";
  for (const c of KNOWN_CITIES) {
    if (new RegExp(`\\b${c.replace(/\./g, "\\.")}\\b`, "i").test(address)) {
      city = c;
      break;
    }
  }
  // Fallback: the comma-separated part just before "FL".
  if (!city) {
    const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
    const flIdx = parts.findIndex((p) => /\bFL\b/i.test(p));
    if (flIdx > 0) city = parts[flIdx - 1];
  }

  // Street: the first comma segment when present (handles city names that are
  // themselves part of a street, e.g. "560 Clearwater Largo road"); otherwise
  // the text before the matched city.
  let streetAddress = address.split(",")[0].trim();
  if (!address.includes(",") && city) {
    const idx = address.toLowerCase().indexOf(city.toLowerCase());
    if (idx > 0) {
      const before = address.slice(0, idx).replace(/[,\s]+$/, "").trim();
      if (before) streetAddress = before;
    }
  }

  return { streetAddress, city, region, postalCode };
}

const PRAYER_LABELS: Record<string, string> = {
  fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha",
};

/** Human-readable list of Jummah/khutbah clock times, if any are fixed. */
export function jumuahTimes(iqama: Record<string, any> | undefined): string[] {
  const j = iqama?.jumuah;
  if (!j) return [];
  const out: string[] = [];
  const pushFromEntry = (entry: any) => {
    if (!entry) return;
    if (typeof entry === "string") out.push(entry);
    else if (entry.khutbah?.time) out.push(entry.khutbah.time);
    else if (entry.time) out.push(entry.time);
  };
  if (Array.isArray(j)) j.forEach(pushFromEntry);
  else pushFromEntry(j);
  return out.filter(Boolean);
}

/** Which of the five daily prayers this masjid holds. */
export function offeredPrayerLabels(m: Mosque): string[] {
  const offered = m.offeredPrayers?.length
    ? m.offeredPrayers
    : ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  return offered.map((p) => PRAYER_LABELS[p]).filter(Boolean);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a string for safe embedding inside a JSON-LD <script> block. */
export function jsonLdSafe(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
