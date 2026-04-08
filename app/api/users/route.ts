import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/users?role=BUSINESS_OWNER — get users by role
// GET /api/users?email=xxx — get user by email
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const email = searchParams.get("email");

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  }

  const where: Record<string, unknown> = {};
  if (role) where.role = role;

  const users = await prisma.user.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json(users);
}
