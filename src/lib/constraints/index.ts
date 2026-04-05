import { prisma } from "@/lib/db";
import type { ConstraintViolation, AlternativeStaff, OvertimeStatus } from "@/types";

export async function checkNoDoubleBooking(
  userId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): Promise<ConstraintViolation | null> {
  const shifts = await prisma.shift.findMany({
    where: {
      assignments: {
        some: {
          user_id: userId,
          status: "CONFIRMED",
        },
      },
      date: date,
      ...(excludeShiftId ? { id: { not: excludeShiftId } } : {}),
    },
    include: {
      location: true,
    },
  });

  for (const shift of shifts) {
    if (timesOverlap(startTime, endTime, shift.start_time, shift.end_time)) {
      return {
        type: "DOUBLE_BOOKING",
        message: `User already has a shift at ${shift.location.name} from ${shift.start_time} to ${shift.end_time}`,
        details: {
          existingShiftId: shift.id,
          location: shift.location.name,
          time: `${shift.start_time} - ${shift.end_time}`,
        },
      };
    }
  }

  return null;
}

export async function checkTenHourRest(
  userId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): Promise<ConstraintViolation | null> {
  const dayBefore = new Date(date);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(date);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const nearbyShifts = await prisma.shift.findMany({
    where: {
      assignments: {
        some: {
          user_id: userId,
          status: "CONFIRMED",
        },
      },
      date: {
        gte: dayBefore,
        lte: dayAfter,
      },
      ...(excludeShiftId ? { id: { not: excludeShiftId } } : {}),
    },
  });

  for (const shift of nearbyShifts) {
    const hoursBetweenEndAndStart = getHoursBetween(shift.end_time, startTime);
    const hoursBetweenEndAndEnd = getHoursBetween(shift.end_time, endTime);

    if (hoursBetweenEndAndStart >= 0 && hoursBetweenEndAndStart < 10) {
      return {
        type: "REST_PERIOD",
        message: `Only ${hoursBetweenEndAndStart.toFixed(1)} hours between shifts (minimum 10 required)`,
        details: {
          previousShiftEnd: shift.end_time,
          newShiftStart: startTime,
          hoursGap: hoursBetweenEndAndStart,
        },
      };
    }

    if (hoursBetweenEndAndEnd >= 0 && hoursBetweenEndAndEnd < 10) {
      return {
        type: "REST_PERIOD",
        message: `Only ${hoursBetweenEndAndEnd.toFixed(1)} hours rest before shift ends (minimum 10 required)`,
        details: {
          previousShiftEnd: shift.end_time,
          newShiftEnd: endTime,
          hoursGap: hoursBetweenEndAndEnd,
        },
      };
    }
  }

  return null;
}

export async function checkSkillMatch(
  userId: string,
  skillId: string
): Promise<ConstraintViolation | null> {
  const certification = await prisma.certification.findFirst({
    where: {
      user_id: userId,
      skill_id: skillId,
    },
  });

  if (!certification) {
    return {
      type: "SKILL_MISMATCH",
      message: "User does not have the required skill for this shift",
    };
  }

  return null;
}

export async function checkCertification(
  userId: string,
  locationId: string
): Promise<ConstraintViolation | null> {
  const certification = await prisma.certification.findFirst({
    where: {
      user_id: userId,
      location_id: locationId,
    },
  });

  if (!certification) {
    return {
      type: "CERTIFICATION_MISSING",
      message: "User is not certified to work at this location",
    };
  }

  return null;
}

export async function checkAvailability(
  userId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<ConstraintViolation | null> {
  const dayOfWeek = date.getDay();
  const dateStr = date.toISOString().split("T")[0];

  const exception = await prisma.availability_exception.findFirst({
    where: {
      user_id: userId,
      date: {
        equals: date,
      },
    },
  });

  if (exception) {
    if (!exception.is_available) {
      return {
        type: "AVAILABILITY",
        message: `User has marked themselves unavailable on ${dateStr}${exception.reason ? `: ${exception.reason}` : ""}`,
      };
    }
    return null;
  }

  const availability = await prisma.availability.findFirst({
    where: {
      user_id: userId,
      day_of_week: dayOfWeek,
      OR: [
        {
          effective_from: null,
          effective_until: null,
        },
        {
          effective_from: { lte: date },
          effective_until: null,
        },
        {
          effective_from: null,
          effective_until: { gte: date },
        },
        {
          effective_from: { lte: date },
          effective_until: { gte: date },
        },
      ],
    },
  });

  if (!availability) {
    return {
      type: "AVAILABILITY",
      message: "User has not set availability for this day of the week",
    };
  }

  if (!isTimeWithinRange(startTime, endTime, availability.start_time, availability.end_time)) {
    return {
      type: "AVAILABILITY",
      message: `Shift time (${startTime}-${endTime}) is outside user's availability (${availability.start_time}-${availability.end_time})`,
      details: {
        availableStart: availability.start_time,
        availableEnd: availability.end_time,
      },
    };
  }

  return null;
}

export async function checkOvertime(
  userId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<OvertimeStatus> {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekShifts = await prisma.shift.findMany({
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
  });

  const todayStart = new Date(date);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(date);
  todayEnd.setHours(23, 59, 59, 999);

  const todayShifts = weekShifts.filter((s) => {
    const shiftDate = new Date(s.date);
    return shiftDate >= todayStart && shiftDate <= todayEnd;
  });

  let weeklyHours = 0;
  let dailyHours = calculateShiftHours(startTime, endTime);
  const workedDays = new Set<string>();

  for (const shift of weekShifts) {
    weeklyHours += calculateShiftHours(shift.start_time, shift.end_time);
    workedDays.add(new Date(shift.date).toISOString().split("T")[0]);
  }

  for (const shift of todayShifts) {
    dailyHours += calculateShiftHours(shift.start_time, shift.end_time);
  }

  const consecutiveDays = calculateConsecutiveDays(weekShifts, date);

  return {
    weeklyHours,
    dailyHours,
    consecutiveDays,
    isOverWeekly: weeklyHours >= 40,
    isOverDaily: dailyHours >= 12,
    isSixthDay: consecutiveDays === 6,
    isSeventhDay: consecutiveDays >= 7,
    requiresOverride: consecutiveDays >= 7,
  };
}

export async function suggestAlternatives(
  locationId: string,
  skillId: string,
  date: Date,
  startTime: string,
  endTime: string
): Promise<AlternativeStaff[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "STAFF",
      banned: false,
      certifications: {
        some: {
          location_id: locationId,
          skill_id: skillId,
        },
      },
    },
  });

  const alternatives: AlternativeStaff[] = [];

  for (const user of users) {
    const { violations } = await validateAssignment(user.id, locationId, skillId, date, startTime, endTime);
    const noConflicts = violations.filter(
      (v: ConstraintViolation) => !["DOUBLE_BOOKING", "REST_PERIOD", "OVERTIME_DAILY", "CONSECUTIVE_DAYS"].includes(v.type)
    );

    if (noConflicts.length === 0) {
      let reason = "Available";
      if (violations.some((v: ConstraintViolation) => v.type === "AVAILABILITY")) {
        reason = "Has availability set";
      } else if (violations.some((v: ConstraintViolation) => v.type === "OVERTIME_WEEKLY")) {
        reason = "Approaching overtime";
      } else {
        reason = "All constraints met";
      }
      alternatives.push({
        userId: user.id,
        name: user.name,
        reason,
      });
    }
  }

  return alternatives.slice(0, 5);
}

