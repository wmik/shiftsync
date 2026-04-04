import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

function getHoursBetween(start: string, end: string): number {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  let hours = endH - startH;
  let minutes = endM - startM;
  if (hours < 0) hours += 24;
  return hours + minutes / 60;
}

function isPremiumShift(date: Date, startTime: string): boolean {
  const day = date.getDay();
  const hour = parseInt(startTime.split(":")[0]);

  const isFriday = day === 5;
  const isSaturday = day === 6;
  const isEvening = hour >= 17 && hour < 23;

  return (isFriday || isSaturday) && isEvening;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const weeks = parseInt(searchParams.get("weeks") || "4");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const where: Record<string, unknown> = {
      status: "CONFIRMED",
      shift: {
        date: {
          gte: startDate,
        },
      },
    };

    if (locationId) {
      where.shift = {
        ...((where.shift as Record<string, unknown>) || {}),
        location_id: locationId,
      };
    }

    const assignments = await prisma.shift_assignment.findMany({
      where,
      include: {
        assigned: {
          select: { id: true, name: true },
        },
        shift: {
          include: {
            location: true,
          },
        },
      },
    });

    const userStats: Record<
      string,
      {
        name: string;
        totalHours: number;
        regularHours: number;
        premiumHours: number;
        shiftCount: number;
        premiumShiftCount: number;
      }
    > = {};

    for (const assignment of assignments) {
      const userId = assignment.assigned.id;
      if (!userStats[userId]) {
        userStats[userId] = {
          name: assignment.assigned.name,
          totalHours: 0,
          regularHours: 0,
          premiumHours: 0,
          shiftCount: 0,
          premiumShiftCount: 0,
        };
      }

      const shift = assignment.shift;
      const hours = getHoursBetween(shift.start_time, shift.end_time);
      const isPremium = isPremiumShift(new Date(shift.date), shift.start_time);

      userStats[userId].totalHours += hours;
      userStats[userId].shiftCount += 1;

      if (isPremium) {
        userStats[userId].premiumHours += hours;
        userStats[userId].premiumShiftCount += 1;
      } else {
        userStats[userId].regularHours += hours;
      }
    }

    const userList = Object.entries(userStats).map(([id, stats]) => ({
      id,
      ...stats,
    }));

    const totalHours = userList.reduce((sum, u) => sum + u.totalHours, 0);
    const avgHours = userList.length > 0 ? totalHours / userList.length : 0;
    const maxHours = Math.max(...userList.map((u) => u.totalHours), 0);
    const minHours = Math.min(...userList.map((u) => u.totalHours), 0);

    const fairnessScore =
      avgHours > 0 ? Math.max(0, 100 - ((maxHours - minHours) / avgHours) * 100) : 100;

    const fairnessRating =
      fairnessScore >= 90
        ? "Excellent"
        : fairnessScore >= 75
          ? "Good"
          : fairnessScore >= 50
            ? "Fair"
            : "Needs Attention";

    const premiumDistribution = userList
      .map((u) => ({
        id: u.id,
        name: u.name,
        premiumHours: u.premiumHours,
        percentage:
          u.totalHours > 0
            ? Math.round((u.premiumHours / u.totalHours) * 100)
            : 0,
      }))
      .sort((a, b) => b.premiumHours - a.premiumHours);

    return NextResponse.json({
      fairnessScore: Math.round(fairnessScore),
      fairnessRating,
      summary: {
        totalHours,
        avgHoursPerUser: avgHours,
        maxHours,
        minHours,
        hourSpread: maxHours - minHours,
      },
      byUser: userList.sort((a, b) => b.totalHours - a.totalHours),
      premiumDistribution,
      totalPremiumShifts: userList.reduce((sum, u) => sum + u.premiumShiftCount, 0),
    });
  } catch (error) {
    console.error("Failed to fetch fairness analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch fairness analytics" },
      { status: 500 }
    );
  }
}
