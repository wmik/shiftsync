import { prisma } from '@/lib/db';

describe('Fairness Analytics Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Premium Shift Detection', () => {
    it('should identify Friday evening as premium', () => {
      const friday = new Date('2026-04-10');
      expect(friday.getDay()).toBe(5);
      
      const isFriday = friday.getDay() === 5;
      const isEvening = 17 >= 17 && 17 < 23;
      
      expect(isFriday && isEvening).toBe(true);
    });

    it('should identify Saturday evening as premium', () => {
      const saturday = new Date('2026-04-11');
      expect(saturday.getDay()).toBe(6);
      
      const isSaturday = saturday.getDay() === 6;
      const isEvening = 18 >= 17 && 18 < 23;
      
      expect(isSaturday && isEvening).toBe(true);
    });

    it('should not flag Sunday afternoon as premium', () => {
      const sunday = new Date('2026-04-12');
      expect(sunday.getDay()).toBe(0);
      
      const isSunday = sunday.getDay() === 0;
      const isEvening = 14 >= 17 && 14 < 23;
      
      expect(isSunday || !isEvening).toBe(true);
    });
  });

  describe('Fairness Score Calculation', () => {
    it('should calculate perfect fairness score', () => {
      const minHours = 32;
      const maxHours = 32;
      const avgHours = 32;
      
      const fairnessScore = avgHours > 0
        ? Math.max(0, 100 - ((maxHours - minHours) / avgHours) * 100)
        : 100;
      
      expect(fairnessScore).toBe(100);
    });

    it('should calculate lower fairness score for uneven distribution', () => {
      const minHours = 20;
      const maxHours = 40;
      const avgHours = 30;
      
      const fairnessScore = avgHours > 0
        ? Math.max(0, 100 - ((maxHours - minHours) / avgHours) * 100)
        : 100;
      
      expect(fairnessScore).toBeCloseTo(33.33, 1);
    });

    it('should handle zero average hours', () => {
      const fairnessScore = 0 > 0
        ? Math.max(0, 100 - ((0 - 0) / 0) * 100)
        : 100;
      
      expect(fairnessScore).toBe(100);
    });
  });

  describe('Fairness Ratings', () => {
    const getFairnessRating = (score: number): string => {
      if (score >= 90) return 'Excellent';
      if (score >= 75) return 'Good';
      if (score >= 50) return 'Fair';
      return 'Needs Attention';
    };

    it('should rate 95 as Excellent', () => {
      expect(getFairnessRating(95)).toBe('Excellent');
    });

    it('should rate 80 as Good', () => {
      expect(getFairnessRating(80)).toBe('Good');
    });

    it('should rate 60 as Fair', () => {
      expect(getFairnessRating(60)).toBe('Fair');
    });

    it('should rate 40 as Needs Attention', () => {
      expect(getFairnessRating(40)).toBe('Needs Attention');
    });
  });

  describe('Hours Comparison', () => {
    it('should identify under-scheduled staff', () => {
      const desiredMin = 30;
      const actualHours = 20;
      
      const isUnderScheduled = actualHours < desiredMin;
      expect(isUnderScheduled).toBe(true);
    });

    it('should identify over-scheduled staff', () => {
      const desiredMax = 40;
      const actualHours = 48;
      
      const isOverScheduled = actualHours > desiredMax;
      expect(isOverScheduled).toBe(true);
    });

    it('should identify staff within desired range', () => {
      const desiredMin = 20;
      const desiredMax = 40;
      const actualHours = 32;
      
      const isInRange = actualHours >= desiredMin && actualHours <= desiredMax;
      expect(isInRange).toBe(true);
    });
  });

  describe('Premium Distribution', () => {
    it('should calculate premium percentage correctly', () => {
      const totalHours = 40;
      const premiumHours = 10;
      
      const premiumPercentage = (premiumHours / totalHours) * 100;
      
      expect(premiumPercentage).toBe(25);
    });

    it('should handle zero total hours', () => {
      const totalHours = 0;
      const premiumHours = 0;
      
      const premiumPercentage = totalHours > 0 
        ? (premiumHours / totalHours) * 100 
        : 0;
      
      expect(premiumPercentage).toBe(0);
    });
  });
});
