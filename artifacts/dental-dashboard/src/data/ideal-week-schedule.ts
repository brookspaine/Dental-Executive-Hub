export type ScheduleBlock = {
  start: number;
  duration: number;
  label: string;
  category: string;
};

export const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  morning: { bg: "bg-yellow-200", text: "text-yellow-900", border: "border-yellow-300" },
  startup: { bg: "bg-[#a8c5e0]", text: "text-slate-900", border: "border-[#8fb3d4]" },
  shutdown: { bg: "bg-[#a8c5e0]", text: "text-slate-900", border: "border-[#8fb3d4]" },
  executive: { bg: "bg-violet-500", text: "text-white", border: "border-violet-600" },
  patient: { bg: "bg-blue-900", text: "text-white", border: "border-blue-950" },
  family: { bg: "bg-red-400", text: "text-white", border: "border-red-500" },
  review: { bg: "bg-green-200", text: "text-green-900", border: "border-green-300" },
  meeting: { bg: "bg-orange-400", text: "text-white", border: "border-orange-500" },
  deepwork: { bg: "bg-blue-400", text: "text-white", border: "border-blue-500" },
  evening: { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" },
  workout: { bg: "bg-yellow-200", text: "text-yellow-900", border: "border-yellow-300" },
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
