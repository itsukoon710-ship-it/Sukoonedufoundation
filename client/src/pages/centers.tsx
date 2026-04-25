import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Plus, Edit, Trash2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Center } from "@shared/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const centerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  location: z.string().min(5, "Location is required"),
  admissionYear: z.number().default(2026),
});
type CenterForm = z.infer<typeof centerSchema>;

export default function CentersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Center | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: centers = [], isLoading } = useQuery<Center[]>({
    queryKey: ["/api/centers"],
    queryFn: () => apiRequest("GET", "/api/centers"),
  });

  const form = useForm<CenterForm>({
    resolver: zodResolver(centerSchema),
    defaultValues: { name: "", location: "", admissionYear: 2026 },
  });

  const createMutation = useMutation({
    mutationFn: (data: CenterForm) => apiRequest("POST", "/api/centers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/centers"] });
      toast({ title: "Center Created" });
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CenterForm> }) =>
      apiRequest("PUT", `/api/centers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/centers"] });
      toast({ title: "Center Updated" });
      setEditing(null);
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/centers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/centers"] });
      toast({ title: "Center Deleted" });
      setDeleteId(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const onSubmit = (data: CenterForm) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const openEdit = (center: Center) => {
    setEditing(center);
    form.reset({ name: center.name, location: center.location, admissionYear: center.admissionYear });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", location: "", admissionYear: 2026 });
    setOpen(true);
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Centers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage NGO learning centers</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Center
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : centers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No centers yet</p>
          <p className="text-sm">Add your first learning center</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map(center => (
            <Card key={center.id} className="hover-elevate" data-testid={`card-center-${center.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{center.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">{center.location}</p>
                    </div>
                    <Badge variant="outline" className="text-xs mt-2">
                      {center.admissionYear} Cycle
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(center)}
                    data-testid={`button-edit-center-${center.id}`}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteId(center.id)}
                    data-testid={`button-delete-center-${center.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Center" : "Add Center"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Center Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Delhi Learning Center" data-testid="input-center-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Karol Bagh, New Delhi" data-testid="input-center-location" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-center"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Center?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Students linked to this center may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-center"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
