
import { cn } from '@/lib/utils';

export interface CategoryPillsProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  className?: string;
  colors?: Record<string, string>;
}

export function CategoryPills({ categories, selected, onSelect, className, colors }: CategoryPillsProps) {
  return (
    <div className={cn("flex overflow-x-auto pb-2 gap-2 hide-scrollbar items-center", className)}>
      <button
        type="button"
        onClick={() => onSelect('ALL')}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
          selected === 'ALL'
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
        )}
      >
        すべて
      </button>
      {categories.map((cat) => {
        const color = colors?.[cat];
        const isSelected = selected === cat;
        // If color exists, use it for border/text (unselected) or bg (selected)
        // For unselected with custom color, we keep bg 'white' to ensure contrast for the custom text color (e.g. black)
        // In dark mode, this pops out but ensures readability.
        const style = color ? {
            borderColor: color,
            backgroundColor: isSelected ? color : undefined, 
            color: isSelected ? 'white' : color,
        } : {};

        return (
            <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            style={style}
            className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground",
                // If custom color and unselected, force white bg to ensure text readability if color is dark
                // But if we want dark mode support... maybe lighter background? 
                // Let's rely on semantic bg-card for now unless strictly needed.
                // Reset: If user picked BLACK for category, and we use bg-card (dark), text is black on dark. Bad.
                // So if color is defined, we might need a specific class override.
                color && !isSelected && "bg-white dark:bg-white/90"
            )}
            >
            {cat}
            </button>
        );
      })}
    </div>
  );
}
