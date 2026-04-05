"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  Calendar,
  Award,
} from "lucide-react";

interface HoursData {
  totalHours: number;
  totalShifts: number;
  byUser: { id: string; name: string; hours: number; shifts: number }[];
  byLocation: { id: string; name: string; hours: number }[];
  byWeek: { week: string; hours: number }[];
}

interface FairnessData {
  fairnessScore: number;
  fairnessRating: string;
  summary: {
    totalHours: number;
    avgHoursPerUser: number;
    maxHours: number;
    minHours: number;
    hourSpread: number;
  };
  byUser: {
    id: string;
    name: string;
    totalHours: number;
    regularHours: number;
    premiumHours: number;
    shiftCount: number;
  }[];
  premiumDistribution: { id: string; name: string; premiumHours: number; percentage: number }[];
  totalPremiumShifts: number;
}

export default function AnalyticsPage() {
  const session = useSession();
  const [hoursData, setHoursData] = useState<HoursData | null>(null);
  const [fairnessData, setFairnessData] = useState<FairnessData | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = session.data?.user?.role === "admin" || session.data?.user?.role === "manager";

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [hoursRes, fairnessRes] = await Promise.all([
        fetch("/api/analytics/hours"),
        fetch("/api/analytics/fairness"),
      ]);

      if (hoursRes.ok) {
        setHoursData(await hoursRes.json());
      }
      if (fairnessRes.ok) {
        setFairnessData(await fairnessRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFairnessColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Workforce insights and fairness metrics" : "Your scheduling statistics"}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="py-6 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fairness Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold ${getFairnessColor(fairnessData?.fairnessScore || 0)}`}>
                    {fairnessData?.fairnessScore || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {fairnessData?.fairnessRating || "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">
                    {formatHours(hoursData?.totalHours || 0)}
                  </span>
                  <span className="text-sm text-muted-foreground">hrs</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {hoursData?.totalShifts || 0} shifts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Hours/User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">
                    {formatHours(fairnessData?.summary.avgHoursPerUser || 0)}
                  </span>
                  <span className="text-sm text-muted-foreground">hrs</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {fairnessData?.byUser.length || 0} staff
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Premium Shifts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-amber-500" />
                  <span className="text-3xl font-bold">
                    {fairnessData?.totalPremiumShifts || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fri/Sat evenings
                </p>
              </CardContent>
            </Card>
          </div>

          {isAdmin && (
            <Tabs defaultValue="fairness" className="space-y-4">
              <TabsList>
                <TabsTrigger value="fairness">Fairness Report</TabsTrigger>
                <TabsTrigger value="hours">Hours Distribution</TabsTrigger>
                <TabsTrigger value="locations">By Location</TabsTrigger>
              </TabsList>

              <TabsContent value="fairness">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Hours Distribution</CardTitle>
                      <CardDescription>
                        Total hours per staff member
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {fairnessData?.byUser.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No data available
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {fairnessData?.byUser.slice(0, 10).map((user, index) => {
                            const maxHours = fairnessData?.summary.maxHours || 1;
                            const width = (user.totalHours / maxHours) * 100;
                            return (
                              <div key={user.id} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <span className="w-5 text-muted-foreground">{index + 1}.</span>
                                    {user.name}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {formatHours(user.totalHours)} hrs
                                  </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${width}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Premium Shift Distribution</CardTitle>
                      <CardDescription>
                        Distribution of Fri/Sat evening shifts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {fairnessData?.premiumDistribution.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No premium shifts
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {fairnessData?.premiumDistribution.slice(0, 10).map((user, index) => (
                            <div key={user.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="w-5 text-muted-foreground text-sm">{index + 1}.</span>
                                <span className="text-sm">{user.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">
                                  {formatHours(user.premiumHours)} hrs
                                </span>
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  {user.percentage}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="hours">
                <Card>
                  <CardHeader>
                    <CardTitle>Hours by Week</CardTitle>
                    <CardDescription>
                      Total scheduled hours over the past weeks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hoursData?.byWeek.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No data available
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {hoursData?.byWeek.map((week) => (
                          <div
                            key={week.week}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                Week of {new Date(week.week).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatHours(week.hours)} hrs
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="locations">
                <Card>
                  <CardHeader>
                    <CardTitle>Hours by Location</CardTitle>
                    <CardDescription>
                      Distribution of hours across locations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hoursData?.byLocation.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No data available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {hoursData?.byLocation.map((location) => {
                          const maxHours = Math.max(...(hoursData?.byLocation.map((l) => l.hours) || [1]));
                          const width = (location.hours / maxHours) * 100;
                          return (
                            <div key={location.id} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                  {location.name}
                                </span>
                                <span className="text-muted-foreground">
                                  {formatHours(location.hours)} hrs
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
