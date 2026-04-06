import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

function getDateOffset(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

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

  const airport = await prisma.location.upsert({
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
  const sarah = await prisma.user.upsert({
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
        user_id: sarah.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${sarah.id}-staff`,
      provider_id: "credential",
      user_id: sarah.id,
      password: passwordHash,
    },
  });

  const serverSkill = skills.find((s) => s.name === "Server")!;
  await prisma.certification.createMany({
    data: [
      { user_id: sarah.id, location_id: downtown.id, skill_id: serverSkill.id, certified_at: new Date() },
      { user_id: sarah.id, location_id: marina.id, skill_id: serverSkill.id, certified_at: new Date() },
    ],
    skipDuplicates: true,
  });

  await prisma.availability.createMany({
    data: [
      { user_id: sarah.id, day_of_week: 1, start_time: "09:00", end_time: "22:00" },
      { user_id: sarah.id, day_of_week: 2, start_time: "09:00", end_time: "22:00" },
      { user_id: sarah.id, day_of_week: 3, start_time: "09:00", end_time: "22:00" },
      { user_id: sarah.id, day_of_week: 4, start_time: "09:00", end_time: "22:00" },
      { user_id: sarah.id, day_of_week: 5, start_time: "09:00", end_time: "22:00" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created staff user (Sarah)");

  const mikeId = nanoid();
  const mike = await prisma.user.upsert({
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
        user_id: mike.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${mike.id}-staff`,
      provider_id: "credential",
      user_id: mike.id,
      password: passwordHash,
    },
  });

  const bartenderSkill = skills.find((s) => s.name === "Bartender")!;
  await prisma.certification.createMany({
    data: [
      { user_id: mike.id, location_id: downtown.id, skill_id: bartenderSkill.id, certified_at: new Date() },
      { user_id: mike.id, location_id: marina.id, skill_id: bartenderSkill.id, certified_at: new Date() },
    ],
    skipDuplicates: true,
  });

  await prisma.availability.createMany({
    data: [
      { user_id: mike.id, day_of_week: 2, start_time: "16:00", end_time: "23:00" },
      { user_id: mike.id, day_of_week: 3, start_time: "16:00", end_time: "23:00" },
      { user_id: mike.id, day_of_week: 4, start_time: "16:00", end_time: "23:00" },
      { user_id: mike.id, day_of_week: 5, start_time: "16:00", end_time: "23:00" },
      { user_id: mike.id, day_of_week: 6, start_time: "16:00", end_time: "23:00" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created staff user (Mike)");

  const grillCook = skills.find((s) => s.name === "Grill Cook")!;
  const alexId = nanoid();
  const alex = await prisma.user.upsert({
    where: { email: "alex@coastaleats.com" },
    update: {},
    create: {
      id: alexId,
      email: "alex@coastaleats.com",
      name: "Alex Rivera",
      email_verified: true,
      role: "staff",
    },
  });

  await prisma.account.upsert({
    where: {
      provider_id_user_id: {
        provider_id: "credential",
        user_id: alex.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${alex.id}-staff`,
      provider_id: "credential",
      user_id: alex.id,
      password: passwordHash,
    },
  });

  await prisma.certification.createMany({
    data: [
      { user_id: alex.id, location_id: downtown.id, skill_id: grillCook.id, certified_at: new Date() },
      { user_id: alex.id, location_id: airport.id, skill_id: grillCook.id, certified_at: new Date() },
    ],
    skipDuplicates: true,
  });

  await prisma.availability.createMany({
    data: [
      { user_id: alex.id, day_of_week: 0, start_time: "10:00", end_time: "22:00" },
      { user_id: alex.id, day_of_week: 1, start_time: "10:00", end_time: "22:00" },
      { user_id: alex.id, day_of_week: 2, start_time: "10:00", end_time: "22:00" },
      { user_id: alex.id, day_of_week: 3, start_time: "10:00", end_time: "22:00" },
      { user_id: alex.id, day_of_week: 4, start_time: "10:00", end_time: "22:00" },
      { user_id: alex.id, day_of_week: 5, start_time: "10:00", end_time: "22:00" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created staff user (Alex)");

  const timesSquare = await prisma.location.findUnique({
    where: { name: "Coastal Eats - Times Square" },
  });

  const emilyId = nanoid();
  const emily = await prisma.user.upsert({
    where: { email: "emily@coastaleats.com" },
    update: {},
    create: {
      id: emilyId,
      email: "emily@coastaleats.com",
      name: "Emily Watson",
      email_verified: true,
      role: "staff",
    },
  });

  await prisma.account.upsert({
    where: {
      provider_id_user_id: {
        provider_id: "credential",
        user_id: emily.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${emily.id}-staff`,
      provider_id: "credential",
      user_id: emily.id,
      password: passwordHash,
    },
  });

  const hostSkill = skills.find((s) => s.name === "Host")!;
  await prisma.certification.createMany({
    data: [
      { user_id: emily.id, location_id: downtown.id, skill_id: hostSkill.id, certified_at: new Date() },
      { user_id: emily.id, location_id: marina.id, skill_id: hostSkill.id, certified_at: new Date() },
      { user_id: emily.id, location_id: timesSquare!.id, skill_id: hostSkill.id, certified_at: new Date() },
    ],
    skipDuplicates: true,
  });

  await prisma.availability.createMany({
    data: [
      { user_id: emily.id, day_of_week: 0, start_time: "09:00", end_time: "17:00" },
      { user_id: emily.id, day_of_week: 1, start_time: "09:00", end_time: "17:00" },
      { user_id: emily.id, day_of_week: 2, start_time: "09:00", end_time: "17:00" },
      { user_id: emily.id, day_of_week: 3, start_time: "09:00", end_time: "17:00" },
      { user_id: emily.id, day_of_week: 4, start_time: "09:00", end_time: "17:00" },
      { user_id: emily.id, day_of_week: 5, start_time: "09:00", end_time: "17:00" },
      { user_id: emily.id, day_of_week: 6, start_time: "09:00", end_time: "17:00" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created cross-timezone staff user (Emily)");

  const jamesId = nanoid();
  const james = await prisma.user.upsert({
    where: { email: "james@coastaleats.com" },
    update: {},
    create: {
      id: jamesId,
      email: "james@coastaleats.com",
      name: "James Park",
      email_verified: true,
      role: "staff",
    },
  });

  await prisma.account.upsert({
    where: {
      provider_id_user_id: {
        provider_id: "credential",
        user_id: james.id,
      },
    },
    update: {},
    create: {
      id: nanoid(),
      account_id: `${james.id}-staff`,
      provider_id: "credential",
      user_id: james.id,
      password: passwordHash,
    },
  });

  const lineCookSkill = skills.find((s) => s.name === "Line Cook")!;
  await prisma.certification.createMany({
    data: [
      { user_id: james.id, location_id: downtown.id, skill_id: lineCookSkill.id, certified_at: new Date() },
      { user_id: james.id, location_id: marina.id, skill_id: lineCookSkill.id, certified_at: new Date() },
    ],
    skipDuplicates: true,
  });

  await prisma.availability.createMany({
    data: [
      { user_id: james.id, day_of_week: 0, start_time: "08:00", end_time: "20:00" },
      { user_id: james.id, day_of_week: 1, start_time: "08:00", end_time: "20:00" },
      { user_id: james.id, day_of_week: 2, start_time: "08:00", end_time: "20:00" },
      { user_id: james.id, day_of_week: 3, start_time: "08:00", end_time: "20:00" },
      { user_id: james.id, day_of_week: 4, start_time: "08:00", end_time: "20:00" },
      { user_id: james.id, day_of_week: 5, start_time: "08:00", end_time: "20:00" },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Created overtime-prone staff user (James)");

  const shiftsToCreate = [
    { days: -7, location: downtown, skill: serverSkill, startTime: "10:00", endTime: "18:00", headcount: 2, published: true },
    { days: -7, location: downtown, skill: bartenderSkill, startTime: "17:00", endTime: "23:00", headcount: 1, published: true },
    { days: -6, location: downtown, skill: serverSkill, startTime: "10:00", endTime: "18:00", headcount: 2, published: true },
    { days: -5, location: downtown, skill: grillCook, startTime: "10:00", endTime: "18:00", headcount: 1, published: true },
    { days: -4, location: downtown, skill: serverSkill, startTime: "10:00", endTime: "18:00", headcount: 2, published: true },
    { days: -3, location: downtown, skill: lineCookSkill, startTime: "10:00", endTime: "18:00", headcount: 1, published: true },
    { days: -2, location: downtown, skill: serverSkill, startTime: "10:00", endTime: "18:00", headcount: 2, published: true },
    { days: 0, location: downtown, skill: serverSkill, startTime: "10:00", endTime: "18:00", headcount: 2, published: true },
    { days: 0, location: downtown, skill: bartenderSkill, startTime: "17:00", endTime: "23:00", headcount: 1, published: true },
    { days: 0, location: downtown, skill: serverSkill, startTime: "17:00", endTime: "23:00", headcount: 2, published: true, premium: true },
    { days: 0, location: marina, skill: bartenderSkill, startTime: "17:00", endTime: "23:00", headcount: 1, published: true, premium: true },
    { days: 1, location: downtown, skill: serverSkill, startTime: "09:00", endTime: "17:00", headcount: 2, published: true },
    { days: 1, location: downtown, skill: bartenderSkill, startTime: "17:00", endTime: "23:00", headcount: 1, published: true },
    { days: 1, location: marina, skill: serverSkill, startTime: "11:00", endTime: "19:00", headcount: 1, published: true },
    { days: 2, location: downtown, skill: grillCook, startTime: "10:00", endTime: "18:00", headcount: 1, published: true },
    { days: 2, location: downtown, skill: serverSkill, startTime: "14:00", endTime: "22:00", headcount: 2, published: true },
    { days: 3, location: airport, skill: grillCook, startTime: "06:00", endTime: "14:00", headcount: 1, published: true },
    { days: 3, location: marina, skill: serverSkill, startTime: "17:00", endTime: "23:00", headcount: 2, published: true },
    { days: 4, location: downtown, skill: serverSkill, startTime: "09:00", endTime: "17:00", headcount: 3, published: true },
    { days: 4, location: downtown, skill: bartenderSkill, startTime: "17:00", endTime: "23:00", headcount: 2, published: true, premium: true },
    { days: 4, location: marina, skill: grillCook, startTime: "10:00", endTime: "18:00", headcount: 1, published: true },
    { days: 5, location: downtown, skill: serverSkill, startTime: "10:00", endTime: "18:00", headcount: 3, published: true },
    { days: 5, location: downtown, skill: bartenderSkill, startTime: "17:00", endTime: "23:00", headcount: 2, published: true, premium: true },
    { days: 5, location: marina, skill: serverSkill, startTime: "14:00", endTime: "22:00", headcount: 2, published: true, premium: true },
    { days: 5, location: marina, skill: bartenderSkill, startTime: "17:00", endTime: "23:00", headcount: 2, published: true, premium: true },
    { days: 6, location: downtown, skill: serverSkill, startTime: "10:00", endTime: "18:00", headcount: 2, published: false },
    { days: 6, location: downtown, skill: bartenderSkill, startTime: "17:00", endTime: "23:00", headcount: 1, published: false, premium: true },
    { days: 7, location: downtown, skill: serverSkill, startTime: "09:00", endTime: "17:00", headcount: 2, published: false },
    { days: 7, location: marina, skill: serverSkill, startTime: "11:00", endTime: "19:00", headcount: 1, published: false },
    { days: 14, location: downtown, skill: serverSkill, startTime: "17:00", endTime: "23:00", headcount: 2, published: false, premium: true },
    { days: 14, location: marina, skill: bartenderSkill, startTime: "17:00", endTime: "23:00", headcount: 2, published: false, premium: true },
  ];

  const staffMembers = [sarah, mike, alex];
  const allStaff = [sarah, mike, alex, emily, james];
  let shiftCount = 0;

  for (const shiftData of shiftsToCreate) {
    const shiftDate = getDateOffset(shiftData.days);
    
    const shift = await prisma.shift.create({
      data: {
        location_id: shiftData.location.id,
        skill_id: shiftData.skill.id,
        date: shiftDate,
        start_time: shiftData.startTime,
        end_time: shiftData.endTime,
        headcount: shiftData.headcount,
        is_published: shiftData.published,
        created_by: manager.id,
      },
    });

    if (shiftData.published && allStaff.length > 0) {
      let assignedStaff;
      
      if (james && shiftCount < 7) {
        assignedStaff = james;
      } else {
        assignedStaff = allStaff[shiftCount % allStaff.length];
      }
      
      const hasCert = await prisma.certification.findFirst({
        where: {
          user_id: assignedStaff.id,
          location_id: shiftData.location.id,
          skill_id: shiftData.skill.id,
        },
      });

      if (hasCert) {
        await prisma.shift_assignment.create({
          data: {
            shift_id: shift.id,
            user_id: assignedStaff.id,
            assigned_by: manager.id,
            status: "CONFIRMED",
          },
        });
      }
    }

    shiftCount++;
  }
  console.log(`✅ Created ${shiftCount} shifts with assignments`);
  console.log("   Premium shifts (Fri/Sat evenings) marked for fairness tracking");

  console.log("\n🎉 Seeding completed!");
  console.log("\nDemo accounts:");
  console.log("  Admin:   admin@coastaleats.com / password123");
  console.log("  Manager: manager@coastaleats.com / password123");
  console.log("  Staff:   sarah@coastaleats.com / password123");
  console.log("  Staff:   mike@coastaleats.com / password123");
  console.log("  Staff:   alex@coastaleats.com / password123");
  console.log("  Staff:   emily@coastaleats.com / password123 (cross-timezone)");
  console.log("  Staff:   james@coastaleats.com / password123 (overtime-prone)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
