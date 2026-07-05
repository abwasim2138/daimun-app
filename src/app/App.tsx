import React, { useState, useEffect, useMemo, useCallback, useRef, startTransition, Suspense } from 'react';
import { MapPin, Bell, BellOff, Globe, LogIn, LayoutDashboard, Compass, Locate, BookOpen, Megaphone, Heart, HandHeart, TriangleAlert, Mail, Newspaper, Sun, Moon, Monitor, PartyPopper, Map, Smartphone } from 'lucide-react';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { API_URL, SITE_URL } from './utils/api';
import { navigate, parseRoute } from './utils/router';
import { getDistance } from 'geolib';
import { CalculationMethod, PrayerTimes, Coordinates } from 'adhan';
import { toHijri } from 'hijri-converter';
import { calculateIqamaTimes } from './utils/iqamaCalculator';
import { timeToMinutes, getCurrentMinutes, formatPrayerTime, calculatePrayerTimes } from './utils/prayerTimes';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';

// ── Critical path (home screen first paint) ──────────────────────────
import { MosqueCard } from './components/MosqueCard';
import { GetTheAppBanner } from './components/GetTheAppBanner';
import { AppStoreBadge } from './components/AppStoreBadge';
import { APP_ICON_DATA_URL as appIcon } from './components/appIconData';
import { MosqueDetailModal } from './components/MosqueDetailModal';
import { SearchBar } from './components/SearchBar';
import { SmartSearchCard, isInformationalSearch } from './components/SmartSearchCard';
import { ThemeProvider } from './components/ThemeProvider';
import { UpcomingPrayerCard } from './components/UpcomingPrayerCard';
import { RamadanCountdown } from './components/RamadanCountdown';
import { IftarCountdownCard } from './components/IftarCountdownCard';
import { SunnahFastingReminder } from './components/SunnahFastingReminder';
import { TahajjudCard } from './components/TahajjudCard';
import { EventCarousel } from './components/EventCarousel';
import { usePrayerTheme } from './components/usePrayerTheme';
import { useTheme } from 'next-themes@0.4.6';
import { getFaviconDataURL } from './components/FaviconSVG';
import { AuthProvider, useAuth } from './components/AuthContext';
import { JanazaAlertCard } from './components/JanazaAlertCard';
import { NotificationPrompt, useNotificationScheduler } from './components/NotificationPrompt';
import { InstallPrompt } from './components/InstallPrompt';
import { LoginModal } from './components/LoginModal';

// ── Lazy: route-level pages (code-split, loaded on navigation) ───────
const TVDisplayPage = React.lazy(() => import('./components/TVDisplayPage').then(m => ({ default: m.TVDisplayPage })));
const EditPage = React.lazy(() => import('./components/EditPage').then(m => ({ default: m.EditPage })));
const PrayerWidget = React.lazy(() => import('./components/PrayerWidget').then(m => ({ default: m.PrayerWidget })));
const DNDTipsPage = React.lazy(() => import('./components/DNDTipsPage').then(m => ({ default: m.DNDTipsPage })));
const ChromeTipsPage = React.lazy(() => import('./components/ChromeTipsPage').then(m => ({ default: m.ChromeTipsPage })));
const QiblaCompass = React.lazy(() => import('./components/QiblaCompass').then(m => ({ default: m.QiblaCompass })));
const MarketingPage = React.lazy(() => import('./components/MarketingPage').then(m => ({ default: m.MarketingPage })));
const MasjidEtiquette = React.lazy(() => import('./components/MasjidEtiquette').then(m => ({ default: m.MasjidEtiquette })));
const WhatsNewPage = React.lazy(() => import('./components/WhatsNewPage').then(m => ({ default: m.WhatsNewPage })));
const RequestAccessPage = React.lazy(() => import('./components/RequestAccessPage').then(m => ({ default: m.RequestAccessPage })));
const JoinPage = React.lazy(() => import('./components/JoinPage').then(m => ({ default: m.JoinPage })));
const PrintableTimetable = React.lazy(() => import('./components/PrintableTimetable').then(m => ({ default: m.PrintableTimetable })));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const VolunteersPage = React.lazy(() => import('./components/VolunteersPage').then(m => ({ default: m.VolunteersPage })));
const CharityPage = React.lazy(() => import('./components/CharityPage').then(m => ({ default: m.CharityPage })));
const MasjidLandingPage = React.lazy(() => import('./components/MasjidLandingPage').then(m => ({ default: m.MasjidLandingPage })));
const ZakatAlFitrPage = React.lazy(() => import('./components/ZakatAlFitrPage').then(m => ({ default: m.ZakatAlFitrPage })));
const ItikafGuidePage = React.lazy(() => import('./components/ItikafGuidePage').then(m => ({ default: m.ItikafGuidePage })));
const EidGuidePage = React.lazy(() => import('./components/EidGuidePage').then(m => ({ default: m.EidGuidePage })));
const EidTimesPage = React.lazy(() => import('./components/EidTimesPage').then(m => ({ default: m.EidTimesPage })));
const RoadmapPage = React.lazy(() => import('./components/RoadmapPage').then(m => ({ default: m.RoadmapPage })));
const AndroidEarlyAccessPage = React.lazy(() => import('./components/AndroidEarlyAccessPage').then(m => ({ default: m.AndroidEarlyAccessPage })));
const DesktopHero = React.lazy(() => import('./components/DesktopHero').then(m => ({ default: m.DesktopHero })));
const GetAppRedirect = React.lazy(() => import('./components/GetAppRedirect').then(m => ({ default: m.GetAppRedirect })));

// ── Lazy: modals (loaded on first open, modal transition masks latency) ──
const AddMosqueModal = React.lazy(() => import('./components/AddMosqueModal').then(m => ({ default: m.AddMosqueModal })));
const AddScheduledTimeChangeModal = React.lazy(() => import('./components/AddScheduledTimeChangeModal').then(m => ({ default: m.AddScheduledTimeChangeModal })));
const ForgotPasswordModal = React.lazy(() => import('./components/ForgotPasswordModal').then(m => ({ default: m.ForgotPasswordModal })));
const ResetPasswordModal = React.lazy(() => import('./components/ResetPasswordModal').then(m => ({ default: m.ResetPasswordModal })));
const LogoutConfirmDialog = React.lazy(() => import('./components/LogoutConfirmDialog').then(m => ({ default: m.LogoutConfirmDialog })));
const RequestMasjidModal = React.lazy(() => import('./components/RequestMasjidModal').then(m => ({ default: m.RequestMasjidModal })));
const MasjidRequestsDashboard = React.lazy(() => import('./components/MasjidRequestsDashboard').then(m => ({ default: m.MasjidRequestsDashboard })));
const AddJanazaModal = React.lazy(() => import('./components/AddJanazaModal').then(m => ({ default: m.AddJanazaModal })));
const EditJanazaModal = React.lazy(() => import('./components/EditJanazaModal').then(m => ({ default: m.EditJanazaModal })));
const EditEventModal = React.lazy(() => import('./components/EditEventModal').then(m => ({ default: m.EditEventModal })));
const ReportTimeModal = React.lazy(() => import('./components/ReportTimeModal').then(m => ({ default: m.ReportTimeModal })));
const BugReportModal = React.lazy(() => import('./components/BugReportModal').then(m => ({ default: m.BugReportModal })));

// ── Preflight: fire API calls at module evaluation time ──────────────
// Eliminates the render → mount → useEffect → fetch waterfall.
// AppContent's useEffect consumes these once; stale-on-remount is handled
// by falling back to the retry-capable fetchMosques()/fetchJanazas().
const _preflightHeaders = {
  'apikey': publicAnonKey,
  'Authorization': `Bearer ${publicAnonKey}`,
};
const _mosquesPreflight = fetch(`${API_URL}/mosques`, { headers: _preflightHeaders })
  .then(r => r.ok ? r.json() : null)
  .catch(() => null);
const _janazasPreflight = fetch(`${API_URL}/janazas`, { headers: _preflightHeaders })
  .then(r => r.ok ? r.json() : null)
  .catch(() => null);
let _preflightConsumed = false;

// ── Analytics: fire-and-forget page-view tracking ────────────────────
fetch(`${API_URL}/analytics/track`, {
  method: 'POST',
  headers: { ..._preflightHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ page: window.location.pathname || '/', tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
}).catch(() => {});

/** Minimal full-screen loading state for lazy route transitions */
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
      <div className="text-gray-400 dark:text-white/30 text-sm">Loading…</div>
    </div>
  );
}

export interface IqamaTime {
  type: 'fixed' | 'offset';
  time?: string; // For fixed times (e.g., "6:00 AM")
  minutes?: number; // For offset times (e.g., 10 means "10 mins after adhan")
}

export interface JumuahTime {
  khutbah: {
    type: 'fixed';
    time: string; // Khutbah time (e.g., "12:30 PM")
  };
}

export interface IqamaTimes {
  fajr: IqamaTime;
  dhuhr: IqamaTime;
  asr: IqamaTime;
  maghrib: IqamaTime;
  isha: IqamaTime;
  jumuah?: JumuahTime | JumuahTime[] | IqamaTime | string; // Support multiple Jumuah times (array), old formats for backward compatibility
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  description?: string;
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'nth-day';
    dayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
    dayOfMonth?: number; // 1-31
    nthWeek?: 'first' | 'second' | 'third' | 'fourth' | 'last'; // For nth-day frequency
    nthDayOfWeek?: number; // 0-6 for nth-day frequency
  };
}

export interface Announcement {
  id: string;
  prayers: ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah')[]; // Multiple prayers can be affected
  newTime: string; // The new iqama time (e.g., "6:30 AM")
  message: string; // Optional message explaining the change
  startDate: string; // ISO date string
  endDate?: string; // Optional ISO date string
}

export interface ScheduledTimeChange {
  id: string;
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jumuah';
  newTime: string; // The new iqama time (e.g., "6:30 AM")
  startDate: string; // ISO date string - when this change takes effect
  endDate?: string; // Optional ISO date string - when to revert to base time
  reason?: string; // Optional reason for the change (e.g., "Daylight Saving Time", "Summer Schedule")
}

