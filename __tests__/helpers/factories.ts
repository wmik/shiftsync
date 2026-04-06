import { prisma } from './db';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

export interface CreateShiftParams {
  locationId: string;
  skillId: string;
  date: Date;
  startTime: string;
  endTime: string;
  headcount?: number;
  published?: boolean;
  createdBy: string;
}

export interface CreateUserParams {
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  timezone?: string;
  desiredHoursMin?: number;
  desiredHoursMax?: number;
}

export interface CreateCertificationParams {
  userId: string;
  locationId: string;
  skillId: string;
}

export interface CreateAvailabilityParams {
  userId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export async function createTestUser(params: CreateUserParams) {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {},
    create: {
      id: nanoid(),
      email: params.email,
      name: params.name,
      email_verified: true,
      role: params.role,
      timezone: params.timezone || 'America/New_York',
      desired_hours_min: params.desiredHoursMin,
      desired_hours_max: params.desiredHoursMax,
    },
  });

  await prisma.account.upsert({
    where: {
      provider_id_user_id: {
        provider_id: 'credential',
        user_id: user.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${user.id}-test`,
      provider_id: 'credential',
      user_id: user.id,
      password: passwordHash,
    },
  });

  return user;
}

export async function createTestShift(params: CreateShiftParams) {
  return prisma.shift.create({
    data: {
      id: nanoid(),
      location_id: params.locationId,
      skill_id: params.skillId,
      date: params.date,
      start_time: params.startTime,
      end_time: params.endTime,
      headcount: params.headcount || 1,
      is_published: params.published || false,
      cutoff_hours: 48,
      created_by: params.createdBy,
    },
  });
}

export async function createTestCertification(params: CreateCertificationParams) {
  return prisma.certification.upsert({
    where: {
      user_id_location_id_skill_id: {
        user_id: params.userId,
        location_id: params.locationId,
        skill_id: params.skillId,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      user_id: params.userId,
      location_id: params.locationId,
      skill_id: params.skillId,
      certified_at: new Date(),
    },
  });
}

export async function createTestAvailability(params: CreateAvailabilityParams) {
  return prisma.availability.create({
    data: {
      id: nanoid(),
      user_id: params.userId,
      day_of_week: params.dayOfWeek,
      start_time: params.startTime,
      end_time: params.endTime,
    },
  });
}

export async function assignStaffToShift(shiftId: string, userId: string, assignedBy: string) {
  return prisma.shift_assignment.create({
    data: {
      id: nanoid(),
      shift_id: shiftId,
      user_id: userId,
      assigned_by: assignedBy,
      status: 'CONFIRMED',
    },
  });
}

export async function createDropRequest(shiftId: string, requestedByUserId: string, expiresAt?: Date) {
  return prisma.drop_request.create({
    data: {
      id: nanoid(),
      shift_id: shiftId,
      requested_by_user_id: requestedByUserId,
      status: 'OPEN',
      expires_at: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
}

export async function createSwapRequest(
  requesterUserId: string,
  requesterShiftId: string,
  targetUserId: string
) {
  return prisma.swap_request.create({
    data: {
      id: nanoid(),
      requester_user_id: requesterUserId,
      requester_shift_id: requesterShiftId,
      target_user_id: targetUserId,
      status: 'PENDING',
    },
  });
}

export async function cleanupTestData() {
  const tableNames = [
    'audit_log',
    'notification',
    'shift_assignment',
    'swap_request',
    'drop_request',
    'shift',
    'availability_exception',
    'availability',
    'certification',
    'manager_location',
  ];

  for (const table of tableNames) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
}

export function getDateOffset(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
