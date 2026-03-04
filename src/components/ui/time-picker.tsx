import * as React from "react"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value: string | undefined;
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  // Parse current value
  const [hour, setHour] = React.useState<string>("09");
  const [minute, setMinute] = React.useState<string>("00");

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      if (h) setHour(h);
      if (m) setMinute(m);
    }
  }, [value]);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    setHour(newHour);
    onChange(`${newHour}:${minute}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    setMinute(newMinute);
    onChange(`${hour}:${newMinute}`);
  };

  // Generate options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="relative">
        <select
          value={hour}
          onChange={handleHourChange}
          className="appearance-none w-16 px-2 py-1 border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        {/* Custom arrow could go here if appearance-none removes it completely */}
      </div>
      <span className="text-gray-500">:</span>
      <div className="relative">
        <select
          value={minute}
          onChange={handleMinuteChange}
          className="appearance-none w-16 px-2 py-1 border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
