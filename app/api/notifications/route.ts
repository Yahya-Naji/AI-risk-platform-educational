import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/notifications?userId=xxx - get notifications for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json([]);
  }

  const notifications: {
    id: string;
    type: string;
    message: string;
    link: string;
    createdAt: string;
  }[] = [];

  if (user.role === "BUSINESS_OWNER") {
    // Tasks assigned to this user that are new or have changes requested
    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        status: { in: ["PENDING", "CHANGES_REQUESTED"] },
      },
      include: {
        risk: { select: { riskId: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    tasks.forEach((t) => {
      notifications.push({
        id: `task-${t.id}`,
        type: t.status === "CHANGES_REQUESTED" ? "changes_requested" : "task_assigned",
        message:
          t.status === "CHANGES_REQUESTED"
            ? `Changes requested on "${t.title}"`
            : `New task assigned: "${t.title}"`,
        link: `/business-owner/tasks/${t.taskId}`,
        createdAt: t.createdAt.toISOString(),
      });
    });
  }

  if (user.role === "RISK_MANAGER" || user.role === "CHIEF_RISK_MANAGER") {
    // Risks submitted for review
    const risks = await prisma.risk.findMany({
      where: {
        status: "SUBMITTED",
        ...(user.role === "RISK_MANAGER" ? { assignedToId: userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    risks.forEach((r) => {
      notifications.push({
        id: `risk-${r.id}`,
        type: "risk_submitted",
        message: `New risk submitted: "${r.title}"`,
        link: `/risk-manager/review/${r.riskId}`,
        createdAt: r.createdAt.toISOString(),
      });
    });

    // Tasks submitted for RM review
    const tasks = await prisma.task.findMany({
      where: { status: "SUBMITTED" },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    tasks.forEach((t) => {
      notifications.push({
        id: `task-review-${t.id}`,
        type: "review_requested",
        message: `Task "${t.title}" submitted for review${t.assignedTo ? ` by ${t.assignedTo.name}` : ""}`,
        link: `/risk-manager/tasks`,
        createdAt: t.createdAt.toISOString(),
      });
    });
  }

  // Sort by date desc
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(notifications.slice(0, 20));
}
