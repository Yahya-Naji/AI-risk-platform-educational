import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/risks?riskId=RSK-046 — single risk detail
// GET /api/risks?userId=xxx — list risks reported by user
// GET /api/risks?department=xxx — list risks by department
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riskId = searchParams.get("riskId");
  const userId = searchParams.get("userId");
  const department = searchParams.get("department");
  const status = searchParams.get("status");

  // Single risk detail
  if (riskId) {
    const risk = await prisma.risk.findUnique({
      where: { riskId },
      include: {
        reportedBy: { select: { id: true, name: true, avatar: true, role: true, department: true } },
        assignedTo: { select: { id: true, name: true, avatar: true, role: true } },
        controls: {
          include: {
            tasks: {
              select: { taskId: true, title: true, status: true, dueDate: true, assignedTo: { select: { name: true, avatar: true } } },
            },
          },
        },
        tasks: {
          select: { taskId: true, title: true, status: true, dueDate: true, evidenceCount: true },
        },
      },
    });
    if (!risk) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }
    return NextResponse.json(risk);
  }

  const where: Record<string, unknown> = {};
  if (userId) where.reportedById = userId;
  if (department) where.department = department;
  if (status) where.status = status;

  const risks = await prisma.risk.findMany({
    where,
    include: {
      reportedBy: { select: { id: true, name: true, avatar: true } },
      assignedTo: { select: { id: true, name: true, avatar: true } },
      _count: { select: { controls: true, tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(risks);
}

// POST /api/risks — create new risk(s) from AI copilot
export async function POST(request: Request) {
  const body = await request.json();
  const { risks, userId } = body;

  if (!risks || !Array.isArray(risks) || !userId) {
    return NextResponse.json(
      { error: "risks array and userId are required" },
      { status: 400 }
    );
  }

  // Get user to find their department
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Find the risk manager for this department
  const riskManager = await prisma.user.findFirst({
    where: { role: "RISK_MANAGER" },
  });

  // Generate sequential risk IDs
  const lastRisk = await prisma.risk.findFirst({
    where: { riskId: { startsWith: "RSK-" } },
    orderBy: { riskId: "desc" },
  });
  let nextNum = 1;
  if (lastRisk) {
    const match = lastRisk.riskId.match(/RSK-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  const created = [];
  for (const risk of risks) {
    const riskId = `RSK-${String(nextNum).padStart(3, "0")}`;
    nextNum++;

    const newRisk = await prisma.risk.create({
      data: {
        riskId,
        title: risk.title,
        description: risk.description,
        category: risk.category,
        department: user.department,
        likelihood: risk.likelihood ?? 0,
        impact: risk.impact ?? 0,
        inherentScore: (risk.likelihood ?? 0) * (risk.impact ?? 0),
        riskLevel: getRiskLevel((risk.likelihood ?? 0) * (risk.impact ?? 0)),
        aiSuggested: risk.aiSuggested ?? true,
        aiLikelihood: risk.aiLikelihood ?? risk.likelihood,
        aiImpact: risk.aiImpact ?? risk.impact,
        notes: risk.notes ?? null,
        status: "SUBMITTED",
        reportedById: userId,
        assignedToId: riskManager?.id ?? null,
      },
    });
    created.push(newRisk);
  }

  return NextResponse.json({ created, count: created.length });
}

function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 20) return "CRITICAL";
  if (score >= 12) return "HIGH";
  if (score >= 6) return "MEDIUM";
  return "LOW";
}
