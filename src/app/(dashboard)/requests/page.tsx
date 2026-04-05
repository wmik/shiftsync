"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  Clock,
  MapPin,
  User,
  Check,
  X,
  AlertCircle,
} from "lucide-react";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Location {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: { id: string; name: string };
  skill: { id: string; name: string };
}

interface UserBrief {
  id: string;
  name: string;
  email: string;
}

interface SwapRequest {
  id: string;
  status: string;
  created_at: string;
  shift: Shift;
  requester: UserBrief;
  target: UserBrief;
}

interface DropRequest {
  id: string;
  status: string;
  expires_at: string;
  created_at: string;
  shift: Shift;
  claimed_by: UserBrief | null;
}

export default function RequestsPage() {
  const session = useSession();
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [dropRequests, setDropRequests] = useState<DropRequest[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManager = session.data?.user?.role === "manager";
  const isAdmin = session.data?.user?.role === "admin";

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        if (data.length > 0 && !selectedLocation) {
          setSelectedLocation(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  const fetchRequests = async () => {
    try {
      const params = selectedLocation ? `?locationId=${selectedLocation}` : "";
      const [swapRes, dropRes] = await Promise.all([
        fetch(`/api/requests/swap${params}`),
        fetch(`/api/requests/drop${params}`),
      ]);

      if (swapRes.ok) {
        setSwapRequests(await swapRes.json());
      }
      if (dropRes.ok) {
        setDropRequests(await dropRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapAction = async (id: string, action: "ACCEPT" | "REJECT" | "CANCEL" | "APPROVE" | "DENY") => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/requests/swap/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchRequests();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update swap request");
      }
    } catch (err) {
      console.error("Failed to update swap request:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDropAction = async (id: string, action: "CLAIM" | "CANCEL") => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/requests/drop/${id}/claim`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchRequests();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update drop request");
      }
    } catch (err) {
      console.error("Failed to update drop request:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${weekDays[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatExpires = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
    const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
    return `${hours}h ${minutes}m`;
  };

  const getSwapStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "PENDING_APPROVAL":
        return <Badge className="bg-amber-500">Awaiting Approval</Badge>;
      case "COMPLETED":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "DENIED":
        return <Badge variant="destructive">Denied</Badge>;
      case "CANCELLED":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDropStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge className="bg-green-500">Open</Badge>;
      case "CLAIMED":
        return <Badge className="bg-blue-500">Claimed</Badge>;
      case "EXPIRED":
        return <Badge variant="secondary">Expired</Badge>;
      case "CANCELLED":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const mySwapRequests = swapRequests.filter(
    (r) => r.requester.id === session.data?.user?.id || r.target.id === session.data?.user?.id
  );
  const myDropRequests = dropRequests.filter(
    (r) => r.claimed_by?.id === session.data?.user?.id
  );
  const openDropRequests = dropRequests.filter((r) => r.status === "OPEN");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
          <p className="text-muted-foreground">
            Manage swap and drop requests
          </p>
        </div>
        {(isManager || isAdmin) && locations.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Location:</span>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="swap" className="space-y-4">
        <TabsList>
          <TabsTrigger value="swap">
            Swap Requests
            {mySwapRequests.filter((r) => r.status === "PENDING").length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {mySwapRequests.filter((r) => r.status === "PENDING").length}
              </Badge>
            )}
            {(isManager || isAdmin) && swapRequests.filter((r) => r.status === "PENDING_APPROVAL").length > 0 && (
              <Badge className="ml-1 bg-amber-500">
                {swapRequests.filter((r) => r.status === "PENDING_APPROVAL").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drop">
            Drop Requests
            {openDropRequests.length > 0 && (
              <Badge className="ml-2 bg-green-500">
                {openDropRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="swap">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : mySwapRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No swap requests
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {mySwapRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ArrowLeftRight className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getSwapStatusBadge(request.status)}
                            <span className="text-sm text-muted-foreground">
                              {formatDate(request.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{request.shift.location.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {formatDate(request.shift.date)} {request.shift.start_time} -{" "}
                              {request.shift.end_time}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">From:</span>
                              <span>{request.requester.name}</span>
                              {request.requester.id === session.data?.user?.id && (
                                <Badge variant="outline" className="ml-1">You</Badge>
                              )}
                            </div>
                            {request.target && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">To:</span>
                                <span>{request.target.name}</span>
                                {request.target.id === session.data?.user?.id && (
                                  <Badge variant="outline" className="ml-1">You</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {request.status === "PENDING" && (
                        <div className="flex gap-2">
                          {request.target.id === session.data?.user?.id && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSwapAction(request.id, "ACCEPT")}
                                disabled={actionLoading === request.id}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSwapAction(request.id, "REJECT")}
                                disabled={actionLoading === request.id}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {request.requester.id === session.data?.user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSwapAction(request.id, "CANCEL")}
                              disabled={actionLoading === request.id}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                      {request.status === "PENDING_APPROVAL" && (isManager || isAdmin) && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSwapAction(request.id, "APPROVE")}
                            disabled={actionLoading === request.id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleSwapAction(request.id, "DENY")}
                            disabled={actionLoading === request.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      )}
                      {request.status === "PENDING_APPROVAL" && (
                        <div className="flex gap-2">
                          {(request.requester.id === session.data?.user?.id || request.target.id === session.data?.user?.id) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSwapAction(request.id, "CANCEL")}
                              disabled={actionLoading === request.id}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drop">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : myDropRequests.length === 0 && openDropRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No drop requests
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {openDropRequests.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Open for Pickup
                  </h3>
                  {openDropRequests.map((request) => (
                    <Card key={request.id} className="border-green-200 dark:border-green-900">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {getDropStatusBadge(request.status)}
                                <Badge variant="outline">
                                  Expires in {formatExpires(request.expires_at)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>{request.shift.location.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {formatDate(request.shift.date)} {request.shift.start_time} -{" "}
                                  {request.shift.end_time}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm mt-1">
                                <Badge variant="outline">{request.shift.skill.name}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleDropAction(request.id, "CLAIM")}
                              disabled={actionLoading === request.id}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Claim
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {myDropRequests.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground mt-6">
                    My Drop Requests
                  </h3>
                  {myDropRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Clock className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {getDropStatusBadge(request.status)}
                                {request.status === "OPEN" && (
                                  <Badge variant="outline">
                                    Expires in {formatExpires(request.expires_at)}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>{request.shift.location.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {formatDate(request.shift.date)} {request.shift.start_time} -{" "}
                                  {request.shift.end_time}
                                </span>
                              </div>
                              {request.claimed_by && (
                                <div className="flex items-center gap-2 text-sm mt-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Claimed by:</span>
                                  <span>{request.claimed_by.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {request.status === "OPEN" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDropAction(request.id, "CANCEL")}
                                disabled={actionLoading === request.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
