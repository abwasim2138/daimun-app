import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Navigation, Locate, AlertCircle, Compass, RotateCcw, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QiblaCompassProps {
  onBack: () => void;
}

// Precise Kaaba coordinates (center of the Kaaba structure)
const KAABA_LAT = 21.4224779;
const KAABA_LNG = 39.8261818;

// WGS-84 ellipsoid parameters
const WGS84_A = 6378137.0; // semi-major axis (m)
const WGS84_F = 1 / 298.257223563; // flattening
const WGS84_B = WGS84_A * (1 - WGS84_F); // semi-minor axis

/**
 * Vincenty inverse formula — computes the geodesic bearing and distance
 * between two points on the WGS-84 ellipsoid. This is the gold-standard
 * method used by geodetic agencies worldwide, accurate to ~0.5mm.
 *
 * Returns { bearing: degrees from true north, distance: meters }
 */
function vincentyInverse(
  lat1Deg: number,
  lng1Deg: number,
  lat2Deg: number,
  lng2Deg: number
): { bearing: number; distance: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;

  const φ1 = toRad(lat1Deg);
  const φ2 = toRad(lat2Deg);
  const L = toRad(lng2Deg - lng1Deg);

  const U1 = Math.atan((1 - WGS84_F) * Math.tan(φ1));
  const U2 = Math.atan((1 - WGS84_F) * Math.tan(φ2));

  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  let λ = L;
  let λPrev: number;
  let sinσ: number, cosσ: number, σ: number;
  let sinα: number, cos2α: number, cos2σm: number;
  let C: number;
  const maxIterations = 200;

  for (let i = 0; i < maxIterations; i++) {
    const sinλ = Math.sin(λ);
    const cosλ = Math.cos(λ);

    sinσ = Math.sqrt(
      (cosU2 * sinλ) ** 2 +
      (cosU1 * sinU2 - sinU1 * cosU2 * cosλ) ** 2
    );

    if (sinσ === 0) {
      // Co-incident points
      return { bearing: 0, distance: 0 };
    }

    cosσ = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
    σ = Math.atan2(sinσ, cosσ);

    sinα = (cosU1 * cosU2 * sinλ) / sinσ;
    cos2α = 1 - sinα ** 2;

    cos2σm = cos2α !== 0 ? cosσ - (2 * sinU1 * sinU2) / cos2α : 0;

    C = (WGS84_F / 16) * cos2α * (4 + WGS84_F * (4 - 3 * cos2α));

    λPrev = λ;
    λ =
      L +
      (1 - C) *
        WGS84_F *
        sinα *
        (σ + C * sinσ * (cos2σm + C * cosσ * (-1 + 2 * cos2σm ** 2)));

    if (Math.abs(λ - λPrev) < 1e-12) break;
  }

  const u2 = cos2α! * (WGS84_A ** 2 - WGS84_B ** 2) / WGS84_B ** 2;
  const A =
    1 + (u2 / 16384) * (4096 + u2 * (-768 + u2 * (320 - 175 * u2)));
  const B = (u2 / 1024) * (256 + u2 * (-128 + u2 * (74 - 47 * u2)));

  const Δσ =
    B *
    sinσ! *
    (cos2σm! +
      (B / 4) *
        (cosσ! * (-1 + 2 * cos2σm! ** 2) -
          (B / 6) *
            cos2σm! *
            (-3 + 4 * sinσ! ** 2) *
            (-3 + 4 * cos2σm! ** 2)));

  const distance = WGS84_B * A * (σ! - Δσ);

  // Forward azimuth (initial bearing from point 1 to point 2)
  const fwdAz = Math.atan2(
    cosU2 * Math.sin(λ),
    cosU1 * sinU2 - sinU1 * cosU2 * Math.cos(λ)
  );

  const bearing = ((fwdAz * 180) / Math.PI + 360) % 360;

  return { bearing, distance };
}

/**
 * Normalize an angle difference to [-180, 180]
 */
function normalizeAngle(a: number): number {
  let result = ((a % 360) + 360) % 360;
  if (result > 180) result -= 360;
  return result;
}

