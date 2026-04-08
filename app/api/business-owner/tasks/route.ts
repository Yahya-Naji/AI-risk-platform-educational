import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/business-owner/tasks/[id] — handled by dynamic route
// GET /api/business-owner/tasks?userId=xxx — list tasks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const taskId = searchParams.get("taskId");

  if (taskId) {
    // Single task detail
    const task = await prisma.task.findUnique({
      where: { taskId },
      include: {
        risk: {
          select: {
            id: true,
            riskId: true,
            title: true,
            description: true,
            category: true,
            likelihood: true,
            impact: true,
            inherentScore: true,
            riskLevel: true,
          },
        },
        control: {
          select: {
            id: true,
            controlId: true,
            description: true,
            type: true,
            designRating: true,
            effectivenessRating: true,
          },
        },
        evidence: true,
        comments: {
          include: { user: { select: { id: true, name: true, avatar: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  }

  if (!userId) {
    return NextResponse.json({ error: "userId or taskId required" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { assignedToId: userId },
    include: {
      risk: { select: { riskId: true, title: true } },
      control: { select: { type: true } },
    },
    orderBy: [{ isOverdue: "desc" }, { dueDate: "asc" }],
  });

  return NextResponse.json(tasks);
}

// PATCH /api/business-owner/tasks — update task
export async function PATCH(request: Request) {
  const body = await request.json();
  const { taskId, status, effectiveness, gaps, recommendations } = body;

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { taskId },
    data: {
      ...(status && { status }),
      ...(effectiveness !== undefined && { effectiveness }),
      ...(gaps !== undefined && { gaps }),
      ...(recommendations !== undefined && { recommendations }),
    },
  });

  return NextResponse.json(task);
}
