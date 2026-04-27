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
const SERIF = "font-['Source_Serif_4']";
const SANS = "font-['Inter']";

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
      className={`flex items-center gap-2.5 mx-2 my-0.5 px-3 py-2 rounded-md text-[13px] ${SANS} ${
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
      <div
        className={`${SANS} text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]`}
      >
        {label}
      </div>
      <div
        className={`${SERIF} text-[34px] font-semibold text-[#0F2A47] tabular-nums leading-tight mt-0.5`}
      >
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
      <td className={`${SANS} px-4 py-2.5 text-[13px] text-slate-800`}>
        {item}
      </td>
      <td className={`${SANS} px-4 py-2.5 text-[13px] text-slate-600`}>
        {owner}
      </td>
      <td
        className={`${SANS} px-4 py-2.5 text-[13px] font-medium ${
          dueRed ? "text-[#D62828]" : "text-slate-600"
        }`}
      >
        {due}
      </td>
    </tr>
  );
}

export function SerifEditorial() {
  return (
    <div className={`${SANS} bg-slate-50`} style={{ minHeight: 900 }}>
      {/* Navy top bar */}
      <header
        className="h-14 flex items-stretch border-b"
        style={{ backgroundColor: NAVY, borderColor: "#0a1e33" }}
      >
        <div className="w-[200px] flex items-center gap-2.5 px-4 border-r border-white/10">
          <div className="h-7 w-7 rounded-md bg-white flex items-center justify-center shrink-0">
            <span
              className={`${SERIF} font-bold text-[12px]`}
              style={{ color: NAVY }}
            >
              E
            </span>
          </div>
          <div
            className={`${SERIF} text-white text-[12px] leading-tight font-semibold tracking-[0.02em]`}
          >
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
              className={`${SERIF} text-[36px] font-semibold tracking-tight leading-[1.05]`}
              style={{ color: NAVY }}
            >
              Action Items
            </h1>
            <p className={`${SANS} text-sm text-slate-500 mt-1.5`}>
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
              <h2
                className={`${SERIF} text-base font-semibold`}
                style={{ color: NAVY }}
              >
                My Action Items
              </h2>
              <button
                className={`${SANS} text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-red-50`}
                style={{ color: RED }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Action Item
              </button>
            </div>
            <table className="w-full">
              <thead
                className={`${SANS} bg-slate-50 text-slate-500 text-[10px] uppercase tracking-[0.08em]`}
              >
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

          <div
            className={`${SANS} mt-5 text-[13px] text-slate-600 max-w-prose leading-relaxed`}
          >
            <span
              className={`${SERIF} text-[15px] font-semibold`}
              style={{ color: NAVY }}
            >
              The quick brown fox
            </span>{" "}
            jumps over the lazy dog. Numerals 0123456789 · $1,284.50 · Apr 27,
            2026.
          </div>

          <div
            className={`${SANS} mt-4 text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-400`}
          >
            Font: Source Serif 4 headings + Inter body — editorial trust
          </div>
        </main>
      </div>
    </div>
  );
}
