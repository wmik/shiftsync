import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function getHoursBetween(start: string, end: string): number {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  let hours = endH - startH;
  const minutes = endM - startM;
  if (hours < 0) hours += 24;
  return hours + minutes / 60;
}

interface OvertimeStatus {
  weeklyHours: number;
  dailyHours: number;
  consecutiveDays: number;
  isOverWeekly: boolean;
  isOverDaily: boolean;
  isSixthDay: boolean;
  isSeventhDay: boolean;
  requiresOverride: boolean;
  warnings: string[];
}

async function getUserOvertimeStatus(
  userId: string,
  weekStart: Date,
  targetDate: Date
): Promise<OvertimeStatus> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const shifts = await prisma.shift.findMany({
    where: {
      assignments: {
        some: {
          user_id: userId,
          status: "CONFIRMED",
        },
      },
      date: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    include: {
      assignments: {
        where: {
          user_id: userId,
          status: "CONFIRMED",
        },
      },
    },
    orderBy: { date: "asc" },
  });

  let weeklyHours = 0;
  let dailyHours = 0;
  const dailyHoursMap: Record<string, number> = {};
  const consecutiveDaysSet = new Set<string>();

  for (const shift of shifts) {
    const hours = getHoursBetween(shift.start_time, shift.end_time);
    weeklyHours += hours;

    const dayKey = new Date(shift.date).toISOString().split("T")[0];
    dailyHoursMap[dayKey] = (dailyHoursMap[dayKey] || 0) + hours;
    consecutiveDaysSet.add(dayKey);
  }

  const currentDayHours = dailyHoursMap[targetDate.toISOString().split("T")[0]] || 0;
  dailyHours = currentDayHours;

  const sortedDates = Array.from(consecutiveDaysSet).sort();
  let consecutiveDays = 0;
  let tempCount = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempCount++;
      consecutiveDays = Math.max(consecutiveDays, tempCount);
    } else {
      tempCount = 1;
    }
  }
  consecutiveDays = Math.max(consecutiveDays, tempCount);

  const warnings: string[] = [];
  const isOverWeekly = weeklyHours > 40;
  const isOverDaily = dailyHours > 8;
  const isSixthDay = consecutiveDays >= 6;
  const isSeventhDay = consecutiveDays >= 7;

  if (weeklyHours > 35 && weeklyHours <= 40) {
    warnings.push(`Approaching weekly overtime (${weeklyHours.toFixed(1)}/40 hours)`);
  }
  if (isOverWeekly) {
    warnings.push(`Weekly overtime: ${weeklyHours.toFixed(1)} hours (max 40)`);
  }
  if (dailyHours > 8 && dailyHours <= 12) {
    warnings.push(`Approaching daily overtime (${dailyHours.toFixed(1)}/8 hours)`);
  }
  if (isOverDaily) {
    warnings.push(`Daily overtime: ${dailyHours.toFixed(1)} hours (max 12)`);
  }
  if (isSixthDay && !isSeventhDay) {
    warnings.push(`Working 6th consecutive day - consider rest`);
  }
  if (isSeventhDay) {
    warnings.push(`Working 7th consecutive day - requires override`);
  }

  const requiresOverride = isOverWeekly || isOverDaily || isSeventhDay;

  return {
    weeklyHours,
    dailyHours,
    consecutiveDays,
    isOverWeekly,
    isOverDaily,
    isSixthDay,
    isSeventhDay,
    requiresOverride,
    warnings,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const today = new Date();
    const weekStart = getWeekStart(today);

    const status = await getUserOvertimeStatus(userId, weekStart, today);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to fetch overtime status:", error);
    return NextResponse.json(
      { error: "Failed to fetch overtime status" },
      { status: 500 }
    );
  }
}
