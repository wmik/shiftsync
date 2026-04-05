"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Trash2,
  Eye,
  EyeOff,
  User,
  ArrowLeftRight,
  AlertTriangle,
} from "lucide-react";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface Location {
  id: string;
  name: string;
  timezone: string;
}

interface Skill {
  id: string;
  name: string;
}

interface ShiftAssignment {
  id: string;
  assigned: { id: string; name: string; email: string };
  status: string;
}

interface Shift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  headcount: number;
  is_published: boolean;
  cutoff_hours: number;
  location: Location;
  skill: Skill;
  creator: { id: string; name: string; email: string };
  assignments: ShiftAssignment[];
  _count?: { assignments: number };
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  certifications: Array<{ skill: { id: string; name: string }; location: { id: string; name: string } }>;
}

export default function SchedulePage() {
  const session = useSession();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShiftDetailOpen, setIsShiftDetailOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [saving, setSaving] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [isEditingShift, setIsEditingShift] = useState(false);
  const [editFormData, setEditFormData] = useState({
    locationId: "",
    skillId: "",
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    headcount: 1,
  });
  const [formData, setFormData] = useState({
    locationId: "",
    skillId: "",
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    headcount: 1,
  });
  const [isDropOpen, setIsDropOpen] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapTargetId, setSwapTargetId] = useState("");
  const [availableSwapTargets, setAvailableSwapTargets] = useState<StaffMember[]>([]);
  const [loadingSwapTargets, setLoadingSwapTargets] = useState(false);
  const [requestError, setRequestError] = useState("");

  const canManage = session.data?.user?.role === "admin" || session.data?.user?.role === "manager";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = useMemo(() => new Date(year, month, 1), [year, month]);
  const lastDayOfMonth = useMemo(() => new Date(year, month + 1, 0), [year, month]);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [shiftsRes, locationsRes, skillsRes] = await Promise.all([
        fetch("/api/shifts"),
        fetch("/api/locations"),
        fetch("/api/skills"),
      ]);

      if (shiftsRes.ok) {
        setShifts(await shiftsRes.json());
      }
      if (locationsRes.ok) {
        setLocations(await locationsRes.json());
      }
      if (skillsRes.ok) {
        setSkills(await skillsRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = useCallback(async () => {
    try {
      const startDate = firstDayOfMonth.toISOString().split("T")[0];
      const endDate = lastDayOfMonth.toISOString().split("T")[0];
      const res = await fetch(`/api/shifts?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        setShifts(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
    }
  }, [firstDayOfMonth, lastDayOfMonth]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleCreateShift = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await fetchShifts();
        setIsCreateOpen(false);
        setFormData({
          locationId: "",
          skillId: "",
          date: "",
          startTime: "09:00",
          endTime: "17:00",
          headcount: 1,
        });
      }
    } catch (error) {
      console.error("Failed to create shift:", error);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async (shift: Shift) => {
    try {
      const endpoint = shift.is_published ? "unpublish" : "publish";
      const res = await fetch(`/api/shifts/${shift.id}/${endpoint}`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchShifts();
      }
    } catch (error) {
      console.error("Failed to toggle publish:", error);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchShifts();
        setSelectedShift(null);
        setIsShiftDetailOpen(false);
      }
    } catch (error) {
      console.error("Failed to delete shift:", error);
    }
  };

  const openShiftDetail = async (shift: Shift) => {
    setSelectedShift(shift);
    setSelectedStaffId("");
    setAssignmentError("");
    setIsShiftDetailOpen(true);
    if (canManage && shift.location && shift.skill) {
      setLoadingStaff(true);
      try {
        const params = new URLSearchParams();
        params.set("locationId", shift.location.id);
        params.set("skillId", shift.skill.id);
        const res = await fetch(`/api/staff?${params}`);
        if (res.ok) {
          const staff = await res.json();
          const assignedUserIds = shift.assignments.map((a) => a.assigned.id);
          const unassigned = staff.filter(
            (s: StaffMember) => !assignedUserIds.includes(s.id)
          );
          setAvailableStaff(unassigned);
        }
      } catch (error) {
        console.error("Failed to fetch staff:", error);
      } finally {
        setLoadingStaff(false);
      }
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedShift || !selectedStaffId) return;
    setAssigning(true);
    setAssignmentError("");
    try {
      const res = await fetch(`/api/shifts/${selectedShift.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedStaffId }),
      });
      if (res.ok) {
        setSelectedStaffId("");
        await fetchShifts();
        const updatedShift = shifts.find((s) => s.id === selectedShift.id);
        if (updatedShift) {
          setSelectedShift({ ...updatedShift, assignments: [...updatedShift.assignments] });
        }
      } else {
        const data = await res.json();
        setAssignmentError(data.error || "Failed to assign staff");
        if (data.violations) {
          setAssignmentError(data.violations.join(", "));
        }
      }
    } catch (error) {
      console.error("Failed to assign staff:", error);
      setAssignmentError("Failed to assign staff");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignStaff = async (assignmentId: string) => {
    if (!selectedShift) return;
    if (!confirm("Are you sure you want to unassign this staff member?")) return;
    try {
      const res = await fetch(`/api/shifts/${selectedShift.id}/assign?assignmentId=${assignmentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchShifts();
        const updatedShift = shifts.find((s) => s.id === selectedShift.id);
        if (updatedShift) {
          setSelectedShift({ ...updatedShift, assignments: [...updatedShift.assignments] });
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to unassign staff");
      }
    } catch (error) {
      console.error("Failed to unassign staff:", error);
      alert("Failed to unassign staff");
    }
  };

  const handleUpdateShift = async () => {
    if (!selectedShift) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/shifts/${selectedShift.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      if (res.ok) {
        await fetchShifts();
        const updated = await res.json();
        setSelectedShift({
          ...selectedShift,
          ...updated,
          location: updated.location,
          skill: updated.skill,
        });
        setIsEditingShift(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update shift");
      }
    } catch (error) {
      console.error("Failed to update shift:", error);
      alert("Failed to update shift");
    } finally {
      setSaving(false);
    }
  };

  const startEditingShift = () => {
    if (!selectedShift) return;
    const dateStr = selectedShift.date.split("T")[0];
    setEditFormData({
      locationId: selectedShift.location.id,
      skillId: selectedShift.skill.id,
      date: dateStr,
      startTime: selectedShift.start_time,
      endTime: selectedShift.end_time,
      headcount: selectedShift.headcount,
    });
    setIsEditingShift(true);
  };

  const getShiftsForDay = (day: number) => {
    const dateStr = new Date(year, month, day).toLocaleDateString("en-CA");
    return shifts.filter((s) => s.date.split("T")[0] === dateStr);
  };

  const formatViolationMessage = (violation: string) => {
    if (violation.includes("double") || violation.includes("overlap") || violation.includes("already has")) {
      return { icon: "📅", text: violation };
    }
    if (violation.includes("10 hour") || violation.includes("rest") || violation.includes("between shifts")) {
      return { icon: "⏰", text: violation };
    }
    if (violation.includes("skill") || violation.includes("certification") || violation.includes("certified")) {
      return { icon: "🎓", text: violation };
    }
    if (violation.includes("availability") || violation.includes("available")) {
      return { icon: "📅", text: violation };
    }
    if (violation.includes("overtime") || violation.includes("hour")) {
      return { icon: "⚠️", text: violation };
    }
    return { icon: "⚠️", text: violation };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${weekDays[date.getDay()]} ${date.getDate()}`;
  };

  const getShiftBadgeColor = (skill: string) => {
    const colors: Record<string, string> = {
      Server: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      Bartender: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      "Line Cook": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      "Grill Cook": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      Host: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      Dishwasher: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    };
    return colors[skill] || "bg-primary/10 text-primary";
  };

  const isUserAssignedToShift = (shift: Shift): boolean => {
    return shift.assignments.some((a) => a.assigned.id === session.data?.user?.id);
  };

  const openDropDialog = () => {
    setRequestError("");
    setIsDropOpen(true);
  };

  const handleDropShift = async () => {
    if (!selectedShift) return;
    setDropping(true);
    setRequestError("");
    try {
      const res = await fetch("/api/requests/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: selectedShift.id }),
      });
      if (res.ok) {
        setIsDropOpen(false);
        setSelectedShift(null);
        setIsShiftDetailOpen(false);
        await fetchShifts();
      } else {
        const data = await res.json();
        setRequestError(data.error || "Failed to create drop request");
      }
    } catch (error) {
      console.error("Failed to drop shift:", error);
      setRequestError("Failed to create drop request");
    } finally {
      setDropping(false);
    }
  };

  const openSwapDialog = async () => {
    if (!selectedShift) return;
    setRequestError("");
    setSwapTargetId("");
    setIsSwapOpen(true);
    setLoadingSwapTargets(true);
    try {
      const params = new URLSearchParams();
      params.set("locationId", selectedShift.location.id);
      params.set("skillId", selectedShift.skill.id);
      const res = await fetch(`/api/staff?${params}`);
      if (res.ok) {
        const staff = await res.json();
        const assignedUserIds = selectedShift.assignments.map((a) => a.assigned.id);
        const others = staff.filter(
          (s: StaffMember) => !assignedUserIds.includes(s.id) && s.id !== session.data?.user?.id
        );
        setAvailableSwapTargets(others);
      }
    } catch (error) {
      console.error("Failed to fetch swap targets:", error);
      setRequestError("Failed to load swap targets");
    } finally {
      setLoadingSwapTargets(false);
    }
  };

  const handleSwapRequest = async () => {
    if (!selectedShift || !swapTargetId) return;
    setSwapping(true);
    setRequestError("");
    try {
      const res = await fetch("/api/requests/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: selectedShift.id, targetUserId: swapTargetId }),
      });
      if (res.ok) {
        setIsSwapOpen(false);
        setSwapTargetId("");
        setSelectedShift(null);
        setIsShiftDetailOpen(false);
      } else {
        const data = await res.json();
        setRequestError(data.error || "Failed to create swap request");
      }
    } catch (error) {
      console.error("Failed to create swap request:", error);
      setRequestError("Failed to create swap request");
    } finally {
      setSwapping(false);
    }
  };

  const generateCalendarDays = () => {
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">Manage and view shifts</p>
        </div>
        {canManage && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        )}
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="my">My Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle>{months[month]} {year}</CardTitle>
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border">
                {weekDays.map((day) => (
                  <div key={day} className="bg-muted p-2 text-center text-sm font-medium">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, index) => {
                  const dayShifts = day ? getShiftsForDay(day) : [];
                  const isToday = day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] bg-card p-2 ${
                        isToday ? "ring-2 ring-primary ring-inset" : ""
                      }`}
                    >
                      {day && (
                        <>
                          <div className="text-sm font-medium mb-1">{day}</div>
                          <div className="space-y-1">
                            {dayShifts.slice(0, 3).map((shift) => (
                              <div
                                key={shift.id}
                                className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${getShiftBadgeColor(shift.skill.name)}`}
                                onClick={() => openShiftDetail(shift)}
                              >
                                {shift.start_time}-{shift.end_time}
                              </div>
                            ))}
                            {dayShifts.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayShifts.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No shifts found
                </div>
              ) : (
                <div className="space-y-4">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
                      onClick={() => openShiftDetail(shift)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getShiftBadgeColor(shift.skill.name)}`}>
                          <Clock className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{formatDate(shift.date)}</p>
                            <Badge variant="outline">{shift.skill.name}</Badge>
                            {!shift.is_published && (
                              <Badge variant="secondary">Draft</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{shift.location.name}</span>
                            <span>&middot;</span>
                            <Clock className="h-3 w-3" />
                            <span>{shift.start_time} - {shift.end_time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {shift._count?.assignments || 0}/{shift.headcount}
                        </span>
                        <Badge variant="secondary">
                          <User className="h-3 w-3 mr-1" />
                          Assigned
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my">
          <Card>
            <CardHeader>
              <CardTitle>My Upcoming Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {session.data?.user ? (
                <div className="space-y-4">
                  {shifts
                    .filter((shift) =>
                      shift.assignments.some(
                        (a) => a.assigned.id === session.data?.user?.id
                      )
                    )
                    .map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getShiftBadgeColor(shift.skill.name)}`}>
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{formatDate(shift.date)}</p>
                            <p className="text-sm text-muted-foreground">
                              {shift.start_time} - {shift.end_time}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{shift.location.name}</p>
                          <Badge variant="outline">{shift.skill.name}</Badge>
                        </div>
                      </div>
                    ))}
                  {shifts.filter((shift) =>
                    shift.assignments.some(
                      (a) => a.assigned.id === session.data?.user?.id
                    )
                  ).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No upcoming shifts
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Sign in to view your shifts
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <select
                id="location"
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill">Skill</Label>
              <select
                id="skill"
                value={formData.skillId}
                onChange={(e) => setFormData({ ...formData, skillId: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select skill</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="headcount">Headcount</Label>
              <Input
                id="headcount"
                type="number"
                min={1}
                value={formData.headcount}
                onChange={(e) => setFormData({ ...formData, headcount: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateShift}
              disabled={
                saving ||
                !formData.locationId ||
                !formData.skillId ||
                !formData.date
              }
            >
              {saving ? "Creating..." : "Create Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isShiftDetailOpen} onOpenChange={setIsShiftDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditingShift ? "Edit Shift" : "Shift Details"}</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4 py-4">
              {isEditingShift ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Location</Label>
                    <select
                      id="edit-location"
                      value={editFormData.locationId}
                      onChange={(e) => setEditFormData({ ...editFormData, locationId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select location</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-skill">Skill</Label>
                    <select
                      id="edit-skill"
                      value={editFormData.skillId}
                      onChange={(e) => setEditFormData({ ...editFormData, skillId: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select skill</option>
                      {skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Date</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-start">Start Time</Label>
                      <Input
                        id="edit-start"
                        type="time"
                        value={editFormData.startTime}
                        onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-end">End Time</Label>
                      <Input
                        id="edit-end"
                        type="time"
                        value={editFormData.endTime}
                        onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-headcount">Headcount</Label>
                    <Input
                      id="edit-headcount"
                      type="number"
                      min={1}
                      value={editFormData.headcount}
                      onChange={(e) => setEditFormData({ ...editFormData, headcount: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditingShift(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateShift} disabled={saving || !editFormData.locationId || !editFormData.skillId || !editFormData.date} className="flex-1">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getShiftBadgeColor(selectedShift.skill.name)}`}>
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold">{formatDate(selectedShift.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedShift.start_time} - {selectedShift.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedShift.skill.name}</Badge>
                      {!selectedShift.is_published && (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedShift.location.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {selectedShift._count?.assignments || 0} / {selectedShift.headcount} assigned
                      </span>
                    </div>
                  </div>

                  {selectedShift.assignments.length > 0 && (
                    <div className="space-y-2">
                      <Label>Assigned Staff</Label>
                      <div className="space-y-2">
                        {selectedShift.assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span>{assignment.assigned.name}</span>
                              <Badge variant="secondary">{assignment.status}</Badge>
                            </div>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnassignStaff(assignment.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isEditingShift && isUserAssignedToShift(selectedShift) && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Your Actions</Label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={openSwapDialog} className="flex-1">
                          <ArrowLeftRight className="h-4 w-4 mr-2" />
                          Request Swap
                        </Button>
                        <Button variant="outline" size="sm" onClick={openDropDialog} className="flex-1">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Drop Shift
                        </Button>
                      </div>
                    </div>
                  )}

                  {canManage && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Assign Staff</Label>
                      {loadingStaff ? (
                        <p className="text-sm text-muted-foreground">Loading staff...</p>
                      ) : availableStaff.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {(selectedShift._count?.assignments || 0) >= selectedShift.headcount
                            ? "Shift is fully staffed"
                            : "No eligible staff available for this shift"}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <select
                            value={selectedStaffId}
                            onChange={(e) => {
                              setSelectedStaffId(e.target.value);
                              setAssignmentError("");
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Select staff member</option>
                            {availableStaff.map((staff) => (
                              <option key={staff.id} value={staff.id}>
                                {staff.name} ({staff.email})
                              </option>
                            ))}
                          </select>
                          {assignmentError && (
                            <div className="space-y-1 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-2">
                              {assignmentError.split(", ").map((violation, idx) => {
                                const { text } = formatViolationMessage(violation.trim());
                                return (
                                  <div key={idx} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>{text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <Button
                            onClick={handleAssignStaff}
                            disabled={!selectedStaffId || assigning}
                            className="w-full"
                          >
                            {assigning ? "Assigning..." : "Assign Staff"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {canManage && !isEditingShift && (
                  <>
                    <Button variant="outline" onClick={startEditingShift} className="flex-1">
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePublishToggle(selectedShift)}
                      className="flex-1"
                    >
                      {selectedShift.is_published ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Publish
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteShift(selectedShift.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDropOpen} onOpenChange={setIsDropOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Drop Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedShift && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedShift.location.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(selectedShift.date)} {selectedShift.start_time} - {selectedShift.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedShift.skill.name}</Badge>
                </div>
              </div>
            )}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Shift will be open for pickup</p>
                  <p className="text-amber-700 dark:text-amber-300">Other staff can claim this shift for 24 hours. If unclaimed, you remain assigned.</p>
                </div>
              </div>
            </div>
            {requestError && (
              <p className="text-sm text-red-500">{requestError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDropOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDropShift} disabled={dropping}>
              {dropping ? "Processing..." : "Drop Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSwapOpen} onOpenChange={setIsSwapOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Request Swap</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedShift && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedShift.location.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(selectedShift.date)} {selectedShift.start_time} - {selectedShift.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedShift.skill.name}</Badge>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="swap-target">Select colleague to swap with</Label>
              {loadingSwapTargets ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : availableSwapTargets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No eligible colleagues available for swap</p>
              ) : (
                <select
                  id="swap-target"
                  value={swapTargetId}
                  onChange={(e) => {
                    setSwapTargetId(e.target.value);
                    setRequestError("");
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select colleague</option>
                  {availableSwapTargets.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {requestError && (
              <p className="text-sm text-red-500">{requestError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSwapOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSwapRequest} disabled={!swapTargetId || swapping}>
              {swapping ? "Sending..." : "Request Swap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
