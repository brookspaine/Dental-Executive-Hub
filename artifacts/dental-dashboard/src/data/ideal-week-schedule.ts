export type ScheduleBlock = {
  start: number;
  duration: number;
  label: string;
  category: string;
};

export const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  morning: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  startup: { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" },
  deepwork: { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
  patient: { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-300" },
  executive: { bg: "bg-slate-200", text: "text-slate-800", border: "border-slate-300" },
  shutdown: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
  evening: { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" },
  family: { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
  review: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  meeting: { bg: "bg-gray-200", text: "text-gray-800", border: "border-gray-300" },
  workout: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  calendar: { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300" },
};

export const categoryLabels: Record<string, string> = {
  morning: "Morning Ritual",
  startup: "Startup Ritual",
  deepwork: "Deepwork",
  patient: "Patient Care",
  executive: "Execution Block",
  shutdown: "Shutdown Ritual",
  evening: "Evening Ritual",
  family: "Family",
  review: "Weekly/Monthly Review",
  meeting: "Meeting",
  workout: "Workout",
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const schedule: Record<string, ScheduleBlock[]> = {
  Mon: [
    { start: 6, duration: 1.5, label: "Morning Ritual", category: "morning" },
    { start: 7.5, duration: 1, label: "Startup Ritual", category: "startup" },
    { start: 8.5, duration: 0.5, label: "Morning Huddle", category: "meeting" },
    { start: 9, duration: 3, label: "Patient Care", category: "patient" },
    { start: 12, duration: 4, label: "Patient Care", category: "patient" },
    { start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown" },
    { start: 17, duration: 2, label: "Family & Dinner", category: "family" },
    { start: 19, duration: 1, label: "Evening Ritual", category: "evening" },
  ],
  Tue: [
    { start: 6, duration: 1.5, label: "Morning Ritual", category: "morning" },
    { start: 7.5, duration: 1, label: "Startup Ritual", category: "startup" },
    { start: 8.5, duration: 1.5, label: "Weekly Review", category: "review" },
    { start: 10, duration: 2, label: "Deepwork", category: "deepwork" },
    { start: 12, duration: 3.5, label: "Deepwork", category: "deepwork" },
    { start: 15.5, duration: 0.5, label: "Execution Block", category: "executive" },
    { start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown" },
    { start: 17, duration: 2, label: "Family & Dinner", category: "family" },
    { start: 19, duration: 1, label: "Evening Ritual", category: "evening" },
  ],
  Wed: [
    { start: 6, duration: 1.5, label: "Morning Ritual", category: "morning" },
    { start: 7.5, duration: 1, label: "Startup Ritual", category: "startup" },
    { start: 8.5, duration: 1.5, label: "Deepwork", category: "deepwork" },
    { start: 10, duration: 0.5, label: "UC Meeting", category: "meeting" },
    { start: 10.5, duration: 1.5, label: "Deepwork", category: "deepwork" },
    { start: 12, duration: 3, label: "Deepwork", category: "deepwork" },
    { start: 15, duration: 1, label: "Execution Block", category: "executive" },
    { start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown" },
    { start: 17, duration: 1, label: "Workout", category: "workout" },
    { start: 18, duration: 1, label: "Dinner", category: "family" },
    { start: 19, duration: 1, label: "Evening Ritual", category: "evening" },
  ],
  Thu: [
    { start: 6, duration: 1.5, label: "Morning Ritual", category: "morning" },
    { start: 7.5, duration: 1, label: "Startup Ritual", category: "startup" },
    { start: 8.5, duration: 0.5, label: "Morning Huddle", category: "meeting" },
    { start: 9, duration: 3, label: "Patient Care", category: "patient" },
    { start: 12, duration: 1, label: "Deepwork", category: "deepwork" },
    { start: 13, duration: 2, label: "Execution Block", category: "executive" },
    { start: 15, duration: 1, label: "Execution Block", category: "executive" },
    { start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown" },
    { start: 17, duration: 2, label: "Family & Dinner", category: "family" },
    { start: 19, duration: 1, label: "Evening Ritual", category: "evening" },
  ],
  Fri: [
    { start: 6, duration: 1.5, label: "Morning Ritual", category: "morning" },
    { start: 7.5, duration: 1, label: "Startup Ritual", category: "startup" },
    { start: 8.5, duration: 0.5, label: "Morning Huddle", category: "meeting" },
    { start: 9, duration: 3, label: "Patient Care", category: "patient" },
    { start: 12, duration: 3, label: "Patient Care", category: "patient" },
    { start: 15, duration: 1, label: "Shutdown Ritual", category: "shutdown" },
    { start: 16, duration: 1, label: "Shutdown Ritual", category: "shutdown" },
    { start: 17, duration: 2, label: "Family & Dinner", category: "family" },
    { start: 19, duration: 1, label: "Evening Ritual", category: "evening" },
  ],
  Sat: [
    { start: 6, duration: 1, label: "Morning Ritual", category: "morning" },
    { start: 7, duration: 0.5, label: "Startup Ritual", category: "startup" },
    { start: 7.5, duration: 1, label: "Workout", category: "workout" },
    { start: 8.5, duration: 3.5, label: "Patient Care", category: "patient" },
    { start: 12, duration: 3, label: "Patient Care", category: "patient" },
    { start: 15, duration: 2, label: "Family Time", category: "family" },
    { start: 17, duration: 2, label: "Family & Dinner", category: "family" },
    { start: 19, duration: 1, label: "Evening Ritual", category: "evening" },
  ],
  Sun: [
    { start: 6, duration: 1.5, label: "Morning Ritual", category: "morning" },
    { start: 7.5, duration: 1, label: "Startup Ritual", category: "startup" },
    { start: 8.5, duration: 3.5, label: "Patient Care", category: "patient" },
    { start: 12, duration: 2, label: "Deepwork", category: "deepwork" },
    { start: 14, duration: 2, label: "Shutdown Ritual", category: "shutdown" },
    { start: 16, duration: 1, label: "Family Outing", category: "family" },
    { start: 17, duration: 2, label: "Family & Dinner", category: "family" },
    { start: 19, duration: 1, label: "Evening Ritual", category: "evening" },
  ],
};

export const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => i + 6);

export function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
}
