import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Plus, Edit, Trash2, Settings2, CheckCircle2, AlertCircle, GripVertical, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Subject, AdmissionYear } from "@shared/schema";

const subjectSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(2, "Code is required"),
  maxMarks: z.number().min(1).max(1000),
  passingMarks: z.number().min(1).max(1000),
  admissionYear: z.number().default(2026),
  isActive: z.boolean().default(true),
  orderIndex: z.number().default(0),
});
type SubjectForm = z.infer<typeof subjectSchema>;

const selectionModeLabels: Record<string, { label: string; desc: string }> = {
  all_pass: { label: "All Subjects Pass", desc: "Student must pass every active subject to be selected for interview" },
  min_subjects: { label: "Minimum Subjects Pass", desc: "Student must pass at least a set number of subjects" },
  total_marks: { label: "Total Marks Cutoff", desc: "Student's total marks across all subjects must meet a minimum" },
};

export default function ExamSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: admissionYears = [], isLoading: yearsLoading } = useQuery<AdmissionYear[]>({
    queryKey: ["/api/admission-years"],
  });

  const activeYear = admissionYears.find(y => y.isActive);
  const resultsPublished = activeYear?.resultsPublished || false;
  const publicRegistrationEnabled = activeYear?.publicRegistrationEnabled ?? true;

  const form = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", code: "", maxMarks: 100, passingMarks: 33, admissionYear: 2026, isActive: true, orderIndex: 0 },
  });

  const yearForm = useForm({
    defaultValues: {
      selectionMode: activeYear?.selectionMode || "all_pass",
      minSubjectsToPass: activeYear?.minSubjectsToPass || 3,
      totalCutoffMarks: activeYear?.totalCutoffMarks || 120,
    },
  });

  // Sync yearForm when activeYear loads
  useState(() => {
    if (activeYear) {
      yearForm.reset({
        selectionMode: activeYear.selectionMode,
        minSubjectsToPass: activeYear.minSubjectsToPass,
        totalCutoffMarks: activeYear.totalCutoffMarks,
      });
    }
  });

  const createSubject = useMutation({
    mutationFn: (data: SubjectForm) => apiRequest("POST", "/api/subjects", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({ title: "Subject Created" });
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSubject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubjectForm> }) =>
      apiRequest("PUT", `/api/subjects/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({ title: "Subject Updated" });
      setOpen(false);
      setEditing(null);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSubject = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/subjects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({ title: "Subject Deleted" });
      setDeleteId(null);
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PUT", `/api/subjects/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/subjects"] }),
  });

  const updateYearConfig = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/admission-years/${activeYear?.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admission-years"] });
      toast({ title: "Selection rules updated successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const publishResultsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/publish-results", { admissionYear: activeYear?.year }),
    onSuccess: () => {
      toast({
        title: "Results Published Successfully!",
        description: "Students can now check their results on the public portal.",
        duration: 5000,
      });
      qc.invalidateQueries({ queryKey: ["/api/admission-years"] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Publish Results",
        description: err.message || "An error occurred while publishing results.",
        variant: "destructive"
      });
    },
  });

  const unpublishResultsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/unpublish-results", { admissionYear: activeYear?.year }),
    onSuccess: () => {
      toast({
        title: "Results Unpublished",
        description: "Results are now hidden from the public portal.",
        duration: 5000,
      });
      qc.invalidateQueries({ queryKey: ["/api/admission-years"] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Unpublish Results",
        description: err.message || "An error occurred while unpublishing results.",
        variant: "destructive"
      });
    },
  });

  const togglePublicRegistrationMutation = useMutation({
    mutationFn: ({ enabled }: { enabled: boolean }) => apiRequest("POST", "/api/admin/toggle-public-registration", { admissionYear: activeYear?.year, enabled }),
    onSuccess: (_, { enabled }) => {
      toast({
        title: enabled ? "Public Registration Enabled" : "Public Registration Disabled",
        description: enabled ? "Students can now register online." : "Public registration is now closed.",
        duration: 5000,
      });
      qc.invalidateQueries({ queryKey: ["/api/admission-years"] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Update Registration Status",
        description: err.message || "An error occurred while updating registration status.",
        variant: "destructive"
      });
    },
  });

  const onSubmitSubject = (data: SubjectForm) => {
    if (editing) updateSubject.mutate({ id: editing.id, data });
    else createSubject.mutate(data);
  };

  const openEdit = (subject: Subject) => {
    setEditing(subject);
    form.reset({
      name: subject.name, code: subject.code, maxMarks: subject.maxMarks,
      passingMarks: subject.passingMarks, admissionYear: subject.admissionYear,
      isActive: subject.isActive, orderIndex: subject.orderIndex,
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    const nextOrder = subjects.length + 1;
    form.reset({ name: "", code: "", maxMarks: 100, passingMarks: 33, admissionYear: 2026, isActive: true, orderIndex: nextOrder });
    setOpen(true);
  };

  const onSaveYearConfig = (data: any) => {
    updateYearConfig.mutate({
      selectionMode: data.selectionMode,
      minSubjectsToPass: parseInt(data.minSubjectsToPass),
      totalCutoffMarks: parseInt(data.totalCutoffMarks),
    });
  };

  const selectionMode = yearForm.watch("selectionMode");
  const activeSubjects = subjects.filter(s => s.isActive);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Exam Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure subjects and selection rules for the admission exam</p>
      </div>

      {/* Selection Rules Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Selection Rules</CardTitle>
          </div>
          <CardDescription>
            Set how students are selected for interview based on exam performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {yearsLoading ? (
            <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-64" /></div>
          ) : !activeYear ? (
            <p className="text-muted-foreground text-sm">No active admission year found.</p>
          ) : (
            <form onSubmit={yearForm.handleSubmit(onSaveYearConfig)} className="space-y-5">
              <div className="space-y-3">
                <label className="text-sm font-medium">Selection Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(selectionModeLabels).map(([mode, info]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => yearForm.setValue("selectionMode", mode as any)}
                      className={`text-left p-3 rounded-lg border-2 transition-colors ${
                        selectionMode === mode
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground"
                      }`}
                      data-testid={`select-mode-${mode}`}
                    >
                      <p className="font-medium text-sm">{info.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{info.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selectionMode === "min_subjects" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Minimum Subjects to Pass</label>
                  <p className="text-xs text-muted-foreground">Student must pass at least this many subjects</p>
                  <Input
                    type="number"
                    min={1}
                    max={activeSubjects.length || 10}
                    className="w-32"
                    {...yearForm.register("minSubjectsToPass", { valueAsNumber: true })}
                    data-testid="input-min-subjects"
                  />
                </div>
              )}

              {selectionMode === "total_marks" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Total Marks Cutoff</label>
                  <p className="text-xs text-muted-foreground">
                    Minimum total marks required across all subjects (max possible: {activeSubjects.reduce((s, sub) => s + sub.maxMarks, 0)})
                  </p>
                  <Input
                    type="number"
                    min={0}
                    className="w-40"
                    {...yearForm.register("totalCutoffMarks", { valueAsNumber: true })}
                    data-testid="input-total-cutoff"
                  />
                </div>
              )}

              {/* Current rule summary */}
              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Current rule:</p>
                  {selectionMode === "all_pass" && <p className="text-muted-foreground">Student must pass ALL {activeSubjects.length} active subjects</p>}
                  {selectionMode === "min_subjects" && <p className="text-muted-foreground">Student must pass at least {yearForm.watch("minSubjectsToPass")} out of {activeSubjects.length} subjects</p>}
                  {selectionMode === "total_marks" && <p className="text-muted-foreground">Student must score at least {yearForm.watch("totalCutoffMarks")} total marks</p>}
                </div>
              </div>

              <Button type="submit" disabled={updateYearConfig.isPending} data-testid="button-save-selection-rules">
                {updateYearConfig.isPending ? "Saving..." : "Save Selection Rules"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Registration & Results Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Registration & Results</CardTitle>
          </div>
          <CardDescription>
            Control public registration and result publishing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {yearsLoading ? (
            <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-64" /></div>
          ) : !activeYear ? (
            <p className="text-muted-foreground text-sm">No active admission year found.</p>
          ) : (
            <div className="space-y-6">
              {/* Result Publishing Actions */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Result Publishing</Label>
                {resultsPublished ? (
                  <Button
                    variant="outline"
                    onClick={() => unpublishResultsMutation.mutate()}
                    disabled={unpublishResultsMutation.isPending}
                    className="border-red-500 text-red-600 hover:bg-red-50"
                    data-testid="button-unpublish-results"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {unpublishResultsMutation.isPending ? "Unpublishing..." : "Unpublish Results"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => publishResultsMutation.mutate()}
                    disabled={publishResultsMutation.isPending}
                    className="border-green-500 text-green-600 hover:bg-green-50"
                    data-testid="button-publish-results"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {publishResultsMutation.isPending ? "Publishing..." : "Publish Results"}
                  </Button>
                )}
              </div>

              {/* Public Registration Toggle */}
              <div>
                <Label htmlFor="public-registration-toggle" className="text-sm font-medium mb-3 block">
                  Public Registration
                </Label>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer">
                      <Switch
                        id="public-registration-toggle"
                        checked={publicRegistrationEnabled}
                        disabled={togglePublicRegistrationMutation.isPending}
                      />
                      <span className="text-sm text-muted-foreground">
                        {publicRegistrationEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {publicRegistrationEnabled ? "Disable Public Registration?" : "Enable Public Registration?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {publicRegistrationEnabled
                          ? "This will close the public registration page and prevent new student registrations. Existing registrations will remain unaffected."
                          : "This will open the public registration page and allow students to register online."
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => togglePublicRegistrationMutation.mutate({ enabled: !publicRegistrationEnabled })}
                        disabled={togglePublicRegistrationMutation.isPending}
                      >
                        {togglePublicRegistrationMutation.isPending ? "Updating..." : "Confirm"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subjects Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <div>
                <CardTitle className="text-base">Subjects</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {activeSubjects.length} active · {subjects.length} total — coordinators enter marks per subject
                </CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={openCreate} data-testid="button-add-subject">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {subjectsLoading ? (
            <div className="px-6 pb-4 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No subjects yet. Add your first subject.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {subjects
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map(subject => (
                <div
                  key={subject.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                  data-testid={`row-subject-${subject.id}`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{subject.name}</span>
                      <Badge variant="outline" className="text-xs font-mono">{subject.code}</Badge>
                      {!subject.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Max: {subject.maxMarks} marks · Pass: {subject.passingMarks} marks
                      <span className="ml-2 text-amber-600 font-medium">({Math.round(subject.passingMarks / subject.maxMarks * 100)}%)</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={subject.isActive}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: subject.id, isActive: checked })}
                      data-testid={`toggle-subject-${subject.id}`}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(subject)}
                      data-testid={`button-edit-subject-${subject.id}`}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(subject.id)}
                      data-testid={`button-delete-subject-${subject.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Info */}
      {subjects.length > 0 && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Subject marks summary for 2026:</p>
                <p className="text-muted-foreground">
                  Total active subjects: {activeSubjects.length} ·
                  Total max marks: {activeSubjects.reduce((s, sub) => s + sub.maxMarks, 0)} ·
                  Total passing marks needed: {activeSubjects.reduce((s, sub) => s + sub.passingMarks, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Subject" : "Add Subject"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitSubject)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Mathematics" data-testid="input-subject-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. MATH-C" data-testid="input-subject-code" />
                  </FormControl>
                  <FormDescription className="text-xs">Short code used to identify the subject</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="maxMarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Marks</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-max-marks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="passingMarks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passing Marks</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-passing-marks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="orderIndex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-order-index" />
                  </FormControl>
                  <FormDescription className="text-xs">Lower numbers appear first</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createSubject.isPending || updateSubject.isPending} data-testid="button-save-subject">
                  {createSubject.isPending || updateSubject.isPending ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the subject and all marks entered for it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteSubject.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-subject"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
