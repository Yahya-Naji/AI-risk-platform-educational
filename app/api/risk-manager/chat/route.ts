import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const body = await request.json();
  const { message, history } = body;

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Fetch live platform data for context
  const [risks, controls, tasks, users] = await Promise.all([
    prisma.risk.findMany({
      where: { status: { not: "DRAFT" } },
      select: {
        riskId: true, title: true, category: true, department: true,
        likelihood: true, impact: true, inherentScore: true, riskLevel: true,
        status: true, fraudRisk: true, strategicObjective: true,
        reportedBy: { select: { name: true } },
        _count: { select: { controls: true, tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.control.findMany({
      select: { controlId: true, description: true, type: true, adequacy: true },
    }),
    prisma.task.findMany({
      select: {
        taskId: true, title: true, status: true, dueDate: true, isOverdue: true,
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      select: { name: true, role: true, department: true },
    }),
  ]);

  // Build risk summary for context
  const totalRisks = risks.length;
  const byLevel: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byDept: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const pending = risks.filter((r) => r.status === "SUBMITTED" || r.status === "IN_REVIEW");

  risks.forEach((r) => {
    byLevel[r.riskLevel] = (byLevel[r.riskLevel] || 0) + 1;
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    byDept[r.department] = (byDept[r.department] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  });

  const overdueTasks = tasks.filter(
    (t) => t.isOverdue || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED")
  );

  const riskListSummary = risks
    .slice(0, 25)
    .map((r) => `${r.riskId}: "${r.title}" [${r.category}] ${r.department} | Score: ${r.inherentScore} (${r.riskLevel}) | Status: ${r.status} | Controls: ${r._count.controls} | Owner: ${r.reportedBy?.name || "Unassigned"}`)
    .join("\n");

  const systemPrompt = `You are **EduRisk AI Assistant**, the AI-powered risk intelligence advisor for ADEK Risk Analysts overseeing Higher Education Institutions (HEIs) in Abu Dhabi.

## Your Role
You have FULL ACCESS to the live EduRisk AI platform data. Help the ADEK Risk Analyst:
- Analyze flagged HEI anomalies, identify patterns, and provide regulatory recommendations
- Answer questions about specific institution risks, controls, tasks, and assigned personnel
- Generate summaries and reports on HEI performance across submission cycles
- Suggest remediation controls and evidence requirements for flagged institutions
- Provide ADEK regulatory and compliance guidance (CAA, QF Emirates, NQA, UAE PDPL, Emiratisation)
- Help prioritize which HEI risks to review next based on ensemble score and KPI drivers

## LIVE PLATFORM DATA (as of now)

### Risk Overview
- **Total Risks**: ${totalRisks}
- **By Level**: ${Object.entries(byLevel).map(([k, v]) => `${k}: ${v}`).join(", ")}
- **By Category**: ${Object.entries(byCategory).map(([k, v]) => `${k}: ${v}`).join(", ")}
- **By Department**: ${Object.entries(byDept).map(([k, v]) => `${k}: ${v}`).join(", ")}
- **By Status**: ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(", ")}
- **Pending Your Review**: ${pending.length} risks
- **Total Controls**: ${controls.length}
- **Total Tasks**: ${tasks.length} (${overdueTasks.length} overdue)

### Users
${users.map((u) => `- ${u.name} (${u.role}, ${u.department})`).join("\n")}

### Risk Registry (top 25)
${riskListSummary}

### Overdue Tasks
${overdueTasks.length > 0 ? overdueTasks.map((t) => `- ${t.taskId}: "${t.title}" assigned to ${t.assignedTo?.name || "Unassigned"} | Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No date"}`).join("\n") : "None"}

## Response Guidelines
- Use **bold** for emphasis, bullet points for lists, clear sections
- Be specific — reference actual risk IDs, names, scores, and people
- When asked about risk patterns, analyze the actual data above
- For risk scoring: Likelihood (1-5) × Impact (1-5), LOW (1-5), MEDIUM (6-11), HIGH (12-19), CRITICAL (20-25)
- Provide actionable recommendations grounded in ADEK regulatory expectations
- If asked to prioritize, consider: ensemble score, σ deviation severity, overdue tasks, control gaps
- Reference specific HEI IDs, KPI metrics, and submission cycles when relevant
- Keep responses concise but thorough`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(history || []).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 500 });
  }
}
