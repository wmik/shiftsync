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

describe('Drop Request API', () => {
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

    const sessionM = await prisma.session.create({
      data: {
        id: `session-m-${Date.now()}`,
        user_id: manager.id,
        token: `token-m-${Date.now()}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    managerSession = sessionM.token;

    await prisma.session.delete({ where: { id: sessionA.id } });
  });

  const createSession = async (userId: string) => {
    const session = await prisma.session.create({
      data: {
        id: `session-${userId}-${Date.now()}`,
        user_id: userId,
        token: `token-${userId}-${Date.now()}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return session.token;
  };

  describe('POST /api/requests/drop', () => {
    it('should create a drop request', async () => {
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

      const staffASession = await createSession(staffA.id);

      const res = await request(BASE_URL)
        .post('/api/requests/drop')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({ shiftId: shift.id });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('OPEN');
      expect(res.body.requested_by_user_id).toBe(staffA.id);
    });

    it('should reject drop request for unassigned shift', async () => {
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

      const staffASession = await createSession(staffA.id);

      const res = await request(BASE_URL)
        .post('/api/requests/drop')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({ shiftId: shift.id });

      expect(res.status).toBe(403);
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

      const staffASession = await createSession(staffA.id);

      const res = await request(BASE_URL)
        .post('/api/requests/drop')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({ shiftId: shifts[3].id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Maximum 3 pending');
    });
  });

  describe('PUT /api/requests/drop/[id]/claim', () => {
    it('should allow staff to claim drop request', async () => {
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

      const staffASession = await createSession(staffA.id);

      const dropRes = await request(BASE_URL)
        .post('/api/requests/drop')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({ shiftId: shift.id });

      const dropId = dropRes.body.id;

      const staffBSession = await createSession(staffB.id);

      const claimRes = await request(BASE_URL)
        .put(`/api/requests/drop/${dropId}/claim`)
        .set('Cookie', `better-auth.session_token=${staffBSession}`)
        .send({ action: 'CLAIM' });

      expect(claimRes.status).toBe(200);
      expect(claimRes.body.status).toBe('CLAIMED');
    });

    it('should allow requester to cancel drop request', async () => {
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

      const staffASession = await createSession(staffA.id);

      const dropRes = await request(BASE_URL)
        .post('/api/requests/drop')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({ shiftId: shift.id });

      const dropId = dropRes.body.id;

      const cancelRes = await request(BASE_URL)
        .put(`/api/requests/drop/${dropId}/claim`)
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({ action: 'CANCEL' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('CANCELLED');
    });
  });

  describe('Drop Request Expiry', () => {
    it('should mark expired requests as EXPIRED on GET', async () => {
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

      const staffASession = await createSession(staffA.id);

      await request(BASE_URL)
        .post('/api/requests/drop')
        .set('Cookie', `better-auth.session_token=${staffASession}`)
        .send({ shiftId: shift.id });

      await prisma.drop_request.updateMany({
        data: {
          expires_at: new Date(Date.now() - 1000),
        },
      });

      const res = await request(BASE_URL)
        .get('/api/requests/drop')
        .set('Cookie', `better-auth.session_token=${staffASession}`);

      expect(res.body.some((r: { status: string }) => r.status === 'EXPIRED')).toBe(true);
    });
  });
});
