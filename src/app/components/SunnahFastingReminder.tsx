import { Utensils } from 'lucide-react';

interface SunnahFastingReminderProps {
  data: {
    maghribPassed: boolean;
    currentDay: number; // 0 = Sunday, 3 = Wednesday
  };
}

export function SunnahFastingReminder({ data }: SunnahFastingReminderProps) {
  const { maghribPassed, currentDay } = data;
  
  // Only show on Sunday (0) or Wednesday (3) nights after Maghrib
  if (!maghribPassed || (currentDay !== 0 && currentDay !== 3)) {
    return null;
  }

  const nextDay = currentDay === 0 ? 'Monday' : 'Thursday';

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
          <Utensils className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold text-sm mb-0.5">
            Sunnah Fasting Tomorrow
          </div>
          <div className="text-white/90 text-xs">
            Prepare for fasting {nextDay}
          </div>
        </div>
      </div>
    </div>
  );
}