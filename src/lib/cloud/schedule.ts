import type { Frequency, Schedule } from "./types";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Next occurrence strictly after `after`, in local time. */
export function computeNextRun(s: Pick<Schedule, "frequency" | "weekday" | "dayOfMonth" | "time">, after = new Date()): Date {
  const [hh, mm] = s.time.split(":").map(Number);
  const c = new Date(after);
  c.setSeconds(0, 0);
  c.setHours(hh, mm);
  switch (s.frequency) {
    case "daily":
      if (c <= after) c.setDate(c.getDate() + 1);
      return c;
    case "weekly": {
      c.setDate(c.getDate() + ((s.weekday - c.getDay() + 7) % 7));
      if (c <= after) c.setDate(c.getDate() + 7);
      return c;
    }
    case "monthly": {
      c.setDate(s.dayOfMonth);
      if (c <= after) c.setMonth(c.getMonth() + 1, s.dayOfMonth);
      return c;
    }
  }
}

export function describeSchedule(s: Pick<Schedule, "frequency" | "weekday" | "dayOfMonth" | "time">): string {
  const [hh, mm] = s.time.split(":").map(Number);
  const time = new Date(2000, 0, 1, hh, mm).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const freq: Record<Frequency, string> = {
    daily: `Every day at ${time}`,
    weekly: `Every ${WEEKDAYS[s.weekday]} at ${time}`,
    monthly: `Monthly on the ${ordinal(s.dayOfMonth)} at ${time}`,
  };
  return freq[s.frequency];
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
