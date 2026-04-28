import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2,
  Users,
  Bell,
  CalendarCheck,
  Network,
  Menu,
  ChevronDown,
  CalendarDays,
  ListChecks,
  Compass,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useListDirectReports } from "@workspace/api-client-react";
import { resolveAvatarUrl } from "@/components/editable-report-photo";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const CURRENT_USER_NAME = "Brooks Paine";
const CURRENT_USER_TITLE = "Chief Executive Officer";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type NavLeaf = { href: string; label: string; icon: any };
type NavGroup = {
  label: string;
  icon: any;
  children: { href: string; label: string }[];
};
type NavItem = NavLeaf | NavGroup;

const navItems: NavItem[] = [
  { href: "/ideal-week", label: "Ideal Week", icon: CalendarCheck },
  { href: "/organizations", label: "Urgent Dental", icon: Building2 },
  { href: "/org-chart", label: "Practice Organization Chart", icon: Network },
  { href: "/action-items", label: "Action Items", icon: ListChecks },
  {
    label: "Team",
    icon: Users,
    children: [
      { href: "/team/reports", label: "Team Reports" },
      { href: "/team/my-reports", label: "My Reports" },
      { href: "/team/fill-out-a-report", label: "Fill Out a Report" },
      { href: "/direct-reports", label: "Manage Teams" },
    ],
  },
  {
    label: "Meetings",
    icon: CalendarDays,
    children: [
      { href: "/meetings/leadership", label: "Leadership Team" },
      { href: "/meetings/one-on-ones", label: "1-on-1s" },
    ],
  },
  { href: "/edge-way", label: "The UD Way", icon: Compass },
];

function isGroup(item: NavItem): item is NavGroup {
  return (item as NavGroup).children !== undefined;
}

function findCurrentLabel(location: string): string | null {
  // Collect every nav href + label (top-level leaves and group children).
  const candidates: { href: string; label: string }[] = [];
  for (const item of navItems) {
    if (isGroup(item)) {
      for (const c of item.children) candidates.push({ href: c.href, label: c.label });
    } else {
      candidates.push({ href: item.href, label: item.label });
    }
  }
  // Longest prefix wins so nested routes resolve to the deepest nav entry
  // (e.g. /team/reports beats /team, /meetings/leadership/series/123 → "Leadership Team").
  candidates.sort((a, b) => b.href.length - a.href.length);
  const match = candidates.find(
    (c) => location === c.href || location.startsWith(c.href + "/"),
  );
  return match ? match.label : null;
}

