import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/users — list all users with counts
export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      company: true,
      group: true,
      avatar: true,
      createdAt: true,
      _count: {
        select: {
          reportedRisks: true,
          assignedRisks: true,
          tasks: true,
          comments: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

// POST /api/admin/users — create a new user
export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, role, department, company, group, avatar } = body;

  if (!name || !email || !role || !department) {
    return NextResponse.json(
      { error: "name, email, role, and department are required" },
      { status: 400 }
    );
  }

  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      department,
      company: company || "Bloom Holding",
      group: group || "National Holding Group",
      avatar: avatar || name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
    },
  });

  return NextResponse.json(user, { status: 201 });
}

// PATCH /api/admin/users — update user
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Only allow specific fields to be updated
  const allowed: Record<string, unknown> = {};
  if (updates.name !== undefined) allowed.name = updates.name;
  if (updates.email !== undefined) allowed.email = updates.email;
  if (updates.role !== undefined) allowed.role = updates.role;
  if (updates.department !== undefined) allowed.department = updates.department;
  if (updates.company !== undefined) allowed.company = updates.company;
  if (updates.group !== undefined) allowed.group = updates.group;
  if (updates.avatar !== undefined) allowed.avatar = updates.avatar;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Check email uniqueness if changing email
  if (allowed.email) {
    const existing = await prisma.user.findFirst({
      where: { email: allowed.email as string, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: allowed,
  });

  return NextResponse.json(user);
}

// DELETE /api/admin/users — delete user
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