export interface RamadanProgram {
  iftarProvided?: boolean;       // Does the masjid serve iftar?
  iftarEveryNight?: boolean;     // Every night or select nights?
  iftarNotes?: string;           // e.g., "Fridays & weekends only", "Donations welcome"
  tarawih?: boolean;             // Does the masjid hold tarawih?
  tarawihRakat?: 8 | 20;         // 8 or 20 rakat
  tarawihTime?: string;          // e.g., "9:30 PM" — optional, specific start time
  itikaf?: boolean;              // I'tikaf space available (last 10 nights)
  qiyam?: boolean;               // Qiyam al-Layl program (last 10 nights)
  qiyamTime?: string;            // e.g., "2:00 AM"
  khatmQuran?: boolean;          // Quran completion/khatm program during Ramadan
  khatmQuranDate?: string;       // Optional known date for khatm completion (e.g., "2026-03-20")
}

export interface EidInfo {
  prayerTimes?: string[];        // e.g., ["8:00 AM", "9:30 AM"] — multiple salat times if offered
  sistersAccommodation?: boolean; // Sisters prayer space available
  refreshments?: boolean;        // Food/refreshments provided
  carnival?: boolean;            // Activities/carnival on Eid day or after
  carnivalDetails?: string;      // e.g., "Sat 3/21, 5 pm to 11 pm"
  notes?: string;                // Additional notes (e.g., "Bring your own prayer mat", "Gifts for children")
  contact?: {
    name: string;
    phone: string;
  };
  whatsapp?: string;             // Dedicated Eid WhatsApp group/channel (overrides main one)
}

