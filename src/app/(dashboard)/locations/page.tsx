"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MapPin, Clock, Users } from "lucide-react";

export default function LocationsPage() {
  const canManage = true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage Coastal Eats locations</p>
        </div>
        {canManage && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Locations</TabsTrigger>
          <TabsTrigger value="pacific">Pacific Time</TabsTrigger>
          <TabsTrigger value="eastern">Eastern Time</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Connect to database to view locations
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pacific">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Connect to database to view Pacific Time locations
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eastern">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Connect to database to view Eastern Time locations
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
