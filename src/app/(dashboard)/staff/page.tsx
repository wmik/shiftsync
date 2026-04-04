"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, MapPin, Plus, Trash2, X, User, Clock } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Skill {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  timezone: string;
}

interface Certification {
  id: string;
  skill: Skill;
  location: Location;
  certified_at: string;
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  timezone: string;
  certifications: Certification[];
  availability: Availability[];
  manager_locations?: { location: Location }[];
  _count?: {
    shift_assignments: number;
  };
}

export default function StaffPage() {
  const session = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isAddCertOpen, setIsAddCertOpen] = useState(false);
  const [isAddAvailabilityOpen, setIsAddAvailabilityOpen] = useState(false);
  const [newCert, setNewCert] = useState({ locationId: "", skillId: "" });
  const [newAvailability, setNewAvailability] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
  const [saving, setSaving] = useState(false);

  const canManage = session.data?.user?.role === "admin" || session.data?.user?.role === "manager";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, skillsRes, locationsRes] = await Promise.all([
        fetch("/api/staff"),
        fetch("/api/skills"),
        fetch("/api/locations"),
      ]);

      if (staffRes.ok) {
        setStaff(await staffRes.json());
      }
      if (skillsRes.ok) {
        setSkills(await skillsRes.json());
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

  const fetchStaffDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/staff/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStaff(data);
      }
    } catch (error) {
      console.error("Failed to fetch staff details:", error);
    }
  };

  const handleAddCertification = async () => {
    if (!selectedStaff || !newCert.locationId || !newCert.skillId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}/certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCert),
      });
      if (res.ok) {
        await fetchStaffDetails(selectedStaff.id);
        await fetchData();
        setIsAddCertOpen(false);
        setNewCert({ locationId: "", skillId: "" });
      }
    } catch (error) {
      console.error("Failed to add certification:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCertification = async (certId: string) => {
    if (!selectedStaff) return;
    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}/certifications?certificationId=${certId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchStaffDetails(selectedStaff.id);
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to delete certification:", error);
    }
  };

  const handleUpdateAvailability = async () => {
    if (!selectedStaff) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability: selectedStaff.availability.map((a) => ({
            dayOfWeek: a.day_of_week,
            startTime: a.start_time,
            endTime: a.end_time,
          })),
        }),
      });
      if (res.ok) {
        setIsAddAvailabilityOpen(false);
      }
    } catch (error) {
      console.error("Failed to update availability:", error);
    } finally {
      setSaving(false);
    }
  };

  const addAvailabilitySlot = () => {
    if (!selectedStaff) return;
    setSelectedStaff({
      ...selectedStaff,
      availability: [
        ...selectedStaff.availability,
        {
          id: `temp-${Date.now()}`,
          day_of_week: newAvailability.dayOfWeek,
          start_time: newAvailability.startTime,
          end_time: newAvailability.endTime,
        },
      ],
    });
  };

  const removeAvailabilitySlot = (index: number) => {
    if (!selectedStaff) return;
    const updated = [...selectedStaff.availability];
    updated.splice(index, 1);
    setSelectedStaff({ ...selectedStaff, availability: updated });
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500";
      case "manager":
        return "bg-blue-500";
      default:
        return "bg-green-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">Manage staff members and their certifications</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No staff members found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => (
            <Card
              key={member.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => fetchStaffDetails(member.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{member.name}</h3>
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {member.certifications.slice(0, 3).map((cert) => (
                        <Badge key={cert.id} variant="outline" className="text-xs">
                          {cert.skill.name}
                        </Badge>
                      ))}
                      {member.certifications.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.certifications.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!selectedStaff} onOpenChange={(open) => !open && setSelectedStaff(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedStaff?.name}
              {selectedStaff && (
                <Badge className={`ml-2 ${getRoleBadgeColor(selectedStaff.role)}`}>
                  {selectedStaff.role}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {selectedStaff && (
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">{selectedStaff.email}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedStaff.timezone} &middot; {selectedStaff._count?.shift_assignments || 0} shifts
                </p>
              </div>

              <Tabs defaultValue="certifications">
                <TabsList className="w-full">
                  <TabsTrigger value="certifications" className="flex-1">
                    Certifications
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="flex-1">
                    Availability
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="certifications" className="mt-4">
                  <div className="space-y-3">
                    {selectedStaff.certifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No certifications yet
                      </p>
                    ) : (
                      selectedStaff.certifications.map((cert) => (
                        <div
                          key={cert.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">{cert.skill.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {cert.location.name}
                            </p>
                          </div>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCertification(cert.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                    {canManage && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsAddCertOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Certification
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="availability" className="mt-4">
                  <div className="space-y-3">
                    {selectedStaff.availability.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No availability set
                      </p>
                    ) : (
                      DAYS.map((day, index) => {
                        const dayAvailability = selectedStaff.availability.filter(
                          (a) => a.day_of_week === index
                        );
                        return (
                          <div key={day} className="flex items-start gap-3">
                            <div className="w-24 text-sm font-medium">{day}</div>
                            <div className="flex-1">
                              {dayAvailability.length === 0 ? (
                                <span className="text-sm text-muted-foreground">Unavailable</span>
                              ) : (
                                dayAvailability.map((a) => (
                                  <div key={a.id} className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm">
                                      {a.start_time} - {a.end_time}
                                    </span>
                                    {canManage && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() =>
                                          removeAvailabilitySlot(
                                            selectedStaff.availability.indexOf(a)
                                          )
                                        }
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    {canManage && (
                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setIsAddAvailabilityOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Availability
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isAddCertOpen} onOpenChange={setIsAddCertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Certification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skill">Skill</Label>
              <select
                id="skill"
                value={newCert.skillId}
                onChange={(e) => setNewCert({ ...newCert, skillId: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a skill</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <select
                id="location"
                value={newCert.locationId}
                onChange={(e) => setNewCert({ ...newCert, locationId: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCertOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCertification}
              disabled={saving || !newCert.skillId || !newCert.locationId}
            >
              {saving ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddAvailabilityOpen} onOpenChange={setIsAddAvailabilityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="day">Day</Label>
              <select
                id="day"
                value={newAvailability.dayOfWeek}
                onChange={(e) =>
                  setNewAvailability({ ...newAvailability, dayOfWeek: parseInt(e.target.value) })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="time"
                  value={newAvailability.startTime}
                  onChange={(e) =>
                    setNewAvailability({ ...newAvailability, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="time"
                  value={newAvailability.endTime}
                  onChange={(e) =>
                    setNewAvailability({ ...newAvailability, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                addAvailabilitySlot();
                setIsAddAvailabilityOpen(false);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Schedule
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAvailabilityOpen(false)}>
              Done
            </Button>
            <Button onClick={handleUpdateAvailability} disabled={saving}>
              {saving ? "Saving..." : "Save Availability"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
