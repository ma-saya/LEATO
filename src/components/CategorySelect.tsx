import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  className?: string;
}

export function CategorySelect({ value, onChange, categories, className }: CategorySelectProps) {
  return (
    <div className={cn("relative inline-block text-left w-full sm:w-auto", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full bg-background border border-input text-foreground py-2 pl-3 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-input text-sm cursor-pointer transition-all duration-200 hover:border-ring/50"
      >
        <option value="ALL">すべてのカテゴリ</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
}

