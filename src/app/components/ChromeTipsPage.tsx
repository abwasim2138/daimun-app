import React from 'react';
import { ArrowLeft, Globe, Monitor, Pin, ExternalLink, Download, Settings, Clock } from 'lucide-react';
import { useTheme } from 'next-themes@0.4.6';
import { SITE_URL } from '../utils/api';

interface ChromeTipsPageProps {
  onBack: () => void;
}

export function ChromeTipsPage({ onBack }: ChromeTipsPageProps) {
  const { theme } = useTheme();
  const widgetUrl = `${SITE_URL}/prayer-widget`;

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
              Browser Integration
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
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Always See Salah Times
              </h2>
              <p className="text-gray-600 dark:text-white/60 leading-relaxed">
                Keep Dāimūn's salah times visible while you work. These methods should hopefully work on all major browsers 
                and help you stay connected to salah times throughout your day.
              </p>
            </div>
          </div>
        </div>

        {/* Method 1: Prayer Widget Window */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200/50 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-white/[0.06] rounded-lg">
              <Clock className="w-5 h-5 text-gray-700 dark:text-white/70" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Method 1: Prayer Widget Window (Recommended)
            </h2>
          </div>

          <p className="text-gray-600 dark:text-white/60 mb-4">
            Keep a small, always-visible prayer times widget on your screen. Perfect for multi-monitor setups 
            or keeping prayer times in view while working.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-bold">1</span>
                Open Prayer Widget
              </h3>
              <div className="ml-8 space-y-3">
                <p className="text-gray-600 dark:text-white/60">
                  Click this link to open the prayer widget:
                </p>
                <a
                  href={widgetUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Prayer Widget</span>
                </a>
                <p className="text-gray-500 dark:text-white/45 text-sm">
                  Or copy this URL: <code className="bg-gray-100 dark:bg-white/[0.06] px-2 py-1 rounded text-xs">{widgetUrl}</code>
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-bold">2</span>
                Resize & Position
              </h3>
              <ul className="text-gray-600 dark:text-white/60 ml-8 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Resize the window to your preferred size (compact widget works great)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Position it in a corner or second monitor where it won't obstruct your work</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>On Windows, you can use <strong className="text-gray-900 dark:text-white">Win + Arrow keys</strong> to snap it to a corner</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-bold">3</span>
                Keep It Always Visible (Optional)
              </h3>
              <ul className="text-gray-600 dark:text-white/60 ml-8 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Windows:</strong>
                    <p className="text-sm mt-1">Use a third-party tool like <strong>DeskPins</strong> or <strong>Always on Top</strong> to pin the window above all others</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Mac:</strong>
                    <p className="text-sm mt-1">Use <strong>Afloat</strong> or <strong>Rectangle</strong> to keep the window always on top</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Method 2: Bookmark Bar */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200/50 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-white/[0.06] rounded-lg">
              <Pin className="w-5 h-5 text-gray-700 dark:text-white/70" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Method 2: Quick Access Bookmark
            </h2>
          </div>

          <p className="text-gray-600 dark:text-white/60 mb-4">
            Add Dāimūn to your bookmarks bar for instant access with one click.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold">1</span>
                Show Bookmarks Bar
              </h3>
              <ul className="text-gray-600 dark:text-white/60 ml-8 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Press <strong className="text-gray-900 dark:text-white">Ctrl+Shift+B</strong> (Windows) or <strong className="text-gray-900 dark:text-white">Cmd+Shift+B</strong> (Mac)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Or: Chrome menu (⋮) → <strong className="text-gray-900 dark:text-white">Bookmarks</strong> → <strong className="text-gray-900 dark:text-white">Show bookmarks bar</strong></span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold">2</span>
                Add Bookmark
              </h3>
              <ul className="text-gray-600 dark:text-white/60 ml-8 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Click the <strong className="text-gray-900 dark:text-white">⭐ star icon</strong> in Chrome's address bar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Select <strong className="text-gray-900 dark:text-white">Bookmarks bar</strong> as the folder</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Optionally shorten the name to just "Dāimūn" or "🕌" for a compact bookmark</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Method 3: Pinned Tab */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200/50 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-white/[0.06] rounded-lg">
              <Globe className="w-5 h-5 text-gray-700 dark:text-white/70" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Method 3: Pinned Tab
            </h2>
          </div>

          <p className="text-gray-600 dark:text-white/60 mb-4">
            Keep Dāimūn open in a small, always-visible tab that won't accidentally close.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                How to Pin
              </h3>
              <ul className="text-gray-600 dark:text-white/60 ml-4 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Right-click the Dāimūn tab</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Select <strong className="text-gray-900 dark:text-white">Pin tab</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>The tab shrinks to show only the favicon and stays at the left of your tab bar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>To unpin: Right-click → <strong className="text-gray-900 dark:text-white">Unpin tab</strong></span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/30">
              <p className="text-blue-900 dark:text-blue-300 text-sm">
                <strong>💡 Pro Tip:</strong> Pinned tabs persist across browser restarts if you have 
                "Continue where you left off" enabled in your browser settings.
              </p>
            </div>
          </div>
        </div>

        {/* Method 4: Desktop Shortcut */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl p-6 border border-gray-200/50 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-white/[0.06] rounded-lg">
              <Monitor className="w-5 h-5 text-gray-700 dark:text-white/70" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Method 4: Desktop Shortcut
            </h2>
          </div>

          <p className="text-gray-600 dark:text-white/60 mb-4">
            Create a desktop icon that opens Dāimūn's prayer widget with one click - no need to open your browser first.
          </p>

          <div className="space-y-4">
            {/* Windows */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Windows
              </h3>
              <ul className="text-gray-600 dark:text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex-shrink-0">1</span>
                  <span>Right-click on your desktop → <strong className="text-gray-900 dark:text-white">New</strong> → <strong className="text-gray-900 dark:text-white">Shortcut</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex-shrink-0">2</span>
                  <div className="flex-1">
                    <span>Paste this URL:</span>
                    <code className="block bg-gray-100 dark:bg-white/[0.06] px-3 py-2 rounded text-xs mt-2 break-all">{widgetUrl}</code>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex-shrink-0">3</span>
                  <span>Click <strong className="text-gray-900 dark:text-white">Next</strong>, name it "Najma Prayer Times" (or just "Najma")</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold flex-shrink-0">4</span>
                  <span>Click <strong className="text-gray-900 dark:text-white">Finish</strong></span>
                </li>
              </ul>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/30 mt-3">
                <p className="text-blue-900 dark:text-blue-300 text-sm">
                  <strong>💡 Bonus:</strong> Drag the shortcut to your taskbar for even quicker access, or add it to your 
                  Startup folder (<code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">Win+R</code> → type <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">shell:startup</code>) 
                  to launch automatically when you boot up.
                </p>
              </div>
            </div>

            {/* Mac */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 mt-6">
                Mac
              </h3>
              <ul className="text-gray-600 dark:text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-bold flex-shrink-0">1</span>
                  <span>Open the prayer widget in Safari (or your preferred browser)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-bold flex-shrink-0">2</span>
                  <span>Drag the URL from the address bar to your desktop</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-bold flex-shrink-0">3</span>
                  <span>Rename the file to "Najma Prayer Times" if desired</span>
                </li>
              </ul>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900/30 mt-3">
                <p className="text-purple-900 dark:text-purple-300 text-sm">
                  <strong>💡 Alternative:</strong> You can also drag the shortcut to your Dock for permanent quick access. 
                  For startup on login, go to <strong>System Settings</strong> → <strong>General</strong> → <strong>Login Items</strong> and add the shortcut.
                </p>
              </div>
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
              <span><strong className="text-gray-900 dark:text-white">Multiple monitors:</strong> The prayer widget works great on a second monitor for constant visibility.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <span><strong className="text-gray-900 dark:text-white">TV Display:</strong> For displaying on masjid TVs, use the dedicated TV mode (accessible from each masjid's detail page).</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <span><strong className="text-gray-900 dark:text-white">Mobile widget:</strong> The prayer widget also works great on mobile devices - just bookmark the widget URL for quick access.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <span><strong className="text-gray-900 dark:text-white">Startup shortcut:</strong> Create a desktop shortcut to the widget URL and add it to your startup programs to see prayer times as soon as you boot up.</span>
            </li>
          </ul>
        </div>

        {/* Footer note */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-white/45">
            Stay connected to salah times throughout your day.
          </p>
        </div>
      </div>
    </div>
  );
}