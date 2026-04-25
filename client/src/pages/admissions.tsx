import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { Student } from "@shared/schema";

export default function AdmissionsPage() {
  const [filterDecision, setFilterDecision] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery<{ students: Student[]; total: number }>({
    queryKey: ["/api/students", page, limit, filterDecision],
    queryFn: async () => {
      const res = await fetch(`/api/students?page=${page}&limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
  });

  const { data: allData, refetch: refetchAll } = useQuery<{ students: Student[]; total: number }>({
    queryKey: ["/api/students/export"],
    queryFn: async () => {
      const res = await fetch(`/api/students/export`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: false,
  });

  const students = data?.students ?? [];
  const totalStudents = data?.total ?? 0;
  const totalPages = Math.ceil(totalStudents / limit);

  const { data: interviewResults = [] } = useQuery<any[]>({
    queryKey: ["/api/interview-results"],
    queryFn: () => apiRequest("GET", "/api/interview-results"),
  });

  const finalStudents = students.filter(s =>
    ["admitted", "waitlisted", "rejected"].includes(s.status)
  );

  const filteredStudents = finalStudents.filter(s => {
    if (filterDecision === "all") return true;
    return s.status === filterDecision;
  });

  const getInterviewResult = (studentId: string) =>
    interviewResults.find((r: any) => r.studentId === studentId);

  const statusConfig: Record<string, { label: string; color: string }> = {
    admitted: { label: "Admitted", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    waitlisted: { label: "Waitlisted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };

  const exportCSV = async () => {
    await refetchAll();
    const exportData = allData?.students ?? [];
    
    const finalExportStudents = exportData.filter(s =>
      ["admitted", "waitlisted", "rejected"].includes(s.status)
    );
    
    const headers = ["Application ID", "Student Name", "Father Name", "Class", "Mobile", "Exam Center", "Status", "Interview Marks", "Remarks"];
    const rows = finalExportStudents.map(s => {
      const ir = getInterviewResult(s.id);
      return [
        s.applicationId, s.name, s.fatherName, s.classApplying, s.phone,
        s.examCenter || "", s.status, ir?.interviewMarks || "", ir?.remarks || ""
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sukoon-admissions-2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportText = async () => {
    await refetchAll();
    const exportData = allData?.students ?? [];
    
    const finalExportStudents = exportData.filter(s =>
      ["admitted", "waitlisted", "rejected"].includes(s.status)
    );
    
    const lines = finalExportStudents.map((s, i) => {
      const ir = getInterviewResult(s.id);
      return `${i + 1}. ${s.applicationId} | ${s.name} | ${s.classApplying} | ${s.status.toUpperCase()}${ir ? ` | ${ir.interviewMarks}/100` : ""}`;
    });
    const content = `SUKOON NGO — FINAL ADMISSION LIST 2026\n${"=".repeat(50)}\n\n${lines.join("\n")}\n\nTotal: ${finalExportStudents.length} students`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sukoon-admissions-2026.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Final Admissions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Complete list of students with final admission decisions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportCSV} data-testid="button-export-csv">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportText} data-testid="button-export-text">
            <Download className="w-4 h-4 mr-2" />
            Export Text
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Admitted", count: finalStudents.filter(s => s.status === "admitted").length, color: "text-green-600" },
          { label: "Waitlisted", count: finalStudents.filter(s => s.status === "waitlisted").length, color: "text-amber-600" },
          { label: "Rejected", count: finalStudents.filter(s => s.status === "rejected").length, color: "text-red-500" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <Select value={filterDecision} onValueChange={(val) => { setFilterDecision(val); setPage(1); }}>
          <SelectTrigger className="w-44" data-testid="select-admission-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Decisions</SelectItem>
            <SelectItem value="admitted">Admitted</SelectItem>
            <SelectItem value="waitlisted">Waitlisted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredStudents.length} students</span>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Admission List 2026</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 pb-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No final admissions yet</p>
              <p className="text-sm">Complete the interview process to see admissions here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Father's Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Class</TableHead>
                    <TableHead className="hidden md:table-cell">Mobile</TableHead>
                    <TableHead className="hidden lg:table-cell">Interview Score</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, index) => {
                    const ir = getInterviewResult(student.id);
                    const conf = statusConfig[student.status];
                    return (
                      <TableRow key={student.id} data-testid={`row-admission-${student.id}`}>
                        <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs text-primary font-medium">
                          {student.applicationId}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.gender}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{student.fatherName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{student.classApplying}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{student.phone}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {ir ? (
                            <span className="font-semibold">{ir.interviewMarks} / 100</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {conf && (
                            <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${conf.color}`}>
                              {conf.label}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
