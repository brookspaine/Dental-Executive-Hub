import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  Building2,
  LayoutDashboard,
  Users,
  Bell,
  Zap,
  CalendarCheck,
  Network,
  Menu,
  ChevronDown,
  CalendarDays,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type NavLeaf = { href: string; label: string; icon: any };
type NavGroup = {
  label: string;
  icon: any;
  children: { href: string; label: string }[];
};
type NavItem = NavLeaf | NavGroup;

const navItems: NavItem[] = [
  { href: "/ideal-week", label: "Ideal Week", icon: CalendarCheck },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizations", label: "EDGE", icon: Building2 },
  { href: "/urgent-dental", label: "Urgent Dental", icon: Zap },
  { href: "/org-chart", label: "Practice Organization Chart", icon: Network },
  {
    label: "Team",
    icon: Users,
    children: [
      { href: "/team/reports", label: "Team Reports" },
      { href: "/team/my-reports", label: "My Reports" },
      { href: "/team/fill-out-a-report", label: "Fill Out a Report" },
      { href: "/direct-reports", label: "Manage Company" },
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
    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  hasActiveChild
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-expanded={open}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    open ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>
              {open && (
                <div className="mt-1 ml-7 space-y-1 border-l pl-3">
                  {item.children.map((child) => {
                    const childActive = location === child.href;
                    return (
                      <Link key={child.href} href={child.href}>
                        <span
                          onClick={onNavigate}
                          className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                            childActive
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserBadge() {
  return (
    <div className="p-4 border-t">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="shrink-0">
          <AvatarImage src="" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate">Brooks Paine</span>
          <span className="text-xs text-muted-foreground truncate">
            Chief Executive Officer
          </span>
        </div>
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
        <Activity className="h-6 w-6" />
        <span>Brooks Paine</span>
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
    navItems.map((i) => flattenLabel(i, location)).find((l) => l) || "Dashboard";

  const hideTopHeader = shouldHideTopHeader(location);

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Persistent sidebar — md and up */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-col shrink-0">
        <BrandHeader />
        <NavList location={location} />
        <UserBadge />
      </aside>

      {/* Main column */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {hideTopHeader ? (
          <header className="h-14 border-b bg-card flex items-center gap-2 px-3 sm:px-4 md:hidden">
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
              <SheetContent side="left" className="p-0 w-72 flex flex-col">
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
          <header className="h-14 border-b bg-card flex items-center gap-2 px-3 sm:px-4 md:px-6 md:grid md:grid-cols-3">
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
                <SheetContent side="left" className="p-0 w-72 flex flex-col">
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
            <h1 className="hidden md:block text-lg font-semibold tracking-tight truncate">
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
              <button className="relative p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-card" />
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
