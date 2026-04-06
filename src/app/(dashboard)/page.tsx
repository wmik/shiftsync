"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, AlertTriangle, MapPin, Activity } from "lucide-react";

interface Shift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: { id: string; name: string; timezone: string };
  skill: { name: string };
  assignments: { id: string; assigned: { id: string; name: string } }[];
}

interface Location {
  id: string;
  name: string;
  timezone: string;
}

interface OnDutyStaff {
  name: string;
  skill: string;
  location: string;
  shiftEnd: string;
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isCurrentlyOnShift(shift: Shift): boolean {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  
  if (shift.date.split("T")[0] !== dateStr) return false;
  
  if (shift.start_time > shift.end_time) {
    return currentTime >= shift.start_time || currentTime <= shift.end_time;
  }
  return currentTime >= shift.start_time && currentTime <= shift.end_time;
}

function getOnDutyStaff(shifts: Shift[]): OnDutyStaff[] {
  return shifts
    .filter(isCurrentlyOnShift)
    .flatMap((shift) =>
      shift.assignments.map((a) => ({
        name: a.assigned.name,
        skill: shift.skill.name,
        location: shift.location.name,
        shiftEnd: shift.end_time,
      }))
    );
}

export default function DashboardPage() {
  const session = useSession();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = session.data?.user?.role;
  const isManager = userRole === "manager" || userRole === "admin";

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const [shiftsRes, locationsRes] = await Promise.all([
        fetch("/api/shifts?active=true"),
        fetch("/api/locations"),
      ]);
      if (shiftsRes.ok) {
        const data = await shiftsRes.json();
        setShifts(data);
      }
      if (locationsRes.ok) {
        setLocations(await locationsRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const myUpcomingShifts = shifts.filter((shift) => {
    const shiftDate = new Date(shift.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      shift.assignments.some((a) => a.assigned.id === session.data?.user?.id) &&
      shiftDate >= today
    );
  });

  const myHoursThisWeek = myUpcomingShifts.reduce((total, shift) => {
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM] = shift.end_time.split(":").map(Number);
    let adjustedEndH = endH;
    if (adjustedEndH < startH) adjustedEndH += 24;
    const hours = adjustedEndH - startH + (endM - startM) / 60;
    return total + hours;
  }, 0);

  const onDutyStaff = getOnDutyStaff(shifts);

  const stats = [
    {
      title: "Upcoming Shifts",
      value: myUpcomingShifts.length,
      description: "This week",
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      title: "Hours This Week",
      value: myHoursThisWeek.toFixed(0),
      description: "Target: 32",
      icon: Clock,
      color: myHoursThisWeek >= 35 ? "text-amber-500" : "text-green-500",
    },
    {
      title: "On Duty Now",
      value: onDutyStaff.length,
      description: "Across all locations",
      icon: Users,
      color: onDutyStaff.length > 0 ? "text-green-500" : "text-gray-500",
    },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${weekDays[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session.data?.user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your schedule.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {myHoursThisWeek >= 35 && myHoursThisWeek < 40 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Approaching overtime: You have {myHoursThisWeek.toFixed(0)} hours scheduled this week
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {myHoursThisWeek >= 40 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Overtime alert: You have {myHoursThisWeek.toFixed(0)} hours scheduled (limit: 40)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Who&apos;s Working Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : onDutyStaff.length === 0 ? (
              <p className="text-muted-foreground text-sm">No staff currently on shift</p>
            ) : (
              <div className="space-y-3">
                {onDutyStaff.map((staff, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {staff.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{staff.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{staff.skill}</Badge>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {staff.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Until {staff.shiftEnd}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              My Upcoming Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : myUpcomingShifts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming shifts scheduled</p>
            ) : (
              <div className="space-y-3">
                {myUpcomingShifts.slice(0, 5).map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{shift.location.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{shift.skill.name}</Badge>
                        <span>{formatDate(shift.date)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{shift.start_time} - {shift.end_time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isManager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {locations.map((location) => {
                const locationOnDuty = onDutyStaff.filter((s) => s.location === location.name);
                return (
                  <div key={location.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{location.name.replace("Coastal Eats - ", "")}</p>
                      {locationOnDuty.length > 0 ? (
                        <span className="w-2 h-2 rounded-full bg-green-500" title="Staff on duty" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-300" title="No staff on duty" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {locationOnDuty.length} on duty
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
