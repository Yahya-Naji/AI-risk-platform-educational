import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/risk-manager/validate — validate a risk, create controls & tasks
export async function POST(request: Request) {
  const body = await request.json();
  const {
    riskId,       // risk's internal id
    action,       // "validate" | "accept" | "reject" | "request_changes"
    likelihood,   // optional adjusted likelihood
    impact,       // optional adjusted impact
    controls,     // array of { description, type, assignToId, dueDate, priority }
    reason,       // rejection/changes reason
  } = body;

  if (!riskId || !action) {
    return NextResponse.json({ error: "riskId and action are required" }, { status: 400 });
  }

  const risk = await prisma.risk.findUnique({ where: { id: riskId } });
  if (!risk) {
    return NextResponse.json({ error: "Risk not found" }, { status: 404 });
  }

  // Handle rejection
  if (action === "reject") {
    await prisma.risk.update({
      where: { id: riskId },
      data: { status: "REJECTED", notes: reason || risk.notes },
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  // Handle request changes (keep as IN_REVIEW)
  if (action === "request_changes") {
    await prisma.risk.update({
      where: { id: riskId },
      data: { status: "IN_REVIEW", notes: reason || risk.notes },
    });
    return NextResponse.json({ success: true, status: "IN_REVIEW" });
  }

  // Handle accept as-is (no controls needed)
  if (action === "accept") {
    const score = (likelihood || risk.likelihood) * (impact || risk.impact);
    await prisma.risk.update({
      where: { id: riskId },
      data: {
        status: "ACCEPTED",
        likelihood: likelihood || risk.likelihood,
        impact: impact || risk.impact,
        inherentScore: score,
        riskLevel: getRiskLevel(score),
      },
    });
    return NextResponse.json({ success: true, status: "ACCEPTED" });
  }

  // Handle validate with controls
  if (action === "validate") {
    const score = (likelihood || risk.likelihood) * (impact || risk.impact);

    // Update risk status and ratings
    await prisma.risk.update({
      where: { id: riskId },
      data: {
        status: "VALIDATED",
        likelihood: likelihood || risk.likelihood,
        impact: impact || risk.impact,
        inherentScore: score,
        riskLevel: getRiskLevel(score),
      },
    });

    // Generate sequential control/task IDs
    const lastControl = await prisma.control.findFirst({
      where: { controlId: { startsWith: "CTL-" } },
      orderBy: { controlId: "desc" },
    });
    let nextCtlNum = 1;
    if (lastControl) {
      const match = lastControl.controlId.match(/CTL-(\d+)/);
      if (match) nextCtlNum = parseInt(match[1]) + 1;
    }

    const lastTask = await prisma.task.findFirst({
      where: { taskId: { startsWith: "TSK-" } },
      orderBy: { taskId: "desc" },
    });
    let nextTskNum = 1;
    if (lastTask) {
      const match = lastTask.taskId.match(/TSK-(\d+)/);
      if (match) nextTskNum = parseInt(match[1]) + 1;
    }

    const createdControls = [];
    const createdTasks = [];

    if (controls && Array.isArray(controls)) {
      for (const ctrl of controls) {
        const controlId = `CTL-${String(nextCtlNum).padStart(3, "0")}`;
        nextCtlNum++;

        const newControl = await prisma.control.create({
          data: {
            controlId,
            description: ctrl.description,
            type: ctrl.type || "PREVENTIVE",
            riskId: riskId,
          },
        });
        createdControls.push(newControl);

        // Create a task for each control
        const taskId = `TSK-${String(nextTskNum).padStart(3, "0")}`;
        nextTskNum++;

        const newTask = await prisma.task.create({
          data: {
            taskId,
            title: `Implement: ${ctrl.description}`,
            description: `Implement the control "${ctrl.description}" for risk ${risk.riskId}.`,
            status: "PENDING",
            dueDate: ctrl.dueDate ? new Date(ctrl.dueDate) : null,
            riskId: riskId,
            controlId: newControl.id,
            assignedToId: ctrl.assignToId || risk.reportedById || null,
          },
        });
        createdTasks.push(newTask);
      }
    }

    return NextResponse.json({
      success: true,
      status: "VALIDATED",
      controls: createdControls,
      tasks: createdTasks,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 20) return "CRITICAL";
  if (score >= 12) return "HIGH";
  if (score >= 6) return "MEDIUM";
  return "LOW";
}
