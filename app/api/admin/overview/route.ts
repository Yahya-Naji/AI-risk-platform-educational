import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [users, risks, controls, tasks] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        createdAt: true,
        _count: {
          select: { reportedRisks: true, tasks: true },
        },
      },
    }),
    prisma.risk.findMany({
      where: { status: { not: "DRAFT" } },
      select: {
        id: true,
        riskId: true,
        title: true,
        category: true,
        department: true,
        likelihood: true,
        impact: true,
        inherentScore: true,
        riskLevel: true,
        status: true,
        fraudRisk: true,
        createdAt: true,
        reportedBy: { select: { name: true, avatar: true } },
        _count: { select: { controls: true, tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.control.findMany({
      select: {
        id: true,
        adequacy: true,
        type: true,
      },
    }),
    prisma.task.findMany({
      select: {
        id: true,
        status: true,
        dueDate: true,
        isOverdue: true,
        assignedTo: { select: { name: true } },
      },
    }),
  ]);

  // User stats
  const usersByRole: Record<string, number> = {};
  const usersByDept: Record<string, number> = {};
  users.forEach((u) => {
    usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
    usersByDept[u.department] = (usersByDept[u.department] || 0) + 1;
  });

  // Risk stats
  const risksByLevel: Record<string, number> = {};
  const risksByCategory: Record<string, number> = {};
  const risksByStatus: Record<string, number> = {};
  const risksByDept: Record<string, number> = {};
  let fraudCount = 0;

  risks.forEach((r) => {
    risksByLevel[r.riskLevel] = (risksByLevel[r.riskLevel] || 0) + 1;
    risksByCategory[r.category] = (risksByCategory[r.category] || 0) + 1;
    risksByStatus[r.status] = (risksByStatus[r.status] || 0) + 1;
    risksByDept[r.department] = (risksByDept[r.department] || 0) + 1;
    if (r.fraudRisk) fraudCount++;
  });

  // Control stats
  const controlsByAdequacy: Record<string, number> = {};
  const controlsByType: Record<string, number> = {};
  controls.forEach((c) => {
    const adeq = c.adequacy || "Unknown";
    controlsByAdequacy[adeq] = (controlsByAdequacy[adeq] || 0) + 1;
    controlsByType[c.type] = (controlsByType[c.type] || 0) + 1;
  });

  // Task stats
  const tasksByStatus: Record<string, number> = {};
  let overdueTasks = 0;
  tasks.forEach((t) => {
    tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    if (
      t.isOverdue ||
      (t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== "COMPLETED")
    ) {
      overdueTasks++;
    }
  });

  // Business owner activity — users who reported risks
  const businessOwnerActivity = users
    .filter((u) => u.role === "BUSINESS_OWNER")
    .map((u) => ({
      id: u.id,
      name: u.name,
      department: u.department,
      risksReported: u._count.reportedRisks,
      tasksAssigned: u._count.tasks,
    }))
    .sort((a, b) => b.risksReported - a.risksReported);

  // Recent risks (last 10)
  const recentRisks = risks.slice(0, 10).map((r) => ({
    riskId: r.riskId,
    title: r.title,
    category: r.category,
    department: r.department,
    riskLevel: r.riskLevel,
    inherentScore: r.inherentScore,
    status: r.status,
    reportedBy: r.reportedBy?.name || "Unknown",
    controlCount: r._count.controls,
    taskCount: r._count.tasks,
    createdAt: r.createdAt,
  }));

  // Heat map 5x5
  const heatMap: number[][] = Array.from({ length: 5 }, () =>
    Array(5).fill(0)
  );
  risks.forEach((r) => {
    if (r.likelihood >= 1 && r.likelihood <= 5 && r.impact >= 1 && r.impact <= 5) {
      heatMap[5 - r.impact][r.likelihood - 1]++;
    }
  });

  return NextResponse.json({
    stats: {
      totalUsers: users.length,
      totalRisks: risks.length,
      totalControls: controls.length,
      totalTasks: tasks.length,
      overdueTasks,
      fraudCount,
      pendingReview:
        (risksByStatus["SUBMITTED"] || 0) + (risksByStatus["IN_REVIEW"] || 0),
      mitigated: risksByStatus["MITIGATED"] || 0,
    },
    usersByRole,
    usersByDept,
    risksByLevel,
    risksByCategory,
    risksByStatus,
    risksByDept,
    controlsByAdequacy,
    controlsByType,
    tasksByStatus,
    businessOwnerActivity,
    recentRisks,
    heatMap,
  });
}