export async function validateAssignment(
  userId: string,
  locationId: string,
  skillId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeShiftId?: string,
  overrideReason?: string
): Promise<{ violations: ConstraintViolation[]; hasSeventhDayOverride: boolean }> {
  const violations: ConstraintViolation[] = [];
  let hasSeventhDayOverride = false;

  const doubleBooking = await checkNoDoubleBooking(userId, date, startTime, endTime, excludeShiftId);
  if (doubleBooking) violations.push(doubleBooking);

  const restPeriod = await checkTenHourRest(userId, date, startTime, endTime, excludeShiftId);
  if (restPeriod) violations.push(restPeriod);

  const skill = await checkSkillMatch(userId, skillId);
  if (skill) violations.push(skill);

  const cert = await checkCertification(userId, locationId);
  if (cert) violations.push(cert);

  const avail = await checkAvailability(userId, date, startTime, endTime);
  if (avail) violations.push(avail);

  const overtime = await checkOvertime(userId, date, startTime, endTime);
  if (overtime.isOverDaily) {
    violations.push({
      type: "OVERTIME_DAILY",
      message: `Would exceed 12-hour daily limit (${overtime.dailyHours.toFixed(1)} hours)`,
    });
  }
  if (overtime.isOverWeekly) {
    violations.push({
      type: "OVERTIME_WEEKLY",
      message: `Would exceed 40-hour weekly limit (${overtime.weeklyHours.toFixed(1)} hours)`,
    });
  }
  if (overtime.isSixthDay) {
    violations.push({
      type: "CONSECUTIVE_DAYS",
      message: "Would be 6th consecutive day worked (warning)",
    });
  }
  if (overtime.isSeventhDay) {
    if (overrideReason && overrideReason.length >= 5) {
      hasSeventhDayOverride = true;
      violations.push({
        type: "CONSECUTIVE_DAYS",
        message: `7th consecutive day - override applied: ${overrideReason}`,
      });
    } else {
      violations.push({
        type: "CONSECUTIVE_DAYS",
        message: "Would be 7th consecutive day worked (requires manager override with documented reason)",
      });
    }
  }

  return { violations, hasSeventhDayOverride };
}

function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

function getHoursBetween(time1: string, time2: string): number {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  let hours = h2 - h1;
  let minutes = m2 - m1;
  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }
  return hours + minutes / 60;
}

function calculateShiftHours(startTime: string, endTime: string): number {
  let hours = getHoursBetween(startTime, endTime);
  if (hours < 0) hours += 24;
  return hours;
}

function isTimeWithinRange(
  shiftStart: string,
  shiftEnd: string,
  availStart: string,
  availEnd: string
): boolean {
  const isOvernightShift = shiftStart > shiftEnd;
  const isOvernightAvailability = availStart > availEnd;

  if (isOvernightShift) {
    if (isOvernightAvailability) {
      return shiftStart >= availStart || shiftEnd <= availEnd;
    }
    return false;
  }

  if (isOvernightAvailability) {
    return false;
  }

  return shiftStart >= availStart && shiftEnd <= availEnd;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function calculateConsecutiveDays(shifts: { date: Date }[], targetDate: Date): number {
  const sortedDates = shifts
    .map((s) => new Date(s.date).toISOString().split("T")[0])
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  if (sortedDates.length === 0) return 1;

  let count = 1;
  const targetStr = targetDate.toISOString().split("T")[0];

  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const current = new Date(sortedDates[i]);
    const next = i > 0 ? new Date(sortedDates[i - 1]) : null;

    if (sortedDates[i] === targetStr) {
      continue;
    }

    if (next) {
      const diffDays = Math.round((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        count++;
      } else {
        break;
      }
    }
  }

  return count;
}
