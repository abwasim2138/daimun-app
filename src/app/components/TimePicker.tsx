import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
}

export function TimePicker({ value, onChange, label, required = false }: TimePickerProps) {
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value; // Format: "HH:mm" (24-hour)
    
    if (!timeValue) {
      onChange('');
      return;
    }

    // Convert 24-hour format to 12-hour format with AM/PM
    const [hours, minutes] = timeValue.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    onChange(formattedTime);
  };

  // Convert display value (12-hour) back to input value (24-hour)
  const getInputValue = () => {
    if (!value) return '';
    
    try {
      // Parse formats like "6:00 AM" or "1:15 PM"
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return '';
      
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="time"
          required={required}
          value={getInputValue()}
          onChange={handleTimeChange}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            {value}
          </div>
        )}
      </div>
    </div>
  );
}
