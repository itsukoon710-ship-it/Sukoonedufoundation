import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Download, FileSpreadsheet, Users, Building2, UserCheck, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { Student } from "@shared/schema";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";

const COLORS = ["hsl(221,72%,43%)", "hsl(142,72%,29%)", "hsl(37,91%,55%)", "hsl(280,65%,60%)", "hsl(340,75%,55%)"];

export default function ReportsPage() {
  const [year, setYear] = useState("2026");

  const { data: studentsData, isLoading } = useQuery<{ students: Student[]; total: number }>({
    queryKey: ["/api/students"],
  });
  const students = studentsData?.students ?? [];
  
  // Use export API for CSV to get all students, not paginated
  const { data: allStudentsData, refetch: refetchAllStudents } = useQuery<{ students: Student[]; total: number }>({
    queryKey: ["/api/students/export"],
    queryFn: async () => {
      const res = await fetch(`/api/students/export?admissionYear=${year}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students for export");
      return res.json();
    },
    enabled: false,
  });
  const { data: coordinators = [] } = useQuery<any[]>({ queryKey: ["/api/coordinators"] });
  const { data: centers = [] } = useQuery<any[]>({ queryKey: ["/api/centers"] });
  const { data: examResults = [] } = useQuery<any[]>({ queryKey: ["/api/exam-results"] });
  const { data: interviewResults = [] } = useQuery<any[]>({ queryKey: ["/api/interview-results"] });

  const filteredStudents = students.filter(s => s.admissionYear === parseInt(year));

  // By center
  const centerStats = centers.map(c => ({
    name: c.name.split(" ")[0],
    fullName: c.name,
    total: filteredStudents.filter(s => s.centerId === c.id).length,
    admitted: filteredStudents.filter(s => s.centerId === c.id && s.status === "admitted").length,
  }));

  // By coordinator
  const coordStats = coordinators.map(c => ({
    name: c.name,
    center: centers.find((ct: any) => ct.id === c.centerId)?.name || "—",
    total: filteredStudents.filter(s => s.coordinatorId === c.id).length,
    admitted: filteredStudents.filter(s => s.coordinatorId === c.id && s.status === "admitted").length,
  }));

  // Status breakdown
  const statusData = [
    { name: "Registered", value: filteredStudents.filter(s => s.status === "registered").length },
    { name: "Exam Done", value: filteredStudents.filter(s => s.status === "exam_done").length },
    { name: "Interview", value: filteredStudents.filter(s => s.status === "selected_for_interview").length },
    { name: "Admitted", value: filteredStudents.filter(s => s.status === "admitted").length },
    { name: "Waitlisted", value: filteredStudents.filter(s => s.status === "waitlisted").length },
    { name: "Rejected", value: filteredStudents.filter(s => s.status === "rejected").length },
  ].filter(d => d.value > 0);

  const examStats = {
    total: examResults.length,
    selected: examResults.filter((r: any) => r.selectedForInterview).length,
    avgMarks: examResults.length > 0
      ? Math.round(examResults.reduce((sum: number, r: any) => sum + r.marks, 0) / examResults.length)
      : 0,
  };

  const exportFullReport = () => {
    const lines = [
      `SUKOON NGO — ENROLLMENT REPORT ${year}`,
      "=".repeat(50),
      "",
      "SUMMARY",
      `Total Students: ${filteredStudents.length}`,
      `Exam Completed: ${filteredStudents.filter(s => ["exam_done","selected_for_interview","interview_done","admitted","waitlisted","rejected"].includes(s.status)).length}`,
      `Interview Selected: ${filteredStudents.filter(s => ["selected_for_interview","interview_done","admitted","waitlisted","rejected"].includes(s.status)).length}`,
      `Final Admissions: ${filteredStudents.filter(s => s.status === "admitted").length}`,
      `Average Exam Marks: ${examStats.avgMarks}`,
      "",
      "COORDINATOR PERFORMANCE",
      "Coordinator | Center | Students | Admitted",
      ...coordStats.map(c => `${c.name} | ${c.center} | ${c.total} | ${c.admitted}`),
      "",
      "CENTER PERFORMANCE",
      "Center | Total | Admitted",
      ...centerStats.map(c => `${c.fullName} | ${c.total} | ${c.admitted}`),
      "",
      "STUDENT LIST",
      "AppID | Name | Class | Status",
      ...filteredStudents.map(s => `${s.applicationId} | ${s.name} | ${s.classApplying} | ${s.status}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sukoon-report-${year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = async () => {
    await refetchAllStudents();
    const exportStudents = allStudentsData?.students ?? [];
    const filteredForExport = exportStudents.filter(s => s.admissionYear === parseInt(year));
    
    const headers = ["App ID", "Name", "Father", "Mother", "Gender", "DOB", "Class", "Mobile", "Center", "Status", "Exam Marks", "Interview Decision"];
    const rows = filteredForExport.map(s => {
      const er = examResults.find((r: any) => r.student?.id === s.id);
      const ir = interviewResults.find((r: any) => r.studentId === s.id);
      return [
        s.applicationId, s.name, s.fatherName, s.motherName, s.gender, s.dateOfBirth,
        s.classApplying, s.phone,
        centers.find((c: any) => c.id === s.centerId)?.name || "",
        s.status, er?.marks || "", ir?.decision || ""
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sukoon-students-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Comprehensive enrollment data and performance insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} data-testid="button-export-csv-report">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={exportFullReport} data-testid="button-export-full-report">
            <Download className="w-4 h-4 mr-2" />
            Full Report
          </Button>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Enrolled", value: filteredStudents.length, icon: Users, color: "text-blue-600" },
          { label: "Exam Pass Rate", value: `${examStats.total > 0 ? Math.round(examStats.selected / examStats.total * 100) : 0}%`, icon: TrendingUp, color: "text-green-600" },
          { label: "Avg Exam Marks", value: `${examStats.avgMarks}/100`, icon: BarChart2, color: "text-purple-600" },
          { label: "Admitted", value: filteredStudents.filter(s => s.status === "admitted").length, icon: UserCheck, color: "text-emerald-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-muted flex-shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-7 w-12" /> : (
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Students by Center</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={centerStats} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  />
                  <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
                    {centerStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Status Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={65} paddingAngle={2} dataKey="value">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coordinator Performance Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Coordinator Performance</CardTitle>
          </div>
          <CardDescription>Student registration and admission stats per coordinator</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Coordinator</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead className="text-center">Registered</TableHead>
                  <TableHead className="text-center">Admitted</TableHead>
                  <TableHead className="text-center">Success Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : coordStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No data available</TableCell>
                  </TableRow>
                ) : (
                  coordStats.map((coord, i) => (
                    <TableRow key={i} data-testid={`row-report-coord-${i}`}>
                      <TableCell className="font-medium">{coord.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{coord.center}</TableCell>
                      <TableCell className="text-center font-semibold">{coord.total}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600 font-semibold">{coord.admitted}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={coord.total > 0 && coord.admitted / coord.total >= 0.5 ? "default" : "secondary"}>
                          {coord.total > 0 ? Math.round(coord.admitted / coord.total * 100) : 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Center Performance Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Center Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Center Name</TableHead>
                  <TableHead className="text-center">Total Students</TableHead>
                  <TableHead className="text-center">Admitted</TableHead>
                  <TableHead className="text-center">Waitlisted</TableHead>
                  <TableHead className="text-center">Rejected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centerStats.map((center, i) => {
                  const c = centers[i];
                  const waitlisted = c ? filteredStudents.filter(s => s.centerId === c.id && s.status === "waitlisted").length : 0;
                  const rejected = c ? filteredStudents.filter(s => s.centerId === c.id && s.status === "rejected").length : 0;
                  return (
                    <TableRow key={i} data-testid={`row-report-center-${i}`}>
                      <TableCell className="font-medium">{center.fullName}</TableCell>
                      <TableCell className="text-center font-semibold">{center.total}</TableCell>
                      <TableCell className="text-center text-green-600 font-semibold">{center.admitted}</TableCell>
                      <TableCell className="text-center text-amber-600">{waitlisted}</TableCell>
                      <TableCell className="text-center text-red-500">{rejected}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
