import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/risk-manager/tasks - get all tasks for RM review
export async function GET() {
  // Only show tasks that need RM attention: submitted for review, changes requested, or recently completed
  const tasks = await prisma.task.findMany({
    where: {
      status: { in: ["SUBMITTED", "CHANGES_REQUESTED", "COMPLETED"] },
    },
    include: {
      risk: {
        select: {
          riskId: true,
          title: true,
          category: true,
          department: true,
          riskLevel: true,
        },
      },
      control: {
        select: {
          controlId: true,
          type: true,
          description: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          avatar: true,
          department: true,
        },
      },
      evidence: {
        select: { id: true },
      },
    },
    orderBy: [{ isOverdue: "desc" }, { status: "asc" }, { dueDate: "asc" }],
  });

  const mapped = tasks.map((t) => ({
    id: t.id,
    taskId: t.taskId,
    title: t.title,
    description: t.description,
    status: t.status,
    dueDate: t.dueDate,
    isOverdue: t.isOverdue,
    evidenceCount: t.evidence.length,
    effectiveness: t.effectiveness,
    gaps: t.gaps,
    recommendations: t.recommendations,
    risk: t.risk
      ? {
          riskId: t.risk.riskId,
          title: t.risk.title,
          category: t.risk.category,
          department: t.risk.department,
          riskLevel: t.risk.riskLevel,
        }
      : null,
    control: t.control
      ? {
          controlId: t.control.controlId,
          type: t.control.type,
        }
      : null,
    assignedTo: t.assignedTo
      ? {
          id: t.assignedTo.id,
          name: t.assignedTo.name,
          avatar: t.assignedTo.avatar,
        }
      : null,
  }));

  return NextResponse.json(mapped);
}
