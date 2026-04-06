import { prisma } from './db';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  password: string;
}

export const TEST_USERS = {
  admin: {
    email: 'admin@coastaleats.com',
    password: 'password123',
  },
  manager: {
    email: 'manager@coastaleats.com',
    password: 'password123',
  },
  staff: {
    email: 'sarah@coastaleats.com',
    password: 'password123',
  },
  alex: {
    email: 'alex@coastaleats.com',
    password: 'password123',
  },
  emily: {
    email: 'emily@coastaleats.com',
    password: 'password123',
  },
  james: {
    email: 'james@coastaleats.com',
    password: 'password123',
  },
} as const;

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      accounts: true,
      certifications: {
        include: {
          location: true,
          skill: true,
        },
      },
      availability: true,
      manager_locations: {
        include: {
          location: true,
        },
      },
    },
  });
}

export async function getUserSession(userEmail: string) {
  const user = await getUserByEmail(userEmail);
  if (!user) return null;

  const session = await prisma.session.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
  });

  return { user, session };
}

export async function createTestSession(userId: string) {
  const { nanoid } = await import('nanoid');
  const token = nanoid(32);
  
  const session = await prisma.session.create({
    data: {
      id: nanoid(),
      user_id: userId,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return session;
}

export async function deleteTestSession(sessionId: string) {
  await prisma.session.delete({
    where: { id: sessionId },
  });
}

export function getAuthHeaders(sessionToken?: string) {
  if (sessionToken) {
    return {
      Cookie: `better-auth.session_token=${sessionToken}`,
    };
  }
  return {};
}

export async function cleanupTestSessions() {
  await prisma.session.deleteMany({});
}

export async function cleanupTestAccounts() {
  await prisma.account.deleteMany({});
}
