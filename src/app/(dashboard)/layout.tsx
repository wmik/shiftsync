"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import {
  Calendar,
  Users,
  MapPin,
  ArrowLeftRight,
  BarChart3,
  Settings,
  UserCog,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navigation = [
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Staff", href: "/staff", icon: Users },
  { name: "Locations", href: "/locations", icon: MapPin },
  { name: "Requests", href: "/requests", icon: ArrowLeftRight },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const adminNavigation = [
  { name: "User Management", href: "/admin", icon: UserCog },
];

function SidebarContent({ 
  pathname, 
  isAdmin, 
  onLinkClick,
  user,
}: { 
  pathname: string; 
  isAdmin: boolean;
  onLinkClick?: () => void;
  user?: { name?: string | null; email?: string };
}) {
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";
  const router = useRouter()

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">ShiftSync</h1>
        <p className="text-sm text-muted-foreground">Coastal Eats</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t" />
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Admin
            </p>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onLinkClick}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-medium text-primary-foreground">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
          </div>
        </div>
        <Link href="/settings">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-muted-foreground mt-1"
          onClick={() => {
            authClient.signOut()
            router.push("/login")
            router.refresh();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const session = useSession();

  const isAdmin = session.data?.user?.role === "admin";
  const user = session.data?.user;

  return (
    <div className="flex h-screen">
      <aside className="hidden lg:flex w-64 flex-col bg-card border-r">
        <SidebarContent pathname={pathname} isAdmin={isAdmin} user={user} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent pathname={pathname} isAdmin={isAdmin} user={user} onLinkClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 border-b bg-background z-50 flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-2 font-semibold">ShiftSync</span>
        </div>
        <NotificationBell />
      </div>

      <div className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="hidden lg:block container mx-auto p-6">{children}</div>
        <div className="lg:hidden container mx-auto p-4">{children}</div>
      </div>
    </div>
  );
}
