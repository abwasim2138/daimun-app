export function FaviconSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        {/* Rich gold gradient */}
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: '#F2D06B' }} />
          <stop offset="45%" style={{ stopColor: '#D4AF37' }} />
          <stop offset="100%" style={{ stopColor: '#A67C00' }} />
        </linearGradient>

        {/* Clip to arch shape */}
        <clipPath id="archClip">
          <path d="M 52 164 L 52 95 Q 52 38 100 26 Q 148 38 148 95 L 148 164 Z" />
        </clipPath>

        {/* Subtle diagonal line texture */}
        <pattern id="tex" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeWidth="0.8" opacity="0.12" />
        </pattern>
      </defs>

      {/* Solid filled arch */}
      <path
        d="M 52 164 L 52 95 Q 52 38 100 26 Q 148 38 148 95 L 148 164 Z"
        fill="url(#gold)"
      />

      {/* Texture overlay clipped to arch */}
      <rect
        x="0" y="0" width="200" height="200"
        fill="url(#tex)"
        clipPath="url(#archClip)"
      />
    </svg>
  );
}

// Function to convert SVG to data URL for favicon
export function getFaviconDataURL(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style="stop-color:#F2D06B"/>
          <stop offset="45%" style="stop-color:#D4AF37"/>
          <stop offset="100%" style="stop-color:#A67C00"/>
        </linearGradient>
        <clipPath id="archClip">
          <path d="M 52 164 L 52 95 Q 52 38 100 26 Q 148 38 148 95 L 148 164 Z"/>
        </clipPath>
        <pattern id="tex" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" stroke-width="0.8" opacity="0.12"/>
        </pattern>
      </defs>
      <path d="M 52 164 L 52 95 Q 52 38 100 26 Q 148 38 148 95 L 148 164 Z"
            fill="url(#gold)"/>
      <rect x="0" y="0" width="200" height="200"
            fill="url(#tex)" clip-path="url(#archClip)"/>
    </svg>
  `;

  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
