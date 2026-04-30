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
import { User, Phone, MapPin, GraduationCap, CheckCircle, Search, Bell, Calendar, Download, Printer, QrCode, MessageCircle } from "lucide-react";
import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdmitCard } from "@/components/admit-card";

const formSchema = z.object({
  // Student Details
  name: z.string().min(2, "Full name must be at least 2 characters"),
   age: z.coerce.number().min(10, "Age must be at least 10 years").max(12, "Age must be at most 12 years"),
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

const classes = ["Class 6"];

export default function PublicRegistrationPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [studentData, setStudentData] = useState<any>(null);
  const [rollNumber, setRollNumber] = useState("");
  const [resultChecked, setResultChecked] = useState(false);
  // Admit card states
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [admitCardLoading, setAdmitCardLoading] = useState(false);
  const [admitCardFound, setAdmitCardFound] = useState(false);
  const [admitCardStudent, setAdmitCardStudent] = useState<any>(null);
  const [admitCardError, setAdmitCardError] = useState("");
  const admitCardPrintRef = useRef<HTMLDivElement>(null);

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
       setStudentData(data);
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

   // Fetch admit card by Aadhaar
   const admitCardMutation = useMutation({
     mutationFn: (aadhaar: string) => apiRequest("POST", "/api/public/find-by-aadhaar", { aadhaarNumber: aadhaar }),
     onSuccess: (data: any) => {
       setAdmitCardStudent(data);
       setAdmitCardFound(true);
       setAdmitCardError("");
       toast({ 
         title: "Admit Card Found", 
         description: "Your admit card has been retrieved successfully.",
         duration: 5000,
       });
     },
     onError: (err: any) => {
       setAdmitCardStudent(null);
       setAdmitCardFound(false);
       setAdmitCardError(err.message || "No student found with this Aadhaar number");
       toast({ 
         title: "Not Found", 
         description: err.message || "Could not find admit card for this Aadhaar number. Please check and try again.", 
         variant: "destructive" 
       });
     },
   });


  const calculateAgeFromDOB = (dob: string): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const selectedDate = e.target.value;
    if (!selectedDate) {
      onChange("");
      return;
    }
    
     const minDate = new Date("2014-04-01");
     const maxDate = new Date("2016-03-31");
    const birthDate = new Date(selectedDate);
    
     if (birthDate < minDate || birthDate > maxDate) {
       alert("You are not eligible");
       onChange("");
       return;
     }
    
    onChange(selectedDate);
    
    const age = calculateAgeFromDOB(selectedDate);
    if (age !== null) {
      form.setValue("age", age);
    }
  };

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

  const handleFetchAdmitCard = () => {
    if (!aadhaarNumber.trim()) {
      toast({ 
        title: "Aadhaar Number Required", 
        description: "Please enter your Aadhaar number to download admit card.", 
        variant: "destructive" 
      });
      return;
    }
    if (aadhaarNumber.length !== 12) {
      toast({ 
        title: "Invalid Aadhaar", 
        description: "Aadhaar number must be 12 digits.", 
        variant: "destructive" 
      });
      return;
    }
    setAdmitCardFound(false);
    setAdmitCardError("");
    admitCardMutation.mutate(aadhaarNumber.trim());
  };

  const handlePrintAdmitCard = () => {
    const printContent = admitCardPrintRef.current;
    if (!printContent) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admit Card — ${admitCardStudent?.name} — ${admitCardStudent?.applicationId}</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
            width: 100%;
            height: 100%;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div id="admit-card-container">
          ${printContent.outerHTML}
        </div>
      </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const handleDownloadAdmitCard = () => {
    handlePrintAdmitCard();
  };

  if (submitted) {
    // Function to generate and download admit card
    const handleDownloadAdmitCard = async () => {
      try {
        // Fetch student data by application ID
        const response = await fetch(`/api/public/student/${applicationId}`);
        if (!response.ok) throw new Error("Failed to fetch student data");
        const student = await response.json();
        
        // Generate QR code URL
        const qrData = [
          `SUKOON NGO - ADMIT CARD`,
          `App ID: ${student.applicationId}`,
          `Name: ${student.name}`,
          `Father: ${student.fatherName}`,
          `DOB: ${student.dateOfBirth}`,
          `Class: ${student.classApplying}`,
          `Center: ${student.examCenter || "Sukoon Edu village, Andhaka village, Sudaka, Nuh district, Haryana Pin- 122107"}`,
           `Date: 10 May, 2026`,
          `Year: ${student.admissionYear}`,
        ].join("\n");
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&margin=4`;
        
        // Create A4 printable HTML
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Admit Card - ${student.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              @page { size: A4 portrait; margin: 10mm; }
              @media print { 
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
              }
            </style>
          </head>
          <body className="p-4">
            <div style="width: 100%; max-width: 700px; margin: 0 auto;">
              <!-- Header -->
              <div style="background: linear-gradient(to right, #1e3a8a, #1e40af, #1d4ed8); color: white; padding: 20px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                  <div style="width: 64px; height: 64px; background: white; border-radius: 8px; padding: 4px;">
                    <img src="/Logo.png" style="width: 100%; height: 100%; object-contain;" />
                  </div>
                  <div style="flex: 1;">
                    <h2 style="font-weight: bold; font-size: 18px;">Sukoon Edu Foundation</h2>
                    <p style="color: #93c5fd; font-size: 12px;">Admission Entrance Examination - ${student.admissionYear}</p>
                  </div>
                  <div style="text-align: right;">
                    <div style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3);">
                      <p style="font-size: 11px; font-weight: bold; letter-spacing: 1px;">ADMIT CARD</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Application ID -->
              <div style="background: #eff6ff; border-bottom: 1px solid #bfdbfe; padding: 10px 20px; display: flex; justify-content: space-between;">
                <div>
                  <p style="font-size: 10px; color: #2563eb; font-weight: 600; text-transform: uppercase;">Application No.</p>
                  <p style="font-weight: bold; font-size: 18px; color: #1e3a8a;">${student.applicationId}</p>
                </div>
                <div style="text-align: right;">
                  <p style="font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase;">Roll No.</p>
                  <p style="font-weight: bold; font-size: 18px; color: #1e3a8a;">${student.applicationId.replace("APP-", "").replace("-", "")}</p>
                </div>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 16px;">
                <div style="display: flex; gap: 20px;">
                  <!-- Photo -->
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                    <div style="width: 100px; height: 120px; border: 2px dashed #60a5fa; background: #f9fafb; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                      ${student.photoUrl ? 
                        `<img src="${student.photoUrl}" style="width: 100%; height: 100%; object-cover;" />` :
                        `<div style="display: flex; flex-direction: column; align-items: center;"><div style="width: 48px; height: 48px; border-radius: 50%; background: #dbeafe; display: flex; align-items: center; justify-content: center;"><span style="color: #1d4ed8; font-size: 24px; font-weight: bold;">${student.name.charAt(0)}</span></div><p style="font-size: 9px; color: #9ca3af; text-align: center;">Affix Photo</p></div>`
                      }
                    </div>
                    <p style="font-size: 9px; color: #6b7280;">35mm × 45mm</p>
                  </div>
                  
                  <!-- Student Details -->
                  <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex;"><span style="font-size: 10px; color: #6b7280; width: 100px;">Student Name:</span><span style="font-size: 11px; font-weight: bold; color: #1e3a8a;">${student.name}</span></div>
                    <div style="display: flex;"><span style="font-size: 10px; color: #6b7280; width: 100px;">Father's Name:</span><span style="font-size: 11px; color: #374151;">${student.fatherName}</span></div>
                    <div style="display: flex;"><span style="font-size: 10px; color: #6b7280; width: 100px;">Mother's Name:</span><span style="font-size: 11px; color: #374151;">${student.motherName}</span></div>
                    <div style="display: flex;"><span style="font-size: 10px; color: #6b7280; width: 100px;">Date of Birth:</span><span style="font-size: 11px; color: #374151;">${student.dateOfBirth}</span></div>
                    <div style="display: flex;"><span style="font-size: 10px; color: #6b7280; width: 100px;">Gender:</span><span style="font-size: 11px; color: #374151;">${student.gender}</span></div>
                    <div style="display: flex;"><span style="font-size: 10px; color: #6b7280; width: 100px;">Class Applying:</span><span style="font-size: 11px; font-weight: bold; color: #1e3a8a;">${student.classApplying}</span></div>
                  </div>
                  
                  <!-- QR Code -->
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                    <div style="border: 1px solid #d1d5db; padding: 4px; background: white; border-radius: 4px;">
                      <img src="${qrUrl}" width="96" height="96" />
                    </div>
                    <p style="font-size: 9px; color: #6b7280;">Scan to verify</p>
                  </div>
                </div>
                
                <!-- Exam Details -->
                <div style="margin-top: 16px; background: linear-gradient(to right, #1e3a8a, #1d4ed8); border-radius: 8px; padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                   <div><p style="font-size: 9px; color: #93c5fd;">Exam Date</p><p style="font-size: 11px; font-weight: bold; color: white;">10 May, 2026</p></div>
                  <div><p style="font-size: 9px; color: #93c5fd;">Exam Center</p><p style="font-size: 11px; font-weight: bold; color: white;">${student.examCenter || "Sukoon Edu village"}</p></div>
                  <div><p style="font-size: 9px; color: #93c5fd;">Reporting Time</p><p style="font-size: 11px; font-weight: bold; color: white;">09:00 AM</p></div>
                  <div><p style="font-size: 9px; color: #93c5fd;">Admission Year</p><p style="font-size: 11px; font-weight: bold; color: white;">${student.admissionYear}</p></div>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 16px; display: flex; justify-content: space-between; border-top: 2px solid #e5e7eb; padding-top: 12px;">
                  <div style="font-size: 10px; color: #4b5563;">
                    <p>Sukoon Edu Foundation - ${student.admissionYear}</p>
                  </div>
                  <div style="text-align: right;">
                    <div style="border-top: 2px solid #9ca3af; width: 112px; margin-bottom: 4px;"></div>
                    <p style="font-size: 9px; color: #6b7280;">Authorised Signature</p>
                  </div>
                </div>
                
                <!-- Instructions -->
                <div style="margin-top: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px;">
                  <p style="font-size: 9px; font-weight: bold; color: #92400e;">Instructions:</p>
                  <p style="font-size: 9px; color: #b45309;">Carry this admit card and a valid ID proof on the day of examination. No student will be allowed without admit card.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      } catch (error) {
        console.error("Error generating admit card:", error);
        toast({ title: "Error", description: "Failed to generate admit card. Please try again.", variant: "destructive" });
      }
    };
    
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
              <div className="flex items-center justify-center gap-3">
                <p className="text-2xl font-bold text-blue-600">{applicationId}</p>
                <Button 
                  onClick={handleDownloadAdmitCard}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Admit Card
                </Button>
              </div>
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
               2026 Sukoon Edu Foundation Exam Scheduled for 10 May 2026
            </span>
          </div>
        </div>
      </div>

      {/* Check if registration is enabled */}
      {registrationStatus && !registrationStatus.enabled && (
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
              <p className="text-gray-500 text-sm md:text-base">Registration is currently closed</p>
            </div>

            {/* Tabs for Registration and Admit Card Checking */}
            <Tabs defaultValue="registration" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-white shadow-md">
                <TabsTrigger 
                  value="registration" 
                  className="text-sm md:text-base py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <User className="w-4 h-4 mr-2" />
                  Registration
                </TabsTrigger>
                <TabsTrigger 
                  value="admit-card" 
                  className="text-sm md:text-base py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Admit Card
                </TabsTrigger>
                <TabsTrigger 
                  value="results" 
                  className="text-sm md:text-base py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Check Result
                </TabsTrigger>
              </TabsList>

              {/* Registration Tab - Closed Message */}
              <TabsContent value="registration">
                <Card className="shadow-lg">
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Bell className="w-12 h-12 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Registration is Closed</h2>
                    <p className="text-gray-600 mb-4">
                      Admission registration has closed. Please check back later or contact support for more information.
                    </p>
             <p className="text-sm text-gray-500">
               The Check Result feature is still available.
             </p>
             
             {/* Contact Buttons */}
             <div className="flex justify-center gap-4 my-6">
               <a 
                 href="tel:+918818076733" 
                 className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors"
               >
                 <Phone className="w-5 h-5" />
                 Call Us
               </a>
               <a 
                 href="https://wa.me/918818076733" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md transition-colors"
               >
                 <MessageCircle className="w-5 h-5" />
                 WhatsApp
               </a>
             </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Result Checking Tab - Always Available */}
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
                                      You have been shortlisted for the interview.
                                    </p>
                                    <div className="bg-white rounded-lg p-4 shadow-sm">
                                      <p className="text-gray-600 mb-2">
                                        <span className="font-semibold">Date:</span> 3rd May 2026
                                      </p>
                                      <p className="text-gray-600 mb-2">
                                        <span className="font-semibold">Venue:</span> Sukoon Edu Village, Andhaka, Nuh
                                      </p>
                                      <p className="text-gray-600 text-sm italic">
                                        Please be present on time with necessary documents.
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
                                      Not Selected for Interview
                                    </p>
                                    <div className="bg-white rounded-lg p-4 shadow-sm">
                                      <p className="text-gray-600 text-center">
                                        Thank you for appearing in our entrance examination. We regret to inform you that you have not been shortlisted for the interview at this stage. We truly appreciate your effort and interest. We encourage you to continue your learning journey and wish you all the very best for your future.
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
            {/* Admit Card Download Tab */}
            <TabsContent value="admit-card">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Admit Card
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    Enter your Aadhaar number to retrieve and download your admit card
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="aadhaarInputEnabled2" className="block text-sm font-medium text-gray-700 mb-2">
                          Aadhaar Number *
                        </label>
                        <Input
                          id="aadhaarInputEnabled2"
                          type="text"
                          placeholder="Enter your 12-digit Aadhaar number"
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(e.target.value)}
                          className="h-12 text-lg"
                          maxLength={12}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Enter the Aadhaar number you provided during registration
                        </p>
                      </div>
                      <Button 
                        onClick={handleFetchAdmitCard}
                        disabled={admitCardMutation.isPending}
                        className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                      >
                        {admitCardMutation.isPending ? "Fetching..." : "Download Admit Card"}
                      </Button>
                    </div>

                    {admitCardFound && admitCardStudent && (
                      <div className="space-y-4">
                        <Card className="border-2 border-blue-200 bg-blue-50">
                          <CardContent className="pt-6">
                            <div className="text-center mb-4">
                              <h3 className="text-xl font-bold text-blue-900">Admit Card Found!</h3>
                              <p className="text-gray-600">Application ID: {admitCardStudent.applicationId}</p>
                            </div>
                            <div ref={admitCardPrintRef} className="flex justify-center">
                              <AdmitCard student={admitCardStudent} subjects={admitCardStudent.subjects || []} />
                            </div>
                            <div className="flex justify-center gap-3 mt-4">
                              <Button
                                onClick={handlePrintAdmitCard}
                                variant="outline"
                                className="gap-2"
                              >
                                <Printer className="w-4 h-4" />
                                Print
                              </Button>
                              <Button
                                onClick={handleDownloadAdmitCard}
                                className="gap-2 bg-green-600 hover:bg-green-700"
                              >
                                <Download className="w-4 h-4" />
                                Download PDF
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {admitCardError && (
                      <Card className="border-2 border-red-200 bg-red-50">
                        <CardContent className="pt-6 text-center">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-red-600" />
                          </div>
                          <h3 className="text-xl font-semibold text-red-700 mb-2">Not Found</h3>
                          <p className="text-gray-600">{admitCardError}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

               {/* Admit Card Download Tab */}
               <TabsContent value="admit-card-disabled">
                 <Card className="shadow-lg">
                   <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-lg">
                     <CardTitle className="flex items-center gap-2">
                       <Download className="w-5 h-5" />
                       Download Admit Card
                     </CardTitle>
                     <CardDescription className="text-blue-100">
                       Enter your Aadhaar number to retrieve and download your admit card
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="pt-6">
                     <div className="space-y-6">
                       <div className="space-y-4">
                         <div>
                           <label htmlFor="aadhaarInputDisabled" className="block text-sm font-medium text-gray-700 mb-2">
                             Aadhaar Number *
                           </label>
                           <Input
                             id="aadhaarInputDisabled"
                             type="text"
                             placeholder="Enter your 12-digit Aadhaar number"
                             value={aadhaarNumber}
                             onChange={(e) => setAadhaarNumber(e.target.value)}
                             className="h-12 text-lg"
                             maxLength={12}
                           />
                           <p className="text-sm text-gray-500 mt-1">
                             Enter the Aadhaar number you provided during registration
                           </p>
                         </div>
                         <Button 
                           onClick={handleFetchAdmitCard}
                           disabled={admitCardMutation.isPending}
                           className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                         >
                           {admitCardMutation.isPending ? "Fetching..." : "Download Admit Card"}
                         </Button>
                       </div>

                       {admitCardFound && admitCardStudent && (
                         <div className="space-y-4">
                           <Card className="border-2 border-blue-200 bg-blue-50">
                             <CardContent className="pt-6">
                               <div className="text-center mb-4">
                                 <h3 className="text-xl font-bold text-blue-900">Admit Card Found!</h3>
                                 <p className="text-gray-600">Application ID: {admitCardStudent.applicationId}</p>
                               </div>
                               <div ref={admitCardPrintRef} className="flex justify-center">
                                 <AdmitCard student={admitCardStudent} subjects={admitCardStudent.subjects || []} />
                               </div>
                               <div className="flex justify-center gap-3 mt-4">
                                 <Button
                                   onClick={handlePrintAdmitCard}
                                   variant="outline"
                                   className="gap-2"
                                 >
                                   <Printer className="w-4 h-4" />
                                   Print
                                 </Button>
                                 <Button
                                   onClick={handleDownloadAdmitCard}
                                   className="gap-2 bg-green-600 hover:bg-green-700"
                                 >
                                   <Download className="w-4 h-4" />
                                   Download PDF
                                 </Button>
                               </div>
                             </CardContent>
                           </Card>
                         </div>
                       )}

                       {admitCardError && (
                         <Card className="border-2 border-red-200 bg-red-50">
                           <CardContent className="pt-6 text-center">
                             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                               <Search className="w-8 h-8 text-red-600" />
                             </div>
                             <h3 className="text-xl font-semibold text-red-700 mb-2">Not Found</h3>
                             <p className="text-gray-600">{admitCardError}</p>
                           </CardContent>
                         </Card>
                       )}
                     </div>
                   </CardContent>
                 </Card>
               </TabsContent>

             {/* Admit Card Download Tab */}
             <TabsContent value="admit-card">
               <Card className="shadow-lg">
                 <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-t-lg">
                   <CardTitle className="flex items-center gap-2">
                     <Download className="w-5 h-5" />
                     Download Admit Card
                   </CardTitle>
                   <CardDescription className="text-blue-100">
                     Enter your Aadhaar number to retrieve and download your admit card
                   </CardDescription>
                 </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="aadhaarInputEnabled" className="block text-sm font-medium text-gray-700 mb-2">
                            Aadhaar Number *
                          </label>
                          <Input
                            id="aadhaarInputEnabled"
                            type="text"
                            placeholder="Enter your 12-digit Aadhaar number"
                            value={aadhaarNumber}
                            onChange={(e) => setAadhaarNumber(e.target.value)}
                            className="h-12 text-lg"
                            maxLength={12}
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Enter the Aadhaar number you provided during registration
                          </p>
                        </div>
                        <Button 
                          onClick={handleFetchAdmitCard}
                          disabled={admitCardMutation.isPending}
                          className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                        >
                          {admitCardMutation.isPending ? "Fetching..." : "Download Admit Card"}
                        </Button>
                      </div>

                      {admitCardFound && admitCardStudent && (
                        <div className="space-y-4">
                          <Card className="border-2 border-blue-200 bg-blue-50">
                            <CardContent className="pt-6">
                              <div className="text-center mb-4">
                                <h3 className="text-xl font-bold text-blue-900">Admit Card Found!</h3>
                                <p className="text-gray-600">Application ID: {admitCardStudent.applicationId}</p>
                              </div>
                              <div ref={admitCardPrintRef} className="flex justify-center">
                                <AdmitCard student={admitCardStudent} subjects={admitCardStudent.subjects || []} />
                              </div>
                              <div className="flex justify-center gap-3 mt-4">
                                <Button
                                  onClick={handlePrintAdmitCard}
                                  variant="outline"
                                  className="gap-2"
                                >
                                  <Printer className="w-4 h-4" />
                                  Print
                                </Button>
                                <Button
                                  onClick={handleDownloadAdmitCard}
                                  className="gap-2 bg-green-600 hover:bg-green-700"
                                >
                                  <Download className="w-4 h-4" />
                                  Download PDF
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {admitCardError && (
                        <Card className="border-2 border-red-200 bg-red-50">
                          <CardContent className="pt-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Search className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-red-700 mb-2">Not Found</h3>
                            <p className="text-gray-600">{admitCardError}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
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

          {/* Contact Buttons */}
          <div className="flex justify-center gap-4 my-6">
            <a 
              href="tel:+918818076733" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors"
            >
              <Phone className="w-5 h-5" />
              Call Us
            </a>
            <a 
              href="https://wa.me/918818076733" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
          </div>

           {/* Tabs for Registration, Admit Card and Result Checking */}
           <Tabs defaultValue="registration" className="w-full">
             <TabsList className="grid w-full grid-cols-3 mb-6 bg-white shadow-md">
               <TabsTrigger 
                 value="registration" 
                 className="text-sm md:text-base py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
               >
                 <User className="w-4 h-4 mr-2" />
                 Registration
               </TabsTrigger>
               <TabsTrigger 
                 value="admit-card" 
                 className="text-sm md:text-base py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
               >
                 <Download className="w-4 h-4 mr-2" />
                 Admit Card
               </TabsTrigger>
               <TabsTrigger 
                 value="results" 
                 className="text-sm md:text-base py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
               >
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
                                <Input 
                                  {...field} 
                                  type="number" 
                                  placeholder="Age" 
                                  className="h-11" 
                                  min={5} 
                                  max={25} 
                                  readOnly 
                                />
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
                              <Input 
                                {...field} 
                                type="date" 
                                className="h-11"
                                onChange={(e) => handleDateOfBirthChange(e, field.onChange)}
                              />
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