export interface Mosque {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  iqamaTimes: IqamaTimes;
  events: Event[];
  announcements?: Announcement[]; // Deprecated - kept for backward compatibility
  scheduledTimeChanges?: ScheduledTimeChange[]; // New field for scheduled iqama time changes
  updatedAt?: string; // ISO timestamp of last modification
  website?: string;
  whatsappChannel?: string; // WhatsApp Channel invite URL (e.g., https://whatsapp.com/channel/...)
  note?: string; // Special notes about the masjid (e.g., different location for Jumuah)
  calculationMethod?: string; // e.g., 'MuslimWorldLeague', 'NorthAmerica', etc.
  asrMethod?: 'Standard' | 'Hanafi'; // Standard (shadow = object length) or Hanafi (shadow = 2x object length)
  ramadanProgram?: RamadanProgram; // Ramadan-specific program info
  eidInfo?: EidInfo; // Eid al-Fitr and Eid al-Adha specific program info
  offeredPrayers?: ('fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha')[]; // Which daily prayers the masjid holds — defaults to all five if omitted
  temporarilyHidden?: boolean; // Admin can temporarily hide from users while data is stale/being updated
  logoSvg?: string; // SVG markup for the masjid's logo (traced from uploaded image by admin)
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute());

  useEffect(() => {
    const handleNavigation = () => {
      // startTransition keeps the current screen visible while preparing
      // the new one, eliminating blank-frame jank on lazy-loaded routes.
      startTransition(() => {
        setRoute(parseRoute());
      });
    };

    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  // Scroll to top on every route change — reliable because it fires AFTER React renders
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  // Set favicon at the top level so it's present on ALL routes (including shared landing pages)
  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = getFaviconDataURL();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <Suspense fallback={<RouteLoading />}>
        {route.type === 'tv' && 'id' in route ? (
          <TVDisplayPage mosqueId={route.id} />
        ) : route.type === 'edit' && 'id' in route ? (
          <EditPage 
            mosqueId={route.id} 
            onBack={() => {
              const cameFromAdmin = sessionStorage.getItem('edit-return-to') === 'admin';
              sessionStorage.removeItem('edit-return-to');
              if (cameFromAdmin) {
                navigate('/admin');
              } else if ('id' in route) {
                navigate(`/mosque/${route.id}`);
              }
            }} 
          />
        ) : route.type === 'widget' ? (
          <PrayerWidget />
        ) : route.type === 'dnd-tips' ? (
          <DNDTipsPage onBack={() => navigate('/')} />
        ) : route.type === 'chrome-tips' ? (
          <ChromeTipsPage onBack={() => navigate('/')} />
        ) : route.type === 'qibla' ? (
          <QiblaCompass onBack={() => navigate('/')} />
        ) : route.type === 'share' ? (
          <MarketingPage onBack={() => navigate('/')} />
        ) : route.type === 'etiquette' ? (
          <MasjidEtiquette onBack={() => navigate('/')} />
        ) : route.type === 'whats-new' ? (
          <WhatsNewPage onBack={() => navigate('/')} />
        ) : route.type === 'request-access' ? (
          <RequestAccessPage
            onBack={() => navigate('/')}
            onSwitchToLogin={() => {
              sessionStorage.setItem('open-login-modal', '1');
              navigate('/');
            }}
          />
        ) : route.type === 'join' ? (
          <JoinPage
            onBack={() => navigate('/')}
            onSwitchToLogin={() => {
              sessionStorage.setItem('open-login-modal', '1');
              navigate('/');
            }}
          />
        ) : route.type === 'volunteers' ? (
          <VolunteersPage onBack={() => navigate('/')} />
        ) : route.type === 'charity' ? (
          <CharityPage onBack={() => navigate('/')} />
        ) : route.type === 'zakat-al-fitr' ? (
          <ZakatAlFitrPage onBack={() => navigate('/')} />
        ) : route.type === 'itikaf-guide' ? (
          <ItikafGuidePage onBack={() => navigate('/')} />
        ) : route.type === 'eid-guide' ? (
          <EidGuidePage onBack={() => navigate('/')} />
        ) : route.type === 'eid-times' ? (
          <EidTimesPage onBack={() => navigate('/')} />
        ) : route.type === 'roadmap' ? (
          <RoadmapPage onBack={() => navigate('/')} onOpenFeedback={() => { navigate('/'); setTimeout(() => window.dispatchEvent(new CustomEvent('daimun:open-bug-report')), 100); }} />
        ) : route.type === 'android' ? (
          <AndroidEarlyAccessPage onBack={() => navigate('/')} iconSrc={appIcon} />
        ) : route.type === 'get-app' ? (
          <GetAppRedirect />
        ) : route.type === 'masjid-landing' && 'id' in route ? (
          <MasjidLandingPage mosqueId={route.id} onBack={() => {
            // Clean up query param and go home
            const url = new URL(window.location.href);
            url.searchParams.delete('masjid');
            url.hash = '';
            window.history.replaceState(null, '', url.toString());
            setRoute({ type: 'main' });
          }} />
        ) : route.type === 'timetable' && 'id' in route ? (
          <AppContent deepLinkMosqueId={undefined} timetableMosqueId={route.id} />
        ) : route.type === 'admin' ? (
          <AppContent deepLinkMosqueId={undefined} adminMode={true} />
        ) : (
          <AppContent deepLinkMosqueId={route.type === 'mosque' && 'id' in route ? route.id : undefined} />
        )}
        </Suspense>
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent({ deepLinkMosqueId, adminMode, timetableMosqueId }: { deepLinkMosqueId?: string; adminMode?: boolean; timetableMosqueId?: string }) {
  // API_URL imported from /utils/api.ts
  const { isAuthenticated, isLoading: authLoading, accessToken, logout } = useAuth();

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  // Prayer-aware ambient theme
  const prayerTheme = usePrayerTheme(mosques, favorites);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Gate the slow ambient transition — skip on first paint to avoid a visible light→dark flash
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => {
    // Wait a tick so next-themes has resolved the correct class on <html>
    const id = requestAnimationFrame(() => setThemeMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [selectedMosqueForDetail, setSelectedMosqueForDetail] = useState<Mosque | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(() => {
    // Auto-open login modal if redirected from RequestAccessPage
    if (sessionStorage.getItem('open-login-modal') === '1') {
      sessionStorage.removeItem('open-login-modal');
      return true;
    }
    return false;
  });
  // SignupModal removed — replaced with RequestAccessPage at #/request-access
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    // Try to restore from localStorage only if recent (within 30 minutes)
    const stored = localStorage.getItem('userLocation');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        const thirtyMinutes = 30 * 60 * 1000;
        
        // Only use cached location if it has a timestamp and is recent
        if (parsed.timestamp && (now - parsed.timestamp) < thirtyMinutes) {
          return { lat: parsed.lat, lng: parsed.lng };
        } else {
          // Location is too old, clear it
          localStorage.removeItem('userLocation');
        }
      } catch {
        return null;
      }
    }
    return null;
  });
  // Track location source so GPS always overrides IP (state so UI re-renders)
  const [locationSource, setLocationSource] = useState<'cache' | 'ip' | 'gps' | null>(() => {
    // If useState initializer found a cached location, mark source as cache
    const stored = localStorage.getItem('userLocation');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const thirtyMinutes = 30 * 60 * 1000;
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < thirtyMinutes) {
          return 'cache';
        }
      } catch {}
    }
    return null;
  });
  // Ref mirror for async callbacks that shouldn't stale-close over state
  const locationSourceRef = useRef(locationSource);
  useEffect(() => { locationSourceRef.current = locationSource; }, [locationSource]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Location permission state
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationCardDismissed, setLocationCardDismissed] = useState(() => {
    return localStorage.getItem('daimun-location-card-dismissed') === 'true';
  });

  // Notification re-enable state (tracks whether the prompt was dismissed so footer button can appear)
  const [notificationsDismissedFlag, setNotificationsDismissedFlag] = useState(() => {
    try {
      const stored = localStorage.getItem('daimun-notification-prefs');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.dismissed === true && !parsed.enabled;
      }
    } catch {}
    return false;
  });
  
  // Pagination state
  const [displayCount, setDisplayCount] = useState(10);
  const ITEMS_PER_PAGE = 10;

  // Animation guard — entrance animations only play on the very first load.
  // After that, cards appear instantly to prevent flicker on state-driven re-renders
  // (e.g. userLocation updating from IP → GPS causes filteredMosques to re-sort).
  const hasAnimatedRef = useRef(false);

  // Janaza state
  const [janazas, setJanazas] = useState<Array<{
    id: string;
    mosqueId: string;
    dateTime: string;
    notes: string;
    createdAt: string;
  }>>([]);
  const [showAddJanazaModal, setShowAddJanazaModal] = useState(false);
  const [showEditJanazaModal, setShowEditJanazaModal] = useState(false);
  const [selectedJanazaForEdit, setSelectedJanazaForEdit] = useState<{
    id: string;
    mosqueId: string;
    dateTime: string;
    notes: string;
    createdAt: string;
  } | null>(null);

  
  // Event editing state
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<{
    mosqueId: string;
    mosqueName: string;
    event: Event;
  } | null>(null);

  // Announcement state - Renamed to Scheduled Time Changes
  const [showAddScheduledChangeModal, setShowAddScheduledChangeModal] = useState(false);
  const [selectedMosqueForScheduledChange, setSelectedMosqueForScheduledChange] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Request masjid state (for non-authenticated users)
  const [showRequestMasjidModal, setShowRequestMasjidModal] = useState(false);
  const [showMasjidRequestsDashboard, setShowMasjidRequestsDashboard] = useState(false);

  // Report incorrect time state
  const [showReportTimeModal, setShowReportTimeModal] = useState(false);
  const [selectedMosqueForReport, setSelectedMosqueForReport] = useState<Mosque | null>(null);

  // Bug report modal state
  const [showBugReportModal, setShowBugReportModal] = useState(false);

  // Allow the Roadmap page (or any other route) to open the bug report modal
  // by dispatching the 'daimun:open-bug-report' custom event after navigating home.
  useEffect(() => {
    const handler = () => setShowBugReportModal(true);
    window.addEventListener('daimun:open-bug-report', handler);
    return () => window.removeEventListener('daimun:open-bug-report', handler);
  }, []);

  // Reset pagination when search query changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [searchQuery]);

  // Detect Supabase recovery token from password reset email.
  // Handles three flows:
  //   A) Direct token_hash in query params (our custom email template link)
  //   B) Implicit flow hash fragment (#access_token=...&type=recovery)
  //   C) Error fragment (#error=access_denied&error_code=otp_expired)
  useEffect(() => {
    const SUPABASE_URL = `https://${projectId}.supabase.co`;
    const queryParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    // ── Flow A: Custom email link → ?token_hash=xxx&type=recovery ──
    const tokenHash = queryParams.get('token_hash');
    const tokenType = queryParams.get('type');
    if (tokenHash && tokenType === 'recovery') {
      console.log('[Auth] Recovery token_hash detected in query params, verifying...');
      window.history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));

      (async () => {
        try {
          const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
            method: 'POST',
            headers: {
              'apikey': publicAnonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token_hash: tokenHash, type: 'recovery' }),
          });

          if (!res.ok) {
            const err = await res.json();
            console.error('[Auth] Token verification failed:', err);
            const msg = err.error_description || err.msg || '';
            if (msg.toLowerCase().includes('expired') || err.error_code === 'otp_expired') {
              setRecoveryError('expired');
            } else {
              setRecoveryError(msg || 'This reset link is no longer valid. Please request a new one.');
            }
            return;
          }

          const data = await res.json();
          if (data.access_token) {
            console.log('[Auth] Recovery session obtained via token_hash');
            setRecoveryToken(data.access_token);
          } else {
            setRecoveryError('Unable to verify reset link. Please request a new one.');
          }
        } catch (e) {
          console.error('[Auth] Token exchange error:', e);
          setRecoveryError('Something went wrong verifying your reset link. Please try again.');
        }
      })();
      return;
    }

    // ── Flow B: Implicit flow — hash contains access_token + type=recovery ──
    if (hash.includes('access_token=') && hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const token = params.get('access_token');
      if (token) {
        console.log('[Auth] Recovery token detected in URL hash (implicit flow)');
        setRecoveryToken(token);
        window.history.replaceState(null, '', window.location.pathname);
      }
      return;
    }

    // ── Flow C: Error fragment — e.g. otp_expired, access_denied ──
    if (hash.includes('error=') && hash.includes('error_code=')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const errorCode = params.get('error_code') || 'unknown';
      const errorDesc = params.get('error_description')?.replace(/\+/g, ' ') || '';
      console.warn('[Auth] Recovery error in URL:', errorCode, errorDesc);

      if (errorCode === 'otp_expired') {
        setRecoveryError('expired');
      } else {
        setRecoveryError(errorDesc || 'Something went wrong with the password reset link.');
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Ramadan Mode — account for Islamic day starting at Maghrib
  const isRamadan = useMemo(() => {
    // Get a representative mosque for calculating Maghrib time
    const representative = mosques.find(m => favorites.has(m.id)) || mosques[0];
    
    const now = new Date();
    let adjustedDate = new Date(now);
    
    // If we have a mosque, check if we're past Maghrib
    if (representative) {
      try {
        const times = calculatePrayerTimes(
          representative.latitude,
          representative.longitude,
          now,
          representative.calculationMethod || 'NorthAmerica',
          representative.asrMethod || 'Standard'
        );
        const maghribTime = formatPrayerTime(times.maghrib);
        const maghribMinutes = timeToMinutes(maghribTime);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // If we're past Maghrib, we're in the next Islamic day
        if (currentMinutes >= maghribMinutes) {
          adjustedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
        }
      } catch (e) {
        // If prayer time calculation fails, fall back to midnight-based conversion
        console.warn('Failed to calculate Maghrib time for Islamic date adjustment:', e);
      }
    }
    
    const hijri = toHijri(adjustedDate.getFullYear(), adjustedDate.getMonth() + 1, adjustedDate.getDate());
    return hijri.hm === 9;
  }, [mosques, favorites]);

  // Set favicon and page title
  useEffect(() => {
    // Set page title — switches during Ramadan
    document.title = isRamadan ? 'Ramaḍān — Dāimūn' : 'Dāimūn';

    // Set favicon
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = getFaviconDataURL();
  }, [isRamadan]);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('mosqueFavorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('mosqueFavorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  // Run notification scheduler at the app level (always active, reads prefs from localStorage)
  useNotificationScheduler(mosques, favorites);

  // Helper: merge client-side update timestamps
  const mergeMosqueTimestamps = (fetchedMosques: Mosque[]): Mosque[] => {
    return fetchedMosques.map((m: Mosque) => {
      const localTimestamp = localStorage.getItem(`mosque-updated:${m.id}`);
      if (localTimestamp) {
        const diffHours = (Date.now() - new Date(localTimestamp).getTime()) / (1000 * 60 * 60);
        if (diffHours > 24) {
          localStorage.removeItem(`mosque-updated:${m.id}`);
          return m;
        }
        if (!m.updatedAt || new Date(localTimestamp) > new Date(m.updatedAt)) {
          return { ...m, updatedAt: localTimestamp };
        }
      }
      return m;
    });
  };

  // Retry-capable fetch wrapper for cold-start resilience.
  // Uses exponential backoff and per-request timeout via AbortController.
  const fetchWithRetry = async (
    url: string,
    options: RequestInit = {},
    retries = 4,
    baseDelay = 2000,
  ): Promise<Response> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.status >= 400 && response.status < 500) return response;
        if (response.status >= 502 && response.status <= 504 && attempt < retries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`[fetchWithRetry] ${response.status} on attempt ${attempt + 1}, retrying in ${delay}ms…`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        if (attempt === retries) throw err;
        const delay = baseDelay * Math.pow(2, attempt);
        const reason = (err as Error).name === 'AbortError' ? 'timeout (20s)' : 'network error';
        console.warn(`[fetchWithRetry] ${reason} on attempt ${attempt + 1}, retrying in ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('fetchWithRetry: unreachable');
  };

  // Fetch mosques from the edge function
  const fetchMosques = async () => {
    try {
      const response = await fetchWithRetry(`${API_URL}/mosques`, {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch mosques: ${response.status}`);
      }

      const data = await response.json();
      const fetched = data.mosques || [];
      if (fetched.length === 0) {
        // Database is empty, initialize it
        await initializeDatabase();
        return;
      }
      setMosques(mergeMosqueTimestamps(fetched));
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching mosques:', error);
      const reason = (error as Error).name === 'AbortError'
        ? 'Server not responding (timed out after all retries). The edge function may be cold-starting — try again in a minute.'
        : `Unable to load mosques: ${(error as Error).message}`;
      setError(reason);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initialize database with sample data
  const initializeDatabase = async () => {
    try {
      console.log('Initializing database...');
      const response = await fetchWithRetry(`${API_URL}/initialize`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('Database initialized successfully');
        await fetchMosques();
      } else {
        const errorText = await response.text();
        console.error('Failed to initialize database:', errorText);
        setError('Failed to initialize database. Please refresh the page.');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      setError('Failed to initialize database. Please refresh the page.');
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Force reinitialize database with clean simple IDs
  const forceReinitializeDatabase = async () => {
    if (!confirm('This will delete all mosques and reset to sample data with simple IDs. Continue?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Force reinitializing database...');
      const response = await fetchWithRetry(`${API_URL}/initialize`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true }),
      });

      if (response.ok) {
        console.log('Database force reinitialized successfully');
        await fetchMosques();
        alert('Database reset successfully! All mosques now have simple IDs.');
      } else {
        const errorText = await response.text();
        console.error('Failed to reinitialize database:', errorText);
        alert('Failed to reinitialize database. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error reinitializing database:', error);
      alert('Failed to reinitialize database. Please try again.');
      setIsLoading(false);
    }
  };

  // Load mosques on mount — consume preflight if available, else retry-capable fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!_preflightConsumed) {
        _preflightConsumed = true;
        const preflight = await _mosquesPreflight;
        if (!cancelled && preflight?.mosques?.length > 0) {
          setMosques(mergeMosqueTimestamps(preflight.mosques));
          setIsLoading(false);
          return;
        }
      }
      // Preflight missed or returned empty — fall back to retry-capable fetch
      if (!cancelled) fetchMosques();
    })();
    return () => { cancelled = true; };
  }, []);

  // Mark entrance animations as completed ~1.5s after first data load
  useEffect(() => {
    if (!isLoading && mosques.length > 0 && !hasAnimatedRef.current) {
      const timer = setTimeout(() => { hasAnimatedRef.current = true; }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, mosques.length]);

  // Prefetch admin-only chunks once we know the user is authenticated
  // so navigating to #/admin or #/edit/:id is instant
  useEffect(() => {
    if (isAuthenticated) {
      import('./components/AdminDashboard');
      import('./components/EditPage');
    }
  }, [isAuthenticated]);

  // Fetch janazas from the edge function
  const fetchJanazas = async () => {
    try {
      const response = await fetchWithRetry(`${API_URL}/janazas`, {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch janazas: ${response.status}`);
      }

      const data = await response.json();
      setJanazas(data.janazas || []);
    } catch (error) {
      console.error('Error fetching janazas:', error);
    }
  };

  // Load janazas on mount — try preflight first, fall back to retry-capable fetch
  useEffect(() => {
    let cancelled = false;
    _janazasPreflight.then(data => {
      if (!cancelled && data?.janazas) {
        setJanazas(data.janazas);
      } else if (!cancelled) {
        fetchJanazas();
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Add janaza
  const handleAddJanaza = async (mosqueId: string, dateTime: string, notes: string) => {
    try {
      const response = await fetch(`${API_URL}/janazas`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mosqueId, dateTime, notes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add janaza');
      }

      // Refresh janazas list
      await fetchJanazas();
      alert('Janaza alert added successfully');
    } catch (error) {
      console.error('Error adding janaza:', error);
      throw error;
    }
  };

  // Delete janaza
  const handleDeleteJanaza = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/janazas/${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete janaza');
      }

      // Refresh janazas list
      await fetchJanazas();
    } catch (error) {
      console.error('Error deleting janaza:', error);
      alert('Failed to remove janaza alert');
    }
  };

  // Edit janaza
  const handleEditJanaza = async (id: string, mosqueId: string, dateTime: string, notes: string) => {
    try {
      const response = await fetch(`${API_URL}/janazas/${id}`, {
        method: 'PUT',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mosqueId, dateTime, notes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit janaza');
      }

      // Refresh janazas list
      await fetchJanazas();
      alert('Janaza alert edited successfully');
    } catch (error) {
      console.error('Error editing janaza:', error);
      throw error;
    }
  };

  // IP-based geolocation fallback — silent, no permission dialog required
  useEffect(() => {
    // Skip if we already have a cached GPS location
    if (locationSourceRef.current === 'cache') {
      console.log('[IP Geolocation] Skipping — cached location available');
      return;
    }

    const controller = new AbortController();

    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Only set IP location if GPS hasn't already resolved
        if (data.latitude && data.longitude && locationSourceRef.current !== 'gps') {
          console.log('[IP Geolocation] Approximate location:', data.city, data.region, data.postal);
          setUserLocation({ lat: data.latitude, lng: data.longitude });
          setLocationSource('ip');
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.log('[IP Geolocation] Fallback unavailable:', err.message);
        }
      });

    return () => controller.abort();
  }, []);

  // Request user location on mount (native GPS — may show permission dialog)
  useEffect(() => {
    if ('geolocation' in navigator) {
      console.log('[Geolocation] Requesting user location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('[Geolocation] GPS location granted:', position.coords.latitude, position.coords.longitude);
          setLocationSource('gps');
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationDenied(false);
          // Save to localStorage with timestamp
          localStorage.setItem('userLocation', JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          }));
        },
        (error) => {
          // Silently handle — IP geolocation fallback may already have set a location
          console.log('[Geolocation] Native location unavailable:', error.message);
          setLocationDenied(true);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      console.log('[Geolocation] Geolocation API not available');
    }
  }, []);

  // Function to manually request location
  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationSource('gps');
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationDenied(false);
          // Save to localStorage with timestamp
          localStorage.setItem('userLocation', JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          }));
        },
        (error) => {
          setLocationDenied(true);
          if (error.code === error.PERMISSION_DENIED) {
            // Only toast if the browser truly blocked it (won't re-prompt natively)
            if (navigator.permissions && navigator.permissions.query) {
              navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
                if (result.state === 'denied') {
                  toast.error('Location blocked', { description: 'Enable location for this site in your browser settings.' });
                }
                // 'prompt' = browser will re-prompt next time, stay silent
              }).catch(() => {
                // Permissions API unsupported (Safari) — won't re-prompt this session
                toast.error('Location blocked', { description: 'Reload the page and tap "Allow" when prompted.' });
              });
            } else {
              // Safari fallback
              toast.error('Location blocked', { description: 'Reload the page and tap "Allow" when prompted.' });
            }
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            toast.error('Location unavailable', { description: 'Check your device location settings and try again.' });
          } else if (error.code === error.TIMEOUT) {
            toast.error('Location timed out', { description: 'Please try again.' });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast.error('Geolocation not supported', { description: 'Your browser does not support location services.' });
    }
  };

  // Handle deep link - open mosque detail modal when mosques are loaded
  useEffect(() => {
    if (deepLinkMosqueId && !isLoading && mosques.length > 0) {
      console.log('[Deep Link] Looking for mosque with ID:', deepLinkMosqueId);
      console.log('[Deep Link] Available mosque IDs:', mosques.map(m => m.id));
      const mosque = mosques.find(m => m.id === deepLinkMosqueId);
      if (mosque) {
        console.log('[Deep Link] Found mosque:', mosque.name);
        setSelectedMosqueForDetail(mosque);
        setIsDetailModalOpen(true);
      } else {
        console.warn('[Deep Link] Mosque not found:', deepLinkMosqueId);
        alert(`Masjid not found. The link may be outdated or the masjid may have been removed.`);
        // Navigate back to home
        navigate('/');
      }
    }
  }, [deepLinkMosqueId, isLoading, mosques]);

  // Refresh mosques
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMosques();
  };

  // Calculate distance between two points using geolib
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // getDistance returns distance in meters, convert to miles
    const distanceInMeters = getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    );
    const distanceInMiles = distanceInMeters * 0.000621371; // Convert meters to miles
    return distanceInMiles;
  };

  // Smart natural language search with keyword awareness + fuzzy typo tolerance
  const searchMosques = (query: string, mosquesList: Mosque[]): Mosque[] => {
    if (!query.trim()) return mosquesList;

    // If this is an informational SmartSearch intent (e.g. "fajr", "suhoor",
    // "eid", "zakat"), show the answer card but don't filter the mosque list.
    if (isInformationalSearch(query)) return mosquesList;

    const lowerQuery = query.toLowerCase().trim();
    const tokens = lowerQuery.split(/\s+/).filter(t => t.length > 0);

    // ── Levenshtein distance (optimised single-row DP) ──────────────
    const levenshtein = (a: string, b: string): number => {
      if (a === b) return 0;
      if (!a.length) return b.length;
      if (!b.length) return a.length;
      if (a.length < b.length) { const t = a; a = b; b = t; }
      const bLen = b.length;
      const row = Array.from({ length: bLen + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        let prev = i;
        for (let j = 1; j <= bLen; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          const val = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost);
          row[j - 1] = prev;
          prev = val;
        }
        row[bLen] = prev;
      }
      return row[bLen];
    };

    // Adaptive max-distance: 1 for short tokens (≤4 chars), 2 for longer
    const maxDist = (tokenLen: number) => tokenLen <= 4 ? 1 : 2;

    // Check if any word in `text` is within Levenshtein tolerance of `token`
    const fuzzyWordMatch = (token: string, text: string): boolean => {
      if (token.length < 3) return false; // Too short for fuzzy — would be noisy
      const d = maxDist(token.length);
      return text.split(/[\s,.\-/]+/).some(word => {
        if (!word) return false;
        // Quick length-diff gate: if lengths differ by > d, skip entirely
        if (Math.abs(word.length - token.length) > d) return false;
        return levenshtein(token, word) <= d;
      });
    };

    // Keyword aliases → categories
    const KEYWORD_MAP: Record<string, string[]> = {
      ramadan: ['ramadan', 'ramazan', 'ramadhan'],
      iftar: ['iftar', 'iftaar', 'break fast'],
      suhoor: ['suhoor', 'suhur', 'sehri', 'sahur'],
      taraweeh: ['taraweeh', 'tarawih', 'taraweh', 'taravih'],
      itikaf: ['itikaf', "i'tikaf", 'itikaaf', 'last 10', 'last ten'],
      qiyam: ['qiyam', 'tahajjud', 'night prayer'],
      khatm: ['khatm', 'khatam', 'quran completion'],
      jumuah: ['jumuah', 'jummah', 'jumma', "jum'ah", 'friday', 'khutbah', 'khutba'],
      janaza: ['janaza', 'janazah', 'funeral'],
    };

    // Detect which smart categories the query matches
    const matchedCategories = new Set<string>();
    for (const [category, aliases] of Object.entries(KEYWORD_MAP)) {
      if (aliases.some(alias => lowerQuery.includes(alias))) {
        matchedCategories.add(category);
      }
    }

    // Active janaza mosque IDs
    const janazaMosqueIds = new Set(janazas.map(j => j.mosqueId));

    return mosquesList.filter(mosque => {
      // Direct text match on name and address
      const nameMatch = mosque.name.toLowerCase().includes(lowerQuery);
      const addressMatch = mosque.address.toLowerCase().includes(lowerQuery);
      
      // Search in salah times (e.g., "fajr", "morning", "dawn")
      const salahTimeMatch = tokens.some(token => {
        if (/fajr|morning|dawn/.test(token)) return true;
        if (/dhuhr|zuhr|noon|afternoon/.test(token)) return true;
        if (/^asr$/.test(token)) return true;
        if (/maghrib|sunset|evening/.test(token)) return true;
        if (/isha/.test(token)) return true;
        return false;
      });

      // Search in events
      const eventMatch = mosque.events.some(event =>
        event.title.toLowerCase().includes(lowerQuery) ||
        event.description?.toLowerCase().includes(lowerQuery)
      );

      // Smart category matches (Ramadan programs, jumuah, janaza)
      const rp = mosque.ramadanProgram;
      let categoryMatch = false;

      if (matchedCategories.has('ramadan')) {
        categoryMatch = categoryMatch || !!rp;
      }
      if (matchedCategories.has('iftar')) {
        categoryMatch = categoryMatch || !!rp?.iftarProvided;
      }
      if (matchedCategories.has('suhoor')) {
        categoryMatch = categoryMatch || !!rp;
      }
      if (matchedCategories.has('taraweeh')) {
        categoryMatch = categoryMatch || !!rp?.tarawih;
      }
      if (matchedCategories.has('itikaf')) {
        categoryMatch = categoryMatch || !!rp?.itikaf;
      }
      if (matchedCategories.has('qiyam')) {
        categoryMatch = categoryMatch || !!rp?.qiyam;
      }
      if (matchedCategories.has('khatm')) {
        categoryMatch = categoryMatch || !!rp?.khatmQuran;
      }
      if (matchedCategories.has('jumuah')) {
        categoryMatch = categoryMatch || !!mosque.iqamaTimes.jumuah;
      }
      if (matchedCategories.has('janaza')) {
        categoryMatch = categoryMatch || janazaMosqueIds.has(mosque.id);
      }

      // Rakat-specific ("8 rakat", "20 rakat")
      const rakatMatch = tokens.some(token => {
        if (token === '8' && lowerQuery.includes('rakat')) return rp?.tarawihRakat === 8;
        if (token === '20' && lowerQuery.includes('rakat')) return rp?.tarawihRakat === 20;
        return false;
      });

      // Notes match
      const noteMatch = mosque.note?.toLowerCase().includes(lowerQuery) || false;

      // Token-level fuzzy on name/address (exact substring + Levenshtein typo tolerance)
      const nameLower = mosque.name.toLowerCase();
      const addrLower = mosque.address.toLowerCase();
      const fuzzyMatch = tokens.some(token =>
        nameLower.includes(token) ||
        addrLower.includes(token) ||
        fuzzyWordMatch(token, nameLower) ||
        fuzzyWordMatch(token, addrLower) ||
        ((token === 'near' || token === 'close' || token === 'closest' || token === 'nearby') && userLocation)
      );

      return nameMatch || addressMatch || salahTimeMatch || eventMatch || categoryMatch || rakatMatch || noteMatch || fuzzyMatch;
    });
  };

  // Filter and sort mosques: favorites first, then by distance
  const filteredMosques = useMemo(() => {
    let filtered = searchMosques(searchQuery, mosques);

    // Hide mosques that admins have temporarily hidden from users
    filtered = filtered.filter(m => !m.temporarilyHidden);

    // Sort: favorites first, then by distance
    if (userLocation) {
      filtered = [...filtered].sort((a, b) => {
        // Favorites always come first
        const aIsFav = favorites.has(a.id);
        const bIsFav = favorites.has(b.id);
        
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        
        // If both are favorites or both are not, sort by distance
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    } else {
      // No location: just put favorites first
      filtered = [...filtered].sort((a, b) => {
        const aIsFav = favorites.has(a.id);
        const bIsFav = favorites.has(b.id);
        
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return 0;
      });
    }

    return filtered;
  }, [mosques, searchQuery, favorites, userLocation]);

  // Eid al-Adha card state — computed once per render
  const eidAdhaCard = (() => {
    const eidDate = new Date('2026-05-27T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((eidDate.getTime() - today.getTime()) / 86400000);
    if (diffDays < -3 || diffDays > 10) return null;
    return {
      diffDays,
      isEidDay: diffDays === 0,
      isPost: diffDays < 0,
      isDhulHijja: diffDays > 3,
    };
  })();

  // Get paginated mosques
  const displayedMosques = useMemo(() => {
    return filteredMosques.slice(0, displayCount);
  }, [filteredMosques, displayCount]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  // Stable callback refs for MosqueCard to enable React.memo
  const handleMosqueEdit = useCallback((mosque: Mosque) => {
    navigate(`/edit/${mosque.id}`);
  }, []);

  const handleMosqueDetail = useCallback((mosque: Mosque) => {
    setSelectedMosqueForDetail(mosque);
    setIsDetailModalOpen(true);
  }, []);

  const noopDelete = useCallback(() => {}, []);
  const noopAddEvent = useCallback(() => {}, []);
  const noopDeleteEvent = useCallback(() => {}, []);

  // Add mosque
  const handleAddMosque = async (mosque: Omit<Mosque, 'id'>) => {
    try {
      const response = await fetch(`${API_URL}/mosques`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mosque),
      });

      if (!response.ok) {
        throw new Error('Failed to add mosque');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh mosques list
        await fetchMosques();
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error adding mosque:', error);
      alert('Failed to add masjid. Please try again.');
    }
  };

  // Convert a masjid request into a real masjid entry.
  // Throws on failure so the calling code (MasjidRequestsDashboard) can show errors.
  const handleConvertRequest = async (request: { masjidName: string; address: string; city: string; state: string; website: string | null }) => {
    const fullAddress = `${request.address}, ${request.city}, ${request.state}`;
    
    // Geocode the address — fall back to 0,0 so the mosque is still created
    let coords: { lat: number; lng: number } = { lat: 0, lng: 0 };
    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
        { headers: { 'User-Agent': 'Daimun-Masjid-App' } }
      );
      const geoData = await geoResponse.json();
      if (geoData && geoData.length > 0) {
        coords = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) };
      } else {
        console.warn('[ConvertRequest] Geocoding returned no results for:', fullAddress, '— using 0,0 fallback');
      }
    } catch (geoErr) {
      console.warn('[ConvertRequest] Geocoding failed for:', fullAddress, geoErr, '— using 0,0 fallback');
    }

    const newMosque: Omit<Mosque, 'id'> = {
      name: request.masjidName,
      address: fullAddress,
      latitude: coords.lat,
      longitude: coords.lng,
      calculationMethod: 'NorthAmerica',
      iqamaTimes: {
        fajr: { type: 'offset', minutes: 20 },
        dhuhr: { type: 'offset', minutes: 15 },
        asr: { type: 'offset', minutes: 15 },
        maghrib: { type: 'offset', minutes: 5 },
        isha: { type: 'offset', minutes: 15 },
      },
      events: [],
      ...(request.website && { website: request.website }),
    };

    // Create the mosque via the API
    const response = await fetch(`${API_URL}/mosques`, {
      method: 'POST',
      headers: {
        'apikey': publicAnonKey,
        'Authorization': `Bearer ${accessToken || publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newMosque),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to create masjid (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error('Server returned unsuccessful response when creating masjid');
    }

    // Refresh mosques list so the new masjid appears
    await fetchMosques();
  };

  // Edit mosque
  const handleEditMosque = async (id: string, updates: Partial<Mosque>) => {
    // Authentication required - disabled for now
  };

  // Delete mosque
  const handleDeleteMosque = async (id: string) => {
    // Authentication required - disabled for now
  };

  // Add event
  const handleAddEvent = async (mosqueId: string, event: Omit<Event, 'id'>) => {
    // Authentication required - disabled for now
  };

  // Edit event
  const handleEditEvent = async (mosqueId: string, eventId: string, eventData: Omit<Event, 'id'>) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error('Failed to edit event');
      }

      // Track update timestamp client-side
      localStorage.setItem(`mosque-updated:${mosqueId}`, new Date().toISOString());

      // Refresh mosques list
      await fetchMosques();
      
      // Update the detail modal mosque if open
      if (selectedMosqueForDetail && selectedMosqueForDetail.id === mosqueId) {
        const updatedMosque = mosques.find(m => m.id === mosqueId);
        if (updatedMosque) {
          setSelectedMosqueForDetail(updatedMosque);
        }
      }
      
      alert('Event updated successfully');
    } catch (error) {
      console.error('Error editing event:', error);
      alert('Failed to edit event. Please try again.');
    }
  };

  // Delete event
  const handleDeleteEvent = async (mosqueId: string, eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Track update timestamp client-side
      localStorage.setItem(`mosque-updated:${mosqueId}`, new Date().toISOString());

      // Refresh mosques list
      await fetchMosques();
      
      // Update the detail modal mosque if open
      if (selectedMosqueForDetail && selectedMosqueForDetail.id === mosqueId) {
        const updatedMosque = mosques.find(m => m.id === mosqueId);
        if (updatedMosque) {
          setSelectedMosqueForDetail(updatedMosque);
        }
      }
      
      alert('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  // Add scheduled time change(s) — supports bulk array
  const handleAddScheduledChange = async (mosqueId: string, changes: Omit<ScheduledTimeChange, 'id'>[]) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/scheduled-changes`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        throw new Error('Failed to add scheduled time changes');
      }

      // Track update timestamp client-side
      localStorage.setItem(`mosque-updated:${mosqueId}`, new Date().toISOString());

      // Refresh mosques list
      await fetchMosques();
      setShowAddScheduledChangeModal(false);
    } catch (error) {
      console.error('Error adding scheduled time changes:', error);
      throw error;
    }
  };

  // Delete scheduled time change
  const handleDeleteScheduledChange = async (mosqueId: string, changeId: string) => {
    try {
      const response = await fetch(`${API_URL}/mosques/${mosqueId}/scheduled-changes/${changeId}`, {
        method: 'DELETE',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete scheduled time change');
      }

      // Track update timestamp client-side
      localStorage.setItem(`mosque-updated:${mosqueId}`, new Date().toISOString());

      // Refresh mosques list
      await fetchMosques();
    } catch (error) {
      console.error('Error deleting scheduled time change:', error);
      alert('Failed to delete scheduled time change. Please try again.');
    }
  };

  // Check if we should show the Jumuah motivation card
  const shouldShowJumuahCard = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
    
    // Only show on Fridays
    if (dayOfWeek !== 5) return false;
    
    // Check if current time is before the latest Jumuah iqama time
    // Find the latest Jumuah time from all mosques
    let latestJumuahTime: Date | null = null;
    
    for (const mosque of mosques) {
      if (mosque.iqamaTimes.jumuah.type === 'fixed' && mosque.iqamaTimes.jumuah.time) {
        const [time, period] = mosque.iqamaTimes.jumuah.time.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        
        let hour24 = hours;
        if (period === 'PM' && hours !== 12) {
          hour24 = hours + 12;
        } else if (period === 'AM' && hours === 12) {
          hour24 = 0;
        }
        
        const jumuahDateTime = new Date(now);
        jumuahDateTime.setHours(hour24, minutes, 0, 0);
        
        if (!latestJumuahTime || jumuahDateTime > latestJumuahTime) {
          latestJumuahTime = jumuahDateTime;
        }
      }
    }
    
    // If we found a Jumuah time, check if current time is before it
    if (latestJumuahTime) {
      return now < latestJumuahTime;
    }
    
    // If no Jumuah times found, show until 3 PM as a fallback
    const threePM = new Date(now);
    threePM.setHours(15, 0, 0, 0);
    return now < threePM;
  }, [mosques]);

  // Check if Maghrib has passed for Sunnah fasting reminder
  const sunnahFastingReminderData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 3 = Wednesday
    
    // Only relevant on Sunday or Wednesday
    if (dayOfWeek !== 0 && dayOfWeek !== 3) {
      return { maghribPassed: false, currentDay: dayOfWeek };
    }
    
    // Get a representative mosque (first favorite, or first in list)
    const representativeMosque = filteredMosques.find(m => favorites.has(m.id)) || filteredMosques[0];
    
    if (!representativeMosque) {
      return { maghribPassed: false, currentDay: dayOfWeek };
    }
    
    // Calculate Maghrib time for this mosque
    const calculatedTimes = calculateIqamaTimes(
      representativeMosque.latitude,
      representativeMosque.longitude,
      representativeMosque.iqamaTimes,
      now,
      representativeMosque.calculationMethod || 'NorthAmerica',
      representativeMosque.asrMethod || 'Standard',
      representativeMosque.scheduledTimeChanges
    );
    
    // Get current time in minutes
    const currentMinutes = getCurrentMinutes();
    
    // Get Maghrib time in minutes
    const maghribMinutes = timeToMinutes(calculatedTimes.maghrib.iqama);
    
    // Check if Maghrib has passed
    const maghribPassed = currentMinutes >= maghribMinutes;
    
    return { maghribPassed, currentDay: dayOfWeek };
  }, [mosques, filteredMosques, favorites]);

  // Compute Tahajjud card data - Isha adhan time and whether Isha has passed
  const tahajjudCardData = useMemo(() => {
    // Get a representative mosque (first favorite, or first in list)
    const representativeMosque = filteredMosques.find(m => favorites.has(m.id)) || filteredMosques[0];
    
    if (!representativeMosque) {
      return { maghribAdhanTime: '', fajrAdhanTime: '', ishaAdhanTime: '', visible: false };
    }
    
    const now = new Date();
    const calculatedTimes = calculateIqamaTimes(
      representativeMosque.latitude,
      representativeMosque.longitude,
      representativeMosque.iqamaTimes,
      now,
      representativeMosque.calculationMethod || 'NorthAmerica',
      representativeMosque.asrMethod || 'Standard',
      representativeMosque.scheduledTimeChanges
    );
    
    const currentMinutes = getCurrentMinutes();
    const ishaIqamaMinutes = timeToMinutes(calculatedTimes.isha.iqama);
    const fajrAdhanMinutes = timeToMinutes(calculatedTimes.fajr.adhan);
    
    // Show after Isha iqama (evening) OR before Fajr adhan (pre-dawn)
    // Hide during daytime (between Fajr and Isha)
    const visible = currentMinutes >= ishaIqamaMinutes || currentMinutes < fajrAdhanMinutes;
    
    return {
      maghribAdhanTime: calculatedTimes.maghrib.adhan,
      fajrAdhanTime: calculatedTimes.fajr.adhan,
      ishaAdhanTime: calculatedTimes.isha.adhan,
      visible
    };
  }, [mosques, filteredMosques, favorites]);

  const handleShare = async (mosque: Mosque) => {
    const mosqueUrl = `${SITE_URL}?masjid=${mosque.id}`;

    // Check if Web Share API is available
    if (navigator.share) {
      // Try native share first
      try {
        await navigator.share({
          title: mosque.name,
          text: `Check out ${mosque.name} on Dāimūn`,
          url: mosqueUrl
        });
        return; // Successfully shared
      } catch (err: any) {
        // Check if user cancelled (this is normal behavior, not an error)
        if (err.name === 'AbortError') {
          return;
        }
        
        // For NotAllowedError or other errors, fall through to clipboard
        // Silently continue to fallback
      }
    }
    
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(mosqueUrl);
      alert('Masjid link copied to clipboard!');
    } catch (err) {
      // Last resort: show the URL to user via prompt (this always works)
      prompt('Copy this link to share:', mosqueUrl);
    }
  };

  // If admin mode requested but not authenticated, redirect to main.
  // MUST be a useEffect — never call navigate() during render;
  // doing so fires the popstate listener mid-render, which can trigger
  // cascading state updates in the parent and crash the browser.
  // Placed BEFORE all early returns so the hook count is stable (Rules of Hooks).
  useEffect(() => {
    if (adminMode && !isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [adminMode, isAuthenticated, authLoading]);

  // Printable Timetable mode
  if (timetableMosqueId) {
    const timetableMosque = mosques.find(m => m.id === timetableMosqueId);
    if (timetableMosque) {
      return (
        <Suspense fallback={<RouteLoading />}>
          <PrintableTimetable
            mosque={timetableMosque}
            onBack={() => navigate('/')}
          />
        </Suspense>
      );
    }
    // If mosque not loaded yet, show loading
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
          <div className="text-gray-400 dark:text-white/30 text-sm">Loading timetable…</div>
        </div>
      );
    }
  }

  // Admin Dashboard mode
  if (adminMode && isAuthenticated) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <AdminDashboard
          mosques={mosques}
          isLoading={isLoading}
          onBack={() => navigate('/')}
          onEditMosque={(mosque) => {
            sessionStorage.setItem('edit-return-to', 'admin');
            navigate(`/edit/${mosque.id}`);
          }}
          onAddMosque={() => setShowAddModal(true)}
          onAddJanaza={() => setShowAddJanazaModal(true)}
          onViewRequests={() => setShowMasjidRequestsDashboard(true)}
          onRefresh={async () => {
            await fetchMosques();
          }}
          onLogout={() => setShowLogoutConfirm(true)}
        />
        
        {/* Modals accessible from Admin Dashboard */}
        {showAddModal && (
          <Suspense fallback={null}>
            <AddMosqueModal
              onClose={() => setShowAddModal(false)}
              onAdd={handleAddMosque}
            />
          </Suspense>
        )}
        {showAddJanazaModal && (
          <Suspense fallback={null}>
            <AddJanazaModal
              isOpen={showAddJanazaModal}
              onClose={() => setShowAddJanazaModal(false)}
              mosques={mosques}
              onSubmit={handleAddJanaza}
            />
          </Suspense>
        )}
        {showMasjidRequestsDashboard && (
          <Suspense fallback={null}>
            <MasjidRequestsDashboard
              onClose={() => setShowMasjidRequestsDashboard(false)}
              onConvertToMasjid={async (request) => {
                await handleConvertRequest(request);
              }}
            />
          </Suspense>
        )}
        {showLogoutConfirm && (
          <Suspense fallback={null}>
            <LogoutConfirmDialog
              onConfirm={() => {
                setShowLogoutConfirm(false);
                logout();
              }}
              onCancel={() => setShowLogoutConfirm(false)}
            />
          </Suspense>
        )}
      </Suspense>
    );
  }

  // While waiting for auth or redirecting unauthenticated admin visits,
  // show a minimal loading screen instead of flashing the home screen.
  if (adminMode && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="text-gray-400 dark:text-white/30 text-sm">
          {authLoading ? 'Checking authentication…' : 'Redirecting…'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6 relative">
      {/* Ambient background — z-0 fixed layer; all content sits above via z-[1]+ */}
      <div
        className={`fixed inset-0 z-0 pointer-events-none ${themeMounted ? 'transition-colors duration-[2000ms]' : ''} ${isLoading ? 'bg-[#EDE5D8] dark:bg-black' : prayerTheme.bgClass}`}
        aria-hidden="true"
      />
      {/* Header - Apple minimalist style */}
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            {isRamadan ? (
              <a 
                href="https://quran.com/2/183" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`font-semibold tracking-wide cursor-pointer bg-gradient-to-r ${prayerTheme.titleClass} ${prayerTheme.titleHoverClass} bg-clip-text text-transparent whitespace-nowrap transition-all duration-300 text-3xl`}
                style={{ fontFamily: "'Exo 2', sans-serif" }}
              >
                Ramaḍān
              </a>
            ) : (
              <span 
                className={`font-semibold tracking-wide bg-gradient-to-r ${prayerTheme.titleClass} bg-clip-text text-transparent whitespace-nowrap transition-all duration-300 text-3xl`}
                style={{ fontFamily: "'Exo 2', sans-serif" }}
              >
                Dāimūn
              </span>
            )}
            <div className="flex gap-2 items-center">
              <a
                href="https://quran.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
                aria-label="Quran.com"
                title="Quran.com"
              >
                <BookOpen className="w-5 h-5 text-gray-700 dark:text-white/70" />
              </a>
              {!authLoading && (
                isAuthenticated ? (
                    <button
                      onClick={() => navigate('/admin')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
                      aria-label="Admin Dashboard"
                      title="Admin Dashboard"
                    >
                      <LayoutDashboard className="w-5 h-5 text-gray-700 dark:text-white/70" />
                    </button>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors"
                    aria-label="Admin Login"
                    title="Admin Login"
                  >
                    <LogIn className="w-5 h-5 text-gray-700 dark:text-white/70" />
                  </button>
                )
              )}
            </div>
          </div>
        </div>
        {/* SearchBar — inside sticky header so there's zero gap */}
        {!isLoading && !error && (
          <div className="max-w-2xl mx-auto px-5 pb-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              locationSource={locationSource}
              onRequestLocation={requestLocation}
            />
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <DesktopHero mosqueCount={mosques.length} />
      </Suspense>

      {/* Mosques List */}
      <div className="max-w-2xl mx-auto px-5 space-y-4 pb-8 relative z-[1]">
        {/* Motivation Card - Jumuah Ayat */}
        {shouldShowJumuahCard && (
          <a
            href="https://quran.com/62?startingVerse=9"
            target="_blank"
            rel="noopener noreferrer"
            className={`block mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 rounded-2xl p-6 shadow-lg border border-emerald-400/20 dark:border-emerald-500/20 hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer ${!hasAnimatedRef.current ? 'animate-card-enter' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-white/70 dark:text-white/60 mb-2 font-semibold">
                Surah Al-Jumuah 62:9
              </div>
              {/* Arabic Text */}
              <div className="text-right mb-4 leading-loose" dir="rtl">
                <p className="text-xl md:text-2xl text-white leading-relaxed" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ إِذَا نُودِىَ لِلصَّلَوٰةِ مِن يَوْمِ ٱلْجُمُعَةِ فَٱسْعَوْا۟ إِلَىٰ ذِكْرِ ٱللَّهِ وَذَرُوا۟ ٱلْبَيْعَ ۚ ذَٰلِكُمْ خَيْرٌ لَّكُمْ إِن كُنتُمْ تَعْلَمُونَ
                </p>
              </div>
              {/* English Translation */}
              <div className="border-t border-white/20 dark:border-white/10 pt-3">
                <p className="text-white/90 dark:text-white/80 text-sm md:text-base leading-relaxed italic">
                  "O believers! When the call to prayer is made on Friday, then proceed ˹diligently˺ to the remembrance of Allah and leave off ˹your˺ business. That is best for you, if only you knew."
                </p>
              </div>
            </div>
          </a>
        )}

        {error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-400 font-medium mb-2">Error Loading Data</p>
              <p className="text-red-600 dark:text-red-400/80 text-sm mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  fetchMosques();
                }}
                className="px-4 py-2 bg-red-600 dark:bg-red-600/90 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Janaza Alerts - render independently, don't wait for mosques */}
            {!searchQuery && janazas.map((janaza, idx) => (
              <div
                key={janaza.id}
                className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined}
                style={!hasAnimatedRef.current ? { animationDelay: `${idx * 40}ms` } : undefined}
              >
                <JanazaAlertCard
                  janaza={janaza}
                  mosque={mosques.find(m => m.id === janaza.mosqueId)}
                  canEdit={isAuthenticated}
                  onDelete={handleDeleteJanaza}
                  onEdit={() => {
                    setSelectedJanazaForEdit(janaza);
                    setShowEditJanazaModal(true);
                  }}
                />
              </div>
            ))}

            {isLoading ? (
              /* Minimal centered loading — no skeleton flash, content fades in when ready */
              <div className="flex flex-col items-center justify-center py-24 gap-4 animate-[fadeIn_0.3s_ease]">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-white/[0.08]" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gray-400 dark:border-t-white/40 animate-spin" />
                </div>
                <p className="text-xs text-gray-400 dark:text-white/30">Loading masajid…</p>
              </div>
            ) : (
              <>
                {/* Smart Search Answer Card — contextual info above results */}
                {searchQuery && (
                  <SmartSearchCard
                    query={searchQuery}
                    mosques={mosques}
                    favorites={favorites}
                    userLocation={userLocation}
                  />
                )}

                {filteredMosques.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-white/45">
                    <p>{searchQuery ? 'No matching masajid' : 'No masajid found'}</p>
                    {searchQuery && (
                      <p className="text-xs mt-1 text-gray-400 dark:text-white/30">Try a different search or check spelling</p>
                    )}
                  </div>
                ) : (
              <>
                {/* Eid Card / Ramadan Countdown / Mode — FIRST for Eid visibility before Jummah */}
                {!searchQuery && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '40ms' } : undefined}>
                    <RamadanCountdown mosques={filteredMosques} favorites={favorites} />
                  </div>
                )}

                {/* Eid al-Adha Card — shown during first 10 days of Dhul Hijja through 3 days after May 27 2026 */}
                {!searchQuery && eidAdhaCard && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '60ms' } : undefined}>
                    <button
                      onClick={() => navigate('/eid-times')}
                      className="w-full text-left mb-4 rounded-2xl overflow-hidden border border-amber-300/70 dark:border-amber-500/25 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/30 p-4 active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                            <PartyPopper className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm text-amber-900 dark:text-amber-100">
                              {eidAdhaCard.isEidDay ? 'Eid al-Adha Mubarak!' : eidAdhaCard.isPost ? 'Eid al-Adha' : `Eid al-Adha in ${eidAdhaCard.diffDays} day${eidAdhaCard.diffDays !== 1 ? 's' : ''}`}
                            </div>
                            <div className="text-xs text-amber-700/80 dark:text-amber-300/60 mt-0.5">
                              {eidAdhaCard.isEidDay ? 'Taqabbal Allahu minna wa minkum' : eidAdhaCard.isPost ? 'Eid prayer times & info' : eidAdhaCard.isDhulHijja ? 'Best days of the year — see Eid prayer times' : 'See Eid prayer times near you'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <span>View times</span>
                          <span>→</span>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Iftar Countdown — during Ramadan fasting hours */}
                {!searchQuery && isRamadan && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '80ms' } : undefined}>
                    <IftarCountdownCard mosques={filteredMosques} favorites={favorites} userLocation={userLocation} />
                  </div>
                )}

                {/* Upcoming Prayer Summary Card */}
                {!searchQuery && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '120ms' } : undefined}>
                    <UpcomingPrayerCard
                      mosques={filteredMosques}
                      userLocation={userLocation}
                      calculateDistance={calculateDistance}
                      onMosqueClick={(mosque) => {
                        setSelectedMosqueForDetail(mosque);
                        setIsDetailModalOpen(true);
                      }}
                    />
                  </div>
                )}

                {/* Notification Prompt */}
                {!searchQuery && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '160ms' } : undefined}>
                    <NotificationPrompt key={`notif-${notificationsDismissedFlag}`} mosques={filteredMosques} favorites={favorites} onDismissChange={(dismissed) => setNotificationsDismissedFlag(dismissed)} />
                  </div>
                )}

                {/* Location permission card — show when GPS not granted (even if we have approximate IP location) */}
                {!searchQuery && locationSource !== 'gps' && locationSource !== 'cache' && locationDenied && !locationCardDismissed && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '200ms' } : undefined}>
                    <div className="mb-4 rounded-2xl bg-white/70 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08] p-4 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2 flex-shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 dark:text-white/90 mb-1">
                            {locationSource === 'ip' ? 'Using approximate location' : 'See the closest masajid'}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-white/45 mb-3">
                            {locationSource === 'ip'
                              ? 'We estimated your area from your network. Allow precise location for accurate distances.'
                              : 'Allow location access so we can sort masajid by distance and show you the nearest iqama times.'}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={requestLocation}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors active:scale-[0.98]"
                            >
                              <Locate className="w-3 h-3" />
                              Allow Location
                            </button>
                            <button
                              onClick={() => {
                                setLocationCardDismissed(true);
                                localStorage.setItem('daimun-location-card-dismissed', 'true');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.12] transition-colors active:scale-[0.98]"
                            >
                              Not now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sunnah Fasting Reminder — suppressed during Ramadan (already fasting daily) */}
                {!searchQuery && !isRamadan && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '240ms' } : undefined}>
                    <SunnahFastingReminder data={sunnahFastingReminderData} />
                  </div>
                )}

                {/* Tahajjud Reminder */}
                {!searchQuery && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '200ms' } : undefined}>
                    <TahajjudCard data={tahajjudCardData} />
                  </div>
                )}

                {/* Event Carousel - Auto-rotating banner for today's events */}
                {!searchQuery && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '280ms' } : undefined}>
                    <EventCarousel mosques={mosques} />
                  </div>
                )}

                {/* Get the App banner — right before mosque list */}
                {!searchQuery && (
                  <div className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined} style={!hasAnimatedRef.current ? { animationDelay: '310ms' } : undefined}>
                    <GetTheAppBanner />
                  </div>
                )}

                {displayedMosques.map((mosque, index) => {
                  const distance = userLocation
                    ? calculateDistance(userLocation.lat, userLocation.lng, mosque.latitude, mosque.longitude)
                    : null;

                  return (
                    <div
                      key={mosque.id}
                      className={!hasAnimatedRef.current ? 'animate-card-enter' : undefined}
                      style={!hasAnimatedRef.current ? { animationDelay: `${Math.min(240 + index * 40, 800)}ms` } : undefined}
                    >
                      <MosqueCard
                        mosque={mosque}
                        isFavorite={favorites.has(mosque.id)}
                        onToggleFavorite={toggleFavorite}
                        distance={distance}
                        onShare={handleShare}
                        onEdit={handleMosqueEdit}
                        onDelete={noopDelete}
                        onAddEvent={noopAddEvent}
                        onDeleteEvent={noopDeleteEvent}
                        onDetail={handleMosqueDetail}
                        canEdit={isAuthenticated}
                      />
                    </div>
                  );
                })}

                {/* Load More Button */}
                {displayCount < filteredMosques.length && (
                  <div className="text-center pt-6">
                    <button
                      onClick={() => setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredMosques.length))}
                      className="px-6 py-3 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/15 border border-gray-200 dark:border-white/[0.1] rounded-xl text-gray-900 dark:text-white font-medium transition-all hover:shadow-md"
                    >
                      Load More ({filteredMosques.length - displayCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
          </>
        )}
      </div>

      {/* Get the App — footer card */}
      <div className="max-w-2xl mx-auto px-5 mt-4 relative z-[1]">
        <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-gray-200/70 dark:border-white/[0.09] overflow-hidden shadow-sm">
          <div className="px-5 py-4 flex items-center gap-4">
            <img src={appIcon} alt="Dāimūn app icon" className="w-12 h-12 rounded-2xl object-cover shadow flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">Get Dāimūn on your phone</p>
              <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">iOS available now · Android in testing</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <AppStoreBadge />
              <button
                onClick={() => navigate('/android')}
                className="h-[40px] flex items-center gap-1.5 px-3 border border-emerald-400/60 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Join Beta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-5 pt-6 pb-10 mt-8 relative z-[1]">
        <div className="space-y-4">
          {/* Share + Request side by side */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/share"
              onClick={(e) => { e.preventDefault(); navigate('/share'); window.scrollTo(0, 0); }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-amber-500/10 border border-amber-500/20 dark:border-amber-400/20 text-amber-700 dark:text-amber-400 rounded-xl hover:from-amber-500/[0.15] hover:via-orange-500/[0.15] hover:to-amber-500/[0.15] active:scale-[0.97] transition-all"
            >
              <Megaphone className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium">Share</span>
            </a>
            <button
              onClick={() => setShowRequestMasjidModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600/10 dark:bg-emerald-500/10 border border-emerald-600/20 dark:border-emerald-400/20 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-600/[0.15] dark:hover:bg-emerald-500/[0.15] active:scale-[0.97] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M12 3C12 3 8 6 8 9.5C8 11.71 9.79 13.5 12 13.5C14.21 13.5 16 11.71 16 9.5C16 6 12 3 12 3Z" />
                <circle cx="12" cy="9.5" r="1.2" />
                <path d="M5 21V14H19V21" />
                <path d="M3 21H21" />
                <path d="M9 14V11" />
                <path d="M15 14V11" />
                <path d="M12 14V13.5" />
              </svg>
              <span className="text-xs font-medium">Request a Masjid</span>
            </button>
          </div>

          {/* Add to Home Screen */}
          <InstallPrompt />

          {/* Re-enable buttons for dismissed cards */}
          {((notificationsDismissedFlag && typeof Notification !== 'undefined' && Notification.permission !== 'denied') || (!userLocation && locationCardDismissed)) && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {notificationsDismissedFlag && typeof Notification !== 'undefined' && Notification.permission !== 'denied' && (
                <button
                  onClick={() => {
                    try {
                      const stored = localStorage.getItem('daimun-notification-prefs');
                      const prefs = stored ? JSON.parse(stored) : {};
                      prefs.dismissed = false;
                      localStorage.setItem('daimun-notification-prefs', JSON.stringify(prefs));
                    } catch {}
                    setNotificationsDismissedFlag(false);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs text-gray-500 dark:text-white/50 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] hover:text-gray-700 dark:hover:text-white/70 transition-colors active:scale-[0.98]"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Enable Notifications</span>
                </button>
              )}
              {locationSource !== 'gps' && locationSource !== 'cache' && locationCardDismissed && (
                <button
                  onClick={() => {
                    setLocationCardDismissed(false);
                    localStorage.removeItem('daimun-location-card-dismissed');
                    requestLocation();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs text-gray-500 dark:text-white/50 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] hover:text-gray-700 dark:hover:text-white/70 transition-colors active:scale-[0.98]"
                >
                  <Locate className="w-3.5 h-3.5" />
                  <span>Enable Precise Location</span>
                </button>
              )}
            </div>
          )}

          {/* Utility links */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="/qibla"
              onClick={(e) => { e.preventDefault(); navigate('/qibla'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Qibla</span>
            </a>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <a
              href="/dnd-tips"
              onClick={(e) => { e.preventDefault(); navigate('/dnd-tips'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>Auto-Silence</span>
            </a>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <a
              href="/chrome-tips"
              onClick={(e) => { e.preventDefault(); navigate('/chrome-tips'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Browser Tips</span>
            </a>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <a
              href="/etiquette"
              onClick={(e) => { e.preventDefault(); navigate('/etiquette'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Etiquette</span>
            </a>
          </div>

          {/* Ramadan Guides row */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="/zakat-al-fitr"
              onClick={(e) => { e.preventDefault(); navigate('/zakat-al-fitr'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <HandHeart className="w-3.5 h-3.5" />
              <span>Zakat al-Fitr</span>
            </a>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <a
              href="/itikaf-guide"
              onClick={(e) => { e.preventDefault(); navigate('/itikaf-guide'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>I&#39;tikaf</span>
            </a>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <a
              href="/eid-guide"
              onClick={(e) => { e.preventDefault(); navigate('/eid-guide'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Eid Guide</span>
            </a>
          </div>

          {/* Third row: Volunteer + Give + What's New + Report Bug */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="/volunteers"
              onClick={(e) => { e.preventDefault(); navigate('/volunteers'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Volunteer</span>
            </a>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <a
              href="/charity"
              onClick={(e) => { e.preventDefault(); navigate('/charity'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              <HandHeart className="w-3.5 h-3.5" />
              <span>Give</span>
            </a>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <a
              href="/whats-new"
              onClick={(e) => { e.preventDefault(); navigate('/whats-new'); window.scrollTo(0, 0); }}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>What's New</span>
            </a>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <a
              href="/roadmap"
              onClick={(e) => { e.preventDefault(); navigate('/roadmap'); window.scrollTo(0, 0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Roadmap</span>
            </a>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <button
              onClick={() => setShowBugReportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <TriangleAlert className="w-3.5 h-3.5" />
              <span>Report Bug</span>
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <a
              href="mailto:admin@TampaRamadan.com"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-white/70 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact</span>
            </a>
          </div>

          {/* Dark Mode Toggle — Apple HIG segmented control */}
          <div className="flex items-center justify-center pt-2">
            <div className="inline-flex items-center bg-gray-100 dark:bg-white/[0.08] rounded-full p-0.5 gap-0.5">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all ${
                  theme === 'light'
                    ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm font-medium'
                    : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60'
                }`}
                aria-label="Light mode"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all ${
                  theme === 'system'
                    ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm font-medium'
                    : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60'
                }`}
                aria-label="System theme"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Auto</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm font-medium'
                    : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60'
                }`}
                aria-label="Dark mode"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Mosque Detail Modal */}
      {isDetailModalOpen && selectedMosqueForDetail && (
        <MosqueDetailModal
          mosque={selectedMosqueForDetail}
          isFavorite={favorites.has(selectedMosqueForDetail.id)}
          distance={
            userLocation
              ? calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  selectedMosqueForDetail.latitude,
                  selectedMosqueForDetail.longitude
                )
              : null
          }
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedMosqueForDetail(null);
            // If we came from a deep link, navigate back to home
            if (deepLinkMosqueId) {
              navigate('/');
            }
          }}
          onToggleFavorite={toggleFavorite}
          onShare={handleShare}
          onEdit={handleMosqueEdit}
          isAdmin={isAuthenticated}
          onReportTime={(mosque) => {
            setSelectedMosqueForReport(mosque);
            setShowReportTimeModal(true);
          }}
          onScraped={() => { fetchMosques(); }}
        />
      )}

      {/* Report Time Modal */}
      {showReportTimeModal && selectedMosqueForReport && (
        <Suspense fallback={null}>
          <ReportTimeModal
            mosque={selectedMosqueForReport}
            onClose={() => {
              setShowReportTimeModal(false);
              setSelectedMosqueForReport(null);
            }}
          />
        </Suspense>
      )}

      {/* Bug Report Modal */}
      {showBugReportModal && (
        <Suspense fallback={null}>
          <BugReportModal onClose={() => setShowBugReportModal(false)} />
        </Suspense>
      )}

      {/* Add Mosque Modal */}
      {showAddModal && (
        <Suspense fallback={null}>
          <AddMosqueModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddMosque}
          />
        </Suspense>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            navigate('/admin');
          }}
          onSwitchToRequestAccess={() => {
            setShowLoginModal(false);
            navigate('/request-access');
          }}
          onSwitchToForgotPassword={() => {
            setShowLoginModal(false);
            setShowForgotPasswordModal(true);
          }}
        />
      )}

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <Suspense fallback={null}>
          <ForgotPasswordModal
            onClose={() => setShowForgotPasswordModal(false)}
            onSwitchToLogin={() => {
              setShowForgotPasswordModal(false);
              setShowLoginModal(true);
            }}
          />
        </Suspense>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <Suspense fallback={null}>
          <LogoutConfirmDialog
            onConfirm={() => {
              setShowLogoutConfirm(false);
              logout();
            }}
            onCancel={() => setShowLogoutConfirm(false)}
          />
        </Suspense>
      )}

      {/* Reset Password Modal (shown when user returns from recovery email) */}
      {recoveryToken && (
        <Suspense fallback={null}>
          <ResetPasswordModal
            accessToken={recoveryToken}
            onClose={() => setRecoveryToken(null)}
            onSuccess={() => {
              setRecoveryToken(null);
              setShowLoginModal(true);
            }}
          />
        </Suspense>
      )}

      {/* Recovery Error Modal (expired / invalid reset link) */}
      {recoveryError && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {recoveryError === 'expired' ? 'Reset Link Expired' : 'Reset Link Error'}
              </h3>
              <p className="text-gray-600 dark:text-white/70 mb-2">
                {recoveryError === 'expired'
                  ? 'This password reset link has expired. Reset links are valid for a limited time for security.'
                  : recoveryError}
              </p>
              <p className="text-sm text-gray-500 dark:text-white/50 mb-6">
                No worries — you can request a new reset link below.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRecoveryError(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setRecoveryError(null);
                    setShowForgotPasswordModal(true);
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
                >
                  Request New Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Janaza Modal */}
      {showAddJanazaModal && (
        <Suspense fallback={null}>
          <AddJanazaModal
            isOpen={showAddJanazaModal}
            onClose={() => setShowAddJanazaModal(false)}
            mosques={mosques}
            onSubmit={handleAddJanaza}
          />
        </Suspense>
      )}

      {/* Edit Janaza Modal */}
      {showEditJanazaModal && selectedJanazaForEdit && (
        <Suspense fallback={null}>
          <EditJanazaModal
            isOpen={showEditJanazaModal}
            onClose={() => setShowEditJanazaModal(false)}
            mosques={mosques}
            onSubmit={handleEditJanaza}
            janaza={selectedJanazaForEdit}
          />
        </Suspense>
      )}

      {/* Edit Event Modal */}
      {showEditEventModal && selectedEventForEdit && (
        <Suspense fallback={null}>
          <EditEventModal
            onClose={() => setShowEditEventModal(false)}
            mosqueId={selectedEventForEdit.mosqueId}
            mosqueName={selectedEventForEdit.mosqueName}
            event={selectedEventForEdit.event}
            onUpdate={handleEditEvent}
          />
        </Suspense>
      )}

      {/* Add Scheduled Time Change Modal */}
      {showAddScheduledChangeModal && selectedMosqueForScheduledChange && (() => {
        const fullMosque = mosques.find(m => m.id === selectedMosqueForScheduledChange.id);
        if (!fullMosque) return null;
        return (
          <Suspense fallback={null}>
            <AddScheduledTimeChangeModal
              mosque={fullMosque}
              onClose={() => {
                setShowAddScheduledChangeModal(false);
                setSelectedMosqueForScheduledChange(null);
              }}
              onSave={handleAddScheduledChange}
              onDelete={handleDeleteScheduledChange}
            />
          </Suspense>
        );
      })()}

      {/* Request Masjid Modal (for non-authenticated users) */}
      {showRequestMasjidModal && (
        <Suspense fallback={null}>
          <RequestMasjidModal
            onClose={() => setShowRequestMasjidModal(false)}
          />
        </Suspense>
      )}

      {/* Masjid Requests Dashboard (admin only) */}
      {showMasjidRequestsDashboard && (
        <Suspense fallback={null}>
          <MasjidRequestsDashboard
            onClose={() => setShowMasjidRequestsDashboard(false)}
            onConvertToMasjid={async (request) => {
              await handleConvertRequest(request);
              setShowMasjidRequestsDashboard(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}