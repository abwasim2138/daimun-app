import React from 'react';
import { ArrowLeft, Smartphone, MapPin, Bell, BellOff, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes@0.4.6';

interface DNDTipsPageProps {
  onBack: () => void;
}

export function DNDTipsPage({ onBack }: DNDTipsPageProps) {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black transition-colors">
      {/* Header */}
      <div className="bg-white/80 dark:bg-black/80 border-b border-gray-200/50 dark:border-white/[0.06] sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-white/70" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Auto Do Not Disturb
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {/* Introduction */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200/50 dark:border-white/[0.06]">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl">
              <BellOff className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Why This Matters
              </h2>
              <p className="text-gray-600 dark:text-white/60 leading-relaxed">
                During salah, it's essential to maintain focus and respect for the sanctity of the masjid. 
                Setting up automatic Do Not Disturb ensures your phone won't interrupt prayers, lectures, or 
                other community members.
              </p>
            </div>
          </div>
        </div>

        {/* iOS Instructions */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200/50 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-white/[0.06] rounded-lg">
              <Smartphone className="w-5 h-5 text-gray-700 dark:text-white/70" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              iPhone (iOS)
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold">1</span>
                Open Shortcuts App
              </h3>
              <p className="text-gray-600 dark:text-white/60 ml-8 mb-2">
                The Shortcuts app comes pre-installed on iOS. If you can't find it, search for "Shortcuts" in the App Store.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold">2</span>
                Create Personal Automation
              </h3>
              <ul className="text-gray-600 dark:text-white/60 ml-8 space-y-2">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Tap the <strong className="text-gray-900 dark:text-white">Automation</strong> tab at the bottom</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Tap the <strong className="text-gray-900 dark:text-white">+</strong> button (top right)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Select <strong className="text-gray-900 dark:text-white">Create Personal Automation</strong></span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold">3</span>
                Set Up Arrive Trigger
              </h3>
              <ul className="text-gray-600 dark:text-white/60 ml-8 space-y-2">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Scroll down and select <strong className="text-gray-900 dark:text-white">Arrive</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Tap <strong className="text-gray-900 dark:text-white">Location</strong> and search for your masjid's address</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Adjust the radius if needed (recommended: 100-200 meters)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Tap <strong className="text-gray-900 dark:text-white">Next</strong></span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold">4</span>
                Add DND Action
              </h3>
              <ul className="text-gray-600 dark:text-white/60 ml-8 space-y-2">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Tap <strong className="text-gray-900 dark:text-white">Add Action</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Search for "Focus" or "Do Not Disturb"</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Select <strong className="text-gray-900 dark:text-white">Set Focus</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Choose <strong className="text-gray-900 dark:text-white">Do Not Disturb</strong> and turn it <strong className="text-gray-900 dark:text-white">On</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Tap <strong className="text-gray-900 dark:text-white">Next</strong>, then toggle off <strong className="text-gray-900 dark:text-white">Ask Before Running</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0 text-blue-500" />
                  <span>Tap <strong className="text-gray-900 dark:text-white">Done</strong></span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold">5</span>
                Create Leave Automation (Optional)
              </h3>
              <p className="text-gray-600 dark:text-white/60 ml-8 mb-2">
                Repeat the same steps, but select <strong className="text-gray-900 dark:text-white">Leave</strong> instead of Arrive, 
                and choose to turn <strong className="text-gray-900 dark:text-white">Off</strong> Do Not Disturb. This automatically 
                re-enables notifications when you leave the masjid.
              </p>
            </div>
          </div>
        </div>

        {/* Android Instructions */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200/50 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-white/[0.06] rounded-lg">
              <Smartphone className="w-5 h-5 text-gray-700 dark:text-white/70" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Android
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/30">
              <p className="text-blue-900 dark:text-blue-300 text-sm">
                <strong>Note:</strong> Android implementation varies by manufacturer (Samsung, Google Pixel, OnePlus, etc.). 
                Below are the most common methods.
              </p>
            </div>

            {/* Method 1: Built-in DND Rules */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Method 1: Built-in DND Rules (Most Android Phones)
              </h3>
              <ul className="text-gray-600 dark:text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">1</span>
                  <span>Open <strong className="text-gray-900 dark:text-white">Settings</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">2</span>
                  <span>Go to <strong className="text-gray-900 dark:text-white">Sound & vibration</strong> or <strong className="text-gray-900 dark:text-white">Notifications</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">3</span>
                  <span>Tap <strong className="text-gray-900 dark:text-white">Do Not Disturb</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">4</span>
                  <span>Look for <strong className="text-gray-900 dark:text-white">Schedules</strong>, <strong className="text-gray-900 dark:text-white">Rules</strong>, or <strong className="text-gray-900 dark:text-white">Automatic rules</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">5</span>
                  <span>Some phones have a <strong className="text-gray-900 dark:text-white">Location-based</strong> rule option - if available, add your masjid's location</span>
                </li>
              </ul>
              <p className="text-gray-500 dark:text-white/45 text-sm mt-3 ml-8 italic">
                Unfortunately, many Android phones don't have built-in location-based DND. If yours doesn't, try Method 2.
              </p>
            </div>

            {/* Method 2: Google Assistant Routines */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Method 2: Google Assistant Routines
              </h3>
              <ul className="text-gray-600 dark:text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">1</span>
                  <span>Open the <strong className="text-gray-900 dark:text-white">Google Home</strong> app (not Google app)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">2</span>
                  <span>Tap <strong className="text-gray-900 dark:text-white">Automations</strong> at the bottom (or go to Settings → Routines)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">3</span>
                  <span>Tap the <strong className="text-gray-900 dark:text-white">+</strong> button to create a new routine</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">4</span>
                  <span>Under "Add starter," select <strong className="text-gray-900 dark:text-white">At a certain location</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">5</span>
                  <span>Enter your masjid's address and set radius</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">6</span>
                  <span>Under "Add action," select <strong className="text-gray-900 dark:text-white">Adjust phone settings</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">7</span>
                  <span>Enable <strong className="text-gray-900 dark:text-white">Do Not Disturb</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">8</span>
                  <span>Save the routine</span>
                </li>
              </ul>
              <p className="text-gray-500 dark:text-white/45 text-sm mt-3 ml-8 italic">
                Note: Google has been removing features from Assistant Routines. This may not be available on all devices.
              </p>
            </div>

            {/* Samsung-specific */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Samsung Phones: Bixby Routines
              </h3>
              <ul className="text-gray-600 dark:text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">1</span>
                  <span>Open <strong className="text-gray-900 dark:text-white">Settings</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">2</span>
                  <span>Go to <strong className="text-gray-900 dark:text-white">Modes and Routines</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">3</span>
                  <span>Tap <strong className="text-gray-900 dark:text-white">Routines</strong> → <strong className="text-gray-900 dark:text-white">+</strong> button</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">4</span>
                  <span>Add "If" condition: <strong className="text-gray-900 dark:text-white">Place</strong> → Select your masjid</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold flex-shrink-0">5</span>
                  <span>Add "Then" action: <strong className="text-gray-900 dark:text-white">Sound mode</strong> → <strong className="text-gray-900 dark:text-white">Mute</strong> or <strong className="text-gray-900 dark:text-white">Vibrate</strong></span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Tips */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200/50 dark:border-white/[0.06]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Additional Tips
          </h2>
          <ul className="space-y-3 text-gray-600 dark:text-white/60">
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <span><strong className="text-gray-900 dark:text-white">Set up multiple masajid:</strong> If you visit different masajid, create separate automations for each location.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <span><strong className="text-gray-900 dark:text-white">Test the automation:</strong> Visit the masjid to ensure it works properly. Check that DND activates within the set radius.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <span><strong className="text-gray-900 dark:text-white">Allow important calls:</strong> In DND settings, you can allow calls from favorites or repeated calls in case of emergencies.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <span><strong className="text-gray-900 dark:text-white">Adjust radius:</strong> Too small (under 50m) may not trigger reliably. Too large (over 500m) may activate too early. 100-200m works well for most locations.</span>
            </li>
          </ul>
        </div>

        {/* Footer note */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-white/45">
            May Allah accept our efforts in maintaining the sanctity of His houses.
          </p>
        </div>
      </div>
    </div>
  );
}