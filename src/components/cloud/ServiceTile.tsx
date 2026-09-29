import { DESTINATIONS } from "@/lib/cloud/destinations";
import type { DestinationId } from "@/lib/cloud/types";

export function ServiceTile({ id, size = 36 }: { id: DestinationId; size?: number }) {
  const d = DESTINATIONS[id];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl font-bold text-white shadow-sm"
      style={{ width: size, height: size, backgroundColor: d.color, fontSize: size * (d.mark.length > 1 ? 0.34 : 0.45) }}
      aria-hidden
    >
      {d.mark}
    </span>
  );
}

export function SimulatedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Demo integration: no data leaves your browser"
      className={`inline-flex items-center rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200 ${className}`}
    >
      Simulated
    </span>
  );
}
