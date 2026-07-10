import type { HubEvent } from "@/types/hub";
import { eachDayOfInterval, endOfMonth, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Link } from "wouter";

export function HubCalendarGrid({
  events,
  monthValue,
}: {
  events: HubEvent[];
  monthValue: string;
}) {
  const monthDate = new Date(`${monthValue}-01T00:00:00`);
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const days = eachDayOfInterval({
    start,
    end: endOfMonth(monthDate),
  });
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--line)] bg-white shadow-[0_25px_60px_-45px_rgba(24,40,60,0.4)]">
      <div className="grid grid-cols-7 border-b border-[color:var(--line)] bg-stone-50 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="px-2 py-3">
            {label}
          </div>
        ))}
      </div>
      <div className="grid gap-px bg-[color:var(--line)]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-px">
            {week.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const dayEvents = events.filter(
                (event) => format(new Date(event.startDateTime), "yyyy-MM-dd") === dayStr,
              );

              return (
                <div key={day.toISOString()} className="min-h-36 bg-white p-3 align-top">
                  <div
                    className={`text-sm font-semibold ${
                      isSameMonth(day, monthDate) ? "text-[color:var(--navy)]" : "text-slate-400"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="mt-2 space-y-2">
                    {dayEvents.slice(0, 3).map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="block rounded-2xl bg-[color:var(--forest-soft)] px-3 py-2 text-xs font-medium text-[color:var(--forest)]"
                      >
                        <span className="block truncate">{event.title}</span>
                        <span className="mt-1 block text-[0.7rem] opacity-80">
                          {format(new Date(event.startDateTime), "h:mm a")}
                        </span>
                      </Link>
                    ))}
                    {dayEvents.length > 3 ? (
                      <p className="text-[0.7rem] font-semibold text-slate-500">+{dayEvents.length - 3} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
