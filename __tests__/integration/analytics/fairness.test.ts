import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
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

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

describe('Fairness Analytics API', () => {
  let manager: { id: string };
  let staffA: { id: string };
  let staffB: { id: string };
  let managerSession: string;
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

    const mgr = await createTestUser({
      email: 'manager@test.com',
      name: 'Test Manager',
      role: 'manager',
    });
    manager = mgr;

    const staffUserA = await createTestUser({
      email: 'staffa@test.com',
      name: 'Staff A',
      role: 'staff',
    });
    staffA = staffUserA;

    const staffUserB = await createTestUser({
      email: 'staffb@test.com',
      name: 'Staff B',
      role: 'staff',
    });
    staffB = staffUserB;

    const location = await prisma.location.findFirst();
    locationId = location!.id;

    const skill = await prisma.skill.findFirst();
    skillId = skill!.id;

    await createTestCertification({
      userId: staffA.id,
      locationId,
      skillId,
    });

    await createTestCertification({
      userId: staffB.id,
      locationId,
      skillId,
    });

    for (let day = 0; day < 7; day++) {
      await createTestAvailability({
        userId: staffA.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '22:00',
      });

      await createTestAvailability({
        userId: staffB.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '22:00',
      });
    }

    await prisma.manager_location.create({
      data: {
        user_id: manager.id,
        location_id: locationId,
      },
    });

    const sessionM = await prisma.session.create({
      data: {
        id: `session-m-${Date.now()}`,
        user_id: manager.id,
        token: `token-m-${Date.now()}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    managerSession = sessionM.token;
  });

  describe('GET /api/analytics/fairness', () => {
    it('should calculate fairness score', async () => {
      const today = new Date();

      for (let i = 0; i < 5; i++) {
        const date = getDateOffset(i);

        const shift = await createTestShift({
          locationId,
          skillId,
          date,
          startTime: '09:00',
          endTime: '17:00',
          published: true,
          createdBy: manager.id,
        });

        await assignStaffToShift(shift.id, staffA.id, manager.id);
      }

      const res = await request(BASE_URL)
        .get('/api/analytics/fairness')
        .set('Cookie', `better-auth.session_token=${managerSession}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('fairnessScore');
      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('should include premium shift distribution', async () => {
      const friday = new Date();
      friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7);

      const shift = await createTestShift({
        locationId,
        skillId,
        date: friday,
        startTime: '17:00',
        endTime: '23:00',
        published: true,
        createdBy: manager.id,
      });

      await assignStaffToShift(shift.id, staffA.id, manager.id);

      const res = await request(BASE_URL)
        .get('/api/analytics/fairness')
        .set('Cookie', `better-auth.session_token=${managerSession}`);

      expect(res.status).toBe(200);
      expect(res.body.users[0]).toHaveProperty('premiumHours');
    });
  });

  describe('Premium Shift Detection', () => {
    it('should mark Friday evening as premium', async () => {
      const friday = new Date();
      friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7 || 7));

      const shift = await createTestShift({
        locationId,
        skillId,
        date: friday,
        startTime: '17:00',
        endTime: '23:00',
        published: true,
        createdBy: manager.id,
      });

      await assignStaffToShift(shift.id, staffA.id, manager.id);

      const res = await request(BASE_URL)
        .get('/api/analytics/fairness')
        .set('Cookie', `better-auth.session_token=${managerSession}`);

      const user = res.body.users.find((u: { id: string }) => u.id === staffA.id);
      expect(user.premiumHours).toBeGreaterThan(0);
    });

    it('should mark Saturday evening as premium', async () => {
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7));

      const shift = await createTestShift({
        locationId,
        skillId,
        date: saturday,
        startTime: '18:00',
        endTime: '23:00',
        published: true,
        createdBy: manager.id,
      });

      await assignStaffToShift(shift.id, staffA.id, manager.id);

      const res = await request(BASE_URL)
        .get('/api/analytics/fairness')
        .set('Cookie', `better-auth.session_token=${managerSession}`);

      const user = res.body.users.find((u: { id: string }) => u.id === staffA.id);
      expect(user.premiumHours).toBeGreaterThan(0);
    });

    it('should not mark weekday daytime as premium', async () => {
      const monday = new Date();
      monday.setDate(monday.getDate() + ((1 - monday.getDay() + 7) % 7 || 7));

      const shift = await createTestShift({
        locationId,
        skillId,
        date: monday,
        startTime: '09:00',
        endTime: '17:00',
        published: true,
        createdBy: manager.id,
      });

      await assignStaffToShift(shift.id, staffA.id, manager.id);

      const res = await request(BASE_URL)
        .get('/api/analytics/fairness')
        .set('Cookie', `better-auth.session_token=${managerSession}`);

      const user = res.body.users.find((u: { id: string }) => u.id === staffA.id);
      expect(user.premiumHours).toBe(0);
    });
  });

  describe('Hours Distribution', () => {
    it('should calculate total hours per user', async () => {
      const today = getDateOffset(0);

      const shift = await createTestShift({
        locationId,
        skillId,
        date: today,
        startTime: '09:00',
        endTime: '17:00',
        published: true,
        createdBy: manager.id,
      });

      await assignStaffToShift(shift.id, staffA.id, manager.id);

      const res = await request(BASE_URL)
        .get('/api/analytics/hours')
        .set('Cookie', `better-auth.session_token=${managerSession}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalHours');
      expect(res.body.totalHours).toBeGreaterThan(0);
    });
  });
});
