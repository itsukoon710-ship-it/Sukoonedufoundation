import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Student } from "@/shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Camera, Search, Zap } from "lucide-react";

export default function GateEntryPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    setIsLoading(true);
    try {
      // Try to find student by Aadhaar number or application ID
      const res = await fetch(`/api/public/find-by-aadhaar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarNumber: search }),
        credentials: "include",
      });

      if (!res.ok) {
        // If Aadhaar search fails, try application ID
        const res2 = await fetch(`/api/public/student/${search}`, {
          credentials: "include",
        });

        if (!res2.ok) {
          throw new Error("Student not found");
        }

        const studentData = await res2.json();
        // Fetch full student data
        const fullRes = await fetch(`/api/students?search=${studentData.applicationId}`, {
          credentials: "include",
        });
        
        if (!fullRes.ok) throw new Error("Failed to fetch student details");
        
        const students = await fullRes.json();
        if (students.length === 0) throw new Error("Student not found");
        
        setStudent(students[0]);
      } else {
        const studentData = await res.json();
        // Fetch full student data
        const fullRes = await fetch(`/api/students?search=${studentData.applicationId}`, {
          credentials: "include",
        });
        
        if (!fullRes.ok) throw new Error("Failed to fetch student details");
        
        const students = await fullRes.json();
        if (students.length === 0) throw new Error("Student not found");
        
        setStudent(students[0]);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to find student",
        variant: "destructive",
      });
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!student) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/students/${student.id}/presence`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_present: true }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to update presence");
      }

      const updatedStudent = await res.json();
      setStudent(updatedStudent);

      toast({
        title: "Verified Successfully",
        description: `${student.name} has been marked as present.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to verify entry",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startScan = () => {
    setIsScanning(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            requestAnimationFrame(tick);
          }
        })
        .catch((err) => {
          toast({
            title: "Camera Error",
            description: "Unable to access camera. Please check permissions.",
            variant: "destructive",
          });
          setIsScanning(false);
        });
    }
  };

  const stopScan = () => {
    setIsScanning(false);
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      videoRef.current.srcObject = null;
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        // Found QR code
        stopScan();
        const qrData = code.data;
        setSearch(qrData);
        handleSearch(new Event("submit") as React.FormEvent);
        return;
      }
    }

    if (isScanning) {
      requestAnimationFrame(tick);
    }
  };

  // Load jsQR library dynamically
  const loadJsQR = async () => {
    if (typeof window.jsQR === "undefined") {
      await import("jsQR");
    }
  };

  // Initialize scanning when component mounts
  // useEffect(() => {
  //   loadJsQR();
  //   return () => {
  //     stopScan();
  //   };
  // }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gate Entry Verification</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Verify student entry using QR code or manual search
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={startScan}
            disabled={isScanning || isLoading}
            className="flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Scan QR Code</span>
          </Button>
          <Button
            variant="outline"
            onClick={stopScan}
            disabled={!isScanning || isLoading}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>Stop Scan</span>
          </Button>
        </div>
      </div>

      {/* Video Scanner */}
      {isScanning && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-96 object-contain bg-black rounded"
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div className="mt-4 text-sm text-gray-500">
            Point camera at QR code to scan
          </div>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter Aadhaar number or Application ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !search.trim()}
          className="w-full"
        >
          {isLoading ? "Searching..." : "Search Student"}
        </Button>
      </form>

      {/* Student Info */}
      {student && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow border">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-500 font-bold text-lg">
                    {student.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-bold">{student.name}</h2>
              <p className="text-sm text-muted-foreground">
                Application ID: {student.applicationId}
              </p>
              <p className="text-sm text-muted-foreground">
                Aadhaar: {student.aadhaarNumber}
              </p>
              <p className="text-sm text-muted-foreground">
                Class: {student.classApplying}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Room Number:</p>
              <p className="text-lg font-mono">
                {student.roomNumber || "<span className='text-red-500'>Not Assigned</span>"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status:</p>
              <p className={`text-lg font-medium ${
                student.isPresent ? "text-green-600" : "text-red-600"
              }`}>
                {student.isPresent ? "Present" : "Absent"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleVerify}
              disabled={isLoading || student.isPresent}
              className="w-full"
            >
              {student.isPresent ? "Already Present" : "Mark as Present"}
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!student && !isScanning && !isLoading && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Ready to Verify</h3>
          <p className="text-sm text-muted-foreground">
            Scan a QR code or enter Aadhaar/Application ID to verify student entry
          </p>
        </div>
      )}
    </div>
  );
}