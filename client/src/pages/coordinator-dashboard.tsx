import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { 
  Users, 
  Search, 
  Edit, 
  Download, 
  RefreshCw, 
  Eye, 
  Filter,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from "lucide-react";
import type { Student } from "@shared/schema";

const statusColors: Record<string, string> = {
  registered: "bg-blue-100 text-blue-800",
  exam_scheduled: "bg-yellow-100 text-yellow-800",
  exam_done: "bg-purple-100 text-purple-800",
  selected_for_interview: "bg-green-100 text-green-800",
  interview_done: "bg-indigo-100 text-indigo-800",
  admitted: "bg-emerald-100 text-emerald-800",
  waitlisted: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  registered: <Clock className="w-3 h-3" />,
  exam_scheduled: <Clock className="w-3 h-3" />,
  exam_done: <Clock className="w-3 h-3" />,
  selected_for_interview: <CheckCircle className="w-3 h-3" />,
  interview_done: <CheckCircle className="w-3 h-3" />,
  admitted: <CheckCircle className="w-3 h-3" />,
  waitlisted: <AlertCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

export default function CoordinatorDashboardPage() {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});

  const { data: studentsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/students", { limit: 100 }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students?limit=100");
      return res.json();
    },
  });

  const { data: counts } = useQuery<{ total: number; registered: number; selected: number; admitted: number }>({
    queryKey: ["/api/students/counts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/students/counts");
      return res.json();
    },
  });

  const students = studentsData?.students || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) =>
      apiRequest("PUT", `/api/students/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/students"] });
      toast({ title: "Student updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedStudent(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredStudents = students.filter((student: Student) => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.applicationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((student.mobile || student.phone) ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setEditFormData({
      name: student.name,
      age: student.age,
      dateOfBirth: student.dateOfBirth,
      fatherName: student.fatherName,
      fatherOccupation: student.fatherOccupation,
      motherName: student.motherName,
      phone: student.phone,
      aadhaarNumber: student.aadhaarNumber,
      village: student.village,
      district: student.district,
      state: student.state,
      address: student.address,
      previousSchool: student.previousSchool,
      classApplying: student.classApplying,
      status: student.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (student: Student) => {
    setSelectedStudent(student);
    setIsViewDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedStudent) return;
    updateMutation.mutate({ id: selectedStudent.id, data: editFormData });
  };

  const handleExportCSV = () => {
    const headers = [
      "Application ID",
      "Name",
      "Age",
      "Date of Birth",
      "Father's Name",
      "Father's Occupation",
      "Mother's Name",
      "Phone",
      "Aadhaar Number",
      "Village",
      "District",
      "State",
      "Address",
      "Previous School",
      "Class Applying",
      "Status",
      "Created At"
    ];

    const csvContent = [
      headers.join(","),
      ...filteredStudents.map((student: Student) => [
        student.applicationId,
        `"${student.name}"`,
        student.age,
        student.dateOfBirth,
        `"${student.fatherName}"`,
        `"${student.fatherOccupation}"`,
        `"${student.motherName}"`,
        student.phone,
        student.aadhaarNumber,
        `"${student.village}"`,
        `"${student.district}"`,
        `"${student.state}"`,
        `"${student.address}"`,
        `"${student.previousSchool}"`,
        student.classApplying,
        student.status,
        student.createdAt
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `students_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast({ title: "Export successful", description: `${filteredStudents.length} students exported to CSV` });
  };

  const stats = {
    total: counts?.total ?? 0,
    registered: counts?.registered ?? 0,
    admitted: counts?.admitted ?? 0,
    rejected: students.filter((s: Student) => s.status === "rejected").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading students...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <img src="/Logo.png" alt="Sukoon Logo" className="w-12 h-12 object-contain mb-2" />
          <h1 className="text-2xl font-bold">Coordinator Dashboard</h1>
          <p className="text-muted-foreground">Manage student applications and submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Registered</p>
                <p className="text-2xl font-bold">{stats.registered}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admitted</p>
                <p className="text-2xl font-bold">{stats.admitted}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, application ID, father's name, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="status-filter">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="exam_scheduled">Exam Scheduled</SelectItem>
                  <SelectItem value="exam_done">Exam Done</SelectItem>
                  <SelectItem value="selected_for_interview">Selected for Interview</SelectItem>
                  <SelectItem value="interview_done">Interview Done</SelectItem>
                  <SelectItem value="admitted">Admitted</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Student Applications ({filteredStudents.length})
          </CardTitle>
          <CardDescription>
            View and manage all student applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Father's Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No students found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student: Student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.applicationId}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.fatherName}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>{student.classApplying}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[student.status] || "bg-gray-100 text-gray-800"}>
                          {statusIcons[student.status]}
                          <span className="ml-1 capitalize">{student.status.replace(/_/g, " ")}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(student)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(student)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Application ID: {selectedStudent?.applicationId}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label className="text-muted-foreground">Full Name</Label>
                <p className="font-medium">{selectedStudent.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Age</Label>
                <p className="font-medium">{selectedStudent.age}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date of Birth</Label>
                <p className="font-medium">{selectedStudent.dateOfBirth}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Gender</Label>
                <p className="font-medium">{selectedStudent.gender}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Name</Label>
                <p className="font-medium">{selectedStudent.fatherName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Father's Occupation</Label>
                <p className="font-medium">{selectedStudent.fatherOccupation}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Mother's Name</Label>
                <p className="font-medium">{selectedStudent.motherName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p className="font-medium">{selectedStudent.phone}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Aadhaar Number</Label>
                <p className="font-medium">{selectedStudent.aadhaarNumber}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Village/Place</Label>
                <p className="font-medium">{selectedStudent.village}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">District</Label>
                <p className="font-medium">{selectedStudent.district}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">State</Label>
                <p className="font-medium">{selectedStudent.state}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Full Address</Label>
                <p className="font-medium">{selectedStudent.address}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Previous School</Label>
                <p className="font-medium">{selectedStudent.previousSchool}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Class Applying</Label>
                <p className="font-medium">{selectedStudent.classApplying}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge className={statusColors[selectedStudent.status] || "bg-gray-100 text-gray-800"}>
                  {statusIcons[selectedStudent.status]}
                  <span className="ml-1 capitalize">{selectedStudent.status.replace(/_/g, " ")}</span>
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Declaration</Label>
                <p className="font-medium">{selectedStudent.declaration ? "Accepted" : "Not Accepted"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              if (selectedStudent) handleEdit(selectedStudent);
            }}>
              Edit Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information and status
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-age">Age</Label>
                <Input
                  id="edit-age"
                  type="number"
                  value={editFormData.age || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, age: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={editFormData.dateOfBirth || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-father-name">Father's Name</Label>
                <Input
                  id="edit-father-name"
                  value={editFormData.fatherName || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-father-occupation">Father's Occupation</Label>
                <Input
                  id="edit-father-occupation"
                  value={editFormData.fatherOccupation || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, fatherOccupation: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-mother-name">Mother's Name</Label>
                <Input
                  id="edit-mother-name"
                  value={editFormData.motherName || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, motherName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-aadhaar">Aadhaar Number</Label>
                <Input
                  id="edit-aadhaar"
                  value={editFormData.aadhaarNumber || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, aadhaarNumber: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-village">Village/Place</Label>
                <Input
                  id="edit-village"
                  value={editFormData.village || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, village: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-district">District</Label>
                <Input
                  id="edit-district"
                  value={editFormData.district || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={editFormData.state || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-previous-school">Previous School</Label>
                <Input
                  id="edit-previous-school"
                  value={editFormData.previousSchool || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, previousSchool: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-class">Class Applying</Label>
                <Input
                  id="edit-class"
                  value={editFormData.classApplying || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, classApplying: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFormData.status || ""}
                  onValueChange={(value) => setEditFormData({ ...editFormData, status: value as any })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="exam_scheduled">Exam Scheduled</SelectItem>
                    <SelectItem value="exam_done">Exam Done</SelectItem>
                    <SelectItem value="selected_for_interview">Selected for Interview</SelectItem>
                    <SelectItem value="interview_done">Interview Done</SelectItem>
                    <SelectItem value="admitted">Admitted</SelectItem>
                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-address">Full Address</Label>
                <Input
                  id="edit-address"
                  value={editFormData.address || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