function NavList({
  location,
  onNavigate,
}: {
  location: string;
  onNavigate?: () => void;
}) {
  // Track which groups are expanded. Auto-expand a group if its child is active.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of navItems) {
      if (isGroup(item)) {
        initial[item.label] = item.children.some((c) => c.href === location);
      }
    }
    return initial;
  });

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of navItems) {
        if (isGroup(item) && item.children.some((c) => c.href === location)) {
          next[item.label] = true;
        }
      }
      return next;
    });
  }, [location]);

  return (
    <nav className="flex-1 px-3 pt-3 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        if (isGroup(item)) {
          const open = !!openGroups[item.label];
          const hasActiveChild = item.children.some((c) => c.href === location);
          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((p) => ({ ...p, [item.label]: !p[item.label] }))
                }
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#0F2A47]/30 ${
                  hasActiveChild
                    ? "bg-slate-100 text-[#0F2A47]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#0F2A47]"
                }`}
                aria-expanded={open}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 ${hasActiveChild ? "text-[#D62828]" : "text-slate-500"}`}
                  strokeWidth={hasActiveChild ? 2.5 : 2}
                />
                <span className="truncate flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform text-slate-400 ${
                    open ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>
              {open && (
                <div className="mt-1 ml-7 space-y-1 border-l border-slate-200 pl-3">
                  {item.children.map((child) => {
                    const childActive = location === child.href;
                    return (
                      <Link key={child.href} href={child.href}>
                        <span
                          onClick={onNavigate}
                          className={`block px-3 py-1.5 rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0F2A47]/30 ${
                            childActive
                              ? "bg-slate-100 text-[#0F2A47] font-medium"
                              : "text-slate-600 hover:bg-slate-50 hover:text-[#0F2A47]"
                          }`}
                        >
                          {child.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <span
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#0F2A47]/30 ${
                isActive
                  ? "bg-slate-100 text-[#0F2A47]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#0F2A47]"
              }`}
            >
              <item.icon
                className={`h-4 w-4 shrink-0 ${isActive ? "text-[#D62828]" : "text-slate-500"}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="truncate">{item.label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserBadge() {
  const { data: reports } = useListDirectReports();
  const target = CURRENT_USER_NAME.trim().toLowerCase();
  const me = (reports ?? []).find(
    (r: any) => (r.name ?? "").trim().toLowerCase() === target,
  );
  const photoUrl = resolveAvatarUrl((me as any)?.avatarUrl) ?? undefined;

  return (
    <div className="p-4 border-t border-slate-200">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="shrink-0 border border-slate-200">
          {photoUrl && <AvatarImage src={photoUrl} alt={CURRENT_USER_NAME} />}
          <AvatarFallback className="bg-slate-100 text-[#0F2A47] text-xs font-medium">
            {getInitials(CURRENT_USER_NAME)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-[#0F2A47] truncate">
            {CURRENT_USER_NAME}
          </span>
          <span className="text-xs text-slate-500 truncate">
            {CURRENT_USER_TITLE}
          </span>
        </div>
      </div>
    </div>
  );
}

function BrandHeader() {
  const baseUrl = (import.meta as any).env?.BASE_URL ?? "/";
  const logoSrc = `${baseUrl}urgent-dental-logo.png`;
  return (
    <div className="h-16 flex items-center px-6 border-b border-slate-200 shrink-0">
      <img
        src={logoSrc}
        alt="Urgent Dental"
        className="h-10 w-auto object-contain"
      />
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  const currentLabel = findCurrentLabel(location) || "Ideal Week";
  // Page title in the navy bar is intentionally only shown for Ideal Week.
  const showTitle = location === "/ideal-week" || location === "/";

  const baseUrl = (import.meta as any).env?.BASE_URL ?? "/";
  const logoSrc = `${baseUrl}urgent-dental-logo.png`;

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Full-width navy top bar */}
      <header className="h-16 bg-[#0F2A47] border-b border-[#0a1e33] shadow-sm flex items-stretch shrink-0 z-20">
        {/* Brand block — aligned with sidebar width on desktop.
            The logo's tooth/cross icon uses navy strokes, so we sit it on a
            white pill to stay legible against the navy header. */}
        <div className="hidden md:flex w-64 items-center px-3 border-r border-white/10 shrink-0">
          <div className="flex items-center bg-white rounded-md px-3 py-1.5 shadow-sm">
            <img
              src={logoSrc}
              alt="Urgent Dental"
              className="h-9 w-auto object-contain shrink-0"
            />
          </div>
        </div>

        {/* Mobile: hamburger + condensed brand */}
        <div className="md:hidden flex items-center gap-2 px-3 flex-1 min-w-0">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation"
                className="p-2 -ml-2 rounded-md text-slate-300 hover:text-white hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-72 flex flex-col bg-white text-slate-700 border-r border-slate-200"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <BrandHeader />
              <NavList
                location={location}
                onNavigate={() => setDrawerOpen(false)}
              />
              <UserBadge />
            </SheetContent>
          </Sheet>
          <div className="flex items-center bg-white rounded-md px-2 py-1 shadow-sm shrink-0">
            <img
              src={logoSrc}
              alt="Urgent Dental"
              className="h-7 w-auto object-contain"
            />
          </div>
          {showTitle && (
            <span className="font-semibold text-white text-sm tracking-tight truncate">
              {currentLabel}
            </span>
          )}
        </div>

        {/* Desktop: page title (Ideal Week only) + center slot */}
        <div className="hidden md:flex items-center gap-6 px-8 flex-1 min-w-0">
          {showTitle && (
            <h1 className="text-xl font-semibold text-white tracking-tight truncate shrink-0">
              {currentLabel}
            </h1>
          )}
          <div
            id="header-actions"
            className="flex items-center justify-center flex-1 min-w-0"
          />
        </div>

        {/* Right: mobile action slot + bell */}
        <div className="flex items-center justify-end gap-2 md:gap-3 px-3 sm:px-4 md:px-6 shrink-0">
          <div
            id="header-actions-mobile"
            className="md:hidden flex items-center"
          />
          <button
            className="relative p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-[#D62828] border-2 border-[#0F2A47]" />
          </button>
        </div>
      </header>

      {/* Sidebar + main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Persistent sidebar — md and up — White chrome */}
        <aside className="hidden md:flex w-64 bg-white text-slate-700 border-r border-slate-200 flex-col shrink-0 z-10">
          <NavList location={location} />
          <UserBadge />
        </aside>

        {/* Main column */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-auto p-3 sm:p-4">
            <div className="max-w-6xl mx-auto space-y-4">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
