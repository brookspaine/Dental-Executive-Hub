import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary,
  useListDailyTop3,
  useCreateDailyTop3,
  useUpdateDailyTop3,
  useDeleteDailyTop3,
  useGetOrgPerformance,
  useGetRecentActivity,
  useListAnnouncements,
  getListDailyTop3QueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  DollarSign,
  UserCheck,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function Dashboard() {
  const queryClient = useQueryClient();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: top3, isLoading: top3Loading } = useListDailyTop3();
  const { data: orgPerf } = useGetOrgPerformance();
  const { data: activity } = useGetRecentActivity({ limit: 8 });
  const { data: announcements } = useListAnnouncements();

  const createTop3 = useCreateDailyTop3();
  const updateTop3 = useUpdateDailyTop3();
  const deleteTop3 = useDeleteDailyTop3();

  const [newTask, setNewTask] = useState("");

  const handleAddTask = () => {
    if (!newTask.trim() || (top3 && top3.length >= 3)) return;
    createTop3.mutate(
      { data: { title: newTask.trim(), priority: (top3?.length ?? 0) + 1 } },
      {
        onSuccess: () => {
          setNewTask("");
          queryClient.invalidateQueries({ queryKey: getListDailyTop3QueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
      }
    );
  };

  const handleToggle = (id: number, completed: boolean) => {
    updateTop3.mutate(
      { id, data: { completed: !completed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDailyTop3QueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteTop3.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDailyTop3QueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
      }
    );
  };

  const kpis = summary
    ? [
        {
          label: "Total Revenue",
          value: `$${(summary.totalMonthlyRevenue / 1000).toFixed(0)}K`,
          change: summary.revenueChangePercent,
          icon: DollarSign,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          label: "Total Patients",
          value: summary.totalPatients.toLocaleString(),
          change: summary.patientChangePercent,
          icon: UserCheck,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Organizations",
          value: `${summary.activeOrganizations}/${summary.totalOrganizations}`,
          icon: Building2,
          color: "text-violet-600",
          bg: "bg-violet-50",
        },
        {
          label: "Direct Reports",
          value: summary.totalDirectReports.toString(),
          icon: Users,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
      ]
    : [];

  const recentAnnouncements = announcements?.slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Good morning, Dr. Doe</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Here is what is happening across your practices today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                      <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                      {kpi.change !== undefined && (
                        <div className="flex items-center gap-1 mt-1">
                          {kpi.change >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span
                            className={`text-xs font-medium ${
                              kpi.change >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {kpi.change >= 0 ? "+" : ""}
                            {kpi.change}%
                          </span>
                          <span className="text-xs text-muted-foreground">vs last month</span>
                        </div>
                      )}
                    </div>
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Top 3 */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Daily Top 3
              </CardTitle>
              {summary && (
                <Badge variant="secondary">
                  {summary.dailyTop3Completed}/{summary.dailyTop3Total}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {top3Loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : (
              <>
                {top3?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 group p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => handleToggle(item.id, item.completed)}
                    />
                    <span
                      className={`flex-1 text-sm ${
                        item.completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.title}
                    </span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {(!top3 || top3.length < 3) && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a priority..."
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                      className="text-sm h-9"
                    />
                    <Button size="sm" onClick={handleAddTask} className="h-9 px-3">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Org Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Organization Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {orgPerf && orgPerf.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={orgPerf}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="organizationName"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
                      formatter={(value: number) => [`$${(value / 1000).toFixed(0)}K`, "Revenue"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="monthlyRevenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {orgPerf.map((org) => (
                    <div key={org.organizationId} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-32 truncate">{org.organizationName}</span>
                      <Progress value={org.productionGoalPercent} className="flex-1 h-2" />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {org.productionGoalPercent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No organization data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity && activity.length > 0 ? (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full mt-1.5 bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">{item.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Latest Announcements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Latest Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          a.type === "urgent"
                            ? "destructive"
                            : a.type === "success"
                            ? "default"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {a.type}
                      </Badge>
                      <span className="text-sm font-medium">{a.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No announcements yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
