"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const userName = "there";

  const stats = [
    {
      title: "Upcoming Shifts",
      value: "3",
      description: "This week",
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      title: "Hours This Week",
      value: "24",
      description: "Target: 32",
      icon: Clock,
      color: "text-green-500",
    },
    {
      title: "Pending Requests",
      value: "1",
      description: "Swap request",
      icon: Users,
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName}</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your schedule.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">Morning Shift</p>
                  <p className="text-sm text-muted-foreground">Coastal Eats - Downtown</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Today</p>
                  <p className="text-sm text-muted-foreground">6:00 AM - 2:00 PM</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">Evening Shift</p>
                  <p className="text-sm text-muted-foreground">Coastal Eats - Marina</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Tomorrow</p>
                  <p className="text-sm text-muted-foreground">4:00 PM - 10:00 PM</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Overtime approaching</p>
                  <p className="text-xs text-muted-foreground">You have 32 hours scheduled this week</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Users className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Schedule published</p>
                  <p className="text-xs text-muted-foreground">Next week&apos;s schedule is now available</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
