import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  isWeeklyDue,
  isMonthlyDue,
  isQuarterlyDue,
  weeklyPeriod,
  monthlyPeriod,
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

/* Persistent reminder rendered as a PLAIN fixed overlay (deliberately NOT a
   Radix Dialog — auto-mounting a modal Dialog app-wide in the shell triggered a
   scroll-lock / focus-trap / refetch loop that white-screened the app). On app
   open, if a review is due, not completed, and not dismissed this session, this
   overlay appears linking into the review's guided flow. X / "Later" dismiss
   for the session only; it returns next app open until the review is completed
   (which only the review page does). */
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
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (!completions) return null; // fail closed — never block the app

  const now = new Date();
  const qP = quarterlyPeriod(now);
  const mP = monthlyPeriod(now);
  const wP = weeklyPeriod(now);

  const quarterlyDue =
    isQuarterlyDue(completions, now) && !isDismissed("quarterly", qP.year, qP.period);
  const monthlyDue =
    isMonthlyDue(completions, now) && !isDismissed("monthly", mP.year, mP.period);
  const weeklyDue =
    isWeeklyDue(completions, now) && !isDismissed("weekly", wP.year, wP.period);

  // Precedence: surface the rarest/most-strategic review first.
  const active: "quarterly" | "monthly" | "weekly" | null = quarterlyDue
    ? "quarterly"
    : monthlyDue
      ? "monthly"
      : weeklyDue
        ? "weekly"
        : null;
  if (!active) return null;

  const period = active === "quarterly" ? qP : active === "monthly" ? mP : wP;
  const copy = {
    quarterly: {
      icon: "🎯",
      title: `New quarter — time for your Q${qP.period} review`,
      sub: "Score last quarter's objectives, reflect, and set this quarter's goals.",
      path: "/quarterly-review",
    },
    monthly: {
      icon: "💰",
      title: "Time for your Monthly Review",
      sub: "Review your personal finances and log this month's personal assessment.",
      path: "/monthly-review",
    },
    weekly: {
      icon: "🗓️",
      title: "Your Weekly Review is ready",
      sub: "Take a few minutes to reflect on last week and set your focus for the week ahead.",
      path: "/weekly-review",
    },
  }[active];

  const dismiss = () => {
    setDismissed(active, period.year, period.period);
    forceTick((t) => t + 1);
  };
  const start = () => {
    dismiss();
    setLocation(`${copy.path}?mode=guided`);
  };

  const navyBtn: CSSProperties = {
    background: "#0F2A47",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
  const ghostBtn: CSSProperties = {
    background: "transparent",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15,42,71,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          maxWidth: 440,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(15,42,71,0.4)",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ background: "linear-gradient(135deg,#0F2A47,#1c4066)", color: "#fff", padding: "26px 24px 20px", position: "relative" }}>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#9fb3c9", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
          >
            ✕
          </button>
          <div style={{ fontSize: 30 }}>{copy.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>
            {copy.title}
          </div>
          <div style={{ fontSize: 13, color: "#c7d5e6", marginTop: 6, lineHeight: 1.5 }}>
            {copy.sub}
          </div>
        </div>
        <div style={{ padding: "18px 24px 22px", display: "flex", gap: 10, justifyContent: "center" }}>
          <button type="button" onClick={start} style={navyBtn}>
            Start review →
          </button>
          <button type="button" onClick={dismiss} style={ghostBtn}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
