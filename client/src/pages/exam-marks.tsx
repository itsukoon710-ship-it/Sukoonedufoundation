import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, CheckCircle2, XCircle, ChevronRight, AlertCircle, BookOpen, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Student, Subject } from "@shared/schema";

export default function ExamMarksPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);

  const { data: studentsData, isLoading: studentsLoading } = useQuery<{ students: Student[]; total: number }>({
    queryKey: ["/api/students"],
  });
  const students = studentsData?.students ?? [];

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: admissionYears = [] } = useQuery<any[]>({
    queryKey: ["/api/admission-years"],
  });

  const activeYear = admissionYears.find((y: any) => y.isActive);
  const activeSubjects = subjects.filter(s => s.isActive).sort((a, b) => a.orderIndex - b.orderIndex);

  const { data: savedMarks = [], isLoading: marksLoading } = useQuery<any[]>({
    queryKey: ["/api/student-subject-marks", selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const res = await fetch(`/api/student-subject-marks/${selectedStudent.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedStudent,
  });

  const submitMarksMutation = useMutation({
    mutationFn: (data: { studentId: string; marks: { subjectId: string; marks: number }[] }) =>
      apiRequest("POST", "/api/student-subject-marks", data),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["/api/students"] });
      qc.invalidateQueries({ queryKey: ["/api/student-subject-marks", selectedStudent?.id] });
      qc.invalidateQueries({ queryKey: ["/api/exam-results"] });
      const msg = data.selectedForInterview
        ? `Selected for interview! (${data.subjectsPassed}/${activeSubjects.length} subjects passed)`
        : `Not selected. (${data.subjectsPassed}/${activeSubjects.length} subjects passed)`;
      toast({ title: "Marks Saved", description: msg });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const eligibleStudents = students.filter(s =>
    ["registered", "exam_scheduled", "exam_done", "selected_for_interview"].includes(s.status)
  );

  const filteredStudents = eligibleStudents.filter(s =>
     s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.applicationId.toLowerCase().includes(search.toLowerCase()) ||
     ((s.mobile || s.phone) ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openStudentMarks = (student: Student) => {
    setSelectedStudent(student);
    setResult(null);
    setMarksInput({});
  };

  const closeDialog = () => {
    setSelectedStudent(null);
    setMarksInput({});
    setResult(null);
  };

  const getInitialMark = (subjectId: string) => {
    const saved = savedMarks.find((m: any) => m.subjectId === subjectId);
    return saved ? String(saved.marks) : "";
  };

  const getMarkForSubject = (subjectId: string) => {
    if (marksInput[subjectId] !== undefined) return marksInput[subjectId];
    return getInitialMark(subjectId);
  };

  const handleSubmit = () => {
    if (!selectedStudent) return;
    const marks = activeSubjects
      .map(subject => ({
        subjectId: subject.id,
        marks: getMarkForSubject(subject.id),
      }))
      .filter(m => m.marks !== "");

    if (marks.length === 0) {
      toast({ title: "Enter at least one subject mark", variant: "destructive" });
      return;
    }

    submitMarksMutation.mutate({
      studentId: selectedStudent.id,
      marks: marks.map(m => ({ subjectId: m.subjectId, marks: parseInt(m.marks) })),
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      registered: { label: "Registered", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
      exam_scheduled: { label: "Exam Scheduled", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
      exam_done: { label: "Exam Done", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
      selected_for_interview: { label: "Interview Selected", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    };
    const c = config[status] || { label: status, color: "bg-muted text-muted-foreground" };
    return <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${c.color}`}>{c.label}</span>;
  };

  const computedTotal = activeSubjects.reduce((sum, s) => {
    const v = getMarkForSubject(s.id);
    return sum + (v ? parseInt(v) || 0 : 0);
  }, 0);

  const computedPassed = activeSubjects.filter(s => {
    const v = getMarkForSubject(s.id);
    return v && parseInt(v) >= s.passingMarks;
  }).length;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Exam Marks Entry</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Enter subject-wise marks for each student</p>
        </div>
        {activeYear && (
          <div className="text-right text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
            <p className="font-medium text-foreground text-sm">Selection Rule</p>
            <p>
              {activeYear.selectionMode === "all_pass" && `Pass all ${activeSubjects.length} active subjects`}
              {activeYear.selectionMode === "min_subjects" && `Pass ≥ ${activeYear.minSubjectsToPass} out of ${activeSubjects.length} subjects`}
              {activeYear.selectionMode === "total_marks" && `Total marks ≥ ${activeYear.totalCutoffMarks}`}
            </p>
          </div>
        )}
      </div>

      {/* Subject Legend */}
      {subjectsLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : activeSubjects.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              No active subjects configured.
              {user?.role === "admin" ? " Go to Exam Settings to add subjects." : " Ask the admin to set up subjects."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Active Subjects ({activeSubjects.length}) — coordinators enter marks for each
            </p>
            <div className="flex flex-wrap gap-2">
              {activeSubjects.map(s => (
                <span key={s.id} className="inline-flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1 rounded-full">
                  <span className="font-mono font-medium text-primary">{s.code}</span>
                  <span>{s.name}</span>
                  <span className="text-muted-foreground">pass: {s.passingMarks}/{s.maxMarks}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, application ID or mobile..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-student"
        />
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Students
          </CardTitle>
          <CardDescription>{filteredStudents.length} students eligible for marks entry</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {studentsLoading ? (
            <div className="px-6 pb-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden sm:table-cell">App ID</TableHead>
                    <TableHead className="hidden md:table-cell">Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Marks Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => (
                    <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                      <TableCell>
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.fatherName}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs text-primary">
                        {student.applicationId}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{student.classApplying}</TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs">
                          {["exam_done", "selected_for_interview", "interview_done", "admitted", "waitlisted", "rejected"].includes(student.status)
                            ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saved</span>
                            : <span className="text-muted-foreground">Pending</span>
                          }
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStudentMarks(student)}
                          data-testid={`button-enter-marks-${student.id}`}
                          disabled={activeSubjects.length === 0}
                        >
                          {["exam_done", "selected_for_interview"].includes(student.status) ? "Edit Marks" : "Enter Marks"}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marks Entry Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subject-wise Marks Entry</DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4">
              {/* Student Info */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-semibold">{selectedStudent.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedStudent.applicationId} · {selectedStudent.classApplying} · {selectedStudent.fatherName}
                </p>
              </div>

              {/* Result banner */}
              {result && (
                <div className={`rounded-lg p-3 flex items-start gap-2 border ${result.selectedForInterview ? "bg-green-50 dark:bg-green-900/20 border-green-200" : "bg-red-50 dark:bg-red-900/20 border-red-200"}`}>
                  {result.selectedForInterview
                    ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  }
                  <div className="text-sm">
                    <p className="font-semibold">
                      {result.selectedForInterview ? "✓ Selected for Interview" : "✗ Not Selected for Interview"}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Total: {result.totalMarks}/{result.totalMaxMarks} ·
                      Passed: {result.subjectsPassed}/{activeSubjects.length} subjects
                    </p>
                  </div>
                </div>
              )}

              {/* Marks Input per Subject */}
              {marksLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-1 pb-1">
                    <span className="text-xs font-medium text-muted-foreground">Subject</span>
                    <span className="text-xs font-medium text-muted-foreground text-center w-20">Marks</span>
                    <span className="text-xs font-medium text-muted-foreground text-center w-16">Max</span>
                    <span className="text-xs font-medium text-muted-foreground w-5"></span>
                  </div>
                  {activeSubjects.map(subject => {
                    const currentMark = getMarkForSubject(subject.id);
                    const numMark = currentMark !== "" ? parseInt(currentMark) : null;
                    const passed = numMark !== null && !isNaN(numMark) && numMark >= subject.passingMarks;
                    const failed = numMark !== null && !isNaN(numMark) && numMark < subject.passingMarks;

                    return (
                      <div
                        key={subject.id}
                        className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-1 py-1.5 rounded-md ${
                          passed ? "bg-green-50 dark:bg-green-900/10" : failed ? "bg-red-50 dark:bg-red-900/10" : ""
                        }`}
                        data-testid={`subject-row-${subject.id}`}
                      >
                        <div>
                          <p className="text-sm font-medium leading-tight">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.code} · pass: {subject.passingMarks}</p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={subject.maxMarks}
                          placeholder="—"
                          className="w-20 text-center h-8"
                          value={marksInput[subject.id] ?? getInitialMark(subject.id)}
                          onChange={e => setMarksInput(prev => ({ ...prev, [subject.id]: e.target.value }))}
                          data-testid={`input-marks-${subject.id}`}
                        />
                        <span className="text-xs text-muted-foreground text-center w-16">/ {subject.maxMarks}</span>
                        <div className="w-5 flex justify-center">
                          {passed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {failed && <XCircle className="w-4 h-4 text-red-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Totals */}
              <div className="bg-muted rounded-lg px-3 py-2 grid grid-cols-3 text-sm text-center divide-x divide-border">
                <div>
                  <p className="font-bold text-lg">{computedTotal}</p>
                  <p className="text-xs text-muted-foreground">Total Marks</p>
                </div>
                <div>
                  <p className="font-bold text-lg text-green-600">{computedPassed}</p>
                  <p className="text-xs text-muted-foreground">Subjects Passed</p>
                </div>
                <div>
                  <p className="font-bold text-lg">{activeSubjects.reduce((s, sub) => s + sub.maxMarks, 0)}</p>
                  <p className="text-xs text-muted-foreground">Max Possible</p>
                </div>
              </div>

              {/* Rule reminder */}
              {activeYear && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  Selection rule: {" "}
                  {activeYear.selectionMode === "all_pass" && `Must pass all ${activeSubjects.length} subjects`}
                  {activeYear.selectionMode === "min_subjects" && `Must pass ≥ ${activeYear.minSubjectsToPass} subjects`}
                  {activeYear.selectionMode === "total_marks" && `Total ≥ ${activeYear.totalCutoffMarks} marks`}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={closeDialog}>Close</Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitMarksMutation.isPending || activeSubjects.length === 0}
                  data-testid="button-submit-marks"
                >
                  {submitMarksMutation.isPending ? "Saving..." : "Save & Evaluate"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
