import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Phone, MapPin, GraduationCap, CheckCircle, Search, Bell, Calendar } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  // Student Details
  name: z.string().min(2, "Full name must be at least 2 characters"),
  age: z.coerce.number().min(5, "Age must be at least 5").max(25, "Age must be at most 25"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  
  // Parent/Guardian Details
  fatherName: z.string().min(2, "Father's name must be at least 2 characters"),
  fatherOccupation: z.string().min(2, "Father's occupation is required"),
  motherName: z.string().min(2, "Mother's name must be at least 2 characters"),
  
  // Contact Information
  phone: z.string().regex(/^[6-9]\d{9}$/, "Phone number must be a valid 10-digit Indian mobile number"),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits"),
  
  // Address Details
  village: z.string().min(2, "Village/Place is required"),
  district: z.string().min(2, "District is required"),
  state: z.string().min(2, "State is required"),
  address: z.string().min(10, "Full address must be at least 10 characters"),
  
  // Educational Information
  previousSchool: z.string().min(2, "Current school name is required"),
  classApplying: z.string().min(1, "Current class is required"),
  
  // Declaration
  declaration: z.boolean().refine(val => val === true, {
    message: "You must agree to the declaration to submit the application",
  }),
});

type FormData = z.infer<typeof formSchema>;

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh"
];

const classes = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];

