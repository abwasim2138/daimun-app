function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200/70 dark:bg-white/[0.06] ${className || ''}`} />
  );
}

function ShimmerLight({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-white/20 ${className || ''}`} />
  );
}

/** Skeleton that mimics the MosqueCard layout — instantly visible, no entrance animation */
export function MosqueCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-gray-200/50 dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.2)]"
    >
      {/* Header: name + metadata, star + menu */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Shimmer className="h-5 w-40 mb-2 rounded-md" />
          <Shimmer className="h-3.5 w-28 rounded-md" />
        </div>
        <div className="flex items-center gap-1">
          <Shimmer className="w-11 h-11 rounded-full flex-shrink-0" />
          <Shimmer className="w-11 h-11 rounded-full flex-shrink-0" />
        </div>
      </div>

      {/* Next prayer hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-[#2C2C2E] dark:to-[#1C1C1E] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <ShimmerLight className="h-3 w-10 mb-2 rounded-md" />
            <ShimmerLight className="h-7 w-20 mb-1.5 rounded-md" />
            <ShimmerLight className="h-3.5 w-24 rounded-md" />
          </div>
          <div className="text-right">
            <ShimmerLight className="h-3 w-12 mb-2 rounded-md ml-auto" />
            <ShimmerLight className="h-10 w-24 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton that mimics the UpcomingPrayerCard — neutral, no green, instant */
export function UpcomingPrayerSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 border bg-gray-100 dark:bg-white/[0.04] border-gray-200/50 dark:border-white/[0.06]"
    >
      <div className="flex items-center gap-2 mb-3">
        <Shimmer className="h-5 w-5 rounded-full" />
        <Shimmer className="h-4 w-36" />
      </div>
      <div className="space-y-2">
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-3/4" />
      </div>
    </div>
  );
}
