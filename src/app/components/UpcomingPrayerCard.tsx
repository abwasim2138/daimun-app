import { Navigation, Clock, MapPin, AlertCircle } from 'lucide-react';
import { Mosque } from '../App';
import { calculateIqamaTimes, getNextPrayer } from '../utils/iqamaCalculator';
import { timeToMinutes, getCurrentMinutes } from '../utils/prayerTimes';

interface UpcomingPrayerCardProps {
  mosques: Mosque[];
  userLocation: { lat: number; lng: number } | null;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  onMosqueClick: (mosque: Mosque) => void;
}

interface MosqueWithNextPrayer {
  mosque: Mosque;
  nextPrayer: {
    name: string;
    iqamaTime: string;
    isKhutbah?: boolean;
  };
  minutesUntil: number;
  distance: number | null;
}

export function UpcomingPrayerCard({ mosques, userLocation, calculateDistance, onMosqueClick }: UpcomingPrayerCardProps) {
  const UPCOMING_THRESHOLD_MINUTES = 20; // Show if prayer is within 20 minutes
  const MINUTES_PER_MILE = 3; // Conservative estimate: assume 20 mph average (3 min/mile)
  const BUFFER_MINUTES = 2; // Add 2 minute buffer for parking/walking
  
  // Calculate next prayer for each mosque
  const mosquesWithPrayers: MosqueWithNextPrayer[] = mosques.map(mosque => {
    const calculatedTimes = calculateIqamaTimes(
      mosque.latitude,
      mosque.longitude,
      mosque.iqamaTimes,
      new Date(),
      mosque.calculationMethod || 'NorthAmerica',
      mosque.asrMethod || 'Standard',
      mosque.announcements  // Pass announcements to get effective times
    );
    
    const nextPrayer = getNextPrayer(calculatedTimes, mosque.offeredPrayers);
    const currentMinutes = getCurrentMinutes();
    const prayerMinutes = timeToMinutes(nextPrayer.iqamaTime);
    
    // Handle time wrapping around midnight
    let minutesUntil = prayerMinutes - currentMinutes;
    if (minutesUntil < 0) {
      minutesUntil += 24 * 60; // Add 24 hours if prayer is tomorrow
    }
    
    // Calculate distance
    const distance = userLocation 
      ? calculateDistance(userLocation.lat, userLocation.lng, mosque.latitude, mosque.longitude)
      : null;
    
    return {
      mosque,
      nextPrayer,
      minutesUntil,
      distance
    };
  });
  
  // Filter to only upcoming prayers (within threshold)
  const upcomingPrayers = mosquesWithPrayers.filter(
    m => m.minutesUntil <= UPCOMING_THRESHOLD_MINUTES && m.minutesUntil > 0
  );
  
  // If no upcoming prayers, don't show the card
  if (upcomingPrayers.length === 0) {
    return null;
  }
  
  // Sort by distance first (closest masjid first), then by time
  // This prioritizes nearby masajid over earlier times
  const sortedPrayers = upcomingPrayers.sort((a, b) => {
    // If both have distance data, sort by distance first
    if (a.distance !== null && b.distance !== null) {
      const distanceDiff = a.distance - b.distance;
      // If distance difference is significant (more than 0.5 miles), use that
      if (Math.abs(distanceDiff) > 0.5) {
        return distanceDiff;
      }
      // Otherwise, if very close in distance, sort by time
      return a.minutesUntil - b.minutesUntil;
    }
    
    // If only one has distance data, prioritize the one with distance data
    if (a.distance !== null) return -1;
    if (b.distance !== null) return 1;
    
    // If neither has distance data, sort by time only
    return a.minutesUntil - b.minutesUntil;
  });
  
  // Get the primary suggestion (closest prayer)
  const primarySuggestion = sortedPrayers[0];
  
  // Helper function to check if a masjid is practically reachable
  const isPracticallyReachable = (prayer: MosqueWithNextPrayer): boolean => {
    // If no location data, we can't determine, so assume it's reachable
    if (!userLocation || prayer.distance === null) {
      return true;
    }
    
    // Calculate estimated travel time: distance * minutes per mile + buffer
    const estimatedTravelTime = (prayer.distance * MINUTES_PER_MILE) + BUFFER_MINUTES;
    
    // Must have at least the estimated travel time to be considered reachable
    return prayer.minutesUntil >= estimatedTravelTime;
  };
  
  // Check if there's an alternative with more time for the same prayer
  // AND is practically reachable
  const laterAlternative = sortedPrayers.find(
    m => m.mosque.id !== primarySuggestion.mosque.id && 
         m.minutesUntil > primarySuggestion.minutesUntil &&
         m.nextPrayer.name === primarySuggestion.nextPrayer.name &&
         isPracticallyReachable(m)
  );
  
  return (
    <div className="mb-6 space-y-3">
      {/* Primary Prayer Card */}
      <div 
        onClick={() => onMosqueClick(primarySuggestion.mosque)}
        className="rounded-2xl p-5 shadow-lg border cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 border-emerald-400/20 dark:border-emerald-500/20"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-white/70 dark:text-white/60 mb-1 font-semibold flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Upcoming Salah
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {primarySuggestion.nextPrayer.name}
              {primarySuggestion.nextPrayer.isKhutbah && ' (Khutbah)'}
            </h3>
            <div className="text-white/90 text-sm">
              in {primarySuggestion.minutesUntil} minute{primarySuggestion.minutesUntil !== 1 ? 's' : ''} • {primarySuggestion.nextPrayer.iqamaTime}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-bold text-white">
              {primarySuggestion.minutesUntil}
            </div>
            <div className="text-xs text-white/70">min</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white/90 text-sm">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium truncate">{primarySuggestion.mosque.name}</span>
          </div>
          
          {userLocation && primarySuggestion.distance !== null && (
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Navigation className="w-4 h-4 flex-shrink-0" />
              <span>
                {primarySuggestion.distance.toFixed(1)} mi away
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Alternative Suggestion */}
      {laterAlternative && (
        <div 
          onClick={() => onMosqueClick(laterAlternative.mosque)}
          className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1 font-semibold">
                More Time Available
              </div>
              <div className="text-gray-900 dark:text-white font-semibold mb-1">
                {laterAlternative.mosque.name}
              </div>
              <div className="text-sm text-gray-700 dark:text-white/70">
                {laterAlternative.nextPrayer.name} at {laterAlternative.nextPrayer.iqamaTime}
                {laterAlternative.distance !== null && (
                  <> • {laterAlternative.distance.toFixed(1)} mi away</>
                )}
              </div>
            </div>
            <div className="text-blue-600 dark:text-blue-400 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full whitespace-nowrap">
              {laterAlternative.minutesUntil} min
            </div>
          </div>
        </div>
      )}
    </div>
  );
}