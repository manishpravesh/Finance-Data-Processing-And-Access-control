import { PrismaClient, RecordType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const hash = (value: string): Promise<string> => bcrypt.hash(value, 10);

async function main(): Promise<void> {
  const [adminPassword, analystPassword, viewerPassword] = await Promise.all([
    hash("Admin@123"),
    hash("Analyst@123"),
    hash("Viewer@123"),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: "admin@finance.local" },
    update: {
      name: "System Admin",
      role: Role.ADMIN,
      isActive: true,
      passwordHash: adminPassword,
    },
    create: {
      name: "System Admin",
      email: "admin@finance.local",
      role: Role.ADMIN,
      isActive: true,
      passwordHash: adminPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: "analyst@finance.local" },
    update: {
      name: "Finance Analyst",
      role: Role.ANALYST,
      isActive: true,
      passwordHash: analystPassword,
    },
    create: {
      name: "Finance Analyst",
      email: "analyst@finance.local",
      role: Role.ANALYST,
      isActive: true,
      passwordHash: analystPassword,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@finance.local" },
    update: {
      name: "Finance Viewer",
      role: Role.VIEWER,
      isActive: true,
      passwordHash: viewerPassword,
    },
    create: {
      name: "Finance Viewer",
      email: "viewer@finance.local",
      role: Role.VIEWER,
      isActive: true,
      passwordHash: viewerPassword,
    },
  });

  const existingRecords = await prisma.financialRecord.count();

  if (existingRecords === 0) {
    await prisma.financialRecord.createMany({
      data: [
        {
          amount: 5200,
          type: RecordType.INCOME,
          category: "Salary",
          date: new Date("2026-03-01T00:00:00.000Z"),
          notes: "Monthly salary",
          createdById: admin.id,
        },
        {
          amount: 750,
          type: RecordType.EXPENSE,
          category: "Rent",
          date: new Date("2026-03-02T00:00:00.000Z"),
          notes: "Apartment rent",
          createdById: admin.id,
        },
        {
          amount: 210,
          type: RecordType.EXPENSE,
          category: "Utilities",
          date: new Date("2026-03-05T00:00:00.000Z"),
          notes: "Electricity and internet",
          createdById: admin.id,
        },
        {
          amount: 450,
          type: RecordType.INCOME,
          category: "Freelance",
          date: new Date("2026-03-10T00:00:00.000Z"),
          notes: "Consulting project",
          createdById: admin.id,
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
