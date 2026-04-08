import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company");
  const department = searchParams.get("department");

  const riskWhere: Record<string, unknown> = { status: { not: "DRAFT" } };
  if (department) riskWhere.department = department;

  const [users, risks, controls, tasks] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { in: ["RISK_MANAGER", "BUSINESS_OWNER"] },
        ...(company ? { company } : {}),
        ...(department ? { department } : {}),
      },
      select: {
        id: true, name: true, email: true, role: true, department: true,
        company: true, avatar: true, createdAt: true,
        _count: { select: { reportedRisks: true, assignedRisks: true, tasks: true } },
      },
    }),
    prisma.risk.findMany({
      where: riskWhere,
      select: {
        id: true, riskId: true, title: true, category: true, department: true,
        likelihood: true, impact: true, inherentScore: true, riskLevel: true,
        status: true, fraudRisk: true, fraudCategory1: true, createdAt: true, assignedToId: true,
        reportedBy: { select: { name: true, avatar: true } },
        assignedTo: { select: { name: true, avatar: true } },
        _count: { select: { controls: true, tasks: true } },
        controls: { select: { adequacy: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.control.findMany({
      where: department ? { risk: { department } } : {},
      select: { id: true, adequacy: true, type: true },
    }),
    prisma.task.findMany({
      where: department ? { risk: { department } } : {},
      select: { id: true, status: true, dueDate: true, isOverdue: true, assignedTo: { select: { name: true } } },
    }),
  ]);

  // Filter by company if needed (risks don't have company directly)
  const filteredRisks = company
    ? risks.filter((r) => users.some((u) => u.id === r.assignedToId && u.company === company) || r.reportedBy)
    : risks;

  const riskManagers = users.filter((u) => u.role === "RISK_MANAGER");
  const businessOwners = users.filter((u) => u.role === "BUSINESS_OWNER");

  // Org filter options
  const allCompanies = [...new Set(users.map((u) => u.company))].sort();
  const allDepartments = [...new Set(users.map((u) => u.department))].sort();

  // Stats
  const pendingReview = filteredRisks.filter((r) => r.status === "SUBMITTED" || r.status === "IN_REVIEW").length;
  const overdueTasks = tasks.filter((t) => t.isOverdue || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED")).length;

  // Risk manager performance
  const rmPerformance = riskManagers.map((rm) => {
    const assigned = filteredRisks.filter((r) => r.assignedToId === rm.id);
    const validated = assigned.filter((r) => r.status === "VALIDATED" || r.status === "ACCEPTED" || r.status === "MITIGATED").length;
    const pending = assigned.filter((r) => r.status === "SUBMITTED" || r.status === "IN_REVIEW").length;
    const rmTasks = tasks.filter((t) => t.assignedTo?.name === rm.name);
    const overdue = rmTasks.filter((t) => t.isOverdue || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED")).length;
    return {
      id: rm.id, name: rm.name, avatar: rm.avatar, email: rm.email,
      department: rm.department, company: rm.company,
      totalAssigned: assigned.length, validated, pending, overdue,
      tasks: rmTasks.length, joinedAt: rm.createdAt,
    };
  });

  // Heat map
  const heatMap: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  filteredRisks.forEach((r) => {
    if (r.likelihood >= 1 && r.likelihood <= 5 && r.impact >= 1 && r.impact <= 5) {
      heatMap[5 - r.impact][r.likelihood - 1]++;
    }
  });

  // By category / department / level / status
  const byCategory: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  filteredRisks.forEach((r) => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    byDepartment[r.department] = (byDepartment[r.department] || 0) + 1;
    byLevel[r.riskLevel] = (byLevel[r.riskLevel] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  });

  // Control adequacy
  const controlAdequacy = { effective: 0, partiallyEffective: 0, ineffective: 0, notAssessed: 0, total: controls.length };
  controls.forEach((c) => {
    const a = (c.adequacy || "").toLowerCase();
    if (a.includes("adequate") && !a.includes("inadequate")) controlAdequacy.effective++;
    else if (a.includes("needs")) controlAdequacy.partiallyEffective++;
    else if (a.includes("inadequate")) controlAdequacy.ineffective++;
    else controlAdequacy.notAssessed++;
  });

  // Recent risks
  const recentRisks = filteredRisks.slice(0, 10).map((r) => ({
    riskId: r.riskId, title: r.title, category: r.category, department: r.department,
    riskLevel: r.riskLevel, inherentScore: r.inherentScore, status: r.status,
    reportedBy: r.reportedBy?.name || "Unknown", assignedTo: r.assignedTo?.name || "Unassigned",
    controlCount: r._count.controls, taskCount: r._count.tasks, createdAt: r.createdAt,
  }));

  // BO activity
  const boActivity = businessOwners.map((bo) => ({
    id: bo.id, name: bo.name, avatar: bo.avatar, department: bo.department,
    company: bo.company, risksReported: bo._count.reportedRisks, tasks: bo._count.tasks,
  })).sort((a, b) => b.risksReported - a.risksReported);

  return NextResponse.json({
    orgFilters: { companies: allCompanies, departments: allDepartments },
    stats: {
      totalRiskManagers: riskManagers.length,
      totalBusinessOwners: businessOwners.length,
      totalRisks: filteredRisks.length,
      totalControls: controls.length,
      totalTasks: tasks.length,
      pendingReview, overdueTasks,
      mitigated: byStatus["MITIGATED"] || 0,
      fraudCount: filteredRisks.filter((r) => r.fraudRisk).length,
    },
    fraudByCategory: (() => {
      const fbc: Record<string, number> = {};
      filteredRisks.filter((r) => r.fraudRisk).forEach((r) => {
        const cat = (r as Record<string, unknown>).fraudCategory1 as string || 'Uncategorized';
        fbc[cat] = (fbc[cat] || 0) + 1;
      });
      return fbc;
    })(),
    rmPerformance, heatMap, byCategory, byDepartment, byLevel, byStatus,
    controlAdequacy, recentRisks, boActivity,
  });
}
