"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export default function AnalyticsPage() {
  const isAdmin = true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Workforce insights and fairness metrics" : "Your scheduling statistics"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Fairness Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">--</span>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Connect database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Hours This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">--</span>
              <span className="text-sm text-muted-foreground">hrs</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Connect database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overtime Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">0</span>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">No warnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">--</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Connect database</p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Tabs defaultValue="fairness" className="space-y-4">
          <TabsList>
            <TabsTrigger value="fairness">Fairness Report</TabsTrigger>
            <TabsTrigger value="overtime">Overtime Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="fairness">
            <Card>
              <CardHeader>
                <CardTitle>Premium Shift Distribution</CardTitle>
                <CardDescription>
                  Connect database to view fairness metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No data available
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overtime">
            <Card>
              <CardHeader>
                <CardTitle>Overtime Tracking</CardTitle>
                <CardDescription>
                  Connect database to view overtime data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No data available
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