/**
 * Circular exponentially-weighted moving average.
 * Properly handles the 0°/360° wrap-around by working in sin/cos space.
 * α = smoothing factor (0..1), higher = more responsive.
 */
function circularEWMA(
  prevSmoothed: number | null,
  raw: number,
  alpha: number
): number {
  if (prevSmoothed === null) return raw;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const prevSin = Math.sin(toRad(prevSmoothed));
  const prevCos = Math.cos(toRad(prevSmoothed));
  const rawSin = Math.sin(toRad(raw));
  const rawCos = Math.cos(toRad(raw));

  const smoothedSin = prevSin * (1 - alpha) + rawSin * alpha;
  const smoothedCos = prevCos * (1 - alpha) + rawCos * alpha;

  return (toDeg(Math.atan2(smoothedSin, smoothedCos)) + 360) % 360;
}

type CompassState = 'loading' | 'compass' | 'static' | 'no-location' | 'permission-denied';

// Accuracy buckets
type AccuracyLevel = 'high' | 'medium' | 'low' | 'unknown';

export function QiblaCompass({ onBack }: QiblaCompassProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [state, setState] = useState<CompassState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [accuracy, setAccuracy] = useState<AccuracyLevel>('unknown');
  const smoothHeadingRef = useRef<number | null>(null);
  const headingSamplesRef = useRef<number[]>([]);
  const orientationCleanupRef = useRef<(() => void) | null>(null);
  const hasAbsoluteRef = useRef(false);

  // Request location
  useEffect(() => {
    if (!navigator.geolocation) {
      setState('no-location');
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Try cached location first for instant display
    const cached = localStorage.getItem('userLocation');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.lat && parsed.lng) {
          setLocation({ lat: parsed.lat, lng: parsed.lng });
        }
      } catch {}
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocation(loc);
        localStorage.setItem('userLocation', JSON.stringify({ ...loc, timestamp: Date.now() }));
      },
      (err) => {
        if (err.code === 1) {
          setState('permission-denied');
          setError('Location permission denied. Please enable location access to find your Qibla direction.');
        } else {
          if (!location) {
            setState('no-location');
            setError('Unable to determine your location. Please enable location services.');
          }
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Compute heading accuracy from recent samples variance
  const computeAccuracy = useCallback((samples: number[]): AccuracyLevel => {
    if (samples.length < 5) return 'unknown';
    // Circular variance: R = |mean of unit vectors|, variance = 1 - R
    const sinSum = samples.reduce((s, h) => s + Math.sin((h * Math.PI) / 180), 0);
    const cosSum = samples.reduce((s, h) => s + Math.cos((h * Math.PI) / 180), 0);
    const R = Math.sqrt(sinSum ** 2 + cosSum ** 2) / samples.length;
    // R close to 1 = stable, close to 0 = noisy
    if (R > 0.98) return 'high';
    if (R > 0.90) return 'medium';
    return 'low';
  }, []);

  // Process raw compass heading
  const processHeading = useCallback((raw: number) => {
    const samples = headingSamplesRef.current;
    samples.push(raw);
    if (samples.length > 20) samples.shift(); // Keep last 20 for accuracy calc

    // Exponentially-weighted circular smoothing (α=0.3 balances responsiveness and stability)
    const smoothed = circularEWMA(smoothHeadingRef.current, raw, 0.3);
    smoothHeadingRef.current = smoothed;
    setHeading(smoothed);

    // Update accuracy every 5 samples
    if (samples.length % 5 === 0) {
      setAccuracy(computeAccuracy(samples));
    }
  }, [computeAccuracy]);

  // Device orientation for compass — with Android absolute event support
  useEffect(() => {
    if (!location) return;

    let orientationAvailable = false;

    const handleOrientation = (e: DeviceOrientationEvent, isAbsolute: boolean) => {
      // If we already have absolute events, ignore non-absolute ones
      if (hasAbsoluteRef.current && !isAbsolute) return;

      let compassHeading: number | null = null;

      // iOS: webkitCompassHeading gives true-north heading directly
      if ((e as any).webkitCompassHeading !== undefined && (e as any).webkitCompassHeading !== null) {
        compassHeading = (e as any).webkitCompassHeading as number;
      } else if (e.alpha !== null) {
        // Android / other: alpha = device rotation around z-axis
        // For absolute orientation, alpha=0 means device top points to geographic/magnetic north
        // Compass heading = (360 - alpha) to convert from "how much device rotated"
        // to "what direction device is pointing"
        if (isAbsolute || e.absolute) {
          compassHeading = (360 - e.alpha) % 360;
          if (!hasAbsoluteRef.current && isAbsolute) {
            hasAbsoluteRef.current = true;
          }
        } else {
          // Non-absolute fallback — unreliable but better than nothing
          compassHeading = (360 - e.alpha) % 360;
        }
      }

      if (compassHeading !== null && !isNaN(compassHeading)) {
        orientationAvailable = true;
        processHeading(compassHeading);
        setState('compass');
      }
    };

    // iOS 13+ requires permission request (handled on user tap)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setState('static');
      return;
    }

    // Android Chrome: prefer 'deviceorientationabsolute' (gives absolute heading)
    const absoluteHandler = (e: DeviceOrientationEvent) => handleOrientation(e, true);
    const standardHandler = (e: DeviceOrientationEvent) => handleOrientation(e, false);

    // Try absolute first
    window.addEventListener('deviceorientationabsolute' as any, absoluteHandler, true);
    // Also listen to standard as fallback
    window.addEventListener('deviceorientation', standardHandler, true);

    // If no orientation event fires within 2s, fall back to static
    const timeout = setTimeout(() => {
      if (!orientationAvailable) {
        setState('static');
      }
    }, 2000);

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('deviceorientationabsolute' as any, absoluteHandler, true);
      window.removeEventListener('deviceorientation', standardHandler, true);
    };

    orientationCleanupRef.current = cleanup;

    return cleanup;
  }, [location, processHeading]);

  // Request iOS compass permission
  const requestIOSPermission = useCallback(async () => {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission === 'granted') {
        const handleOrientation = (e: DeviceOrientationEvent) => {
          let compassHeading: number | null = null;

          if ((e as any).webkitCompassHeading !== undefined && (e as any).webkitCompassHeading !== null) {
            compassHeading = (e as any).webkitCompassHeading as number;
          } else if (e.alpha !== null) {
            compassHeading = (360 - e.alpha) % 360;
          }

          if (compassHeading !== null && !isNaN(compassHeading)) {
            processHeading(compassHeading);
            setState('compass');
          }
        };
        window.addEventListener('deviceorientation', handleOrientation, true);
      } else {
        setState('static');
      }
    } catch {
      setState('static');
    }
  }, [processHeading]);

  // Calibration reset
  const handleCalibrate = useCallback(() => {
    setIsCalibrating(true);
    headingSamplesRef.current = [];
    smoothHeadingRef.current = null;
    setAccuracy('unknown');
    setTimeout(() => setIsCalibrating(false), 2000);
  }, []);

  // Geodesic Qibla bearing & distance using Vincenty's formula
  const { qiblaBearing, distance } = location
    ? (() => {
        const result = vincentyInverse(location.lat, location.lng, KAABA_LAT, KAABA_LNG);
        return { qiblaBearing: result.bearing, distance: result.distance / 1000 }; // km
      })()
    : { qiblaBearing: 0, distance: 0 };

  // Compass needle rotation: qibla direction relative to device heading
  const needleRotation = heading !== null ? qiblaBearing - heading : 0;

  // Alignment check — properly handles wrap-around
  const alignmentDelta = Math.abs(normalizeAngle(needleRotation));
  const isFacingQibla = alignmentDelta < 5;
  const isNearlyAligned = alignmentDelta < 15;

  // Cardinal direction label
  const getCardinalDirection = (bearing: number): string => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(bearing / 22.5) % 16];
  };

  const accuracyLabel: Record<AccuracyLevel, { text: string; color: string }> = {
    high: { text: 'High accuracy', color: 'text-emerald-600 dark:text-emerald-400' },
    medium: { text: 'Moderate accuracy', color: 'text-amber-600 dark:text-amber-400' },
    low: { text: 'Low accuracy — calibrate', color: 'text-red-500 dark:text-red-400' },
    unknown: { text: 'Calibrating…', color: 'text-gray-400 dark:text-white/40' },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/[0.06]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white/80" />
          </button>
          <div className="flex-1">
            <h1 className="text-gray-900 dark:text-white">Qibla Compass</h1>
          </div>
          {state === 'compass' && (
            <button
              onClick={handleCalibrate}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors active:scale-95"
              title="Recalibrate"
            >
              <RotateCcw className={`w-4.5 h-4.5 text-gray-500 dark:text-white/50 ${isCalibrating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
        {/* Loading state */}
        {state === 'loading' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
              <Locate className="w-7 h-7 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>
            <p className="text-gray-900 dark:text-white mb-1">Finding your location…</p>
            <p className="text-sm text-gray-500 dark:text-white/50">This is needed to calculate Qibla direction</p>
          </div>
        )}

        {/* Error states */}
        {(state === 'no-location' || state === 'permission-denied') && (
          <div className="text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-gray-900 dark:text-white mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium active:scale-[0.98] transition-transform"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Compass view (live device heading) */}
        {state === 'compass' && location && (
          <>
            {/* Bearing info */}
            <div className="text-center mb-6">
              <div className="text-4xl text-gray-900 dark:text-white tabular-nums">
                {Math.round(qiblaBearing)}°
              </div>
              <div className="text-sm text-gray-500 dark:text-white/50 mt-1">
                {getCardinalDirection(qiblaBearing)} · {Math.round(distance).toLocaleString()} km to Makkah
              </div>
              {/* Accuracy indicator */}
              <div className={`text-xs mt-1.5 ${accuracyLabel[accuracy].color}`}>
                {accuracyLabel[accuracy].text}
              </div>
            </div>

            {/* Compass */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80">
              {/* Outer ring — rotates with device heading */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-white/[0.1]"
                animate={{ rotate: heading !== null ? -heading : 0 }}
                transition={{ type: 'spring', stiffness: 60, damping: 20 }}
              >
                {/* Cardinal marks */}
                {['N', 'E', 'S', 'W'].map((dir, i) => (
                  <div
                    key={dir}
                    className="absolute flex items-center justify-center"
                    style={{
                      top: i === 0 ? '4px' : i === 2 ? 'auto' : '50%',
                      bottom: i === 2 ? '4px' : undefined,
                      left: i === 3 ? '4px' : i === 1 ? 'auto' : '50%',
                      right: i === 1 ? '4px' : undefined,
                      transform: i === 0 || i === 2 ? 'translateX(-50%)' : 'translateY(-50%)',
                    }}
                  >
                    <span className={`text-xs font-medium ${dir === 'N' ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-white/30'}`}>
                      {dir}
                    </span>
                  </div>
                ))}

                {/* Degree tick marks */}
                {Array.from({ length: 72 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 left-1/2 origin-bottom"
                    style={{
                      height: '50%',
                      width: '1px',
                      transform: `translateX(-50%) rotate(${i * 5}deg)`,
                    }}
                  >
                    <div
                      className={`w-px ${i % 6 === 0 ? 'h-3 bg-gray-300 dark:bg-white/20' : 'h-1.5 bg-gray-200 dark:bg-white/[0.08]'}`}
                    />
                  </div>
                ))}
              </motion.div>

              {/* Qibla needle */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: needleRotation }}
                transition={{ type: 'spring', stiffness: 60, damping: 20 }}
              >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  {/* Kaaba icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isFacingQibla
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-300 dark:to-teal-400 shadow-emerald-500/40 scale-110'
                      : isNearlyAligned
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 shadow-emerald-500/30'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 shadow-emerald-500/30'
                  }`}>
                    <span className="text-white text-lg">🕋</span>
                  </div>
                </div>
                {/* Needle line */}
                <div className="absolute top-[60px] left-1/2 -translate-x-[0.5px] w-[1px] bg-gradient-to-b from-emerald-500 to-transparent dark:from-emerald-400" style={{ height: 'calc(50% - 60px)' }} />
              </motion.div>

              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-gray-900 shadow-sm" />
              </div>
            </div>

            {/* Alignment indicator */}
            <AnimatePresence>
              {isFacingQibla ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 rounded-xl"
                >
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium text-center">
                    ✓ You're facing the Qibla
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Low accuracy warning */}
            {accuracy === 'low' && !isCalibrating && (
              <div className="mt-4 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Compass readings are noisy. Move your phone in a figure-8 pattern to recalibrate, and stay away from metal objects.
                </p>
              </div>
            )}

            {isCalibrating && (
              <div className="mt-4 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                  Move your phone in a figure-8 to calibrate
                </p>
              </div>
            )}
          </>
        )}

        {/* Static view (no device compass — desktop or denied orientation) */}
        {state === 'static' && location && (
          <>
            {/* iOS permission request */}
            {typeof (DeviceOrientationEvent as any).requestPermission === 'function' && heading === null && (
              <button
                onClick={requestIOSPermission}
                className="mb-6 px-5 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-transform"
              >
                Enable Compass
              </button>
            )}

            {/* Bearing info */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <span className="text-3xl">🕋</span>
              </div>
              <div className="text-5xl text-gray-900 dark:text-white tabular-nums mb-2">
                {Math.round(qiblaBearing)}°
              </div>
              <div className="text-sm text-gray-500 dark:text-white/50">
                {getCardinalDirection(qiblaBearing)} from your location
              </div>
            </div>

            {/* Static compass rose */}
            <div className="relative w-64 h-64 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-white/[0.1]">
                {['N', 'E', 'S', 'W'].map((dir, i) => (
                  <div
                    key={dir}
                    className="absolute flex items-center justify-center"
                    style={{
                      top: i === 0 ? '8px' : i === 2 ? 'auto' : '50%',
                      bottom: i === 2 ? '8px' : undefined,
                      left: i === 3 ? '8px' : i === 1 ? 'auto' : '50%',
                      right: i === 1 ? '8px' : undefined,
                      transform: i === 0 || i === 2 ? 'translateX(-50%)' : 'translateY(-50%)',
                    }}
                  >
                    <span className={`text-xs font-medium ${dir === 'N' ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-white/30'}`}>
                      {dir}
                    </span>
                  </div>
                ))}
              </div>

              {/* Fixed qibla pointer */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${qiblaBearing}deg)` }}
              >
                <div className="absolute top-3 left-1/2 -translate-x-1/2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                    <span className="text-sm">🕋</span>
                  </div>
                </div>
                <div className="absolute top-[44px] left-1/2 -translate-x-[0.5px] w-[1px] bg-gradient-to-b from-emerald-500 to-transparent" style={{ height: 'calc(50% - 44px)' }} />
              </div>

              {/* Center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-900 dark:bg-white" />
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.08] rounded-2xl border border-gray-200 dark:border-white/[0.1] p-4 w-full max-w-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Direction</div>
                  <div className="text-sm text-gray-900 dark:text-white font-medium">
                    {getCardinalDirection(qiblaBearing)} ({Math.round(qiblaBearing)}°)
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Distance</div>
                  <div className="text-sm text-gray-900 dark:text-white font-medium">
                    {Math.round(distance).toLocaleString()} km
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-white/25 text-center mt-4 max-w-xs">
              Open on a mobile device for a live compass that points toward the Qibla as you rotate your phone
            </p>
          </>
        )}

        {/* Method note */}
        {location && (state === 'compass' || state === 'static') && (
          <p className="text-[10px] text-gray-300 dark:text-white/15 text-center mt-6 max-w-xs">
            Geodesic bearing via Vincenty's formula on the WGS-84 ellipsoid
          </p>
        )}
      </div>
    </div>
  );
}
