import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  isWeeklyDue,
  isQuarterlyDue,
  weeklyPeriod,
  quarterlyPeriod,
  type ReviewCompletion,
} from "@/lib/review-cadence";

const base = import.meta.env.BASE_URL || "/";

function dismissKey(kind: string, year: number, period: number): string {
  return `review-dismiss-${kind}-${year}-${period}`;
}
function isDismissed(kind: string, year: number, period: number): boolean {
  try {
    return sessionStorage.getItem(dismissKey(kind, year, period)) === "1";
  } catch {
    return false;
  }
}
function setDismissed(kind: string, year: number, period: number): void {
  try {
    sessionStorage.setItem(dismissKey(kind, year, period), "1");
  } catch {
    /* ignore */
  }
}

/* Persistent reminder: on app open, if a review is due and not completed and
   not dismissed this session, a modal appears linking into the review's guided
   flow. X / "Later" dismiss for the session only — it returns on the next app
   open until the review is marked complete (which only the review page does). */
export function ReviewReminderModal() {
  const [, setLocation] = useLocation();
  const [, forceTick] = useState(0);

  const { data: completions } = useQuery<ReviewCompletion[]>({
    queryKey: ["reviews-status"],
    queryFn: async () => {
      const res = await fetch(`${base}api/reviews/status`);
      if (!res.ok) throw new Error("Failed to load review status");
      return (await res.json()) as ReviewCompletion[];
    },
    staleTime: 60_000,
  });

  if (!completions) return null; // fail closed — never block the app

  const now = new Date();
  const qP = quarterlyPeriod(now);
  const wP = weeklyPeriod(now);

  const quarterlyDue =
    isQuarterlyDue(completions, now) && !isDismissed("quarterly", qP.year, qP.period);
  const weeklyDue =
    isWeeklyDue(completions, now) && !isDismissed("weekly", wP.year, wP.period);

  // Quarterly takes precedence when both are due.
  const active: "quarterly" | "weekly" | null = quarterlyDue
    ? "quarterly"
    : weeklyDue
      ? "weekly"
      : null;
  if (!active) return null;

  const isQ = active === "quarterly";
  const period = isQ ? qP : wP;

  const dismiss = () => {
    setDismissed(active, period.year, period.period);
    forceTick((t) => t + 1);
  };
  const start = () => {
    dismiss();
    setLocation(isQ ? "/quarterly-review?mode=guided" : "/weekly-review?mode=guided");
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismiss(); }}>
      <DialogContent className="p-0 gap-0 max-w-[440px] overflow-hidden text-center">
        <div style={{ background: "linear-gradient(135deg,#0F2A47,#1c4066)", color: "#fff", padding: "26px 24px 20px" }}>
          <div style={{ fontSize: 30 }}>{isQ ? "🎯" : "🗓️"}</div>
          <DialogTitle style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginTop: 6 }}>
            {isQ ? `New quarter — time for your Q${qP.period} review` : "Your Weekly Review is ready"}
          </DialogTitle>
          <DialogDescription style={{ color: "#c7d5e6", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            {isQ
              ? "Score last quarter's objectives, reflect, and set this quarter's goals."
              : "Take a few minutes to reflect on last week and set your focus for the week ahead."}
          </DialogDescription>
        </div>
        <div style={{ padding: "18px 24px 22px", display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            type="button"
            onClick={start}
            style={{ background: "#0F2A47", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Start review →
          </button>
          <button
            type="button"
            onClick={dismiss}
            style={{ background: "transparent", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
