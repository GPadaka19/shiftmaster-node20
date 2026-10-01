import { cn } from "cn";
import { TabLink } from "@/components/tab-link";
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/time";

/** Senin–Jumat as links. Today gets a dot; days in `muted` are dimmed (e.g. holidays). */
export function DayTabs({
  selected,
  today,
  hrefFor,
  muted = [],
}: {
  selected: number;
  today: number;
  hrefFor: (weekday: number) => string;
  muted?: number[];
}) {
  return (
    <nav aria-label="Pilih hari" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <div className="inline-flex gap-1 rounded-lg border border-border bg-muted p-0.5">
        {[1, 2, 3, 4, 5].map((weekday) => {
          const active = weekday === selected;
          return (
            <TabLink
              key={weekday}
              href={hrefFor(weekday)}
              active={active}
              variant="boxed"
              aria-label={`${WEEKDAY_NAMES[weekday]}${weekday === today ? " (hari ini)" : ""}`}
              className={cn("relative min-w-14 justify-center transition-colors", muted.includes(weekday) && !active && "opacity-50")}
            >
              <span className="sm:hidden">{WEEKDAY_SHORT[weekday]}</span>
              <span className="hidden sm:inline">{WEEKDAY_NAMES[weekday]}</span>
              {weekday === today && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-brand" aria-hidden="true" />}
            </TabLink>
          );
        })}
      </div>
    </nav>
  );
}
