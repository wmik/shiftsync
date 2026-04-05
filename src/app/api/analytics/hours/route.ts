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

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: Record<string, unknown> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const where: Record<string, unknown> = {
      status: "CONFIRMED",
    };

    if (userId) {
      where.user_id = userId;
    }

    if (Object.keys(dateFilter).length > 0) {
      where.shift = { date: dateFilter };
    }

    const assignments = await prisma.shift_assignment.findMany({
      where,
      include: {
        shift: {
          include: {
            location: true,
            skill: true,
          },
        },
        assigned: {
          select: { id: true, name: true },
        },
      },
    });

    const hoursByUser: Record<string, { name: string; hours: number; shifts: number }> = {};
    const hoursByLocation: Record<string, { name: string; hours: number }> = {};
    const hoursBySkill: Record<string, { name: string; hours: number }> = {};
    const hoursByWeek: Record<string, number> = {};
    const hoursByDay: Record<string, number> = {};

    for (const assignment of assignments) {
      const shift = assignment.shift;
      const hours = getHoursBetween(shift.start_time, shift.end_time);

      const userId = assignment.assigned.id;
      if (!hoursByUser[userId]) {
        hoursByUser[userId] = { name: assignment.assigned.name, hours: 0, shifts: 0 };
      }
      hoursByUser[userId].hours += hours;
      hoursByUser[userId].shifts += 1;

      const locationId = shift.location.id;
      if (!hoursByLocation[locationId]) {
        hoursByLocation[locationId] = { name: shift.location.name, hours: 0 };
      }
      hoursByLocation[locationId].hours += hours;

      const skillId = shift.skill.id;
      if (!hoursBySkill[skillId]) {
        hoursBySkill[skillId] = { name: shift.skill.name, hours: 0 };
      }
      hoursBySkill[skillId].hours += hours;

      const weekStart = getWeekStart(new Date(shift.date));
      const weekKey = weekStart.toISOString().split("T")[0];
      if (!hoursByWeek[weekKey]) {
        hoursByWeek[weekKey] = 0;
      }
      hoursByWeek[weekKey] += hours;

      const dayKey = new Date(shift.date).toISOString().split("T")[0];
      if (!hoursByDay[dayKey]) {
        hoursByDay[dayKey] = 0;
      }
      hoursByDay[dayKey] += hours;
    }

    return NextResponse.json({
      totalHours: Object.values(hoursByUser).reduce((sum, u) => sum + u.hours, 0),
      totalShifts: assignments.length,
      byUser: Object.entries(hoursByUser)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.hours - a.hours),
      byLocation: Object.entries(hoursByLocation)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.hours - a.hours),
      bySkill: Object.entries(hoursBySkill)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.hours - a.hours),
      byWeek: Object.entries(hoursByWeek)
        .map(([week, hours]) => ({ week, hours }))
        .sort((a, b) => a.week.localeCompare(b.week)),
      byDay: Object.entries(hoursByDay)
        .map(([day, hours]) => ({ day, hours }))
        .sort((a, b) => a.day.localeCompare(b.day)),
    });
  } catch (error) {
    console.error("Failed to fetch hours analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch hours analytics" },
      { status: 500 }
    );
  }
}
