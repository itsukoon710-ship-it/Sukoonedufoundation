import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserCheck, Plus, Edit, Trash2, MapPin, Key, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, Center } from "@shared/schema";

const coordSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  centerId: z.string().optional(),
  admissionYear: z.number().default(2026),
  role: z.enum(["admin", "coordinator", "examiner", "cvu"]).default("coordinator"),
});
type CoordForm = z.infer<typeof coordSchema>;

export default function CoordinatorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });
  const { data: centers = [] } = useQuery<Center[]>({
    queryKey: ["/api/centers"],
  });
  const { data: studentsData } = useQuery<{ students: any[]; total: number }>({
    queryKey: ["/api/students"],
  });
  const students = studentsData?.students ?? [];

  const coordinators = users;

  const form = useForm<CoordForm>({
    resolver: zodResolver(coordSchema),
    defaultValues: { name: "", username: "", password: "", admissionYear: 2026, role: "coordinator" },
  });

  const createMutation = useMutation({
    mutationFn: (data: CoordForm) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      qc.invalidateQueries({ queryKey: ["/api/coordinators"] });
      toast({ title: "User Created" });
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CoordForm> }) =>
      apiRequest("PUT", `/api/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      qc.invalidateQueries({ queryKey: ["/api/coordinators"] });
      toast({ title: "User Updated" });
      setEditing(null);
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      qc.invalidateQueries({ queryKey: ["/api/coordinators"] });
      toast({ title: "User Removed" });
      setDeleteId(null);
    },
  });

  const toggleMarksEntryMutation = useMutation({
    mutationFn: ({ id, marksEntryPermission }: { id: string; marksEntryPermission: boolean }) =>
      apiRequest("PUT", `/api/users/${id}`, { marksEntryPermission }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      qc.invalidateQueries({ queryKey: ["/api/coordinators"] });
      toast({ title: "Marks Entry Permission Updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const onSubmit = (data: CoordForm) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const openEdit = (coord: any) => {
    setEditing(coord);
    form.reset({ name: coord.name, username: coord.username, password: "", centerId: coord.centerId || undefined, admissionYear: coord.admissionYear, role: coord.role || "coordinator" });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", username: "", password: "", admissionYear: 2026, role: "coordinator" });
    setOpen(true);
  };

  const getStudentCount = (coordinatorId: string) =>
    students.filter((s: any) => s.coordinatorId === coordinatorId).length;

  const getCenterName = (centerId: string | null) =>
    centerId ? centers.find(c => c.id === centerId)?.name || "Unknown" : "Not Assigned";

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage system users and their roles</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-coordinator">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : coordinators.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg text-muted-foreground">
          <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No users yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coordinators.map(coord => (
            <Card key={coord.id} className="hover-elevate" data-testid={`card-coordinator-${coord.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {coord.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{coord.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">@{coord.username}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground truncate">
                        {getCenterName(coord.centerId)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-primary">{getStudentCount(coord.id)}</p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="text-xs">
                      {coord.admissionYear} Cycle
                    </Badge>
                    <Badge variant={coord.role === "admin" ? "default" : coord.role === "examiner" ? "secondary" : "outline"} className="text-xs">
                      {coord.role === "admin" ? "Administrator" : coord.role === "examiner" ? "Examiner" : "Coordinator"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(coord)}
                    data-testid={`button-edit-coordinator-${coord.id}`}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={coord.marksEntryPermission ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleMarksEntryMutation.mutate({ id: coord.id, marksEntryPermission: !coord.marksEntryPermission })}
                    disabled={toggleMarksEntryMutation.isPending}
                    data-testid={`button-marks-entry-${coord.id}`}
                    title={coord.marksEntryPermission ? "Revoke Marks Entry Access" : "Grant Marks Entry Access"}
                  >
                    <ClipboardList className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteId(coord.id)}
                    data-testid={`button-delete-coordinator-${coord.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Coordinator name" data-testid="input-coord-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl><Input {...field} placeholder="login username" data-testid="input-coord-username" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{editing ? "New Password (leave blank to keep)" : "Password"}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input {...field} type="password" placeholder="••••••" className="pl-9" data-testid="input-coord-password" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="role" render={({ field }) => (
                 <FormItem>
                   <FormLabel>Role</FormLabel>
                   <FormControl>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                       <SelectTrigger data-testid="select-coord-role">
                         <SelectValue placeholder="Select role" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="admin">Administrator</SelectItem>
                         <SelectItem value="coordinator">Coordinator</SelectItem>
                         <SelectItem value="examiner">Examiner</SelectItem>
                         <SelectItem value="cvu">CVU (Room Allotment & Gate Entry Only)</SelectItem>
                       </SelectContent>
                     </Select>
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )} />
              <FormField control={form.control} name="centerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Center</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-coord-center">
                        <SelectValue placeholder="Select center" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {centers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-coordinator"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the user account. Their students will remain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-coordinator"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
