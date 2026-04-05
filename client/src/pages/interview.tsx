import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Edit, CheckCircle, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Student } from "@shared/schema";

type InterviewCandidate = {
  student: Student;
  marks?: number;
  maxMarks?: number;
};

type ExamResultWithStudent = {
  id: string;
  studentId: string;
  marks: number;
  maxMarks: number;
  selectedForInterview: boolean;
  student: Student;
};

type InterviewResultWithStudent = {
  id: string;
  studentId: string;
  interviewMarks: number;
  remarks: string | null;
  decision: "selected" | "waitlisted" | "rejected";
  student: Student;
};

export default function InterviewPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [interviewMarks, setInterviewMarks] = useState("");
  const [remarks, setRemarks] = useState("");
  const [decision, setDecision] = useState<"selected" | "waitlisted" | "rejected">("selected");

  const { data: examResults = [], isLoading } = useQuery<ExamResultWithStudent[]>({
    queryKey: ["/api/exam-results"],
  });

  const { data: allStudents = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: interviewResults = [] } = useQuery<InterviewResultWithStudent[]>({
    queryKey: ["/api/interview-results"],
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/interview-results", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/interview-results"] });
      qc.invalidateQueries({ queryKey: ["/api/students"] });
      qc.invalidateQueries({ queryKey: ["/api/exam-results"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Interview Result Saved" });
      setSelectedStudent(null);
      setInterviewMarks("");
      setRemarks("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Get students with status "selected_for_interview" directly from students table
  const studentsSelectedForInterview = allStudents.filter(s => s.status === "selected_for_interview");
  
  // Create a map of studentId -> exam result for quick lookup
  const examResultsMap = new Map<string, { marks: number; maxMarks: number }>();
  examResults.forEach((r: any) => {
    if (r.selectedForInterview && r.student) {
      examResultsMap.set(r.student.id, { marks: r.marks, maxMarks: r.maxMarks });
    }
  });
  
  // Combine both sources and deduplicate by student id, preserving exam marks
  const allInterviewCandidates: InterviewCandidate[] = [];
  
  // First add students from the students table
  studentsSelectedForInterview.forEach(student => {
    const examInfo = examResultsMap.get(student.id);
    allInterviewCandidates.push({
      student,
      marks: examInfo?.marks,
      maxMarks: examInfo?.maxMarks,
    });
  });
  
  // Then add exam results students that aren't already in the list
  examResults.forEach((r: any) => {
    if (r.selectedForInterview && r.student && !allInterviewCandidates.find(c => c.student.id === r.student.id)) {
      allInterviewCandidates.push({
        student: r.student,
        marks: r.marks,
        maxMarks: r.maxMarks,
      });
    }
  });
  
  const filteredResults = allInterviewCandidates.filter(c =>
    !search ||
    c.student.name.toLowerCase().includes(search.toLowerCase()) ||
    c.student.applicationId.toLowerCase().includes(search.toLowerCase())
  );

  const getInterviewResult = (studentId: string) =>
    interviewResults.find(r => r.studentId === studentId);

  const openInterviewEntry = (student: Student) => {
    const existing = getInterviewResult(student.id);
    setSelectedStudent(student);
    setInterviewMarks(existing ? existing.interviewMarks.toString() : "");
    setRemarks(existing?.remarks || "");
    setDecision(existing?.decision || "selected");
  };

  const handleSubmit = () => {
    if (!selectedStudent || !interviewMarks || !decision) return;
    mutation.mutate({
      studentId: selectedStudent.id,
      interviewMarks: parseInt(interviewMarks),
      remarks,
      decision,
    });
  };

  const decisionConfig = {
    selected: { label: "Selected", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
    waitlisted: { label: "Waitlisted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Interview Selection</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Conduct interviews and record decisions for selected students</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "For Interview", count: allInterviewCandidates.length, color: "text-blue-600" },
          { label: "Interviewed", count: interviewResults.length, color: "text-purple-600" },
          { label: "Selected", count: interviewResults.filter(r => r.decision === "selected").length, color: "text-green-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-interview"
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Students Selected for Interview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 pb-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No students selected for interview yet</p>
              <p className="text-sm mt-1">Students above the exam cutoff will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Application ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Exam Score</TableHead>
                    <TableHead className="hidden sm:table-cell">Interview Score</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead className="hidden md:table-cell">Remarks</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map(candidate => {
                    const iResult = getInterviewResult(candidate.student.id);
                    const decConf = iResult ? decisionConfig[iResult.decision] : null;
                    const DecIcon = decConf?.icon;
                    return (
                      <TableRow key={candidate.student.id} data-testid={`row-interview-${candidate.student.id}`}>
                        <TableCell className="font-mono text-xs text-primary font-medium">
                          {candidate.student.applicationId}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{candidate.student.name}</p>
                          <p className="text-xs text-muted-foreground">{candidate.student.classApplying}</p>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">{candidate.marks ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">{candidate.maxMarks ? ` / ${candidate.maxMarks}` : ""}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {iResult ? (
                            <span className="font-semibold">{iResult.interviewMarks} / 100</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Pending</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {decConf && DecIcon ? (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${decConf.color}`}>
                              <DecIcon className="w-3 h-3" />
                              {decConf.label}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-32 truncate">
                          {iResult?.remarks || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openInterviewEntry(candidate.student)}
                            data-testid={`button-interview-${candidate.student.id}`}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            {iResult ? "Update" : "Record"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Interview Result</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium">{selectedStudent.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{selectedStudent.applicationId}</p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Interview Marks (out of 100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={interviewMarks}
                    onChange={e => setInterviewMarks(e.target.value)}
                    placeholder="0"
                    className="mt-1.5"
                    data-testid="input-interview-marks"
                  />
                </div>
                <div>
                  <Label>Final Decision</Label>
                  <Select value={decision} onValueChange={(v) => setDecision(v as any)}>
                    <SelectTrigger className="mt-1.5" data-testid="select-decision">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selected">Selected</SelectItem>
                      <SelectItem value="waitlisted">Waiting List</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Remarks</Label>
                  <Textarea
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Optional remarks..."
                    rows={3}
                    className="mt-1.5"
                    data-testid="input-remarks"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedStudent(null)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={mutation.isPending || !interviewMarks || !decision}
              data-testid="button-save-interview"
            >
              {mutation.isPending ? "Saving..." : "Save Result"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
