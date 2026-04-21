import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  Building2,
  LayoutDashboard,
  Megaphone,
  Users,
  Bell,
  Zap,
  CalendarCheck,
  Network,
  Menu,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/ideal-week", label: "Ideal Week", icon: CalendarCheck },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizations", label: "EDGE", icon: Building2 },
  { href: "/urgent-dental", label: "Urgent Dental", icon: Zap },
  { href: "/org-chart", label: "Practice Organization Chart", icon: Network },
  { href: "/direct-reports", label: "Direct Reports", icon: Users },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
];

function NavList({
  location,
  onNavigate,
}: {
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 px-3 space-y-1">
      {navItems.map((item) => {
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

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  const currentLabel =
    navItems.find((i) => i.href === location)?.label || "Dashboard";

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
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="max-w-6xl mx-auto space-y-4">{children}</div>
        </div>
      </main>
    </div>
  );
}
