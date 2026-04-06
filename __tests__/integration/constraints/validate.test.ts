import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  checkNoDoubleBooking,
  checkTenHourRest,
  checkSkillMatch,
  checkCertification,
  checkAvailability,
  checkOvertime,
  validateAssignment,
} from '@/lib/constraints';
import { prisma, setupTestDb, disconnectTestDb } from '../../helpers/db';
import {
  createTestUser,
  createTestShift,
  createTestCertification,
  createTestAvailability,
  assignStaffToShift,
  cleanupTestData,
  getDateOffset,
} from '../../helpers/factories';

describe('Constraint Validation Tests', () => {
  let adminUser: { id: string };
  let staffUser: { id: string };
  let locationId: string;
  let skillId: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestData();

    const admin = await createTestUser({
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'admin',
    });
    adminUser = admin;

    const staff = await createTestUser({
      email: 'staff@test.com',
      name: 'Test Staff',
      role: 'staff',
    });
    staffUser = staff;

    const location = await prisma.location.findFirst();
    locationId = location!.id;

    const skill = await prisma.skill.findFirst();
    skillId = skill!.id;

    await createTestCertification({
      userId: staffUser.id,
      locationId,
      skillId,
    });

    await createTestAvailability({
      userId: staffUser.id,
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '22:00',
    });
  });

  describe('Double Booking', () => {
    it('should detect overlapping shifts on same day', async () => {
      const date = getDateOffset(0);

      await createTestShift({
        locationId,
        skillId,
        date,
        startTime: '09:00',
        endTime: '17:00',
        createdBy: adminUser.id,
      });

      await createTestShift({
        locationId,
        skillId,
        date,
        startTime: '14:00',
        endTime: '22:00',
        createdBy: adminUser.id,
      });

      await assignStaffToShift(
        (await prisma.shift.findFirst())!.id,
        staffUser.id,
        adminUser.id
      );

      const shift2 = await prisma.shift.findMany({
        where: { NOT: { id: (await prisma.shift.findFirst())!.id } },
      });

      const violation = await checkNoDoubleBooking(
        staffUser.id,
        date,
        shift2[0].start_time,
        shift2[0].end_time,
        shift2[0].id
      );

      expect(violation).not.toBeNull();
      expect(violation?.type).toBe('DOUBLE_BOOKING');
      expect(violation?.message).toContain('already has a shift');
    });

    it('should allow non-overlapping shifts on same day', async () => {
      const date = getDateOffset(0);

      await createTestShift({
        locationId,
        skillId,
        date,
        startTime: '09:00',
        endTime: '12:00',
        createdBy: adminUser.id,
      });

      await createTestShift({
        locationId,
        skillId,
        date,
        startTime: '14:00',
        endTime: '18:00',
        createdBy: adminUser.id,
      });

      const shift1 = await prisma.shift.findFirst();
      await assignStaffToShift(shift1!.id, staffUser.id, adminUser.id);

      const shift2 = await prisma.shift.findMany({
        where: { NOT: { id: shift1!.id } },
      });

      const violation = await checkNoDoubleBooking(
        staffUser.id,
        date,
        shift2[0].start_time,
        shift2[0].end_time,
        shift2[0].id
      );

      expect(violation).toBeNull();
    });

    it('should allow shifts on different days', async () => {
      const date1 = getDateOffset(0);
      const date2 = getDateOffset(1);

      await createTestShift({
        locationId,
        skillId,
        date: date1,
        startTime: '09:00',
        endTime: '17:00',
        createdBy: adminUser.id,
      });

      await createTestShift({
        locationId,
        skillId,
        date: date2,
        startTime: '09:00',
        endTime: '17:00',
        createdBy: adminUser.id,
      });

      const shift1 = await prisma.shift.findFirst();
      await assignStaffToShift(shift1!.id, staffUser.id, adminUser.id);

      const shift2 = await prisma.shift.findMany({
        where: { NOT: { id: shift1!.id } },
      });

      const violation = await checkNoDoubleBooking(
        staffUser.id,
        date2,
        shift2[0].start_time,
        shift2[0].end_time,
        shift2[0].id
      );

      expect(violation).toBeNull();
    });

    it('should detect overnight shifts that overlap', async () => {
      const date = getDateOffset(0);

      await createTestShift({
        locationId,
        skillId,
        date,
        startTime: '22:00',
        endTime: '02:00',
        createdBy: adminUser.id,
      });

      await createTestShift({
        locationId,
        skillId,
        date,
        startTime: '23:00',
        endTime: '03:00',
        createdBy: adminUser.id,
      });

      const shift1 = await prisma.shift.findFirst();
      await assignStaffToShift(shift1!.id, staffUser.id, adminUser.id);

      const shift2 = await prisma.shift.findMany({
        where: { NOT: { id: shift1!.id } },
      });

      const violation = await checkNoDoubleBooking(
        staffUser.id,
        date,
        shift2[0].start_time,
        shift2[0].end_time,
        shift2[0].id
      );

      expect(violation).not.toBeNull();
      expect(violation?.type).toBe('DOUBLE_BOOKING');
    });
  });

  describe('Ten Hour Rest Period', () => {
    it('should detect less than 10 hours between shifts', async () => {
      const date1 = getDateOffset(0);
      const date2 = getDateOffset(1);

      await createTestShift({
        locationId,
        skillId,
        date: date1,
        startTime: '08:00',
        endTime: '14:00',
        createdBy: adminUser.id,
      });

      await createTestShift({
        locationId,
        skillId,
        date: date2,
        startTime: '20:00',
        endTime: '02:00',
        createdBy: adminUser.id,
      });

      const shift1 = await prisma.shift.findFirst();
      await assignStaffToShift(shift1!.id, staffUser.id, adminUser.id);

      const shift2 = await prisma.shift.findMany({
        where: { NOT: { id: shift1!.id } },
      });

      const violation = await checkTenHourRest(
        staffUser.id,
        date2,
        shift2[0].start_time,
        shift2[0].end_time,
        shift2[0].id
      );

      expect(violation).not.toBeNull();
      expect(violation?.type).toBe('REST_PERIOD');
      expect(violation?.message).toContain('minimum 10 required');
    });

    it('should allow shifts with 10+ hours between them', async () => {
      const date1 = getDateOffset(0);
      const date2 = getDateOffset(1);

      await createTestShift({
        locationId,
        skillId,
        date: date1,
        startTime: '08:00',
        endTime: '14:00',
        createdBy: adminUser.id,
      });

      await createTestShift({
        locationId,
        skillId,
        date: date2,
        startTime: '06:00',
        endTime: '14:00',
        createdBy: adminUser.id,
      });

      const shift1 = await prisma.shift.findFirst();
      await assignStaffToShift(shift1!.id, staffUser.id, adminUser.id);

      const shift2 = await prisma.shift.findMany({
        where: { NOT: { id: shift1!.id } },
      });

      const violation = await checkTenHourRest(
        staffUser.id,
        date2,
        shift2[0].start_time,
        shift2[0].end_time,
        shift2[0].id
      );

      expect(violation).toBeNull();
    });
  });

  describe('Skill Match', () => {
    it('should allow assignment when user has required skill', async () => {
      const violation = await checkSkillMatch(staffUser.id, skillId);
      expect(violation).toBeNull();
    });

    it('should block assignment when user lacks required skill', async () => {
      const otherSkill = await prisma.skill.findFirst({
        where: { NOT: { id: skillId } },
      });

      const violation = await checkSkillMatch(staffUser.id, otherSkill!.id);
      expect(violation).not.toBeNull();
      expect(violation?.type).toBe('SKILL_MISMATCH');
    });
  });

  describe('Certification', () => {
    it('should allow assignment when user is certified for location', async () => {
      const violation = await checkCertification(staffUser.id, locationId);
      expect(violation).toBeNull();
    });

    it('should block assignment when user is not certified for location', async () => {
      const otherLocation = await prisma.location.findFirst({
        where: { NOT: { id: locationId } },
      });

      const violation = await checkCertification(staffUser.id, otherLocation!.id);
      expect(violation).not.toBeNull();
      expect(violation?.type).toBe('CERTIFICATION_MISSING');
    });
  });

  describe('Availability', () => {
    it('should allow assignment within availability window', async () => {
      const date = getDateOffset(1);

      const violation = await checkAvailability(
        staffUser.id,
        date,
        '09:00',
        '17:00'
      );

      expect(violation).toBeNull();
    });

    it('should block assignment outside availability window', async () => {
      const date = getDateOffset(1);

      const violation = await checkAvailability(
        staffUser.id,
        date,
        '06:00',
        '10:00'
      );

      expect(violation).not.toBeNull();
      expect(violation?.type).toBe('AVAILABILITY');
    });

    it('should block assignment on unavailable day', async () => {
      const sunday = getDateOffset(0);

      const violation = await checkAvailability(
        staffUser.id,
        sunday,
        '09:00',
        '17:00'
      );

      expect(violation).not.toBeNull();
      expect(violation?.type).toBe('AVAILABILITY');
    });
  });

  describe('Overtime', () => {
    it('should track weekly hours correctly', async () => {
      const weekStart = getDateOffset(-3);

      for (let i = 0; i < 5; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);

        await createTestAvailability({
          userId: staffUser.id,
          dayOfWeek: date.getDay(),
          startTime: '08:00',
          endTime: '22:00',
        });

        await createTestShift({
          locationId,
          skillId,
          date,
          startTime: '08:00',
          endTime: '16:00',
          createdBy: adminUser.id,
        });

        const shift = await prisma.shift.findFirst();
        await assignStaffToShift(shift!.id, staffUser.id, adminUser.id);
      }

      const status = await checkOvertime(staffUser.id, getDateOffset(4), '08:00', '16:00');

      expect(status.weeklyHours).toBeGreaterThanOrEqual(40);
      expect(status.isOverWeekly).toBe(true);
    });

    it('should detect 6th consecutive day', async () => {
      const weekStart = getDateOffset(-5);

      for (let i = 0; i < 6; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);

        await createTestAvailability({
          userId: staffUser.id,
          dayOfWeek: date.getDay(),
          startTime: '08:00',
          endTime: '22:00',
        });

        await createTestShift({
          locationId,
          skillId,
          date,
          startTime: '08:00',
          endTime: '16:00',
          createdBy: adminUser.id,
        });

        const shift = await prisma.shift.findFirst();
        await assignStaffToShift(shift!.id, staffUser.id, adminUser.id);
      }

      const status = await checkOvertime(staffUser.id, getDateOffset(0), '08:00', '16:00');

      expect(status.isSixthDay).toBe(true);
    });

    it('should detect 7th consecutive day', async () => {
      const weekStart = getDateOffset(-6);

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);

        await createTestAvailability({
          userId: staffUser.id,
          dayOfWeek: date.getDay(),
          startTime: '08:00',
          endTime: '22:00',
        });

        await createTestShift({
          locationId,
          skillId,
          date,
          startTime: '08:00',
          endTime: '16:00',
          createdBy: adminUser.id,
        });

        const shift = await prisma.shift.findFirst();
        await assignStaffToShift(shift!.id, staffUser.id, adminUser.id);
      }

      const status = await checkOvertime(staffUser.id, getDateOffset(0), '08:00', '16:00');

      expect(status.isSeventhDay).toBe(true);
      expect(status.requiresOverride).toBe(true);
    });
  });

  describe('validateAssignment', () => {
    it('should return all violations for invalid assignment', async () => {
      const date = getDateOffset(0);

      const { violations } = await validateAssignment(
        staffUser.id,
        locationId,
        skillId,
        date,
        '06:00',
        '14:00'
      );

      expect(violations.length).toBeGreaterThan(0);
    });

    it('should allow valid assignment', async () => {
      const date = getDateOffset(1);

      await createTestAvailability({
        userId: staffUser.id,
        dayOfWeek: date.getDay(),
        startTime: '08:00',
        endTime: '22:00',
      });

      const { violations } = await validateAssignment(
        staffUser.id,
        locationId,
        skillId,
        date,
        '09:00',
        '17:00'
      );

      expect(violations.length).toBe(0);
    });

    it('should require override reason for 7th consecutive day', async () => {
      const weekStart = getDateOffset(-6);

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);

        await createTestAvailability({
          userId: staffUser.id,
          dayOfWeek: date.getDay(),
          startTime: '08:00',
          endTime: '22:00',
        });

        await createTestShift({
          locationId,
          skillId,
          date,
          startTime: '08:00',
          endTime: '16:00',
          createdBy: adminUser.id,
        });

        const shift = await prisma.shift.findFirst();
        await assignStaffToShift(shift!.id, staffUser.id, adminUser.id);
      }

      const result = await validateAssignment(
        staffUser.id,
        locationId,
        skillId,
        getDateOffset(0),
        '08:00',
        '16:00'
      );

      expect(result.violations.some(v => v.type === 'CONSECUTIVE_DAYS')).toBe(true);
      expect(result.hasSeventhDayOverride).toBe(false);
    });

    it('should accept override reason for 7th consecutive day', async () => {
      const weekStart = getDateOffset(-6);

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);

        await createTestAvailability({
          userId: staffUser.id,
          dayOfWeek: date.getDay(),
          startTime: '08:00',
          endTime: '22:00',
        });

        await createTestShift({
          locationId,
          skillId,
          date,
          startTime: '08:00',
          endTime: '16:00',
          createdBy: adminUser.id,
        });

        const shift = await prisma.shift.findFirst();
        await assignStaffToShift(shift!.id, staffUser.id, adminUser.id);
      }

      const result = await validateAssignment(
        staffUser.id,
        locationId,
        skillId,
        getDateOffset(0),
        '08:00',
        '16:00',
        undefined,
        'Emergency coverage needed'
      );

      expect(result.hasSeventhDayOverride).toBe(true);
    });
  });
});
