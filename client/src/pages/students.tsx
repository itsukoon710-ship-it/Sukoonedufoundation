import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, CreditCard, Users, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Student } from "@shared/schema";
import { useLocation } from "wouter";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  registered: { label: "Registered", variant: "secondary" },
  exam_scheduled: { label: "Exam Scheduled", variant: "outline" },
  exam_done: { label: "Exam Done", variant: "secondary" },
  selected_for_interview: { label: "Interview Selected", variant: "default" },
  interview_done: { label: "Interview Done", variant: "default" },
  admitted: { label: "Admitted", variant: "default" },
  waitlisted: { label: "Waitlisted", variant: "outline" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function StudentsPage() {
  const { data: user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ students: Student[]; total: number }>({
    queryKey: ["/api/students", page, limit, statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/students?page=${page}&limit=${limit}&status=${statusFilter}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
  });

  const { data: allData, refetch: refetchAll } = useQuery<{ students: Student[]; total: number }>({
    queryKey: ["/api/students/export", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/students/export?status=${statusFilter}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: false,
  });

  const { data: counts } = useQuery<{ total: number; registered: number; selected: number; admitted: number }>({
    queryKey: ["/api/students/counts"],
    queryFn: async () => {
      const res = await fetch("/api/students/counts", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch student counts");
      return res.json();
    },
  });

  const students = data?.students ?? [];
  const totalStudents = data?.total ?? 0;
  const totalPages = Math.ceil(totalStudents / limit);

  const filteredStudents = students.filter(s => {
    const matchSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.applicationId.toLowerCase().includes(search.toLowerCase()) ||
        ((s.mobile || s.phone) ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportToCSV = async () => {
    await refetchAll();
    const exportData = allData?.students ?? [];
    
    const headers = [
      'Application ID',
      'Student Name',
      'Age',
      'Date of Birth',
      'Gender',
      "Father's Name",
      "Father's Occupation",
      "Mother's Name",
      'Mobile',
      'Phone',
      'Aadhaar Number',
      'Village',
      'District',
      'State',
      'Address',
      'Previous School',
      'Class Applying',
      'Exam Center',
      'Status',
      'Registration Date'
    ];

    const csvContent = [
      headers.join(','),
      ...exportData.map(student => [
        student.applicationId,
        `"${student.name}"`,
        student.age,
        student.dateOfBirth,
        student.gender,
        `"${student.fatherName}"`,
        `"${student.fatherOccupation}"`,
        `"${student.motherName}"`,
        student.mobile,
        student.phone || '',
        student.aadhaarNumber,
        `"${student.village}"`,
        `"${student.district}"`,
        `"${student.state}"`,
        `"${student.address}"`,
        `"${student.previousSchool}"`,
        student.classApplying,
        student.examCenter || '',
        student.status,
        student.createdAt ? new Date(student.createdAt).toLocaleDateString() : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {user?.role === "coordinator" ? "Students you have registered" : "All registered students"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} data-testid="button-export-students">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button asChild data-testid="button-add-student">
            <Link href="/students/add">
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", count: counts?.total ?? 0, filter: "all" },
          { label: "Registered", count: counts?.registered ?? 0, filter: "registered" },
          { label: "Selected", count: counts?.selected ?? 0, filter: "selected_for_interview" },
          { label: "Admitted", count: counts?.admitted ?? 0, filter: "admitted" },
        ].map(stat => (
          <button
            key={stat.filter}
            onClick={() => setStatusFilter(stat.filter)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              statusFilter === stat.filter
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-border"
            }`}
            data-testid={`stat-${stat.filter}`}
          >
            <p className="text-xl font-bold">{stat.count}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, app ID, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-students"
          />
        </div>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusConfig).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">
              {filteredStudents.length} Student{filteredStudents.length !== 1 ? "s" : ""}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 pb-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No students found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Application ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Age</TableHead>
                    <TableHead className="hidden sm:table-cell">Gender</TableHead>
                    <TableHead className="hidden md:table-cell">Father's Name</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">State</TableHead>
                    <TableHead className="hidden lg:table-cell">District</TableHead>
                    <TableHead className="hidden xl:table-cell">Class</TableHead>
                    <TableHead className="hidden xl:table-cell">Exam Center</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const status = statusConfig[student.status] || { label: student.status, variant: "secondary" as const };
                    return (
                      <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                        <TableCell className="font-mono text-xs text-primary font-medium">
                          {student.applicationId}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{student.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{student.age}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{student.gender}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{student.fatherName}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{student.phone}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{student.state}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{student.district}</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">{student.classApplying}</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                          {student.examCenter || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="text-xs whitespace-nowrap">
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              data-testid={`button-admit-card-${student.id}`}
                            >
                              <Link href={`/admit-cards?id=${student.id}`}>
                                <CreditCard className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
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
