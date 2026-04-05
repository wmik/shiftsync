"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertCircle,
  Check,
  X,
  User,
  UserPlus,
  Shield,
  Trash2,
  MapPin,
} from "lucide-react";

interface Location {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  managerLocations?: { id: string; name: string }[];
}

interface ManagerLocation {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const session = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [isCreateManagerOpen, setIsCreateManagerOpen] = useState(false);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isAssignLocationsOpen, setIsAssignLocationsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  const isAdmin = session.data?.user?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchLocations();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", password: "" });
    setSelectedLocations([]);
  };

  const handleCreateUser = async (role: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role }),
      });
      if (res.ok) {
        if (role === "manager") {
          const user = await res.json();
          await assignManagerLocations(user.id, selectedLocations);
        }
        showSuccess(`${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`);
        resetForm();
        if (role === "staff") setIsCreateStaffOpen(false);
        if (role === "manager") setIsCreateManagerOpen(false);
        if (role === "admin") setIsCreateAdminOpen(false);
        await fetchUsers();
      } else {
        const data = await res.json();
        showError(data.error || "Failed to create user");
      }
    } catch (err) {
      showError("Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("User deleted successfully");
        await fetchUsers();
      } else {
        const data = await res.json();
        showError(data.error || "Failed to delete user");
      }
    } catch (err) {
      showError("Failed to delete user");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        showSuccess("Role updated successfully");
        setIsEditUserOpen(false);
        setSelectedUser(null);
        await fetchUsers();
      } else {
        const data = await res.json();
        showError(data.error || "Failed to update role");
      }
    } catch (err) {
      showError("Failed to update role");
    }
  };

  const openEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
  };

  const openAssignLocations = (user: User) => {
    setSelectedUser(user);
    setSelectedLocations(user.managerLocations?.map((l) => l.id) || []);
    setIsAssignLocationsOpen(true);
  };

  const assignManagerLocations = async (userId: string, locationIds: string[]) => {
    try {
      await fetch(`/api/users/${userId}/locations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationIds }),
      });
    } catch (err) {
      console.error("Failed to assign locations:", err);
    }
  };

  const handleSaveLocations = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await assignManagerLocations(selectedUser.id, selectedLocations);
      showSuccess("Locations updated successfully");
      setIsAssignLocationsOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      showError("Failed to update locations");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500">Admin</Badge>;
      case "manager":
        return <Badge className="bg-blue-500">Manager</Badge>;
      case "staff":
        return <Badge variant="secondary">Staff</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const filteredUsers = (role: string) =>
    users.filter((u) => u.role === role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and users</p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-4 w-4" />
              <span>{success}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={isAdmin ? "users" : "profile"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-2xl font-medium text-primary-foreground">
                    {session.data?.user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-lg">{session.data?.user?.name || "Unknown"}</p>
                  <p className="text-muted-foreground">{session.data?.user?.email}</p>
                  {getRoleBadge(session.data?.user?.role || "staff")}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Users</h2>
                <div className="flex gap-2">
                  <Button onClick={() => { resetForm(); setIsCreateStaffOpen(true); }}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                  <Button variant="outline" onClick={() => { resetForm(); setIsCreateManagerOpen(true); }}>
                    <Shield className="h-4 w-4 mr-2" />
                    Add Manager
                  </Button>
                  <Button variant="secondary" onClick={() => { resetForm(); setIsCreateAdminOpen(true); }}>
                    <Shield className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
              </div>

              {loading ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Loading...
                  </CardContent>
                </Card>
              ) : (
                <>
                  {["admin", "manager", "staff"].map((role) => (
                    <Card key={role}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getRoleBadge(role)}
                          <span className="text-sm font-normal text-muted-foreground">
                            ({filteredUsers(role).length})
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {filteredUsers(role).length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No {role}s found
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {filteredUsers(role).map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                    {role === "manager" && user.managerLocations && user.managerLocations.length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        <MapPin className="h-3 w-3 inline mr-1" />
                                        {user.managerLocations.map((l) => l.name).join(", ")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {role === "manager" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openAssignLocations(user)}
                                    >
                                      <MapPin className="h-4 w-4 mr-1" />
                                      Locations
                                    </Button>
                                  )}
                                  {user.email !== session.data?.user?.email && (
                                    <>
                                      <Button variant="ghost" size="sm" onClick={() => openEditUser(user)}>
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={isCreateStaffOpen} onOpenChange={setIsCreateStaffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Full Name</Label>
              <Input
                id="staff-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Password</Label>
              <Input
                id="staff-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateStaffOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleCreateUser("staff")}
              disabled={saving || !formData.name || !formData.email || !formData.password}
            >
              {saving ? "Creating..." : "Create Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateManagerOpen} onOpenChange={setIsCreateManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mgr-name">Full Name</Label>
              <Input
                id="mgr-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mgr-email">Email</Label>
              <Input
                id="mgr-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mgr-password">Password</Label>
              <Input
                id="mgr-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Locations</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {locations.map((loc) => (
                  <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(loc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLocations([...selectedLocations, loc.id]);
                        } else {
                          setSelectedLocations(selectedLocations.filter((id) => id !== loc.id));
                        }
                      }}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{loc.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateManagerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleCreateUser("manager")}
              disabled={saving || !formData.name || !formData.email || !formData.password || selectedLocations.length === 0}
            >
              {saving ? "Creating..." : "Create Manager"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateAdminOpen} onOpenChange={setIsCreateAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full Name</Label>
              <Input
                id="admin-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Admin User"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAdminOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleCreateUser("admin")}
              disabled={saving || !formData.name || !formData.email || !formData.password}
            >
              {saving ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Change Role</Label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => handleUpdateRole(selectedUser.id, e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignLocationsOpen} onOpenChange={setIsAssignLocationsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Locations</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Select the locations {selectedUser.name} can manage:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                {locations.map((loc) => (
                  <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(loc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLocations([...selectedLocations, loc.id]);
                        } else {
                          setSelectedLocations(selectedLocations.filter((id) => id !== loc.id));
                        }
                      }}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{loc.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignLocationsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLocations} disabled={saving || selectedLocations.length === 0}>
              {saving ? "Saving..." : "Save Locations"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
