import { useState, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Student } from "@/shared/schema";
import { useToast } from "@/components/ui/use-toast";

export default function RoomAllotmentPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: students = [], isLoading, error } = useQuery<Student[]>([
    "students",
    search,
  ], async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    
    const res = await fetch(`/api/students?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch students");
    return res.json();
  });

  const roomUpdateMutation = useMutation(
    async ({ id, roomNumber }: { id: string; roomNumber: string | null }) => {
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_number: roomNumber }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update room");
      }
      
      return res.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("students");
        toast({
          title: "Room updated",
          description: "Student room number has been updated.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error updating room",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  );

  if (isLoading) return <div className="flex items-center justify-center py-8">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {(error as Error).message}</div>;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Room Allotment</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Assign room numbers to students
          </p>
        </div>
        <div className="relative flex-1 max-w-sm">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground">
            Search
          </div>
          <input
            type="text"
            placeholder="Search by name or Aadhaar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aadhaar Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class Applying
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room Number
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map(student => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {student.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.aadhaarNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.classApplying}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={student.roomNumber || ""}
                      onChange={(e) => {
                        roomUpdateMutation.mutate({
                          id: student.id,
                          roomNumber: e.target.value.trim() === "" ? null : e.target.value.trim(),
                        });
                      }}
                      className="border border-gray-300 rounded px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter room number"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {students.length === 0 && (
        <p className="text-center py-8 text-gray-500">No students found.</p>
      )}
    </div>
  );
}