import {
  Bell,
  CalendarCheck,
  Building2,
  ListChecks,
  Users,
  Calendar,
  Plus,
} from "lucide-react";

const NAVY = "#0F2A47";
const RED = "#D62828";

function NavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 mx-2 my-0.5 px-3 py-2 rounded-md text-[13px] ${
        active
          ? "bg-slate-100 text-[#0F2A47] font-semibold"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${active ? "text-[#D62828]" : "text-slate-500"}`}
        strokeWidth={active ? 2.5 : 2}
      />
      <span>{label}</span>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">
        {label}
      </div>
      <div className="text-3xl font-bold text-[#0F2A47] tabular-nums leading-tight mt-0.5">
        {value}
      </div>
    </div>
  );
}

function Row({
  item,
  owner,
  due,
  dueRed = false,
}: {
  item: string;
  owner: string;
  due: string;
  dueRed?: boolean;
}) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/60">
      <td className="px-4 py-2.5 text-[13px] text-slate-800">{item}</td>
      <td className="px-4 py-2.5 text-[13px] text-slate-600">{owner}</td>
      <td
        className={`px-4 py-2.5 text-[13px] font-medium ${
          dueRed ? "text-[#D62828]" : "text-slate-600"
        }`}
      >
        {due}
      </td>
    </tr>
  );
}

export function JakartaSans() {
  return (
    <div className="font-['Plus_Jakarta_Sans'] bg-slate-50" style={{ minHeight: 900 }}>
      {/* Navy top bar */}
      <header
        className="h-14 flex items-stretch border-b"
        style={{ backgroundColor: NAVY, borderColor: "#0a1e33" }}
      >
        <div className="w-[200px] flex items-center gap-2.5 px-4 border-r border-white/10">
          <div className="h-7 w-7 rounded-md bg-white flex items-center justify-center shrink-0">
            <span
              className="font-bold text-[10px] tracking-tight"
              style={{ color: NAVY }}
            >
              EDG
            </span>
          </div>
          <div className="text-white text-[10px] leading-tight font-semibold tracking-[0.1em] uppercase">
            Emergency
            <br />
            Dental Group
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center pr-3">
          <button className="relative p-2 text-slate-300 hover:bg-white/10 hover:text-white rounded-full">
            <Bell className="h-4 w-4" />
            <span
              className="absolute top-1 right-1 h-2 w-2 rounded-full"
              style={{ backgroundColor: RED, border: `1.5px solid ${NAVY}` }}
            />
          </button>
        </div>
      </header>

      <div className="flex" style={{ minHeight: 846 }}>
        {/* Sidebar */}
        <aside className="w-[200px] bg-white border-r border-slate-200 py-3 text-slate-700">
          <NavItem icon={CalendarCheck} label="Ideal Week" />
          <NavItem icon={Building2} label="EDGE" />
          <NavItem icon={ListChecks} label="Action Items" active />
          <NavItem icon={Users} label="Team" />
          <NavItem icon={Calendar} label="Meetings" />
        </aside>

        {/* Main */}
        <main className="flex-1 p-7">
          <div className="mb-5">
            <h1
              className="text-[32px] font-bold tracking-tight leading-tight"
              style={{ color: NAVY }}
            >
              Action Items
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track and manage what's on deck for this week.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <KPI label="Open" value="8" />
            <KPI label="Due This Week" value="3" />
            <KPI label="Completed" value="12" />
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>
                My Action Items
              </h2>
              <button
                className="text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-red-50"
                style={{ color: RED }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Action Item
              </button>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-[0.08em]">
                <tr>
                  <th className="text-left font-semibold px-4 py-2">Item</th>
                  <th className="text-left font-semibold px-4 py-2 w-32">
                    Owner
                  </th>
                  <th className="text-left font-semibold px-4 py-2 w-20">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody>
                <Row
                  item="Strategy Meeting Prep — plan your talking points"
                  owner="Brooks Paine"
                  due="Apr 23"
                  dueRed
                />
                <Row
                  item="Invite your team to Elite"
                  owner="Brooks Paine"
                  due="Apr 23"
                  dueRed
                />
                <Row
                  item="Generate a KRA for Mariah"
                  owner="Brooks Paine"
                  due="Apr 29"
                />
                <Row
                  item="Schedule first 1-on-1 with Mariah"
                  owner="Brooks Paine"
                  due="May 2"
                />
              </tbody>
            </table>
          </div>

          <div className="mt-5 text-[13px] text-slate-600 max-w-prose leading-relaxed">
            <span className="font-semibold" style={{ color: NAVY }}>
              The quick brown fox
            </span>{" "}
            jumps over the lazy dog. Numerals 0123456789 · $1,284.50 · Apr 27,
            2026.
          </div>

          <div className="mt-4 text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-400">
            Font: Plus Jakarta Sans — friendly geometric sans
          </div>
        </main>
      </div>
    </div>
  );
}
