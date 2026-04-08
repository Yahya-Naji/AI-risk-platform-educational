import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/comments — add a comment to a task
export async function POST(request: Request) {
  const body = await request.json();
  const { taskId, userId, content } = body;

  if (!taskId || !userId || !content) {
    return NextResponse.json(
      { error: "taskId, userId, and content are required" },
      { status: 400 }
    );
  }

  // Find task by taskId string (e.g. "TSK-001")
  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      taskId: task.id,
      userId,
    },
    include: {
      user: { select: { id: true, name: true, avatar: true, role: true } },
    },
  });

  return NextResponse.json(comment);
}