export default function PublicRegistrationPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [resultChecked, setResultChecked] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      age: undefined,
      dateOfBirth: "",
      fatherName: "",
      fatherOccupation: "",
      motherName: "",
      phone: "",
      aadhaarNumber: "",
      village: "",
      district: "",
      state: "",
      address: "",
      previousSchool: "",
      classApplying: "",
      declaration: false,
    },
  });

  // Check if results are published
  const { data: resultsPublished } = useQuery<{ published: boolean }>({
    queryKey: ["/api/public/results-published"],
  });

  // Check if public registration is enabled
  const { data: registrationStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/public/registration-enabled"],
  });

  // Check result by roll number
  const checkResultMutation = useMutation({
    mutationFn: (rollNum: string) => apiRequest("POST", "/api/public/check-result", { rollNumber: rollNum }),
    onSuccess: (data: any) => {
      setResultChecked(true);
      toast({ 
        title: "Result Found", 
        description: "Your result has been retrieved successfully.",
        duration: 5000,
      });
    },
    onError: (err: any) => {
      toast({ 
        title: "Result Not Found", 
        description: err.message || "Could not find result for this roll number. Please check and try again.", 
        variant: "destructive" 
      });
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/public/register", data),
    onSuccess: (data: any) => {
      setApplicationId(data.applicationId);
      setSubmitted(true);
      toast({ 
        title: "Application Submitted Successfully!", 
        description: `Your Application ID is: ${data.applicationId}`,
        duration: 10000,
      });
    },
    onError: (err: any) => {
      toast({ 
        title: "Submission Failed", 
        description: err.message || "Failed to submit application. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  const handleCheckResult = () => {
    if (!rollNumber.trim()) {
      toast({ 
        title: "Roll Number Required", 
        description: "Please enter your roll number to check the result.", 
        variant: "destructive" 
      });
      return;
    }
    checkResultMutation.mutate(rollNumber.trim());
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for submitting your application. Your application has been received and is being processed.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 mb-2">Your Application ID</p>
              <p className="text-2xl font-bold text-blue-600">{applicationId}</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Please save this Application ID for future reference. You will need it to check your application status.
            </p>
            <Button 
              onClick={() => {
                setSubmitted(false);
                form.reset();
              }}
              className="w-full"
            >
              Submit Another Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Persistent Notification Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 flex-wrap">
          <Bell className="w-5 h-5 animate-pulse flex-shrink-0" />
          <div className="flex items-center gap-2 text-center">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold text-sm md:text-base">
              2026 Sukoon Edu Foundation Exam Scheduled for 26 April 2026
            </span>
          </div>
        </div>
      </div>

      {/* Check if registration is enabled */}
      {registrationStatus && !registrationStatus.enabled && (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full shadow-xl">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="w-12 h-12 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Registration Closed</h2>
              <p className="text-gray-600 mb-6">
                Admission registration has closed. Please check back later or contact support for more information.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {(!registrationStatus || registrationStatus.enabled) && (
        <div className="py-6 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header with Sukoon Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/Logo.png" 
                alt="Sukoon Edu Foundation Logo" 
                className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-full shadow-lg border-4 border-white bg-white"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Sukoon Edu Foundation</h1>
            <h2 className="text-lg md:text-xl text-gray-700 mb-2">Student Registration Portal</h2>
            <p className="text-gray-500 text-sm md:text-base">Please fill in all the required fields accurately</p>
          </div>

          {/* Tabs for Registration and Result Checking */}
          <Tabs defaultValue="registration" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-md">
              <TabsTrigger value="registration" className="text-sm md:text-base py-3">
                <User className="w-4 h-4 mr-2" />
                Registration
              </TabsTrigger>
              <TabsTrigger value="results" className="text-sm md:text-base py-3">
                <Search className="w-4 h-4 mr-2" />
                Check Result
              </TabsTrigger>
            </TabsList>

            {/* Registration Tab */}
            <TabsContent value="registration">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Student Details */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-blue-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Student Details
                      </CardTitle>
                      <CardDescription className="text-blue-100">
                        Basic information about the student
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter student's full name" className="h-11" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Age *</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" placeholder="Enter age" className="h-11" min={5} max={25} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth *</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Parent/Guardian Details */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-green-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Parent / Guardian Details
                      </CardTitle>
                      <CardDescription className="text-green-100">
                        Information about parent or guardian
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fatherName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Father's Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter father's full name" className="h-11" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fatherOccupation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Father's Occupation *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter father's occupation" className="h-11" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="motherName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mother's Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter mother's full name" className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Contact Information */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-purple-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        Contact Information
                      </CardTitle>
                      <CardDescription className="text-purple-100">
                        Phone number and Aadhaar details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="10-digit mobile number" className="h-11" maxLength={10} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="aadhaarNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Aadhaar Number *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="12-digit Aadhaar number" className="h-11" maxLength={12} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Address Details */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-orange-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Address Details
                      </CardTitle>
                      <CardDescription className="text-orange-100">
                        Residential address information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="village"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Village / Place *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter village or place" className="h-11" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="district"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>District *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter district" className="h-11" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11">
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
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Address *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter complete residential address" className="h-11" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Educational Information */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-teal-600 text-white rounded-t-lg">
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5" />
                        Educational Information
                      </CardTitle>
                      <CardDescription className="text-teal-100">
                        Current school and class details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="previousSchool"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current School Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter current school name" className="h-11" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="classApplying"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Class *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select class" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {classes.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Declaration */}
                  <Card className="shadow-lg border-2 border-blue-200">
                    <CardContent className="pt-6">
                      <FormField
                        control={form.control}
                        name="declaration"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-1"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium leading-relaxed cursor-pointer">
                                I hereby confirm that the information provided is accurate and complete to the best of my knowledge. 
                                I understand that any false information may lead to rejection of the application.
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Submit Button */}
                  <div className="flex justify-center">
                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={mutation.isPending}
                      className="w-full md:w-auto px-12 py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                    >
                      {mutation.isPending ? "Submitting Application..." : "Submit Application"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Result Checking Tab */}
            <TabsContent value="results">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Check Your Result
                  </CardTitle>
                  <CardDescription className="text-indigo-100">
                    Enter your roll number to view your exam result
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {!resultsPublished?.published ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bell className="w-10 h-10 text-yellow-600 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">Results Under Process</h3>
                      <p className="text-gray-600 mb-4">
                        The results for the 2026 Sukoon Edu Foundation exam are currently being processed.
                      </p>
                      <p className="text-sm text-gray-500">
                        Please check back later. Results will be published soon.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-700 mb-2">
                            Roll Number *
                          </label>
                          <Input
                            id="rollNumber"
                            type="text"
                            placeholder="e.g., SKN-2026-0001"
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            className="h-12 text-lg"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Format: SKN-YYYY-NNNN (e.g., SKN-2026-0001)
                          </p>
                        </div>
                        <Button 
                          onClick={handleCheckResult}
                          disabled={checkResultMutation.isPending}
                          className="w-full h-12 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700"
                        >
                          {checkResultMutation.isPending ? "Checking..." : "Check Result"}
                        </Button>
                      </div>

                      {resultChecked && checkResultMutation.data && (
                        <Card className={`border-2 ${
                          (checkResultMutation.data as any).selectedForInterview 
                            ? "border-green-500 bg-green-50" 
                            : "border-orange-500 bg-orange-50"
                        }`}>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              {(checkResultMutation.data as any).selectedForInterview ? (
                                <>
                                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                  </div>
                                  <h3 className="text-2xl font-bold text-green-700 mb-2">
                                    Congratulations!
                                  </h3>
                                  <p className="text-lg text-green-600 font-semibold mb-4">
                                    You are shortlisted for interview
                                  </p>
                                  <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-gray-600 mb-2">
                                      <span className="font-semibold">Total Marks:</span> {(checkResultMutation.data as any).marks} / {(checkResultMutation.data as any).maxMarks}
                                    </p>
                                    <p className="text-gray-600">
                                      <span className="font-semibold">Status:</span> Selected for Interview
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bell className="w-10 h-10 text-orange-600" />
                                  </div>
                                  <h3 className="text-2xl font-bold text-orange-700 mb-2">
                                    Result Declared
                                  </h3>
                                  <p className="text-lg text-orange-600 font-semibold mb-4">
                                    Thank you for participating
                                  </p>
                                  <div className="bg-white rounded-lg p-4 shadow-sm">
                                    <p className="text-gray-600 mb-2">
                                      <span className="font-semibold">Total Marks:</span> {(checkResultMutation.data as any).marks} / {(checkResultMutation.data as any).maxMarks}
                                    </p>
                                    <p className="text-gray-600">
                                      <span className="font-semibold">Status:</span> Not Selected for Interview
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-gray-500">
            <p>© 2026 Sukoon Edu Foundation. All rights reserved.</p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
