import React, { useState } from "react";
import {
  LayoutDashboard,
  Activity,
  ListTodo,
  Users,
  Calendar,
  BookOpen,
  Search,
  Bell,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Bold() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div 
      className="min-h-screen bg-[#F5F7FA] text-[#0F2A47]" 
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        .font-display {
          font-family: 'Bricolage Grotesque', sans-serif;
        }
        .edg-card {
          background-color: white;
          border-radius: 1rem;
          box-shadow: 0 4px 24px rgba(15, 42, 71, 0.04);
          border: 1px solid rgba(15, 42, 71, 0.06);
          overflow: hidden;
        }
        .edg-red-card {
          background-color: #D62828;
          color: white;
          border-radius: 1rem;
          box-shadow: 0 8px 32px rgba(214, 40, 40, 0.2);
          overflow: hidden;
        }
      `}</style>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-72 bg-[#0F2A47] text-white flex flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-lg">
            <img src="/__mockup/images/edg-logo.jpg" alt="EDG Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-xl leading-tight tracking-tight">Emergency<br/><span className="text-[#89A1B8]">Dental Group</span></span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {[
            { name: "Dashboard", icon: LayoutDashboard, active: true },
            { name: "EDGE", icon: Activity, active: false },
            { name: "Action Items", icon: ListTodo, active: false, badge: 17 },
            { name: "Team", icon: Users, active: false },
            { name: "Meetings", icon: Calendar, active: false },
            { name: "The EDGE Way", icon: BookOpen, active: false },
          ].map((item) => (
            <a
              key={item.name}
              href="#"
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium ${
                item.active 
                  ? "bg-[#D62828] text-white shadow-md shadow-red-900/20" 
                  : "text-[#89A1B8] hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={item.active ? 2.5 : 2} />
              <span>{item.name}</span>
              {item.badge && (
                <span className="ml-auto bg-white/20 text-white text-xs py-0.5 px-2 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        <div className="p-6">
          <div className="bg-[#163657] rounded-xl p-4 relative overflow-hidden group hover:bg-[#1A4068] transition-colors cursor-pointer">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#D62828] rounded-full opacity-20 blur-2xl group-hover:opacity-40 transition-opacity"></div>
            <h4 className="font-display font-bold text-lg mb-1">Need help?</h4>
            <p className="text-sm text-[#89A1B8] mb-3 leading-tight">Access the leadership playbook and guides.</p>
            <div className="text-sm font-semibold text-[#D62828] flex items-center gap-1">
              View Playbook <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-[#0F2A47]/5 px-8 h-20 flex items-center justify-between">
          <h1 className="font-display font-extrabold text-3xl text-[#0F2A47] tracking-tight">Dashboard</h1>
          
          <div className="flex items-center gap-6">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#89A1B8]" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search metrics, people, meetings..." 
                className="pl-9 bg-[#F5F7FA] border-transparent focus-visible:ring-[#D62828] focus-visible:bg-white h-10 rounded-xl font-medium"
              />
            </div>
            
            <div className="flex items-center gap-4 border-l border-[#0F2A47]/10 pl-6">
              <button className="relative p-2 text-[#0F2A47] hover:bg-[#F5F7FA] rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#D62828] rounded-full border-2 border-white"></span>
              </button>
              
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-[#0F2A47] leading-none">Brooks Paine</p>
                  <p className="text-xs text-[#89A1B8] mt-1">CEO</p>
                </div>
                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                  <AvatarImage src="https://i.pravatar.cc/150?u=brooks" alt="Brooks Paine" />
                  <AvatarFallback className="bg-[#0F2A47] text-white font-bold">BP</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8 max-w-7xl">
          
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="edg-red-card p-6 relative group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white rounded-full opacity-10 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-white/80 font-medium text-sm uppercase tracking-wider">Production MTD</h3>
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="relative z-10">
                <div className="font-display font-extrabold text-4xl tracking-tighter">$148,720</div>
                <div className="mt-2 text-sm text-white/90 font-medium bg-black/20 inline-flex items-center px-2 py-1 rounded-md">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> +12.5% vs last month
                </div>
              </div>
            </div>

            <div className="edg-card p-6 border-t-4 border-t-[#0F2A47]">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[#89A1B8] font-medium text-sm uppercase tracking-wider">New Patients</h3>
                <Users className="w-5 h-5 text-[#0F2A47]" />
              </div>
              <div>
                <div className="font-display font-extrabold text-4xl text-[#0F2A47] tracking-tighter">42</div>
                <div className="mt-2 text-sm text-[#22C55E] font-bold flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> 8 ahead of pace
                </div>
              </div>
            </div>

            <div className="edg-card p-6 border-t-4 border-t-[#D62828]">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[#89A1B8] font-medium text-sm uppercase tracking-wider">Open Action Items</h3>
                <ListTodo className="w-5 h-5 text-[#D62828]" />
              </div>
              <div>
                <div className="font-display font-extrabold text-4xl text-[#D62828] tracking-tighter">17</div>
                <div className="mt-2 text-sm text-[#D62828] font-bold flex items-center">
                  <Clock className="w-3 h-3 mr-1" /> 3 past due
                </div>
              </div>
            </div>

            <div className="edg-card p-6 border-t-4 border-t-[#0F2A47]">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[#89A1B8] font-medium text-sm uppercase tracking-wider">Team Capacity</h3>
                <Activity className="w-5 h-5 text-[#0F2A47]" />
              </div>
              <div>
                <div className="font-display font-extrabold text-4xl text-[#0F2A47] tracking-tighter">92%</div>
                <div className="w-full bg-[#F5F7FA] h-2 rounded-full mt-4 overflow-hidden">
                  <div className="bg-[#0F2A47] h-full rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Action Items & Chart */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Action Items */}
              <div className="edg-card flex flex-col h-full">
                <div className="p-6 border-b border-[#0F2A47]/5 flex justify-between items-center">
                  <h2 className="font-display font-bold text-xl text-[#0F2A47]">Priority Action Items</h2>
                  <Button variant="ghost" className="text-[#D62828] hover:text-[#B21F1F] hover:bg-red-50 font-bold px-3 h-8">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="p-0">
                  {[
                    { title: "Finalize Q3 Equipment Budget", source: "Leadership L10", due: "Today", owner: "Brooks P.", status: "urgent" },
                    { title: "Review Dr. Smith onboarding plan", source: "Team Sync", due: "Tomorrow", owner: "Sarah M.", status: "warning" },
                    { title: "Approve updated hygiene protocols", source: "Clinical Review", due: "Sep 24", owner: "Dr. Evans", status: "normal" },
                    { title: "Quarterly lease renegotiation prep", source: "Finance", due: "Sep 28", owner: "Brooks P.", status: "normal" },
                    { title: "Schedule site visit for Clinic #4", source: "Expansion", due: "Oct 2", owner: "Mike T.", status: "normal" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 border-b border-[#0F2A47]/5 last:border-0 hover:bg-[#F9FAFB] transition-colors group">
                      <button className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-[#CBD5E1] hover:border-[#D62828] flex items-center justify-center transition-colors group-hover:bg-white">
                        <CheckCircle2 className="w-4 h-4 text-transparent group-hover:text-[#D62828]/20" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#0F2A47] truncate">{item.title}</p>
                        <p className="text-sm text-[#89A1B8] truncate mt-0.5">From: {item.source}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          item.status === 'urgent' ? 'bg-red-100 text-[#D62828]' : 
                          item.status === 'warning' ? 'bg-orange-100 text-orange-700' : 
                          'bg-[#F5F7FA] text-[#64748B]'
                        }`}>
                          {item.due}
                        </span>
                        <span className="text-xs font-medium text-[#0F2A47]">{item.owner}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Production Progress */}
              <div className="edg-card p-6">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-display font-bold text-xl text-[#0F2A47]">Monthly Target Progress</h2>
                  <MoreHorizontal className="text-[#89A1B8]" />
                </div>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-[#0F2A47]">Clinic #1 - Downtown</span>
                      <span className="font-bold text-[#0F2A47]">$85k / $100k</span>
                    </div>
                    <div className="w-full bg-[#F5F7FA] h-3 rounded-full overflow-hidden">
                      <div className="bg-[#0F2A47] h-full rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-[#0F2A47]">Clinic #2 - Westside</span>
                      <span className="font-bold text-[#0F2A47]">$42k / $50k</span>
                    </div>
                    <div className="w-full bg-[#F5F7FA] h-3 rounded-full overflow-hidden">
                      <div className="bg-[#D62828] h-full rounded-full" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-[#0F2A47]">Clinic #3 - North</span>
                      <span className="font-bold text-[#0F2A47]">$21k / $40k</span>
                    </div>
                    <div className="w-full bg-[#F5F7FA] h-3 rounded-full overflow-hidden">
                      <div className="bg-[#89A1B8] h-full rounded-full" style={{ width: '52%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Schedule */}
            <div className="space-y-8">
              <div className="edg-card flex flex-col h-full bg-[#0F2A47] text-white">
                <div className="p-6 border-b border-white/10">
                  <h2 className="font-display font-bold text-xl">Today's Schedule</h2>
                  <p className="text-sm text-[#89A1B8] mt-1">September 24, 2024</p>
                </div>
                <div className="p-6 space-y-6 flex-1">
                  
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-[#D62828] ring-4 ring-[#D62828]/20"></div>
                    <div className="absolute left-0.5 top-5 bottom-[-24px] w-0.5 bg-white/10"></div>
                    <p className="text-xs text-[#89A1B8] font-bold mb-1">09:00 AM - 10:30 AM</p>
                    <p className="font-bold text-lg leading-tight">Leadership L10</p>
                    <p className="text-sm text-white/70 mt-1">Boardroom & Zoom</p>
                    <div className="flex -space-x-2 mt-3">
                      {[1,2,3,4].map((i) => (
                        <Avatar key={i} className="w-6 h-6 border-2 border-[#0F2A47]">
                          <AvatarImage src={`https://i.pravatar.cc/150?u=${i}`} />
                        </Avatar>
                      ))}
                    </div>
                  </div>

                  <div className="relative pl-6">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-white/30"></div>
                    <div className="absolute left-0.5 top-5 bottom-[-24px] w-0.5 bg-white/10"></div>
                    <p className="text-xs text-[#89A1B8] font-bold mb-1">11:00 AM - 11:30 AM</p>
                    <p className="font-bold text-lg leading-tight">1-on-1: Sarah M.</p>
                    <p className="text-sm text-white/70 mt-1">Brooks' Office</p>
                  </div>

                  <div className="relative pl-6">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-white/30"></div>
                    <p className="text-xs text-[#89A1B8] font-bold mb-1">02:00 PM - 03:00 PM</p>
                    <p className="font-bold text-lg leading-tight">Financial Review</p>
                    <p className="text-sm text-white/70 mt-1">Zoom</p>
                  </div>

                </div>
                <div className="p-6 pt-0 mt-auto">
                  <Button className="w-full bg-[#D62828] hover:bg-[#B21F1F] text-white rounded-xl h-12 font-bold text-base shadow-lg shadow-[#D62828]/20 transition-all active:scale-[0.98]">
                    Join Current Meeting
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}