import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Search, CreditCard, QrCode, Info } from "lucide-react";
import type { Student } from "@shared/schema";
import { useAuth } from "@/lib/auth";

const DEFAULT_EXAM_CENTER = "Sukoon Edu village, Andhaka village, Sudaka, Nuh district, Haryana Pin- 122107";

function AdmitCard({ student, coordinatorName, subjects }: {
  student: Student;
  coordinatorName: string;
  subjects: any[];
}) {
  // QR encodes: App ID + Name + DOB + Class — scannable by any QR reader
  // Shows full student identity details when scanned (works offline too)
  const qrData = [
    `SUKOON NGO - ADMIT CARD`,
    `App ID: ${student.applicationId}`,
    `Name: ${student.name}`,
    `Father: ${student.fatherName}`,
    `DOB: ${student.dateOfBirth}`,
    `Class: ${student.classApplying}`,
    `Center: ${student.examCenter || DEFAULT_EXAM_CENTER}`,
    `Date: 10 May, 2026`,
    `Year: ${student.admissionYear}`,
  ].join("\n");

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&margin=4`;

  const activeSubjects = subjects.filter(s => s.isActive).sort((a: any, b: any) => a.orderIndex - b.orderIndex);

  return (
    <div
      id={`admit-card-${student.id}`}
      className="admit-card-container bg-white border-2 border-gray-300 rounded-lg overflow-hidden w-full max-w-[700px] mx-auto shadow-lg"
    >
      {/* Header with Logo */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-md p-1">
            <img 
              src="/Logo.png" 
              alt="Sukoon NGO Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg leading-tight tracking-wide">Sukoon Edu Foundation</h2>
            <p className="text-blue-200 text-xs mt-0.5">Admission Entrance Examination — {student.admissionYear}</p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 rounded px-3 py-1.5 inline-block border border-white/30">
              <p className="text-[11px] font-bold tracking-widest uppercase">Admit Card</p>
            </div>
          </div>
        </div>
      </div>

      {/* Application ID Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-2.5 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Application No.</span>
          <p className="font-bold text-blue-900 text-lg tracking-wider">{student.applicationId}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Roll No.</span>
          <p className="font-bold text-blue-900 text-lg">
            {student.applicationId.replace("APP-", "").replace("-", "")}
          </p>
        </div>
      </div>

      {/* Main Body */}
      <div className="px-6 pt-4 pb-4">
        <div className="flex gap-5">

          {/* LEFT: Passport Photo Box */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div
              className="admit-card-photo-box border-2 border-dashed border-blue-400 bg-gray-50 flex flex-col items-center justify-center overflow-hidden rounded"
            >
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full gap-1.5 px-2">
                  <div
                    className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center flex-shrink-0"
                  >
                    <span className="text-blue-700 text-xl font-bold">{student.name.charAt(0)}</span>
                  </div>
                  <p className="text-[9px] text-center text-gray-400 leading-tight">Affix Passport</p>
                  <p className="text-[9px] text-center text-gray-400 leading-tight">Size Photo</p>
                </div>
              )}
            </div>
            <p className="text-[9px] text-gray-500 text-center leading-tight font-medium">35mm × 45mm</p>
          </div>

          {/* CENTER: Student Details */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <InfoRow label="Student Name" value={student.name} bold />
            <InfoRow label="Father's Name" value={student.fatherName} />
            <InfoRow label="Mother's Name" value={student.motherName} />
            <InfoRow label="Date of Birth" value={student.dateOfBirth} />
            <InfoRow label="Gender" value={student.gender} />
            <InfoRow label="Class Applying" value={student.classApplying} bold />
          </div>

          {/* RIGHT: QR Code */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="border border-gray-300 p-1 bg-white rounded shadow-sm">
              <img src={qrUrl} alt="QR Code" width={96} height={96} />
            </div>
            <p className="text-[9px] text-gray-500 text-center leading-tight font-medium">Scan to verify</p>
            <p className="text-[9px] text-gray-500 text-center leading-tight font-medium">identity</p>
          </div>
        </div>

        {/* Exam Details Box */}
        <div className="mt-4 bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
          <ExamDetail label="Exam Date" value="10 May, 2026" />
          <ExamDetail label="Exam Center" value={student.examCenter || DEFAULT_EXAM_CENTER} />
          <ExamDetail label="Reporting Time" value="09:00 AM" />
          <ExamDetail label="Admission Year" value={String(student.admissionYear)} />
        </div>

        {/* Subjects Row */}
        {activeSubjects.length > 0 && (
          <div className="mt-3 border border-blue-200 rounded-lg px-4 py-2.5 bg-blue-50/50">
            <p className="text-[10px] font-semibold text-blue-800 mb-2 uppercase tracking-wide">Exam Subjects</p>
            <div className="flex flex-wrap gap-2">
              {activeSubjects.map((s: any) => (
                <span key={s.id} className="text-[10px] bg-white border border-blue-200 text-blue-700 rounded px-2 py-1 font-medium shadow-sm">
                  {s.code} — {s.name} ({s.maxMarks}M)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex justify-between items-end border-t-2 border-gray-200 pt-3">
          <div className="text-[10px] text-gray-600">
            <p>Coordinator: <span className="font-semibold text-gray-800">{coordinatorName}</span></p>
            <p className="mt-0.5 text-gray-500">Issued by Sukoon Edu Foundation — {student.admissionYear}</p>
          </div>
          <div className="text-right">
            <div className="border-t-2 border-gray-400 w-28 mb-1"></div>
            <p className="text-[9px] text-gray-500 font-medium">Authorised Signature</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-[9px] text-amber-800 font-semibold mb-1">Instructions:</p>
          <p className="text-[9px] text-amber-700 leading-relaxed">
            Carry this admit card and a valid ID proof on the day of examination. No student will be allowed without admit card.
            The QR code can be scanned to instantly verify student identity and exam details.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex gap-2 items-baseline">
      <span className="text-[10px] text-gray-500 whitespace-nowrap flex-shrink-0 w-28 font-medium">{label}:</span>
      <span className={`text-[11px] ${bold ? "font-bold text-blue-900" : "text-gray-700"} leading-tight`}>{value}</span>
    </div>
  );
}

function ExamDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-blue-300 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-[11px] font-semibold text-white leading-tight mt-0.5">{value}</p>
    </div>
  );
}

export default function AdmitCardsPage() {
  const { data: user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedId = params.get("id");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedId || "");
  const [showQrInfo, setShowQrInfo] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: studentsData, isLoading } = useQuery<{ students: Student[]; total: number }>({
    queryKey: ["/api/students"],
  });

  const students = studentsData?.students ?? [];

  const { data: coords = [] } = useQuery<any[]>({
    queryKey: ["/api/coordinators"],
  });

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
  });

  const filteredStudents = students.filter(s =>
    !searchTerm ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.applicationId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId)
    || (preselectedId ? students.find(s => s.id === preselectedId) : null);

  const coordinatorName = selectedStudent?.coordinatorId
    ? coords.find((c: any) => c.id === selectedStudent.coordinatorId)?.name || "N/A"
    : user?.name || "N/A";

  const handlePrint = () => {
    const printContent = document.getElementById(`admit-card-${selectedStudent?.id}`);
    if (!printContent) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admit Card — ${selectedStudent?.name} — ${selectedStudent?.applicationId}</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
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
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
          #admit-card-container {
            width: 100%;
            max-width: 700px;
            margin: 0 auto;
            padding: 10mm;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          .bg-gradient-to-r {
            background: linear-gradient(to right, #1e3a8a, #1e40af, #1d4ed8) !important;
          }
          .from-blue-900 { --tw-gradient-from: #1e3a8a !important; }
          .via-blue-800 { --tw-gradient-via: #1e40af !important; }
          .to-blue-700 { --tw-gradient-to: #1d4ed8 !important; }
          .bg-blue-50 { background-color: #eff6ff !important; }
          .bg-blue-100 { background-color: #dbeafe !important; }
          .bg-amber-50 { background-color: #fffbeb !important; }
          .border-blue-200 { border-color: #bfdbfe !important; }
          .border-blue-400 { border-color: #60a5fa !important; }
          .border-amber-200 { border-color: #fde68a !important; }
          .text-blue-200 { color: #bfdbfe !important; }
          .text-blue-300 { color: #93c5fd !important; }
          .text-blue-600 { color: #2563eb !important; }
          .text-blue-700 { color: #1d4ed8 !important; }
          .text-blue-800 { color: #1e40af !important; }
          .text-blue-900 { color: #1e3a8a !important; }
          .text-amber-700 { color: #b45309 !important; }
          .text-amber-800 { color: #92400e !important; }
          .text-gray-400 { color: #9ca3af !important; }
          .text-gray-500 { color: #6b7280 !important; }
          .text-gray-600 { color: #4b5563 !important; }
          .text-gray-700 { color: #374151 !important; }
          .text-gray-800 { color: #1f2937 !important; }
          .border-gray-200 { border-color: #e5e7eb !important; }
          .border-gray-300 { border-color: #d1d5db !important; }
          .border-gray-400 { border-color: #9ca3af !important; }
          .bg-gray-50 { background-color: #f9fafb !important; }
          .bg-white { background-color: #ffffff !important; }
          .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important; }
          .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important; }
          .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important; }
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

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Admit Cards</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Generate and print student admit cards with QR verification</p>
        </div>
      </div>

      {/* QR Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-4 py-3">
        <QrCode className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-blue-800 dark:text-blue-300">How the QR Code works</p>
          <p className="text-blue-600 dark:text-blue-400 text-xs mt-0.5">
            Each admit card has a unique QR code. When scanned with any phone camera or QR scanner app, it instantly shows the student's
            <strong> full identity</strong> — Name, Application ID, Father's Name, Date of Birth, Class, Exam Center and Date.
            Exam invigilators can scan it at the exam gate to verify the student without checking paper records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Student List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-admit"
            />
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm text-muted-foreground font-normal">
                {filteredStudents.length} students
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No students found</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedStudentId === student.id
                          ? "bg-primary/10 border-l-2 border-l-primary"
                          : "hover:bg-muted/50"
                      }`}
                      data-testid={`select-student-${student.id}`}
                    >
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.applicationId}</p>
                      <p className="text-xs text-muted-foreground">{student.classApplying}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admit Card Preview */}
        <div className="lg:col-span-3 space-y-4">
          {selectedStudent ? (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-base font-semibold">Preview</h2>
                <Button onClick={handlePrint} data-testid="button-print-admit">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Admit Card
                </Button>
              </div>
              <div ref={printRef}>
                <AdmitCard
                  student={selectedStudent}
                  coordinatorName={coordinatorName}
                  subjects={subjects}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                If no photo was uploaded during registration, glue or affix the passport-size photo manually on the printed card before handing it to the student.
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center h-72 border-2 border-dashed border-border rounded-lg text-muted-foreground">
              <div className="text-center">
                <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">Select a student</p>
                <p className="text-sm">to preview their admit card</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
