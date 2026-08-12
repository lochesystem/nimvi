export type TimePeriod = "dawn" | "day" | "afternoon" | "night";

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  dawn: "madrugada",
  day: "dia",
  afternoon: "tarde",
  night: "noite",
};

export function timePeriodForHour(hour: number): TimePeriod {
  const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24;
  if (normalizedHour < 6) return "dawn";
  if (normalizedHour < 12) return "day";
  if (normalizedHour < 18) return "afternoon";
  return "night";
}

export function currentTimePeriod(date = new Date()): TimePeriod {
  return timePeriodForHour(date.getHours());
}
