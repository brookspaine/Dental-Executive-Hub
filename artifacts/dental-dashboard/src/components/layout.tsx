import { Link, useLocation } from "wouter";
import { Activity, Building2, LayoutDashboard, Megaphone, Users, Bell, Zap, CalendarCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/ideal-week", label: "Ideal Week", icon: CalendarCheck },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizations", label: "EDGE", icon: Building2 },
  { href: "/urgent-dental", label: "Urgent Dental", icon: Zap },
  { href: "/direct-reports", label: "Direct Reports", icon: Users },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
            <Activity className="h-6 w-6" />
            <span>Brooks Paine</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Jane Doe</span>
              <span className="text-xs text-muted-foreground">Chief Executive Officer</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 border-b bg-card grid grid-cols-3 items-center px-6">
          <h1 className="text-lg font-semibold tracking-tight">
            {navItems.find((i) => i.href === location)?.label || "Dashboard"}
          </h1>
          <div id="header-actions" className="flex items-center justify-center" />
          <div className="flex items-center justify-end gap-3">
            <button className="relative p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-card" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-6xl mx-auto space-y-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
