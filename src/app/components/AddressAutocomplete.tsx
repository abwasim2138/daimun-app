import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: { address: string; lat: number; lng: number }) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export function AddressAutocomplete({ value, onChange, onPlaceSelect }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!inputValue.trim() || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        // Using Nominatim (OpenStreetMap) - free, no API key needed
        // Limiting to Florida using bounding box coordinates
        const floridaBounds = {
          minLon: -87.6349,
          minLat: 24.5210,
          maxLon: -80.0310,
          maxLat: 31.0009
        };
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue + ', Florida')}&addressdetails=1&limit=5&countrycodes=us&viewbox=${floridaBounds.minLon},${floridaBounds.maxLat},${floridaBounds.maxLon},${floridaBounds.minLat}&bounded=1`,
          {
            headers: {
              'User-Agent': 'IqamaTimesApp/1.0' // Nominatim requires a user agent
            }
          }
        );

        if (response.ok) {
          const data: NominatimResult[] = await response.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleSuggestionClick = (result: NominatimResult) => {
    const address = result.display_name;
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    onPlaceSelect({ address, lat, lng });
    onChange(address);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          required
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Delay to allow clicking on suggestions
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Start typing an address..."
          autoComplete="off"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="text-gray-900">{suggestion.display_name}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}