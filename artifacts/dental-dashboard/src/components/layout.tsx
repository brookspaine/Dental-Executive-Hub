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
  { href: "/organizations", label: "EDGE", icon: Building2 },
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
  { href: "/edge-way", label: "The EDGE Way", icon: Compass },
];

function isGroup(item: NavItem): item is NavGroup {
  return (item as NavGroup).children !== undefined;
}

function flattenLabel(item: NavItem, location: string): string | null {
  if (isGroup(item)) {
    const child = item.children.find((c) => c.href === location);
    return child ? child.label : null;
  }
  return item.href === location ? item.label : null;
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  hasActiveChild
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
                }`}
                aria-expanded={open}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 ${hasActiveChild ? "text-[#D62828]" : "text-slate-400"}`}
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
                <div className="mt-1 ml-7 space-y-1 border-l border-white/10 pl-3">
                  {item.children.map((child) => {
                    const childActive = location === child.href;
                    return (
                      <Link key={child.href} href={child.href}>
                        <span
                          onClick={onNavigate}
                          className={`block px-3 py-1.5 rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                            childActive
                              ? "bg-white/10 text-white font-medium"
                              : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-slate-100"
              }`}
            >
              <item.icon
                className={`h-4 w-4 shrink-0 ${isActive ? "text-[#D62828]" : "text-slate-400"}`}
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
    <div className="p-4 border-t border-white/10">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="shrink-0 border border-white/20">
          {photoUrl && <AvatarImage src={photoUrl} alt={CURRENT_USER_NAME} />}
          <AvatarFallback className="bg-slate-800 text-white text-xs font-medium">
            {getInitials(CURRENT_USER_NAME)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate">
            {CURRENT_USER_NAME}
          </span>
          <span className="text-xs text-slate-400 truncate">
            {CURRENT_USER_TITLE}
          </span>
        </div>
      </div>
    </div>
  );
}

function BrandHeader() {
  const baseUrl = (import.meta as any).env?.BASE_URL ?? "/";
  const logoSrc = `${baseUrl}edg-logo.jpg`;
  return (
    <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="bg-white rounded p-1.5 shadow-sm shrink-0">
          <img
            src={logoSrc}
            alt="Emergency Dental Group"
            className="h-6 w-auto object-contain"
          />
        </div>
        <span className="font-semibold text-white tracking-tight text-sm leading-tight truncate">
          Emergency
          <br />
          Dental Group
        </span>
      </div>
    </div>
  );
}

function shouldHideTopHeader(location: string): boolean {
  if (location.startsWith("/organizations")) return true;
  if (location.startsWith("/urgent-dental")) return true;
  if (location.startsWith("/org-chart")) return true;
  if (location.startsWith("/team")) return true;
  if (location.startsWith("/direct-reports")) return true;
  if (location.startsWith("/action-items")) return true;
  if (location.startsWith("/meetings")) return true;
  return false;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  const currentLabel =
    navItems.map((i) => flattenLabel(i, location)).find((l) => l) || "Ideal Week";

  const hideTopHeader = shouldHideTopHeader(location);

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Persistent sidebar — md and up — Navy chrome */}
      <aside className="hidden md:flex w-64 bg-[#0F2A47] text-slate-300 border-r border-[#0a1e33] shadow-xl flex-col shrink-0 z-10">
        <BrandHeader />
        <NavList location={location} />
        <UserBadge />
      </aside>

      {/* Main column */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {hideTopHeader ? (
          <header className="h-14 border-b border-white/10 bg-[#0F2A47] text-white flex items-center gap-2 px-3 sm:px-4 md:hidden">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open navigation"
                  className="p-2 -ml-2 rounded-md text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-72 flex flex-col bg-[#0F2A47] text-slate-300 border-r border-[#0a1e33]"
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
            <div
              id="header-actions-mobile"
              className="ml-auto flex items-center"
            />
          </header>
        ) : (
          <header className="h-16 border-b border-white/10 bg-[#0F2A47] text-white flex items-center gap-2 px-3 sm:px-4 md:px-8 md:grid md:grid-cols-3">
            {/* Mobile: hamburger + brand */}
            <div className="flex items-center gap-2 md:hidden min-w-0 flex-1">
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open navigation"
                    className="p-2 -ml-2 rounded-md hover:bg-muted"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="p-0 w-72 flex flex-col bg-[#0F2A47] text-slate-300 border-r border-[#0a1e33]"
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
              <h1 className="text-base font-semibold tracking-tight truncate">
                {currentLabel}
              </h1>
            </div>

            {/* Desktop: title left, slot center */}
            <h1 className="hidden md:block text-xl font-semibold tracking-tight text-white truncate">
              {currentLabel}
            </h1>
            <div
              id="header-actions"
              className="hidden md:flex items-center justify-center"
            />

            {/* Right side: actions slot (mobile) + bell */}
            <div className="flex items-center justify-end gap-2 md:gap-3">
              <div
                id="header-actions-mobile"
                className="md:hidden flex items-center"
              />
              <button className="relative p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-[#D62828] border-2 border-[#0F2A47]" />
              </button>
            </div>
          </header>
        )}
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="max-w-6xl mx-auto space-y-4">{children}</div>
        </div>
      </main>
    </div>
  );
}
