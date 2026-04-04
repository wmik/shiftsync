import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create skills
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

  // Create locations
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: "loc_downtown" },
      update: {},
      create: {
        id: "loc_downtown",
        name: "Coastal Eats - Downtown",
        address: "123 Main Street, San Francisco, CA 94102",
        timezone: "America/Los_Angeles",
      },
    }),
    prisma.location.upsert({
      where: { id: "loc_marina" },
      update: {},
      create: {
        id: "loc_marina",
        name: "Coastal Eats - Marina",
        address: "456 Marina Blvd, San Francisco, CA 94123",
        timezone: "America/Los_Angeles",
      },
    }),
    prisma.location.upsert({
      where: { id: "loc_airport" },
      update: {},
      create: {
        id: "loc_airport",
        name: "Coastal Eats - Airport",
        address: "Terminal 2, SFO Airport, CA 94128",
        timezone: "America/Los_Angeles",
      },
    }),
    prisma.location.upsert({
      where: { id: "loc_times_square" },
      update: {},
      create: {
        id: "loc_times_square",
        name: "Coastal Eats - Times Square",
        address: "1500 Broadway, New York, NY 10036",
        timezone: "America/New_York",
      },
    }),
  ]);
  console.log("✅ Created locations");

  // Note: Better Auth manages users through its own API
  // Users should be created through the sign-up flow or admin API
  // This seed file creates the locations and skills only

  console.log("\n🎉 Seeding completed!");
  console.log("\nNote: Create users through the application or API");
  console.log("Demo accounts will be created when you sign up via the app");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
