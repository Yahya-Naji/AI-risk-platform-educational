import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! } as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  const crm = await prisma.user.upsert({
    where: { email: "khalid.mansoori@bloomholding.com" },
    update: {},
    create: { name: "Khalid Al-Mansoori", email: "khalid.mansoori@bloomholding.com", role: "CHIEF_RISK_MANAGER", department: "Enterprise Risk Management", company: "Bloom Holding", group: "National Holding Group", avatar: "KM" },
  });
  const exec = await prisma.user.upsert({
    where: { email: "hasan.qazi@bloomholding.com" },
    update: {},
    create: { name: "Hasan Tariq Qazi", email: "hasan.qazi@bloomholding.com", role: "EXECUTIVE", department: "Executive Board", company: "Bloom Holding", group: "National Holding Group", avatar: "HQ" },
  });
  console.log("Created:", crm.name, exec.name);
  await prisma.$disconnect();
}

main();
