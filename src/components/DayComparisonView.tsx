
import { Log } from '@/types/stacklog';

interface Props {
  currentDate: Date;
  logs: Log[];
  categoryColors: Record<string, string>;
  onLogUpdate: () => void;
}

export function DayComparisonView({ currentDate, logs, categoryColors, onLogUpdate }: Props) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      1日ビュー (DayComparisonView) は現在データベース移行後の対応作業中です。
    </div>
  );
}
