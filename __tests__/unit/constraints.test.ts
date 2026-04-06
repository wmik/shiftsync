import {
  checkNoDoubleBooking,
  checkTenHourRest,
  checkSkillMatch,
  checkCertification,
  checkAvailability,
  checkOvertime,
} from '@/lib/constraints';
import { prisma } from '@/lib/db';

describe('Constraint Validation - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkNoDoubleBooking', () => {
    it('returns null when no overlapping shifts exist', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkNoDoubleBooking(
        'user-1',
        new Date('2026-04-06'),
        '09:00',
        '17:00'
      );

      expect(result).toBeNull();
      expect(prisma.shift.findMany).toHaveBeenCalled();
    });

    it('returns violation when overlapping shift exists', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([{
        id: 'shift-1',
        start_time: '10:00',
        end_time: '18:00',
        location: { name: 'Downtown' },
      }]);

      const result = await checkNoDoubleBooking(
        'user-1',
        new Date('2026-04-06'),
        '09:00',
        '17:00'
      );

      expect(result).not.toBeNull();
      expect(result?.type).toBe('DOUBLE_BOOKING');
      expect(result?.message).toContain('Downtown');
    });

    it('excludes specified shift from check', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([]);

      await checkNoDoubleBooking(
        'user-1',
        new Date('2026-04-06'),
        '09:00',
        '17:00',
        'shift-to-exclude'
      );

      const call = (prisma.shift.findMany as jest.Mock).mock.calls[0];
      expect(call[0]?.where?.id).toEqual({ not: 'shift-to-exclude' });
    });
  });

  describe('checkTenHourRest', () => {
    it('returns null when rest period is sufficient', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkTenHourRest(
        'user-1',
        new Date('2026-04-06'),
        '10:00',
        '18:00'
      );

      expect(result).toBeNull();
    });

    it('returns violation when rest period is less than 10 hours', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([{
        id: 'shift-1',
        start_time: '22:00',
        end_time: '06:00',
      }]);

      const result = await checkTenHourRest(
        'user-1',
        new Date('2026-04-06'),
        '02:00',
        '10:00'
      );

      expect(result).not.toBeNull();
      expect(result?.type).toBe('REST_PERIOD');
    });
  });

  describe('checkSkillMatch', () => {
    it('returns null when user has required skill', async () => {
      (prisma.certification.findFirst as jest.Mock).mockResolvedValue({
        skill_id: 'skill-1',
        user_id: 'user-1',
      });

      const result = await checkSkillMatch('user-1', 'skill-1');

      expect(result).toBeNull();
    });

    it('returns violation when user lacks required skill', async () => {
      (prisma.certification.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await checkSkillMatch('user-1', 'skill-1');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('SKILL_MISMATCH');
    });
  });

  describe('checkCertification', () => {
    it('returns null when user is certified for location', async () => {
      (prisma.certification.findFirst as jest.Mock).mockResolvedValue({
        location_id: 'location-1',
        user_id: 'user-1',
      });

      const result = await checkCertification('user-1', 'location-1');

      expect(result).toBeNull();
    });

    it('returns violation when user is not certified for location', async () => {
      (prisma.certification.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await checkCertification('user-1', 'location-1');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('CERTIFICATION_MISSING');
    });
  });

  describe('checkAvailability', () => {
    it('returns null when shift is within availability', async () => {
      const monday = new Date('2026-04-06');
      (prisma.availability_exception.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.availability.findFirst as jest.Mock).mockResolvedValue({
        day_of_week: monday.getDay(),
        start_time: '09:00',
        end_time: '17:00',
      });

      const result = await checkAvailability(
        'user-1',
        monday,
        '10:00',
        '16:00'
      );

      expect(result).toBeNull();
    });

    it('returns violation when no availability set', async () => {
      (prisma.availability_exception.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.availability.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await checkAvailability(
        'user-1',
        new Date('2026-04-06'),
        '18:00',
        '22:00'
      );

      expect(result).not.toBeNull();
      expect(result?.type).toBe('AVAILABILITY');
    });
  });

  describe('checkOvertime', () => {
    it('returns null when within limits', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkOvertime(
        'user-1',
        new Date('2026-04-06'),
        '09:00',
        '17:00'
      );

      expect(result.isOverWeekly).toBe(false);
      expect(result.isOverDaily).toBe(false);
      expect(result.requiresOverride).toBe(false);
    });

    it('detects weekly overtime', async () => {
      const shifts = Array(5).fill(null).map((_, i) => ({
        id: `shift-${i}`,
        date: new Date(Date.now() - i * 86400000),
        start_time: '09:00',
        end_time: '17:00',
      }));

      (prisma.shift.findMany as jest.Mock).mockResolvedValue(shifts);

      const result = await checkOvertime(
        'user-1',
        new Date(),
        '09:00',
        '17:00'
      );

      expect(result.isOverWeekly).toBe(true);
      expect(result.weeklyHours).toBeGreaterThanOrEqual(40);
    });

    it('detects daily overtime', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([{
        id: 'shift-1',
        date: new Date(),
        start_time: '00:00',
        end_time: '14:00',
      }]);

      const result = await checkOvertime(
        'user-1',
        new Date(),
        '00:00',
        '14:00'
      );

      expect(result.isOverDaily).toBe(true);
    });
  });
});
