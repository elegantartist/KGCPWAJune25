import React from 'react';
import { Bell } from 'lucide-react';

interface AlertBadgeProps {
  count: number | string | { count: number | string };
  onClick?: () => void;
}

const AlertBadge: React.FC<AlertBadgeProps> = ({ count, onClick }) => {
  // Convert count to a number
  const numericCount = (() => {
    if (typeof count === 'number') return count;
    if (typeof count === 'string') return parseInt(count, 10) || 0;
    if (count && typeof count === 'object' && 'count' in count) {
      const countValue = count.count;
      if (typeof countValue === 'number') return countValue;
      if (typeof countValue === 'string') return parseInt(countValue, 10) || 0;
    }
    return 0;
  })();
  
  if (numericCount === 0) return null;
  
  return (
    <div 
      className="relative inline-flex cursor-pointer"
      onClick={onClick}
    >
      <Bell className="h-6 w-6 text-gray-700" />
      {numericCount > 0 && (
        <div className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center">
          {numericCount > 9 ? '9+' : numericCount}
        </div>
      )}
    </div>
  );
};

export default AlertBadge;