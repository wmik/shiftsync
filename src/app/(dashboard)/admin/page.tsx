"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  UserCog,
  Users,
  Shield,
  Search,
  Calendar,
  Activity,
  Filter,
} from "lucide-react";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user: { id: string; name: string; email: string };
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  created_at: string;
}

interface AuditLogResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function AdminPage() {
  const session = useSession();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState<string>("");

  const isAdmin = session.data?.user?.role === "admin";

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEntity) params.set("entityType", filterEntity);
      params.set("limit", "50");

      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data: AuditLogResponse = await res.json();
        setAuditLogs(data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filterEntity]);

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [isAdmin, fetchAuditLogs]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-green-500">Create</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-500">Update</Badge>;
      case "DELETE":
        return <Badge variant="destructive">Delete</Badge>;
      case "ASSIGN":
        return <Badge className="bg-purple-500">Assign</Badge>;
      case "PUBLISH":
        return <Badge className="bg-amber-500">Publish</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${weekDays[date.getDay()]} ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.user.name.toLowerCase().includes(searchLower) ||
      log.user.email.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.entity_type.toLowerCase().includes(searchLower)
    );
  });

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You do not have permission to access this page.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage users, roles, and permissions</p>
      </div>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Audit Log
                  </CardTitle>
                  <CardDescription>
                    Recent system activity and changes
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  value={filterEntity}
                  onChange={(e) => {
                    setFilterEntity(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All Entities</option>
                  <option value="SHIFT">Shifts</option>
                  <option value="ASSIGNMENT">Assignments</option>
                  <option value="USER">Users</option>
                  <option value="LOCATION">Locations</option>
                </select>
                <Button variant="outline" size="icon" onClick={fetchAuditLogs}>
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getActionBadge(log.action)}
                          <span className="text-sm font-medium">
                            {log.entity_type}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {log.entity_id.substring(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{log.user.name}</span>
                          <span>&middot;</span>
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(log.created_at)}</span>
                        </div>
                        {log.after && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.after, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>Connect database to view users</CardDescription>
                </div>
                <Button>
                  <UserCog className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Admin
                </CardTitle>
                <CardDescription>Full system access</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Manage all users and roles</li>
                  <li>• Access all locations</li>
                  <li>• View audit logs</li>
                  <li>• System configuration</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-secondary" />
                  Manager
                </CardTitle>
                <CardDescription>Location-level access</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Manage assigned locations</li>
                  <li>• Create and publish shifts</li>
                  <li>• Approve swap requests</li>
                  <li>• View staff profiles</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-muted-foreground" />
                  Staff
                </CardTitle>
                <CardDescription>Basic access</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• View published schedule</li>
                  <li>• Set availability</li>
                  <li>• Request swaps/drops</li>
                  <li>• Update own profile</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
