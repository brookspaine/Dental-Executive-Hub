import React from "react";
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Users,
  Calendar,
  BookOpen,
  Search,
  Bell,
  ChevronDown,
  MoreVertical,
  Clock,
  ArrowUpRight,
  Stethoscope,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Editorial() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0F2A47] font-sans flex selection:bg-[#D62828] selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#0F2A47]/10 flex flex-col bg-[#FAF7F2] z-10 shrink-0">
        <div className="h-20 flex items-center px-8 border-b border-[#0F2A47]/10">
          <img src="/__mockup/images/edg-logo.jpg" alt="Emergency Dental Group" className="h-8 object-contain mix-blend-multiply" />
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-[#0F2A47]/50 mb-4 px-4">Overview</div>
          <NavItem icon={<LayoutDashboard size={18} strokeWidth={1.5} />} label="Dashboard" active />
          <NavItem icon={<Target size={18} strokeWidth={1.5} />} label="EDGE" />
          <NavItem icon={<CheckSquare size={18} strokeWidth={1.5} />} label="Action Items" badge="17" />
          
          <div className="text-[10px] uppercase tracking-widest font-semibold text-[#0F2A47]/50 mt-8 mb-4 px-4">Organization</div>
          <NavItem icon={<Users size={18} strokeWidth={1.5} />} label="Team" />
          <NavItem icon={<Calendar size={18} strokeWidth={1.5} />} label="Meetings" />
          <NavItem icon={<BookOpen size={18} strokeWidth={1.5} />} label="The EDGE Way" />
        </nav>

        <div className="p-4 border-t border-[#0F2A47]/10">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#0F2A47]/5 transition-colors cursor-pointer">
            <Avatar className="h-8 w-8 ring-1 ring-[#0F2A47]/10">
              <AvatarImage src="https://i.pravatar.cc/150?u=brooks" />
              <AvatarFallback className="bg-[#0F2A47] text-white text-xs">BP</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Brooks Paine</p>
              <p className="text-xs text-[#0F2A47]/60 truncate">CEO</p>
            </div>
            <MoreVertical size={16} className="text-[#0F2A47]/40" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 px-10 flex items-center justify-between border-b border-[#0F2A47]/10 bg-[#FAF7F2]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-8">
            <h1 className="font-serif text-2xl font-light tracking-tight">Morning Report</h1>
            <div className="h-4 w-px bg-[#0F2A47]/20" />
            <p className="text-sm text-[#0F2A47]/60">Tuesday, October 24</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F2A47]/40 group-focus-within:text-[#D62828] transition-colors" />
              <input 
                type="text" 
                placeholder="Search records..." 
                className="pl-9 pr-4 py-2 bg-transparent border-b border-[#0F2A47]/20 focus:border-[#D62828] outline-none text-sm w-64 transition-colors placeholder:text-[#0F2A47]/40"
              />
            </div>
            <button className="relative p-2 text-[#0F2A47]/60 hover:text-[#0F2A47] transition-colors">
              <Bell size={20} strokeWidth={1.5} />
              <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-[#D62828] ring-2 ring-[#FAF7F2]" />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12">
          
          {/* KPIs */}
          <section>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="font-serif text-xl mb-2">Practice Performance</h2>
                <div className="h-0.5 w-12 bg-[#D62828]" />
              </div>
              <button className="text-sm text-[#0F2A47]/60 hover:text-[#D62828] flex items-center gap-1 transition-colors group">
                View Full Report <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-6">
              <KpiCard title="Production MTD" value="$148,720" trend="+12.4%" subtext="vs last month" />
              <KpiCard title="New Patients" value="42" trend="+5" subtext="this week" />
              <KpiCard title="Team Capacity" value="92%" trend="-2%" trendDown subtext="optimal: 85-90%" />
              <KpiCard title="Open Action Items" value="17" subtext="3 high priority" />
            </div>
          </section>

          <div className="grid grid-cols-3 gap-12">
            {/* Main Column */}
            <div className="col-span-2 space-y-12">
              
              {/* Action Items */}
              <section>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-xl mb-2">Needs Attention</h2>
                    <div className="h-0.5 w-12 bg-[#D62828]" />
                  </div>
                </div>
                
                <div className="bg-white border border-[#0F2A47]/10 rounded-xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-[#0F2A47]/5">
                    <ActionRow 
                      title="Finalize Q4 Marketing Budget" 
                      source="L10 Meeting" 
                      owner="Brooks Paine" 
                      dueDate="Today" 
                      priority="high"
                    />
                    <ActionRow 
                      title="Review Dr. Smith's Associate Contract" 
                      source="1:1" 
                      owner="Sarah Jenkins" 
                      dueDate="Tomorrow" 
                    />
                    <ActionRow 
                      title="Approve new equipment purchase for Room 4" 
                      source="Operations" 
                      owner="Brooks Paine" 
                      dueDate="Oct 26" 
                    />
                    <ActionRow 
                      title="Update quarterly goals in EDGE" 
                      source="Quarterly Planning" 
                      owner="Leadership Team" 
                      dueDate="Oct 31" 
                    />
                  </div>
                </div>
              </section>

              {/* Progress Visual */}
              <section>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-xl mb-2">Quarterly Goals Progress</h2>
                    <div className="h-0.5 w-12 bg-[#D62828]" />
                  </div>
                </div>
                
                <div className="bg-white border border-[#0F2A47]/10 rounded-xl p-8 shadow-sm">
                  <div className="space-y-8">
                    <GoalRow title="Open 2 New Locations" progress={50} value="1/2" />
                    <GoalRow title="Increase Case Acceptance to 75%" progress={85} value="71%" />
                    <GoalRow title="Hire Regional Operations Manager" progress={20} value="Sourcing" />
                  </div>
                </div>
              </section>

            </div>

            {/* Sidebar Column */}
            <div className="space-y-12">
              
              {/* Schedule */}
              <section>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-xl mb-2">Today's Schedule</h2>
                    <div className="h-0.5 w-12 bg-[#D62828]" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <MeetingCard 
                    time="09:00 AM" 
                    title="Leadership L10" 
                    type="meeting"
                    duration="90m"
                  />
                  <MeetingCard 
                    time="11:30 AM" 
                    title="Clinic Walkthrough" 
                    type="focus"
                    duration="60m"
                  />
                  <MeetingCard 
                    time="01:00 PM" 
                    title="1:1 with Regional Director" 
                    type="meeting"
                    duration="45m"
                  />
                  <MeetingCard 
                    time="03:00 PM" 
                    title="Financial Review" 
                    type="review"
                    duration="60m"
                  />
                </div>
              </section>
              
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, badge }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string }) {
  return (
    <button 
      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all group
        ${active 
          ? 'bg-white text-[#D62828] shadow-sm border border-[#0F2A47]/5 font-medium' 
          : 'text-[#0F2A47]/70 hover:bg-[#0F2A47]/5 hover:text-[#0F2A47]'
        }`}
    >
      <div className="flex items-center gap-3">
        <span className={`${active ? 'text-[#D62828]' : 'text-[#0F2A47]/50 group-hover:text-[#0F2A47]/80'} transition-colors`}>
          {icon}
        </span>
        <span className="text-sm">{label}</span>
      </div>
      {badge && (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full 
          ${active ? 'bg-[#D62828]/10 text-[#D62828]' : 'bg-[#0F2A47]/10 text-[#0F2A47]/70'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function KpiCard({ title, value, trend, subtext, trendDown }: { title: string, value: string, trend?: string, subtext: string, trendDown?: boolean }) {
  return (
    <div className="bg-white border border-[#0F2A47]/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group cursor-default relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight size={16} className="text-[#0F2A47]/30" />
      </div>
      <h3 className="text-sm font-medium text-[#0F2A47]/60 mb-4">{title}</h3>
      <div className="font-serif text-4xl text-[#0F2A47] mb-2">{value}</div>
      <div className="flex items-center gap-2">
        {trend && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
            trendDown ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {trend}
          </span>
        )}
        <span className="text-xs text-[#0F2A47]/50">{subtext}</span>
      </div>
    </div>
  );
}

function ActionRow({ title, source, owner, dueDate, priority }: { title: string, source: string, owner: string, dueDate: string, priority?: 'high' }) {
  return (
    <div className="group flex items-center justify-between p-4 hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer">
      <div className="flex items-start gap-4">
        <button className="mt-1 h-5 w-5 rounded border border-[#0F2A47]/20 flex items-center justify-center text-transparent hover:border-[#D62828] hover:text-[#D62828] transition-colors">
          <CheckSquare size={14} strokeWidth={2} />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-medium ${priority === 'high' ? 'text-[#D62828]' : 'text-[#0F2A47]'}`}>{title}</p>
            {priority === 'high' && <span className="w-1.5 h-1.5 rounded-full bg-[#D62828]" />}
          </div>
          <div className="flex items-center gap-3 text-xs text-[#0F2A47]/50">
            <span className="flex items-center gap-1"><Target size={12} /> {source}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-[#0F2A47]/30" />
            <span className="flex items-center gap-1"><Users size={12} /> {owner}</span>
          </div>
        </div>
      </div>
      <div className="text-xs font-medium text-[#0F2A47]/70 bg-[#0F2A47]/5 px-2 py-1 rounded-md group-hover:bg-white group-hover:shadow-sm transition-all">
        {dueDate}
      </div>
    </div>
  );
}

function GoalRow({ title, progress, value }: { title: string, progress: number, value: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#0F2A47]">{title}</span>
        <span className="font-serif text-[#0F2A47]">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-[#0F2A47]/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#D62828] rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
}

function MeetingCard({ time, title, type, duration }: { time: string, title: string, type: 'meeting' | 'focus' | 'review', duration: string }) {
  const isNow = time === "09:00 AM";
  
  return (
    <div className={`relative pl-4 py-3 pr-4 rounded-xl border ${
      isNow 
        ? 'bg-white border-[#D62828]/20 shadow-sm' 
        : 'bg-transparent border-transparent hover:bg-white hover:border-[#0F2A47]/10'
    } transition-all cursor-pointer group`}>
      {/* Timeline connector visual */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${
        isNow ? 'bg-[#D62828]' : 'bg-[#0F2A47]/10 group-hover:bg-[#0F2A47]/30'
      }`} />
      
      <div className="flex justify-between items-start mb-1">
        <span className={`text-xs font-semibold ${isNow ? 'text-[#D62828]' : 'text-[#0F2A47]/60'}`}>
          {time}
        </span>
        <span className="text-[10px] text-[#0F2A47]/40 flex items-center gap-1">
          <Clock size={10} /> {duration}
        </span>
      </div>
      <h4 className="text-sm font-medium text-[#0F2A47] mb-1.5">{title}</h4>
      <div className="flex items-center gap-2">
        {type === 'meeting' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal bg-blue-50 text-blue-700 border-blue-200">Video Call</Badge>}
        {type === 'focus' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal bg-purple-50 text-purple-700 border-purple-200">On-site</Badge>}
        {type === 'review' && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal bg-amber-50 text-amber-700 border-amber-200">Review</Badge>}
      </div>
    </div>
  );
}