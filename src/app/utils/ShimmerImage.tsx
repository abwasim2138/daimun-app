import { useState, useCallback, useEffect } from 'react';

interface ShimmerImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Max time (ms) to show the shimmer before giving up. Default 6000. */
  timeout?: number;
}

/**
 * Image component with a shimmering skeleton placeholder while loading.
 * Fades in the real image once loaded.
 * If the image fails or times out (e.g. images disabled in browser), the
 * shimmer stops gracefully and a subtle fallback is shown.
 */
export function ShimmerImage({ src, alt, className = '', style, timeout = 6000, ...rest }: ShimmerImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const onLoad = useCallback(() => setLoaded(true), []);
  const onError = useCallback(() => setFailed(true), []);

  // Timeout: if the image hasn't loaded after `timeout` ms, treat it as failed
  useEffect(() => {
    if (loaded || failed) return;
    const timer = setTimeout(() => {
      setFailed(true);
    }, timeout);
    return () => clearTimeout(timer);
  }, [loaded, failed, timeout]);

  const showShimmer = !loaded && !failed;

  return (
    <div className="relative" style={style}>
      {/* Shimmer skeleton — visible until image loads or fails */}
      {showShimmer && (
        <div
          className={`${className} overflow-hidden`}
          style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.04) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
          aria-hidden
        />
      )}

      {/* Fallback — subtle placeholder when image can't load */}
      {failed && !loaded && (
        <div
          className={`${className} flex items-center justify-center bg-gray-100 dark:bg-white/[0.04]`}
          aria-hidden
        >
          <svg className="w-8 h-8 text-gray-300 dark:text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
      )}

      {/* Real image — hidden until loaded, then fades in */}
      {!failed && (
        <img
          src={src}
          alt={alt}
          className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            transition: 'opacity 300ms ease-in',
            ...(loaded ? {} : { position: 'absolute', top: 0, left: 0 }),
          }}
          onLoad={onLoad}
          onError={onError}
          {...rest}
        />
      )}

      {/* Inline keyframes — injected once via <style> tag */}
      {showShimmer && (
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      )}
    </div>
  );
}
