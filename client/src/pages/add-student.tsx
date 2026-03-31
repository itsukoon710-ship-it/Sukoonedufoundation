import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Link } from "wouter";
import type { Center, User } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.coerce.number().min(5, "Age must be at least 5").max(25, "Age must be at most 25"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"]),
  fatherName: z.string().min(2, "Father's name is required"),
  fatherOccupation: z.string().min(2, "Father's occupation is required"),
  motherName: z.string().min(2, "Mother's name is required"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Mobile must be a valid 10-digit Indian mobile number"),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits"),
  village: z.string().min(2, "Village/Place is required"),
  district: z.string().min(2, "District is required"),
  state: z.string().min(2, "State is required"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  previousSchool: z.string().min(2, "Previous school is required"),
  classApplying: z.string().min(1, "Class is required"),
  examDate: z.string().optional(),
  examCenter: z.string().optional(),
  centerId: z.string().optional(),
  coordinatorId: z.string().optional(),
  admissionYear: z.number().default(2026),
  declaration: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export default function AddStudentPage() {
  const { data: user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: centers = [] } = useQuery<Center[]>({ queryKey: ["/api/centers"] });
  const { data: coordinators = [] } = useQuery<User[]>({
    queryKey: ["/api/coordinators"],
    enabled: user?.role === "admin",
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", age: undefined, dateOfBirth: "",
      gender: "Male", fatherName: "", fatherOccupation: "", motherName: "",
      mobile: "", aadhaarNumber: "", village: "", district: "", state: "",
      address: "", previousSchool: "", classApplying: "", admissionYear: 2026,
      examDate: "", examCenter: "",
      centerId: user?.role === "coordinator" ? (user.centerId || undefined) : undefined,
      coordinatorId: user?.role === "coordinator" ? user.id : undefined,
      declaration: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/students", data),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/students"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Student Registered", description: `Application ID: ${data.applicationId}` });
      navigate("/students");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to register student", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  const classes = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh"
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/students"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Register Student</h1>
          <p className="text-muted-foreground text-sm">Fill in the student enrollment form</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic student details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name *</FormLabel>
                    <FormControl><Input {...field} placeholder="Full name" data-testid="input-student-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age *</FormLabel>
                    <FormControl><Input {...field} type="number" placeholder="Age" data-testid="input-age" min={5} max={25} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
                    <FormControl><Input {...field} type="date" data-testid="input-dob" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Parent/Guardian Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Parent / Guardian Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="fatherName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father's Name *</FormLabel>
                    <FormControl><Input {...field} placeholder="Father's full name" data-testid="input-father-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fatherOccupation" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father's Occupation *</FormLabel>
                    <FormControl><Input {...field} placeholder="Father's occupation" data-testid="input-father-occupation" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="motherName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother's Name *</FormLabel>
                  <FormControl><Input {...field} placeholder="Mother's full name" data-testid="input-mother-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="mobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number *</FormLabel>
                    <FormControl><Input {...field} placeholder="10-digit mobile" data-testid="input-mobile" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="aadhaarNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhaar Number *</FormLabel>
                    <FormControl><Input {...field} placeholder="12-digit Aadhaar" data-testid="input-aadhaar" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Address Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Address Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="village" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Village / Place *</FormLabel>
                    <FormControl><Input {...field} placeholder="Village or place" data-testid="input-village" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="district" render={({ field }) => (
                  <FormItem>
                    <FormLabel>District *</FormLabel>
                    <FormControl><Input {...field} placeholder="District" data-testid="input-district" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-state">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {indianStates.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Full residential address" rows={2} data-testid="input-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="previousSchool" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current School Name *</FormLabel>
                    <FormControl><Input {...field} placeholder="School name" data-testid="input-previous-school" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="classApplying" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Class *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-class">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Exam Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Exam Details</CardTitle>
              <CardDescription>Optional — can be updated later</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="examDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Date</FormLabel>
                    <FormControl><Input {...field} type="date" data-testid="input-exam-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="examCenter" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Center</FormLabel>
                    <FormControl><Input {...field} placeholder="Exam center name" data-testid="input-exam-center" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {user?.role === "admin" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="centerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Center</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-center">
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
                  <FormField control={form.control} name="coordinatorId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coordinator</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-coordinator">
                            <SelectValue placeholder="Select coordinator" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {coordinators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/students">Cancel</Link>
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-student">
              {mutation.isPending ? "Registering..." : "Register Student"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
