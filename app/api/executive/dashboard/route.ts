import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const group = searchParams.get("group");
  const company = searchParams.get("company");
  const department = searchParams.get("department");

  // Build where clause for org hierarchy filtering
  const userWhere: Record<string, string> = {};
  const riskWhere: Record<string, unknown> = { status: { not: "DRAFT" } };

  if (group) {
    userWhere.group = group;
  }
  if (company) {
    userWhere.company = company;
  }
  if (department) {
    userWhere.department = department;
    riskWhere.department = department;
  }

  const [users, allRisks, controls, tasks] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
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
          select: { reportedRisks: true, assignedRisks: true, tasks: true },
        },
      },
    }),
    prisma.risk.findMany({
      where: riskWhere,
      select: {
        id: true,
        riskId: true,
        title: true,
        description: true,
        category: true,
        department: true,
        likelihood: true,
        impact: true,
        inherentScore: true,
        grossScore: true,
        riskLevel: true,
        status: true,
        fraudRisk: true,
        fraudCategory1: true,
        fraudCategory2: true,
        strategicObjective: true,
        strategicRelevance: true,
        createdAt: true,
        reportedBy: { select: { name: true, avatar: true, company: true, group: true } },
        _count: { select: { controls: true, tasks: true } },
        controls: {
          select: { adequacy: true, type: true, effectivenessRating: true, designRating: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.control.findMany({
      select: {
        id: true,
        adequacy: true,
        type: true,
        effectivenessRating: true,
        designRating: true,
        risk: { select: { department: true } },
      },
    }),
    prisma.task.findMany({
      select: {
        id: true,
        status: true,
        dueDate: true,
        isOverdue: true,
        assignedTo: { select: { name: true, department: true, company: true } },
        risk: { select: { department: true } },
      },
    }),
  ]);

  // Filter controls/tasks by department if specified
  const filteredControls = department
    ? controls.filter((c) => c.risk?.department === department)
    : controls;
  const filteredTasks = department
    ? tasks.filter((t) => t.risk?.department === department)
    : tasks;

  // Also filter risks by company/group if specified (via reportedBy)
  let risks = allRisks;
  if (company && !department) {
    risks = allRisks.filter((r) => r.reportedBy?.company === company);
  }
  if (group && !company && !department) {
    risks = allRisks.filter((r) => r.reportedBy?.group === group);
  }

  // Org hierarchy options for filters
  const allGroups = [...new Set(users.map((u) => u.group))].sort();
  const allCompanies = [...new Set(users.map((u) => u.company))].sort();
  const allDepartments = [...new Set(users.map((u) => u.department))].sort();

  // KPI Stats
  const criticalHighCount = risks.filter(
    (r) => r.riskLevel === "CRITICAL" || r.riskLevel === "HIGH"
  ).length;
  const criticalHighPct = risks.length > 0 ? ((criticalHighCount / risks.length) * 100).toFixed(1) : "0";
  const pendingReview = risks.filter(
    (r) => r.status === "SUBMITTED" || r.status === "IN_REVIEW"
  ).length;
  const mitigated = risks.filter((r) => r.status === "MITIGATED").length;
  const overdueTasks = filteredTasks.filter(
    (t) =>
      t.isOverdue ||
      (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED")
  ).length;

  // Fraud breakdown
  const fraudRisks = risks.filter((r) => r.fraudRisk);
  const fraudByCategory: Record<string, number> = {};
  fraudRisks.forEach((r) => {
    const cat = r.fraudCategory1 || "Uncategorized";
    fraudByCategory[cat] = (fraudByCategory[cat] || 0) + 1;
  });

  // Heat Map 5x5
  const heatMap: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  risks.forEach((r) => {
    if (r.likelihood >= 1 && r.likelihood <= 5 && r.impact >= 1 && r.impact <= 5) {
      heatMap[5 - r.impact][r.likelihood - 1]++;
    }
  });

  // Control adequacy
  const controlAdequacy = { effective: 0, partiallyEffective: 0, ineffective: 0, notAssessed: 0, total: filteredControls.length };
  const controlsByType: Record<string, number> = {};
  filteredControls.forEach((c) => {
    const a = (c.adequacy || "").toLowerCase();
    if (a.includes("adequate") && !a.includes("inadequate")) controlAdequacy.effective++;
    else if (a.includes("needs")) controlAdequacy.partiallyEffective++;
    else if (a.includes("inadequate")) controlAdequacy.ineffective++;
    else controlAdequacy.notAssessed++;
    controlsByType[c.type] = (controlsByType[c.type] || 0) + 1;
  });

  // By department
  const byDepartment: Record<string, { inherent: number; gross: number; residual: number; count: number }> = {};
  risks.forEach((r) => {
    if (!byDepartment[r.department]) {
      byDepartment[r.department] = { inherent: 0, gross: 0, residual: 0, count: 0 };
    }
    const d = byDepartment[r.department];
    d.inherent += r.inherentScore;
    d.gross += r.grossScore || r.inherentScore;
    d.count++;
    // Compute residual: inherent minus control effectiveness reduction
    const avgCtrl = r.controls.length > 0
      ? r.controls.reduce((sum, c) => sum + (c.effectivenessRating || 0), 0) / r.controls.length
      : 0;
    d.residual += Math.max(r.inherentScore - Math.round(avgCtrl * 2), 1);
  });

  // By category
  const byCategory: Record<string, number> = {};
  risks.forEach((r) => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  });

  // By status
  const risksByStatus: Record<string, number> = {};
  risks.forEach((r) => {
    risksByStatus[r.status] = (risksByStatus[r.status] || 0) + 1;
  });

  // By level
  const risksByLevel: Record<string, number> = {};
  risks.forEach((r) => {
    risksByLevel[r.riskLevel] = (risksByLevel[r.riskLevel] || 0) + 1;
  });

  // Task stats
  const tasksByStatus: Record<string, number> = {};
  filteredTasks.forEach((t) => {
    tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
  });

  // Strategic objectives
  const byObjective: Record<string, { count: number; highSeverity: number; avgScore: number; totalScore: number }> = {};
  risks.forEach((r) => {
    const obj = r.strategicObjective || "Unassigned";
    if (!byObjective[obj]) byObjective[obj] = { count: 0, highSeverity: 0, avgScore: 0, totalScore: 0 };
    byObjective[obj].count++;
    byObjective[obj].totalScore += r.inherentScore;
    if (r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL") byObjective[obj].highSeverity++;
  });
  Object.values(byObjective).forEach((v) => {
    v.avgScore = v.count > 0 ? Math.round((v.totalScore / v.count) * 10) / 10 : 0;
  });

  // Top vulnerabilities (categories with highest avg score)
  const catScores: Record<string, { total: number; count: number }> = {};
  risks.forEach((r) => {
    if (!catScores[r.category]) catScores[r.category] = { total: 0, count: 0 };
    catScores[r.category].total += r.inherentScore;
    catScores[r.category].count++;
  });

  // Top entities (departments by total risk exposure)
  const entityExposure = Object.entries(byDepartment)
    .map(([dept, v]) => ({ label: dept, value: v.inherent }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Team activity
  const teamActivity = users
    .filter((u) => u.role === "RISK_MANAGER" || u.role === "CHIEF_RISK_MANAGER" || u.role === "BUSINESS_OWNER")
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      department: u.department,
      company: u.company,
      risksOwned: u._count.assignedRisks,
      risksReported: u._count.reportedRisks,
      tasks: u._count.tasks,
      overdue: filteredTasks.filter(
        (t) => t.assignedTo?.name === u.name && (t.isOverdue || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED"))
      ).length,
    }))
    .sort((a, b) => b.risksOwned + b.risksReported - (a.risksOwned + a.risksReported));

  // Top priority risks
  const topRisks = risks
    .sort((a, b) => b.inherentScore - a.inherentScore)
    .slice(0, 8)
    .map((r) => {
      const avgCtrl = r.controls.length > 0
        ? r.controls.reduce((sum, c) => sum + (c.effectivenessRating || 0), 0) / r.controls.length
        : 0;
      const residual = Math.max(r.inherentScore - Math.round(avgCtrl * 2), 1);
      const ctrlStatus = r.controls.length === 0 ? "None" : avgCtrl >= 4 ? "Effective" : avgCtrl >= 2 ? "Partial" : "Ineffective";
      return {
        riskId: r.riskId,
        title: r.title,
        category: r.category,
        department: r.department,
        owner: r.reportedBy?.name || "Unassigned",
        inherentScore: r.inherentScore,
        grossScore: r.grossScore || r.inherentScore,
        residualScore: residual,
        riskLevel: r.riskLevel,
        controlStatus: ctrlStatus,
        status: r.status,
      };
    });

  return NextResponse.json({
    orgFilters: {
      groups: allGroups,
      companies: allCompanies,
      departments: allDepartments,
    },
    stats: {
      criticalHighPct: parseFloat(criticalHighPct),
      totalRisks: risks.length,
      pendingReview,
      mitigated,
      overdueTasks,
      totalControls: filteredControls.length,
      totalTasks: filteredTasks.length,
      totalUsers: users.length,
      fraudTotal: fraudRisks.length,
    },
    fraudByCategory,
    heatMap,
    controlAdequacy,
    controlsByType,
    byDepartment,
    byCategory,
    risksByStatus,
    risksByLevel,
    tasksByStatus,
    byObjective,
    entityExposure,
    teamActivity,
    topRisks,
  });
}
