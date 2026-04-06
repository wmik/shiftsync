"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Save, User, Bell, Mail, Globe } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  timezone: string;
  preferences: { emailNotifications?: boolean } | null;
  desired_hours_min: number | null;
  desired_hours_max: number | null;
}

export default function ProfilePage() {
  const session = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [desiredMin, setDesiredMin] = useState(20);
  const [desiredMax, setDesiredMax] = useState(40);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    if (session.data?.user?.id) {
      fetchProfile();
    }
  }, [session.data?.user?.id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/${session.data?.user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setDesiredMin(data.desired_hours_min ?? 20);
        setDesiredMax(data.desired_hours_max ?? 40);
        setEmailNotifications(data.preferences?.emailNotifications ?? true);
      }
    } catch {
      console.error("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDesiredHours = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/users/${session.data?.user?.id}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desiredHoursMin: desiredMin,
          desiredHoursMax: desiredMax,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save preferences");
      }
    } catch {
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEmailNotifications = async () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);

    try {
      await fetch(`/api/users/${session.data?.user?.id}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifications: newValue }),
      });
    } catch (err) {
      console.error("Failed to update notifications:", err);
      setEmailNotifications(!newValue);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Your basic account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <p className="text-sm font-medium mt-1">{profile?.name}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-sm font-medium mt-1">{profile?.email}</p>
            </div>
            <div>
              <Label>Role</Label>
              <p className="text-sm font-medium mt-1 capitalize">{profile?.role}</p>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Timezone
              </Label>
              <p className="text-sm font-medium mt-1">{profile?.timezone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduling Preferences
          </CardTitle>
          <CardDescription>
            Set your desired weekly hours to help managers distribute shifts fairly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="desiredMin">Minimum Hours/Week</Label>
              <Input
                id="desiredMin"
                type="number"
                min={0}
                max={60}
                value={desiredMin}
                onChange={(e) => setDesiredMin(parseInt(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your minimum availability per week
              </p>
            </div>
            <div>
              <Label htmlFor="desiredMax">Maximum Hours/Week</Label>
              <Input
                id="desiredMax"
                type="number"
                min={0}
                max={60}
                value={desiredMax}
                onChange={(e) => setDesiredMax(parseInt(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your maximum availability per week
              </p>
            </div>
          </div>

          {desiredMin > desiredMax && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                Minimum hours cannot be greater than maximum hours
              </p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-600 dark:text-green-400">
                Scheduling preferences saved successfully
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <Button onClick={handleSaveDesiredHours} disabled={saving || desiredMin > desiredMax}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive email updates for shift changes and requests
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailNotifications}
              onClick={handleToggleEmailNotifications}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                emailNotifications ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                  emailNotifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
