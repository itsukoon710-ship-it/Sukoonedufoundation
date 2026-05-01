import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ClipboardCheck, UserCheck, Award, TrendingUp, Building2, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type DashboardStats = {
  totalStudents: number;
  examCompleted: number;
  interviewSelected: number;
  finalAdmissions: number;
  studentsByCenter: { centerName: string; count: number }[];
  studentsByCenterDetail: { 
    centerName: string; 
    total: number; 
    admitted: number; 
    waitlisted: number; 
    rejected: number 
  }[];
  studentsByState: { state: string; count: number }[];
  studentsByDistrict: { district: string; count: number }[];
  studentsByAge: { ageGroup: string; count: number }[];
};

const CHART_COLORS = ["hsl(221,72%,43%)", "hsl(142,72%,29%)", "hsl(37,91%,55%)", "hsl(280,65%,60%)", "hsl(340,75%,55%)"];

export default function DashboardPage() {
  const [year, setYear] = useState("2026");
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", year],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?admissionYear=${year}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    },
  });



  const metricCards = [
    {
      title: "Total Students",
      value: stats?.totalStudents ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      description: "Registered this cycle",
    },
    {
      title: "Exam Completed",
      value: stats?.examCompleted ?? 0,
      icon: ClipboardCheck,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      description: "Marks submitted",
    },
    {
      title: "Interview Selected",
      value: stats?.interviewSelected ?? 0,
      icon: UserCheck,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      description: "Above cutoff score",
    },
    {
      title: "Final Admissions",
      value: stats?.finalAdmissions ?? 0,
      icon: Award,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
      description: "Students admitted",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <Card key={card.title} className="hover-elevate">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold mt-1 text-foreground">{card.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.bg} flex-shrink-0`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students by Center Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Students by Center</CardTitle>
            </div>
            <CardDescription>Distribution across learning centers</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.studentsByCenter || []} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="centerName" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v.split(" ")[0]} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {(stats?.studentsByCenter || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Admission Funnel</CardTitle>
            </div>
            <CardDescription>Progress through admission stages</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Registered", value: (stats?.totalStudents || 0) - (stats?.examCompleted || 0) },
                      { name: "Exam Done", value: (stats?.examCompleted || 0) - (stats?.interviewSelected || 0) },
                      { name: "Interview", value: (stats?.interviewSelected || 0) - (stats?.finalAdmissions || 0) },
                      { name: "Admitted", value: stats?.finalAdmissions || 0 },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {CHART_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* State-wise and Age-wise Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students by State Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Students by State</CardTitle>
            </div>
            <CardDescription>State-wise enrollment distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.studentsByState || []} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="state" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {(stats?.studentsByState || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Students by Age Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Students by Age Group</CardTitle>
            </div>
            <CardDescription>Age-wise enrollment distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.studentsByAge || []} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="ageGroup" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {(stats?.studentsByAge || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        </div>

        {/* District-wise Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Students by District</CardTitle>
            </div>
            <CardDescription>District-wise enrollment distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.studentsByDistrict || []} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="district" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                    {(stats?.studentsByDistrict || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Center Performance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Center Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 pb-4 space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(stats?.studentsByCenterDetail || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No data available</p>
              ) : (
                (stats?.studentsByCenterDetail || []).map((center, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3" data-testid={`row-center-${i}`}>
                    <div>
                      <p className="text-sm font-medium">{center.centerName}</p>
                      <p className="text-xs text-muted-foreground">
                        Total: {center.total} | Admitted: {center.admitted} | Waitlisted: {center.waitlisted} | Rejected: {center.rejected}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs font-medium">{center.admitted}/{center.total}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
