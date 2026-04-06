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

describe('Swap Request API', () => {
  let manager: { id: string };
  let staffA: { id: string };
  let staffB: { id: string };
  let managerSession: string;
  let staffASession: string;
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

    await createTestAvailability({
      userId: staffA.id,
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '22:00',
    });

    await createTestAvailability({
      userId: staffB.id,
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '22:00',
    });

    await prisma.manager_location.create({
      data: {
        user_id: manager.id,
        location_id: locationId,
      },
    });

    const sessionA = await prisma.session.create({
      data: {
        id: `session-a-${Date.now()}`,
        user_id: staffA.id,
        token: `token-a-${Date.now()}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    staffASession = sessionA.token;

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

  describe('POST /api/requests/swap', () => {
    it('should create a swap request', async () => {
      const date = getDateOffset(1);

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

      const res = await request(BASE_URL)
        .post('/api/requests/swap')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({
          shiftId: shift.id,
          targetUserId: staffB.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
    });

    it('should enforce max 3 pending requests', async () => {
      const date = getDateOffset(1);

      for (let i = 0; i < 3; i++) {
        const shift = await createTestShift({
          locationId,
          skillId,
          date: new Date(date.getTime() + i * 24 * 60 * 60 * 1000),
          startTime: '09:00',
          endTime: '17:00',
          published: true,
          createdBy: manager.id,
        });

        await assignStaffToShift(shift.id, staffA.id, manager.id);
      }

      const shifts = await prisma.shift.findMany({ where: { created_by: manager.id } });

      const res = await request(BASE_URL)
        .post('/api/requests/swap')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({
          shiftId: shifts[3].id,
          targetUserId: staffB.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Maximum 3 pending swap requests');
    });
  });

  describe('PUT /api/requests/swap/[id]', () => {
    it('should allow target to accept swap', async () => {
      const date = getDateOffset(1);

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

      const swapRes = await request(BASE_URL)
        .post('/api/requests/swap')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({
          shiftId: shift.id,
          targetUserId: staffB.id,
        });

      const swapId = swapRes.body.id;

      const sessionB = await prisma.session.create({
        data: {
          id: `session-b-${Date.now()}`,
          user_id: staffB.id,
          token: `token-b-${Date.now()}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const acceptRes = await request(BASE_URL)
        .put(`/api/requests/swap/${swapId}`)
        .set('Cookie', `better-auth.session_token=${sessionB.token}`)
        .send({ action: 'ACCEPT' });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.status).toBe('PENDING_APPROVAL');
    });

    it('should allow manager to approve swap', async () => {
      const date = getDateOffset(1);

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

      const swapRes = await request(BASE_URL)
        .post('/api/requests/swap')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({
          shiftId: shift.id,
          targetUserId: staffB.id,
        });

      const swapId = swapRes.body.id;

      const sessionB = await prisma.session.create({
        data: {
          id: `session-b-${Date.now()}`,
          user_id: staffB.id,
          token: `token-b-${Date.now()}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await request(BASE_URL)
        .put(`/api/requests/swap/${swapId}`)
        .set('Cookie', `better-auth.session_token=${sessionB.token}`)
        .send({ action: 'ACCEPT' });

      const approveRes = await request(BASE_URL)
        .put(`/api/requests/swap/${swapId}`)
        .set('Cookie', `better-auth.session_token=${managerSession}`)
        .send({ action: 'APPROVE' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe('COMPLETED');
    });

    it('should allow requester to cancel pending swap', async () => {
      const date = getDateOffset(1);

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

      const swapRes = await request(BASE_URL)
        .post('/api/requests/swap')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({
          shiftId: shift.id,
          targetUserId: staffB.id,
        });

      const swapId = swapRes.body.id;

      const cancelRes = await request(BASE_URL)
        .put(`/api/requests/swap/${swapId}`)
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({ action: 'CANCEL' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('CANCELLED');
    });
  });
});
