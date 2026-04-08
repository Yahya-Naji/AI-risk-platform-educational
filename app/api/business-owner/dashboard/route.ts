import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/business-owner/dashboard?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get tasks assigned to this user
  const tasks = await prisma.task.findMany({
    where: { assignedToId: userId },
    include: {
      risk: { select: { riskId: true, title: true, riskLevel: true, inherentScore: true } },
      control: { select: { controlId: true, type: true, description: true } },
      evidence: { select: { id: true, fileName: true } },
    },
    orderBy: [{ isOverdue: "desc" }, { dueDate: "asc" }],
  });

  // Get high priority risks for this user's department
  const highPriorityRisks = await prisma.risk.findMany({
    where: {
      department: user.department,
      riskLevel: { in: ["HIGH", "CRITICAL"] },
      status: { in: ["VALIDATED", "IN_REVIEW"] },
    },
    include: {
      _count: { select: { controls: true } },
    },
    orderBy: { inherentScore: "desc" },
    take: 5,
  });

  // Stats
  const totalTasks = tasks.length;
  const overdue = tasks.filter((t) => t.status === "OVERDUE").length;
  const changesRequested = tasks.filter((t) => t.status === "CHANGES_REQUESTED").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const submitted = tasks.filter((t) => t.status === "SUBMITTED").length;
  const pending = tasks.filter((t) => t.status === "PENDING").length;

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
      company: user.company,
      group: user.group,
      avatar: user.avatar,
    },
    stats: { totalTasks, overdue, changesRequested, inProgress, completed, submitted, pending },
    tasks: tasks.map((t) => ({
      id: t.id,
      taskId: t.taskId,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      isOverdue: t.isOverdue,
      evidenceCount: t.evidenceCount,
      controlType: t.control?.type ?? null,
      linkedRisk: t.risk
        ? { riskId: t.risk.riskId, title: t.risk.title }
        : null,
    })),
    highPriorityRisks: highPriorityRisks.map((r) => ({
      id: r.id,
      riskId: r.riskId,
      title: r.title,
      inherentScore: r.inherentScore,
      riskLevel: r.riskLevel,
      controlCount: r._count.controls,
    })),
  });
}
