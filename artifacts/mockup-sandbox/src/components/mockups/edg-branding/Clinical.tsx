import React, { useState } from "react";
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
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Clock,
  Plus,
  AlertCircle
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function Clinical() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-red-100 selection:text-red-900">
      {/* Sidebar - Deep Navy Chrome */}
      <aside className="w-64 bg-[#0F2A47] text-slate-300 flex flex-col border-r border-[#0a1e33] shadow-xl z-10 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded p-1.5 shadow-sm">
              <img 
                src="/__mockup/images/edg-logo.jpg" 
                alt="Emergency Dental Group" 
                className="h-6 w-auto object-contain"
              />
            </div>
            <span className="font-semibold text-white tracking-tight text-sm leading-tight">
              Emergency<br/>Dental Group
            </span>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-3 px-2">
            Main Menu
          </div>
          <nav className="space-y-1">
            {[
              { name: "Dashboard", icon: LayoutDashboard },
              { name: "EDGE", icon: Target },
              { name: "Action Items", icon: CheckSquare, badge: "17" },
              { name: "Team", icon: Users },
              { name: "Meetings", icon: Calendar },
              { name: "The EDGE Way", icon: BookOpen },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveNav(item.name)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeNav === item.name
                    ? "bg-white/10 text-white"
                    : "hover:bg-white/5 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon 
                    className={`h-4 w-4 ${activeNav === item.name ? "text-[#D62828]" : "text-slate-400"}`} 
                    strokeWidth={activeNav === item.name ? 2.5 : 2} 
                  />
                  {item.name}
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    activeNav === item.name 
                      ? "bg-[#D62828] text-white" 
                      : "bg-white/10 text-slate-300"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="bg-[#0a1e33] rounded-lg p-4">
            <h4 className="text-xs font-semibold text-white mb-1">System Status</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              All systems operational
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Navy Chrome */}
        <header className="h-16 bg-[#0F2A47] border-b border-white/10 flex items-center justify-between px-8 shrink-0 z-0 sticky top-0">
          <h1 className="text-xl font-semibold text-white tracking-tight">Dashboard</h1>
          
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search patients, metrics..." 
                className="w-full pl-9 bg-white/10 border-transparent text-white placeholder:text-slate-400 focus-visible:ring-white/20 text-sm h-9 rounded-md"
              />
            </div>
            
            <div className="flex items-center gap-4 border-l border-white/10 pl-6">
              <button className="relative text-slate-300 hover:text-white transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-[#D62828] border-2 border-[#0F2A47] rounded-full"></span>
              </button>
              
              <button className="flex items-center gap-3 hover:bg-white/5 p-1.5 rounded-md transition-colors text-left">
                <Avatar className="h-8 w-8 border border-white/20">
                  <AvatarFallback className="bg-slate-800 text-white text-xs font-medium">BP</AvatarFallback>
                </Avatar>
                <div className="hidden md:block leading-none">
                  <p className="text-sm font-semibold text-white">Brooks Paine</p>
                  <p className="text-xs text-slate-400">CEO</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1 */}
              <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Production MTD</p>
                      <p className="text-2xl font-bold tracking-tight text-[#0F2A47]">$148,720</p>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-600 font-medium">+12.5%</span>
                    <span className="text-slate-400">vs last month</span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 2 */}
              <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">New Patients</p>
                      <p className="text-2xl font-bold tracking-tight text-[#0F2A47]">42</p>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-600 font-medium">+4</span>
                    <span className="text-slate-400">vs last week</span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 3 */}
              <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Open Action Items</p>
                      <p className="text-2xl font-bold tracking-tight text-[#D62828]">17</p>
                    </div>
                    <div className="p-2 bg-red-50 text-[#D62828] rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#D62828] font-medium">5 Overdue</span>
                    <span className="text-slate-400">needs attention</span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 4 */}
              <Card className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Team Capacity</p>
                      <p className="text-2xl font-bold tracking-tight text-[#0F2A47]">92%</p>
                    </div>
                    <div className="p-2 bg-[#0F2A47]/5 text-[#0F2A47] rounded-lg">
                      <Target className="h-4 w-4" />
                    </div>
                  </div>
                  <Progress value={92} className="h-1.5 mt-2" indicatorClassName="bg-[#0F2A47]" />
                </CardContent>
              </Card>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Action Items */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="rounded-xl border-slate-200 shadow-sm bg-white overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Priority Action Items</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Tasks requiring immediate attention</p>
                    </div>
                    <Button size="sm" className="bg-[#D62828] hover:bg-[#b02121] text-white shadow-sm gap-2 rounded-md">
                      <Plus className="h-4 w-4" /> New Task
                    </Button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[
                      { 
                        title: "Finalize Q3 Marketing Budget for New Clinic", 
                        source: "L10 Leadership Meeting", 
                        due: "Today", 
                        owner: "Brooks Paine", 
                        status: "urgent" 
                      },
                      { 
                        title: "Review associate dentist contract drafts", 
                        source: "Quarterly Planning", 
                        due: "Tomorrow", 
                        owner: "Legal Team", 
                        status: "pending" 
                      },
                      { 
                        title: "Approve updated patient intake forms", 
                        source: "Operations Review", 
                        due: "Oct 12", 
                        owner: "Sarah Jenkins", 
                        status: "pending" 
                      },
                      { 
                        title: "Resolve staffing overlap at Northside location", 
                        source: "Weekly Sync", 
                        due: "Oct 14", 
                        owner: "Marcus Wright", 
                        status: "pending" 
                      },
                      { 
                        title: "Evaluate new X-Ray equipment vendor proposals", 
                        source: "Finance Review", 
                        due: "Oct 15", 
                        owner: "Brooks Paine", 
                        status: "pending" 
                      },
                    ].map((item, i) => (
                      <div key={i} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-start gap-4 group">
                        <div className="mt-0.5">
                          <div className={`h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                            item.status === 'urgent' ? 'border-[#D62828] bg-red-50' : 'border-slate-300 hover:border-[#0F2A47]'
                          }`}>
                            {/* Empty checkbox */}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium truncate ${item.status === 'urgent' ? 'text-[#D62828]' : 'text-slate-900'}`}>
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" /> {item.source}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={`flex items-center gap-1 font-medium ${item.status === 'urgent' ? 'text-[#D62828]' : ''}`}>
                              <Clock className="h-3 w-3" /> {item.due}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px]">
                                {item.owner.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-600 w-24 truncate">{item.owner}</span>
                          </div>
                          <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right Column: Schedule & Visuals */}
              <div className="space-y-8">
                
                {/* Schedule */}
                <Card className="rounded-xl border-slate-200 shadow-sm bg-white">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900">Today's Schedule</h3>
                  </div>
                  <div className="p-5 space-y-5">
                    {[
                      { time: "09:00 AM", title: "Leadership L10 Sync", type: "meeting" },
                      { time: "11:30 AM", title: "1:1 with Clinical Director", type: "one-on-one" },
                      { time: "02:00 PM", title: "Quarterly Review Prep", type: "focus" },
                    ].map((event, i) => (
                      <div key={i} className="flex gap-4 relative">
                        {i !== 2 && (
                          <div className="absolute left-2 top-6 bottom-[-20px] w-[1px] bg-slate-100"></div>
                        )}
                        <div className="w-4 h-4 rounded-full border-[3px] border-white bg-[#0F2A47] shadow-sm z-10 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">{event.time}</p>
                          <p className="text-sm font-medium text-slate-900">{event.title}</p>
                          <Badge variant="secondary" className="mt-2 text-[10px] uppercase tracking-wider bg-slate-100 text-slate-600 hover:bg-slate-100 font-semibold rounded">
                            {event.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                    <button className="text-sm text-[#0F2A47] font-medium hover:underline flex items-center gap-1 w-full justify-center">
                      View full calendar
                    </button>
                  </div>
                </Card>

                {/* Production Target Visual */}
                <Card className="rounded-xl border-slate-200 shadow-sm bg-white overflow-hidden">
                  <div className="p-5 bg-[#0F2A47] text-white">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-semibold text-slate-200">Monthly Target</h3>
                      <Target className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex items-end gap-3 mb-2">
                      <span className="text-3xl font-bold tracking-tight text-white">74%</span>
                      <span className="text-sm text-slate-300 mb-1 leading-none">to goal</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-4 mb-2">
                      <div className="bg-[#D62828] h-2 rounded-full" style={{ width: "74%" }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                      <span>$148.7k actual</span>
                      <span>$200k goal</span>
                    </div>
                  </div>
                </Card>

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
