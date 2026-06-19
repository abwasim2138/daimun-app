/**
 * Lightweight SPA router utilities for clean, shareable path-based URLs.
 *
 * Replaces the old hash-based (`#/path`) routing with proper pathname routing
 * (`/path`) via History API pushState/replaceState.
 *
 * Usage:
 *   navigate('/admin')       — push a new history entry
 *   navigate('/', true)      — replace current entry (no back button)
 *   parseRoute()             — read current pathname + search params into a route object
 */

export interface Route {
  type: string;
  id?: string;
}

// ── Navigation ──────────────────────────────────────────────────

/** Navigate to a path-based route. Fires popstate so the app re-renders. */
export function navigate(path: string, replace = false) {
  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  // Dispatch popstate so the single listener in App picks it up
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// ── Route parsing ───────────────────────────────────────────────

/** Parse the current URL (pathname + search params) into a Route object. */
export function parseRoute(): Route {
  const { pathname, search, hash } = window.location;
  const params = new URLSearchParams(search);

  // ── Legacy hash redirect ──────────────────────────────────────
  // If someone hits an old `#/path` URL, redirect to the clean version.
  if (hash && hash.startsWith('#/')) {
    const cleanPath = hash.slice(1); // '#/admin' → '/admin'
    navigate(cleanPath, true);
    return parsePathname(cleanPath, params);
  }

  // ── Query-param routes (masjid landing page, ?page= fallback) ─
  const masjidParam = params.get('masjid');
  if (masjidParam) {
    return { type: 'masjid-landing', id: masjidParam };
  }

  const pageParam = params.get('page');
  if (pageParam) {
    const validPages = [
      'request-access', 'whats-new', 'etiquette', 'share', 'qibla',
      'volunteers', 'charity', 'join', 'zakat-al-fitr', 'itikaf-guide', 'eid-guide', 'eid-times',
      'roadmap', 'android',
    ];
    if (validPages.includes(pageParam)) {
      // Upgrade to clean pathname
      navigate(`/${pageParam}`, true);
      return { type: pageParam };
    }
  }

  return parsePathname(pathname, params);
}

function parsePathname(pathname: string, _params: URLSearchParams): Route {
  // Normalise: strip trailing slash (but keep '/' as-is)
  const p = pathname === '/' ? '/' : pathname.replace(/\/$/, '');

  // ── Parameterised routes ──────────────────────────────────────
  if (p.startsWith('/tv/'))        return { type: 'tv', id: p.slice(4) };
  if (p.startsWith('/edit/'))      return { type: 'edit', id: p.slice(6) };
  if (p.startsWith('/mosque/'))    return { type: 'mosque', id: p.slice(8) };
  if (p.startsWith('/timetable/')) return { type: 'timetable', id: p.slice(11) };
  if (p.startsWith('/masjid/')) {
    // Legacy /masjid/{id} → redirect to ?masjid= format
    const id = p.slice(8);
    navigate(`/?masjid=${id}`, true);
    return { type: 'masjid-landing', id };
  }

  // ── Static routes ─────────────────────────────────────────────
  const staticRoutes: Record<string, string> = {
    '/prayer-widget': 'widget',
    '/dnd-tips':      'dnd-tips',
    '/chrome-tips':   'chrome-tips',
    '/admin':         'admin',
    '/qibla':         'qibla',
    '/share':         'share',
    '/etiquette':     'etiquette',
    '/request-access':'request-access',
    '/whats-new':     'whats-new',
    '/join':          'join',
    '/volunteers':    'volunteers',
    '/charity':       'charity',
    '/zakat-al-fitr': 'zakat-al-fitr',
    '/itikaf-guide':  'itikaf-guide',
    '/eid-guide':     'eid-guide',
    '/eid-times':     'eid-times',
    '/roadmap':       'roadmap',
    '/android':       'android',
  };

  const staticType = staticRoutes[p];
  if (staticType) return { type: staticType };

  // /join can also have query params — starts with /join
  if (p.startsWith('/join')) return { type: 'join' };

  return { type: 'main' };
}