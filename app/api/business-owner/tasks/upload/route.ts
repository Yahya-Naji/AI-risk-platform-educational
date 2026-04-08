import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const taskId = formData.get("taskId") as string | null;

    if (!file || !taskId) {
      return NextResponse.json(
        { error: "file and taskId are required" },
        { status: 400 }
      );
    }

    const task = await prisma.task.findUnique({ where: { taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Convert file to base64 and store in DB
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type || "application/octet-stream"};base64,${base64}`;

    // Format file size
    const sizeKB = Math.round(file.size / 1024);
    const fileSize =
      sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    const evidence = await prisma.evidence.create({
      data: {
        fileName: file.name,
        fileSize,
        fileType: file.type || null,
        url: null,
        data: dataUri,
        taskId: task.id,
      },
    });

    return NextResponse.json({
      id: evidence.id,
      fileName: evidence.fileName,
      fileSize: evidence.fileSize,
      fileType: evidence.fileType,
      createdAt: evidence.createdAt,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const evidence = await prisma.evidence.findUnique({ where: { id } });
    if (!evidence) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.evidence.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
