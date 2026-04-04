"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Clock, MapPin } from "lucide-react";

export default function RequestsPage() {
  const isStaff = false;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "ACCEPTED":
        return <Badge variant="default">Accepted</Badge>;
      case "OPEN":
        return <Badge className="bg-green-500">Open for Pickup</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
        <p className="text-muted-foreground">
          {isStaff 
            ? "Manage your swap and drop requests" 
            : "Review and approve staff requests"}
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="swap">Swap Requests</TabsTrigger>
          <TabsTrigger value="drop">Drop Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Connect to database to view requests
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="swap">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No swap requests
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drop">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No drop requests
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
