interface FilterTabsProps {
  activeTab: 'all' | 'favorites';
  onTabChange: (tab: 'all' | 'favorites') => void;
  hasFavorites: boolean;
}

export function FilterTabs({ activeTab, onTabChange, hasFavorites }: FilterTabsProps) {
  if (!hasFavorites) {
    return null; // Hide tabs if no favorites
  }

  return (
    <div className="flex gap-2 mt-4">
      <button
        onClick={() => onTabChange('all')}
        className={`px-5 py-2 rounded-full text-[15px] font-medium transition-all ${
          activeTab === 'all'
            ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
            : 'bg-gray-100/60 dark:bg-white/[0.06] text-gray-600 dark:text-white/60 hover:bg-gray-200/80 dark:hover:bg-white/[0.10] hover:text-gray-900 dark:hover:text-white/80'
        }`}
      >
        All Masajid
      </button>
      <button
        onClick={() => onTabChange('favorites')}
        className={`px-5 py-2 rounded-full text-[15px] font-medium transition-all ${
          activeTab === 'favorites'
            ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
            : 'bg-gray-100/60 dark:bg-white/[0.06] text-gray-600 dark:text-white/60 hover:bg-gray-200/80 dark:hover:bg-white/[0.10] hover:text-gray-900 dark:hover:text-white/80'
        }`}
      >
        Favorites
      </button>
    </div>
  );
}