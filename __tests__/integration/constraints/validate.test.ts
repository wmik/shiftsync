import {
  validateAssignment,
} from '@/lib/constraints';
import { prisma } from '@/lib/db';

describe('validateAssignment Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Multiple Constraint Validation', () => {
    it('should return multiple violations for invalid assignment', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([
        { id: 'shift-1', date: new Date(), start_time: '22:00', end_time: '06:00' },
      ]);
      (prisma.certification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.availability.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.availability_exception.findFirst as jest.Mock).mockResolvedValue(null);

      const { violations } = await validateAssignment(
        'user-1',
        'location-1',
        'skill-1',
        new Date('2026-04-06'),
        '09:00',
        '17:00'
      );

      expect(violations.length).toBeGreaterThan(0);
      const violationTypes = violations.map(v => v.type);
      expect(violationTypes).toContain('SKILL_MISMATCH');
    });

    it('should pass when all constraints are satisfied', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.certification.findFirst as jest.Mock)
        .mockResolvedValueOnce({ skill_id: 'skill-1', user_id: 'user-1' })
        .mockResolvedValueOnce({ location_id: 'location-1', user_id: 'user-1' });
      (prisma.availability_exception.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.availability.findFirst as jest.Mock).mockResolvedValue({
        day_of_week: 0,
        start_time: '08:00',
        end_time: '22:00',
      });

      const { violations } = await validateAssignment(
        'user-1',
        'location-1',
        'skill-1',
        new Date('2026-04-05'),
        '09:00',
        '17:00'
      );

      expect(violations.length).toBe(0);
    });

    it('should flag 7th consecutive day violation', async () => {
      const shifts = Array(7).fill(null).map((_, i) => ({
        id: `shift-${i}`,
        date: new Date(Date.now() - (6 - i) * 86400000),
        start_time: '09:00',
        end_time: '17:00',
        location: { name: 'Test Location' },
      }));
      (prisma.shift.findMany as jest.Mock).mockResolvedValue(shifts);
      (prisma.certification.findFirst as jest.Mock)
        .mockResolvedValueOnce({ skill_id: 'skill-1', user_id: 'user-1' })
        .mockResolvedValueOnce({ location_id: 'location-1', user_id: 'user-1' });
      (prisma.availability_exception.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.availability.findFirst as jest.Mock).mockResolvedValue({
        day_of_week: 0,
        start_time: '08:00',
        end_time: '22:00',
      });

      const result = await validateAssignment(
        'user-1',
        'location-1',
        'skill-1',
        new Date(),
        '09:00',
        '17:00'
      );

      expect(result.violations.some(v => v.type === 'CONSECUTIVE_DAYS')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle overnight shifts', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([{
        id: 'shift-1',
        date: new Date(),
        start_time: '22:00',
        end_time: '06:00',
        location: { name: 'Test Location' },
      }]);
      (prisma.certification.findFirst as jest.Mock)
        .mockResolvedValueOnce({ skill_id: 'skill-1', user_id: 'user-1' })
        .mockResolvedValueOnce({ location_id: 'location-1', user_id: 'user-1' });
      (prisma.availability_exception.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.availability.findFirst as jest.Mock).mockResolvedValue({
        day_of_week: 0,
        start_time: '06:00',
        end_time: '10:00',
      });

      const { violations } = await validateAssignment(
        'user-1',
        'location-1',
        'skill-1',
        new Date('2026-04-05'),
        '08:00',
        '16:00'
      );

      expect(violations.some(v => v.type === 'REST_PERIOD')).toBe(true);
    });

    it('should validate daily overtime limit', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([{
        id: 'shift-1',
        date: new Date(),
        start_time: '00:00',
        end_time: '14:00',
        location: { name: 'Test Location' },
      }]);
      (prisma.certification.findFirst as jest.Mock)
        .mockResolvedValueOnce({ skill_id: 'skill-1', user_id: 'user-1' })
        .mockResolvedValueOnce({ location_id: 'location-1', user_id: 'user-1' });
      (prisma.availability_exception.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.availability.findFirst as jest.Mock).mockResolvedValue({
        day_of_week: 0,
        start_time: '00:00',
        end_time: '23:59',
      });

      const { violations } = await validateAssignment(
        'user-1',
        'location-1',
        'skill-1',
        new Date(),
        '00:00',
        '14:00'
      );

      expect(violations.some(v => v.type === 'OVERTIME_DAILY')).toBe(true);
    });

    it('should validate weekly overtime limit', async () => {
      const shifts = Array(5).fill(null).map((_, i) => ({
        id: `shift-${i}`,
        date: new Date(Date.now() - i * 86400000),
        start_time: '09:00',
        end_time: '17:00',
        location: { name: 'Test Location' },
      }));
      (prisma.shift.findMany as jest.Mock).mockResolvedValue(shifts);
      (prisma.certification.findFirst as jest.Mock)
        .mockResolvedValueOnce({ skill_id: 'skill-1', user_id: 'user-1' })
        .mockResolvedValueOnce({ location_id: 'location-1', user_id: 'user-1' });
      (prisma.availability_exception.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.availability.findFirst as jest.Mock).mockResolvedValue({
        day_of_week: 0,
        start_time: '00:00',
        end_time: '23:59',
      });

      const { violations } = await validateAssignment(
        'user-1',
        'location-1',
        'skill-1',
        new Date(),
        '09:00',
        '17:00'
      );

      expect(violations.some(v => v.type === 'OVERTIME_WEEKLY')).toBe(true);
    });
  });
});
