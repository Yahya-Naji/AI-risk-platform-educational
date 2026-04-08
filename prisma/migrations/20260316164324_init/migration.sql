-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUSINESS_OWNER', 'RISK_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'VALIDATED', 'ACCEPTED', 'REJECTED', 'MITIGATED');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('OPERATIONAL', 'COMPLIANCE', 'FINANCIAL', 'STRATEGIC', 'HR_TALENT', 'IT_CYBER');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ControlType" AS ENUM ('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'CHANGES_REQUESTED', 'SUBMITTED', 'COMPLETED', 'OVERDUE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "department" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT 'Bloom Holding',
    "group" TEXT NOT NULL DEFAULT 'National Holding Group',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "subcategoryL2" TEXT,
    "subcategoryL3" TEXT,
    "department" TEXT NOT NULL,
    "process" TEXT,
    "likelihood" INTEGER NOT NULL DEFAULT 0,
    "impact" INTEGER NOT NULL DEFAULT 0,
    "inherentScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "aiLikelihood" INTEGER,
    "aiImpact" INTEGER,
    "fraudRisk" BOOLEAN NOT NULL DEFAULT false,
    "fraudCategory1" TEXT,
    "fraudCategory2" TEXT,
    "fraudDescription" TEXT,
    "strategicObjective" TEXT,
    "strategicRelevance" INTEGER,
    "grossScore" INTEGER,
    "reportedById" TEXT,
    "assignedToId" TEXT,
    "riskOwner" TEXT,
    "notes" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controls" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ControlType" NOT NULL,
    "designRating" INTEGER,
    "effectivenessRating" INTEGER,
    "totalRating" INTEGER,
    "adequacy" TEXT,
    "riskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "riskId" TEXT NOT NULL,
    "controlId" TEXT,
    "assignedToId" TEXT,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "effectiveness" TEXT,
    "gaps" TEXT,
    "recommendations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" TEXT,
    "fileType" TEXT,
    "url" TEXT,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "draftRisks" JSONB NOT NULL DEFAULT '[]',
    "step" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "risks_riskId_key" ON "risks"("riskId");

-- CreateIndex
CREATE UNIQUE INDEX "controls_controlId_key" ON "controls"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_taskId_key" ON "tasks"("taskId");

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "controls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
