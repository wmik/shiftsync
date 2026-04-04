import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const skills = await Promise.all([
    prisma.skill.upsert({
      where: { name: "Server" },
      update: {},
      create: { name: "Server" },
    }),
    prisma.skill.upsert({
      where: { name: "Bartender" },
      update: {},
      create: { name: "Bartender" },
    }),
    prisma.skill.upsert({
      where: { name: "Line Cook" },
      update: {},
      create: { name: "Line Cook" },
    }),
    prisma.skill.upsert({
      where: { name: "Grill Cook" },
      update: {},
      create: { name: "Grill Cook" },
    }),
    prisma.skill.upsert({
      where: { name: "Host" },
      update: {},
      create: { name: "Host" },
    }),
    prisma.skill.upsert({
      where: { name: "Dishwasher" },
      update: {},
      create: { name: "Dishwasher" },
    }),
  ]);
  console.log("✅ Created skills");

  const downtown = await prisma.location.upsert({
    where: { name: "Coastal Eats - Downtown" },
    update: {},
    create: {
      name: "Coastal Eats - Downtown",
      address: "123 Main Street, San Francisco, CA 94102",
      timezone: "America/Los_Angeles",
    },
  });

  const marina = await prisma.location.upsert({
    where: { name: "Coastal Eats - Marina" },
    update: {},
    create: {
      name: "Coastal Eats - Marina",
      address: "456 Marina Blvd, San Francisco, CA 94123",
      timezone: "America/Los_Angeles",
    },
  });

  await prisma.location.upsert({
    where: { name: "Coastal Eats - Airport" },
    update: {},
    create: {
      name: "Coastal Eats - Airport",
      address: "Terminal 2, SFO Airport, CA 94128",
      timezone: "America/Los_Angeles",
    },
  });

  await prisma.location.upsert({
    where: { name: "Coastal Eats - Times Square" },
    update: {},
    create: {
      name: "Coastal Eats - Times Square",
      address: "1500 Broadway, New York, NY 10036",
      timezone: "America/New_York",
    },
  });
  console.log("✅ Created locations");

  const passwordHash = await bcrypt.hash("password123", 10);

  const adminId = nanoid();
  const admin = await prisma.user.upsert({
    where: { email: "admin@coastaleats.com" },
    update: {},
    create: {
      id: adminId,
      email: "admin@coastaleats.com",
      name: "Admin User",
      email_verified: true,
      role: "admin",
    },
  });

  await prisma.account.upsert({
    where: {
      provider_id_user_id: {
        provider_id: "credential",
        user_id: admin.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${admin.id}-admin`,
      provider_id: "credential",
      user_id: admin.id,
      password: passwordHash,
    },
  });
  console.log("✅ Created admin user");

  const managerId = nanoid();
  const manager = await prisma.user.upsert({
    where: { email: "manager@coastaleats.com" },
    update: {},
    create: {
      id: managerId,
      email: "manager@coastaleats.com",
      name: "Manager User",
      email_verified: true,
      role: "manager",
    },
  });

  await prisma.account.upsert({
    where: {
      provider_id_user_id: {
        provider_id: "credential",
        user_id: manager.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${manager.id}-manager`,
      provider_id: "credential",
      user_id: manager.id,
      password: passwordHash,
    },
  });

  await prisma.manager_location.createMany({
    data: [
      { user_id: manager.id, location_id: downtown.id },
      { user_id: manager.id, location_id: marina.id },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created manager user");

  const sarahId = nanoid();
  const staff = await prisma.user.upsert({
    where: { email: "sarah@coastaleats.com" },
    update: {},
    create: {
      id: sarahId,
      email: "sarah@coastaleats.com",
      name: "Sarah Johnson",
      email_verified: true,
      role: "staff",
    },
  });

  await prisma.account.upsert({
    where: {
      provider_id_user_id: {
        provider_id: "credential",
        user_id: staff.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${staff.id}-staff`,
      provider_id: "credential",
      user_id: staff.id,
      password: passwordHash,
    },
  });

  const serverSkill = skills.find((s) => s.name === "Server")!;
  await prisma.certification.createMany({
    data: [
      { user_id: staff.id, location_id: downtown.id, skill_id: serverSkill.id, certified_at: new Date() },
    ],
    skipDuplicates: true,
  });

  await prisma.availability.createMany({
    data: [
      { user_id: staff.id, day_of_week: 1, start_time: "09:00", end_time: "22:00" },
      { user_id: staff.id, day_of_week: 2, start_time: "09:00", end_time: "22:00" },
      { user_id: staff.id, day_of_week: 3, start_time: "09:00", end_time: "22:00" },
      { user_id: staff.id, day_of_week: 4, start_time: "09:00", end_time: "22:00" },
      { user_id: staff.id, day_of_week: 5, start_time: "09:00", end_time: "22:00" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created staff user (Sarah)");

  const mikeId = nanoid();
  const staff2 = await prisma.user.upsert({
    where: { email: "mike@coastaleats.com" },
    update: {},
    create: {
      id: mikeId,
      email: "mike@coastaleats.com",
      name: "Mike Chen",
      email_verified: true,
      role: "staff",
    },
  });

  await prisma.account.upsert({
    where: {
      provider_id_user_id: {
        provider_id: "credential",
        user_id: staff2.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${staff2.id}-staff`,
      provider_id: "credential",
      user_id: staff2.id,
      password: passwordHash,
    },
  });

  const bartenderSkill = skills.find((s) => s.name === "Bartender")!;
  await prisma.certification.createMany({
    data: [
      { user_id: staff2.id, location_id: downtown.id, skill_id: bartenderSkill.id, certified_at: new Date() },
      { user_id: staff2.id, location_id: marina.id, skill_id: bartenderSkill.id, certified_at: new Date() },
    ],
    skipDuplicates: true,
  });

  await prisma.availability.createMany({
    data: [
      { user_id: staff2.id, day_of_week: 2, start_time: "16:00", end_time: "23:00" },
      { user_id: staff2.id, day_of_week: 3, start_time: "16:00", end_time: "23:00" },
      { user_id: staff2.id, day_of_week: 4, start_time: "16:00", end_time: "23:00" },
      { user_id: staff2.id, day_of_week: 5, start_time: "16:00", end_time: "23:00" },
      { user_id: staff2.id, day_of_week: 6, start_time: "16:00", end_time: "23:00" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created staff user (Mike)");

  console.log("\n🎉 Seeding completed!");
  console.log("\nDemo accounts:");
  console.log("  Admin:   admin@coastaleats.com / password123");
  console.log("  Manager: manager@coastaleats.com / password123");
  console.log("  Staff:   sarah@coastaleats.com / password123");
  console.log("  Staff:   mike@coastaleats.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
