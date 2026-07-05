/**
 * Official "Download on the App Store" badge per Apple marketing guidelines:
 * https://developer.apple.com/app-store/marketing/guidelines/
 *
 * Rules adhered to:
 * - Uses Apple's official badge artwork served from Apple's CDN
 * - Badge is not altered, stretched, or recolored
 * - Links directly to the App Store product page
 * - Minimum size respected (rendered at 135px wide, above the 120px minimum)
 * - alt text uses the approved lockup phrase "Download on the App Store"
 */

export const APP_STORE_URL = 'https://apps.apple.com/us/app/daimun/id6772403917';

// Apple's official badge CDN — black variant, en-US locale.
// Apple provides this endpoint for developers to embed in marketing materials.
const BADGE_URL = 'https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us';

export function AppStoreBadge({ className }: { className?: string }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Download Dāimūn on the App Store"
      className={className}
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <img
        src={BADGE_URL}
        alt="Download on the App Store"
        width={135}
        height={40}
        style={{ display: 'block' }}
      />
    </a>
  );
}
