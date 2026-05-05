import type { Student } from "@shared/schema";

const DEFAULT_EXAM_CENTER = "Sukoon Edu village, Andhaka village, Sudaka, Nuh district, Haryana Pin- 122107";

export interface AdmitCardProps {
  student: Student;
  coordinatorName?: string;
  subjects?: any[];
}

export function AdmitCard({ student, coordinatorName = "Sukoon Edu Foundation", subjects = [] }: AdmitCardProps) {
   const qrData = [
     `SUKOON NGO - ADMIT CARD`,
     `App ID: ${student.applicationId}`,
     `Name: ${student.name}`,
     `Father: ${student.fatherName}`,
     `DOB: ${student.dateOfBirth}`,
     `Class: ${student.classApplying}`,
     `Center: ${student.examCenter || DEFAULT_EXAM_CENTER}`,
     `Date: 10 May 2026`,
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
           <ExamDetail label="Exam Date" value="10 May 2026" />
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
