import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! } as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🗑️  Clearing existing data...");
  await prisma.comment.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.task.deleteMany();
  await prisma.control.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.user.deleteMany();

  console.log("👤 Creating users...");

  // ── HEI Representatives (Business Owners) ─────────────────────────────
  const ahmedADPU = await prisma.user.create({
    data: {
      name: "Ahmed Al-Mansouri",
      email: "ahmed.mansouri@hei-adpu.ae",
      role: "BUSINESS_OWNER",
      department: "HEI_ADPU",
      company: "Abu Dhabi Polytechnic University",
      group: "Abu Dhabi Department of Education and Knowledge",
      avatar: "AM",
    },
  });

  const fatimaGULF = await prisma.user.create({
    data: {
      name: "Fatima Al-Hassan",
      email: "fatima.hassan@hei-gulf.ae",
      role: "BUSINESS_OWNER",
      department: "HEI_GULF",
      company: "Gulf University",
      group: "Abu Dhabi Department of Education and Knowledge",
      avatar: "FH",
    },
  });

  const ibrahimEMAC = await prisma.user.create({
    data: {
      name: "Ibrahim Al-Emadi",
      email: "ibrahim.emadi@hei-emac.ae",
      role: "BUSINESS_OWNER",
      department: "HEI_EMAC",
      company: "Emirates Academy",
      group: "Abu Dhabi Department of Education and Knowledge",
      avatar: "IE",
    },
  });

  // ── ADEK Risk Analyst (Risk Manager) ──────────────────────────────────
  const saraADEK = await prisma.user.create({
    data: {
      name: "Sara Khalil",
      email: "sara.khalil@adek.gov.ae",
      role: "RISK_MANAGER",
      department: "Risk & Compliance",
      company: "ADEK",
      group: "Abu Dhabi Department of Education and Knowledge",
      avatar: "SK",
    },
  });

  // ── ADEK Senior Manager (Chief Risk Manager) ──────────────────────────
  await prisma.user.create({
    data: {
      name: "Khalid Al-Rahman",
      email: "khalid.rahman@adek.gov.ae",
      role: "CHIEF_RISK_MANAGER",
      department: "Enterprise Risk Management",
      company: "ADEK",
      group: "Abu Dhabi Department of Education and Knowledge",
      avatar: "KR",
    },
  });

  // ── ADEK Leadership (Executive) ───────────────────────────────────────
  await prisma.user.create({
    data: {
      name: "Noura Al-Mazrouei",
      email: "noura.almazrouei@adek.gov.ae",
      role: "EXECUTIVE",
      department: "Executive Leadership",
      company: "ADEK",
      group: "Abu Dhabi Department of Education and Knowledge",
      avatar: "NM",
    },
  });

  // ── Admin ──────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      name: "System Administrator",
      email: "admin@adek.gov.ae",
      role: "ADMIN",
      department: "IT & Systems",
      company: "ADEK",
      group: "Abu Dhabi Department of Education and Knowledge",
      avatar: "SA",
    },
  });

  console.log("⚠️  Creating risks...");

  // ─── CRITICAL: HEI_ADPU — AY2013 Semester B ───────────────────────────
  // Anomaly: Ensemble Score 1.0 | pass_rate 2.82σ | assessment_completion_rate 2.50σ | fail_rate 1.95σ
  const riskADPU1 = await prisma.risk.create({
    data: {
      riskId: "ADEK-001",
      title: "Critical Academic Performance Anomaly — HEI_ADPU (AY2013 Sem B)",
      description:
        "AI anomaly detection flagged HEI_ADPU for AY2013 Semester B with a maximum ensemble score of 1.0 (IForest: 1.0 | LOF: 1.0 | COPOD: 1.0). Key drivers: pass_rate deviation of 2.82σ below sector norm, assessment_completion_rate at 2.50σ below benchmark, and fail_rate at 1.95σ above expected threshold. Enrolled students: 383. Pass rate recorded at 67.4% against sector average of ~41%, indicating a statistical anomaly requiring regulatory review.",
      category: "STRATEGIC",
      subcategoryL2: "Academic Performance",
      subcategoryL3: "Pass Rate & Completion",
      department: "HEI_ADPU",
      process: "Academic Outcomes Monitoring",
      likelihood: 5,
      impact: 5,
      inherentScore: 25,
      riskLevel: "CRITICAL",
      riskOwner: "ADEK Risk Analyst",
      aiSuggested: true,
      aiLikelihood: 5,
      aiImpact: 5,
      notes:
        "Ensemble Score: 1.0 | Submission: AY2013 — Semester B (October) | Enrolled: 383 | Pass Rate: 67.4% | Assessment Completion: 85.2% | Fail Rate: 11.8%",
      status: "VALIDATED",
      strategicObjective: "Ensure Academic Quality & Regulatory Compliance across Abu Dhabi HEIs",
      reportedById: ahmedADPU.id,
      assignedToId: saraADEK.id,
    },
  });

  // ─── HIGH: HEI_ADPU — AY2014 Semester B ──────────────────────────────
  // Anomaly: Ensemble Score 0.7486 | pass_rate 2.34σ | assessment_completion_rate 2.26σ | fail_rate 1.78σ
  const riskADPU2 = await prisma.risk.create({
    data: {
      riskId: "ADEK-002",
      title: "High-Risk Academic Pattern — HEI_ADPU (AY2014 Sem B)",
      description:
        "AI anomaly detection flagged HEI_ADPU for AY2014 Semester B with ensemble score of 0.75 (IForest: 0.72 | LOF: 0.75 | COPOD: 0.77). Persistent pattern from prior cycle. Key drivers: pass_rate at 2.34σ, assessment_completion_rate at 2.26σ below benchmark, fail_rate at 1.78σ above norm. Enrolled students: 365. This is the second consecutive semester with anomalous performance indicators for this institution.",
      category: "STRATEGIC",
      subcategoryL2: "Academic Performance",
      subcategoryL3: "Pass Rate & Completion",
      department: "HEI_ADPU",
      process: "Academic Outcomes Monitoring",
      likelihood: 4,
      impact: 4,
      inherentScore: 16,
      riskLevel: "HIGH",
      riskOwner: "ADEK Risk Analyst",
      aiSuggested: true,
      aiLikelihood: 4,
      aiImpact: 4,
      notes:
        "Ensemble Score: 0.7486 | Submission: AY2014 — Semester B (October) | Enrolled: 365 | Pass Rate: 62.7% | Assessment Completion: 83.0% | Fail Rate: 12.6%",
      status: "IN_REVIEW",
      strategicObjective: "Ensure Academic Quality & Regulatory Compliance across Abu Dhabi HEIs",
      reportedById: ahmedADPU.id,
      assignedToId: saraADEK.id,
    },
  });

  // ─── HIGH: HEI_EMAC — AY2014 Semester A ──────────────────────────────
  // Anomaly: Ensemble Score 0.7077 | tma_cma_score_gap 2.20σ | assessment_completion_rate 2.07σ | withdrawal_rate 1.88σ
  const riskEMAC1 = await prisma.risk.create({
    data: {
      riskId: "ADEK-003",
      title: "Assessment Integrity & Withdrawal Risk — HEI_EMAC (AY2014 Sem A)",
      description:
        "AI anomaly detection flagged HEI_EMAC for AY2014 Semester A with ensemble score of 0.71 (IForest: 0.72 | LOF: 0.75 | COPOD: 0.65). Key drivers: TMA-CMA score gap at 2.20σ above norm (indicating potential assessment integrity concerns), assessment_completion_rate at 2.07σ below benchmark, withdrawal_rate at 1.88σ above sector norm. Enrolled students: 1,936. The significant gap between tutor-marked and computer-marked assessments warrants investigation.",
      category: "COMPLIANCE",
      subcategoryL2: "Assessment Integrity",
      subcategoryL3: "TMA-CMA Gap & Withdrawal",
      department: "HEI_EMAC",
      process: "Assessment Quality Assurance",
      likelihood: 4,
      impact: 4,
      inherentScore: 16,
      riskLevel: "HIGH",
      riskOwner: "ADEK Risk Analyst",
      aiSuggested: true,
      aiLikelihood: 4,
      aiImpact: 4,
      notes:
        "Ensemble Score: 0.7077 | Submission: AY2014 — Semester A (February) | Enrolled: 1936 | TMA-CMA Gap: +3.80 | Assessment Completion: 42.9% | Withdrawal Rate: 46.4%",
      status: "SUBMITTED",
      strategicObjective: "Ensure Academic Quality & Regulatory Compliance across Abu Dhabi HEIs",
      reportedById: ibrahimEMAC.id,
      assignedToId: saraADEK.id,
    },
  });

  // ─── MEDIUM: HEI_GULF — Submission Compliance Risk ───────────────────
  const riskGULF1 = await prisma.risk.create({
    data: {
      riskId: "ADEK-004",
      title: "Late Submission Rate Exceeding Threshold — HEI_GULF",
      description:
        "HEI_GULF has recorded late submission rates consistently above the sector benchmark across AY2013–AY2014. Late submission rates ranging from 51.5% to 56.4% indicate systemic issues with student engagement and institutional support processes. While ensemble anomaly score is below flagging threshold, the trend warrants proactive monitoring.",
      category: "OPERATIONAL",
      subcategoryL2: "Student Engagement",
      subcategoryL3: "Submission Compliance",
      department: "HEI_GULF",
      process: "Student Performance Monitoring",
      likelihood: 3,
      impact: 3,
      inherentScore: 9,
      riskLevel: "MEDIUM",
      riskOwner: "ADEK Risk Analyst",
      status: "VALIDATED",
      strategicObjective: "Ensure Academic Quality & Regulatory Compliance across Abu Dhabi HEIs",
      reportedById: fatimaGULF.id,
      assignedToId: saraADEK.id,
    },
  });

  // ─── MEDIUM: HEI_GULF — TMA-CMA Score Gap ────────────────────────────
  const riskGULF2 = await prisma.risk.create({
    data: {
      riskId: "ADEK-005",
      title: "Persistent Negative TMA-CMA Score Gap — HEI_GULF",
      description:
        "HEI_GULF has reported a persistent negative TMA-CMA score gap across all submission cycles (ranging from -15.8 to -16.8), indicating that students consistently score higher on tutor-marked assessments than on computer-marked assessments. This pattern may suggest over-generous tutor marking or insufficient student preparation for standardised assessments.",
      category: "COMPLIANCE",
      subcategoryL2: "Assessment Integrity",
      subcategoryL3: "TMA-CMA Gap",
      department: "HEI_GULF",
      process: "Assessment Quality Assurance",
      likelihood: 3,
      impact: 4,
      inherentScore: 12,
      riskLevel: "MEDIUM",
      riskOwner: "ADEK Risk Analyst",
      status: "VALIDATED",
      strategicObjective: "Ensure Academic Quality & Regulatory Compliance across Abu Dhabi HEIs",
      reportedById: fatimaGULF.id,
      assignedToId: saraADEK.id,
    },
  });

  // ─── LOW: HEI_GULF — Withdrawal Rate Trend ───────────────────────────
  const riskGULF3 = await prisma.risk.create({
    data: {
      riskId: "ADEK-006",
      title: "Elevated Withdrawal Rate — HEI_GULF",
      description:
        "HEI_GULF withdrawal rates have remained between 28–33% over monitored submission cycles, above the sector average. While not yet triggering anomaly detection thresholds, sustained withdrawal rates at this level indicate student retention challenges that could affect institutional performance rankings and ADEK regulatory standing.",
      category: "OPERATIONAL",
      subcategoryL2: "Student Retention",
      subcategoryL3: "Withdrawal Rate",
      department: "HEI_GULF",
      process: "Student Retention Monitoring",
      likelihood: 2,
      impact: 3,
      inherentScore: 6,
      riskLevel: "LOW",
      riskOwner: "ADEK Risk Analyst",
      status: "MITIGATED",
      strategicObjective: "Ensure Academic Quality & Regulatory Compliance across Abu Dhabi HEIs",
      reportedById: fatimaGULF.id,
      assignedToId: saraADEK.id,
    },
  });

  console.log("🛡️  Creating controls...");

  // Controls for ADEK-001 (Critical ADPU)
  const ctl1 = await prisma.control.create({
    data: {
      controlId: "CTL-001",
      description: "Mandatory Academic Performance Remediation Plan",
      type: "CORRECTIVE",
      designRating: 4,
      effectivenessRating: 2,
      totalRating: 8,
      adequacy: "Needs Improvement",
      riskId: riskADPU1.id,
    },
  });

  const ctl2 = await prisma.control.create({
    data: {
      controlId: "CTL-002",
      description: "ADEK On-Site Regulatory Review Visit",
      type: "DETECTIVE",
      designRating: 5,
      effectivenessRating: 3,
      totalRating: 15,
      adequacy: "Adequate",
      riskId: riskADPU1.id,
    },
  });

  // Controls for ADEK-002 (High ADPU repeat)
  const ctl3 = await prisma.control.create({
    data: {
      controlId: "CTL-003",
      description: "Semester-over-Semester Performance Benchmarking Review",
      type: "DETECTIVE",
      designRating: 4,
      effectivenessRating: 3,
      totalRating: 12,
      adequacy: "Adequate",
      riskId: riskADPU2.id,
    },
  });

  // Controls for ADEK-003 (EMAC assessment integrity)
  const ctl4 = await prisma.control.create({
    data: {
      controlId: "CTL-004",
      description: "Independent TMA-CMA Gap Audit",
      type: "DETECTIVE",
      designRating: 5,
      effectivenessRating: 2,
      totalRating: 10,
      adequacy: "Needs Improvement",
      riskId: riskEMAC1.id,
    },
  });

  const ctl5 = await prisma.control.create({
    data: {
      controlId: "CTL-005",
      description: "Withdrawal Early Warning System",
      type: "PREVENTIVE",
      designRating: 3,
      effectivenessRating: 2,
      totalRating: 6,
      adequacy: "Needs Improvement",
      riskId: riskEMAC1.id,
    },
  });

  // Controls for ADEK-004 (GULF late submission)
  const ctl6 = await prisma.control.create({
    data: {
      controlId: "CTL-006",
      description: "Student Engagement Monitoring Dashboard",
      type: "DETECTIVE",
      designRating: 4,
      effectivenessRating: 3,
      totalRating: 12,
      adequacy: "Adequate",
      riskId: riskGULF1.id,
    },
  });

  // Controls for ADEK-005 (GULF TMA-CMA gap)
  const ctl7 = await prisma.control.create({
    data: {
      controlId: "CTL-007",
      description: "Tutor Marking Calibration & Moderation Policy",
      type: "PREVENTIVE",
      designRating: 4,
      effectivenessRating: 3,
      totalRating: 12,
      adequacy: "Adequate",
      riskId: riskGULF2.id,
    },
  });

  // Controls for ADEK-006 (GULF withdrawal)
  await prisma.control.create({
    data: {
      controlId: "CTL-008",
      description: "Student Retention Intervention Programme",
      type: "CORRECTIVE",
      designRating: 4,
      effectivenessRating: 4,
      totalRating: 16,
      adequacy: "Adequate",
      riskId: riskGULF3.id,
    },
  });

  console.log("📋 Creating tasks...");

  // Tasks for HEI_ADPU rep (ADEK-001 - Critical)
  const task1 = await prisma.task.create({
    data: {
      taskId: "TSK-001",
      title: "Submit Academic Remediation Action Plan",
      description:
        "Provide a detailed action plan addressing the critical anomalies identified in AY2013 Semester B submission. Plan must cover interventions for pass rate improvement, assessment completion support, and fail rate reduction. Submit within 14 days of notification.",
      status: "OVERDUE",
      dueDate: new Date("2026-03-20"),
      isOverdue: true,
      riskId: riskADPU1.id,
      controlId: ctl1.id,
      assignedToId: ahmedADPU.id,
      evidenceCount: 1,
    },
  });

  await prisma.task.create({
    data: {
      taskId: "TSK-002",
      title: "Prepare ADEK On-Site Review Documentation Package",
      description:
        "Compile all documentation required for the ADEK regulatory on-site visit. Include student performance records, faculty assessment logs, internal audit reports, and institutional improvement plans for the flagged submission cycle.",
      status: "IN_PROGRESS",
      dueDate: new Date("2026-04-25"),
      isOverdue: false,
      riskId: riskADPU1.id,
      controlId: ctl2.id,
      assignedToId: ahmedADPU.id,
      evidenceCount: 0,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      taskId: "TSK-003",
      title: "Historical Performance Trend Analysis — AY2013 vs AY2014",
      description:
        "Produce a semester-over-semester comparative analysis for HEI_ADPU covering AY2013 Sem B and AY2014 Sem B. Highlight key KPI movements, identify root causes of persistent anomalies, and propose corrective measures.",
      status: "CHANGES_REQUESTED",
      dueDate: new Date("2026-04-10"),
      isOverdue: false,
      riskId: riskADPU2.id,
      controlId: ctl3.id,
      assignedToId: ahmedADPU.id,
      evidenceCount: 1,
    },
  });

  // Tasks for HEI_EMAC rep (ADEK-003)
  await prisma.task.create({
    data: {
      taskId: "TSK-004",
      title: "Submit TMA-CMA Scoring Audit Evidence",
      description:
        "Provide evidence of internal audit conducted on TMA and CMA scoring processes for AY2014 Semester A. Include marking rubrics, sample graded assessments, moderator reports, and any corrective actions taken to address the 3.80-point score gap.",
      status: "PENDING",
      dueDate: new Date("2026-05-01"),
      isOverdue: false,
      riskId: riskEMAC1.id,
      controlId: ctl4.id,
      assignedToId: ibrahimEMAC.id,
      evidenceCount: 0,
    },
  });

  await prisma.task.create({
    data: {
      taskId: "TSK-005",
      title: "Withdrawal Rate Root Cause Report — HEI_EMAC",
      description:
        "Investigate and document the root causes behind the 46.4% withdrawal rate recorded in AY2014 Semester A. Survey students, review support services utilisation, and propose an early warning intervention system to be implemented in the next submission cycle.",
      status: "PENDING",
      dueDate: new Date("2026-05-10"),
      isOverdue: false,
      riskId: riskEMAC1.id,
      controlId: ctl5.id,
      assignedToId: ibrahimEMAC.id,
      evidenceCount: 0,
    },
  });

  // Tasks for HEI_GULF rep (ADEK-004 & 005)
  const task6 = await prisma.task.create({
    data: {
      taskId: "TSK-006",
      title: "Late Submission Monitoring Dashboard Report",
      description:
        "Provide a report from the student engagement monitoring dashboard showing late submission trends across AY2013–AY2014. Include breakdown by course, faculty, and student cohort. Attach screenshots or exported report from LMS.",
      status: "SUBMITTED",
      dueDate: new Date("2026-03-30"),
      isOverdue: false,
      riskId: riskGULF1.id,
      controlId: ctl6.id,
      assignedToId: fatimaGULF.id,
      evidenceCount: 2,
    },
  });

  await prisma.task.create({
    data: {
      taskId: "TSK-007",
      title: "Tutor Marking Calibration Records Submission",
      description:
        "Submit evidence of tutor marking calibration sessions conducted in AY2014. Include attendance records, marking samples reviewed, moderation outcomes, and updated marking guidelines issued to tutors following calibration.",
      status: "IN_PROGRESS",
      dueDate: new Date("2026-04-20"),
      isOverdue: false,
      riskId: riskGULF2.id,
      controlId: ctl7.id,
      assignedToId: fatimaGULF.id,
      evidenceCount: 0,
    },
  });

  console.log("📎 Creating evidence...");

  await prisma.evidence.createMany({
    data: [
      {
        fileName: "ADPU_Initial_Remediation_Response.pdf",
        fileSize: "1.2 MB",
        fileType: "pdf",
        taskId: task1.id,
      },
      {
        fileName: "ADPU_AY2014_Performance_Comparison.xlsx",
        fileSize: "980 KB",
        fileType: "xlsx",
        taskId: task3.id,
      },
      {
        fileName: "GULF_LMS_Late_Submission_Report_AY2014.pdf",
        fileSize: "2.1 MB",
        fileType: "pdf",
        taskId: task6.id,
      },
      {
        fileName: "GULF_Student_Engagement_Dashboard_Export.xlsx",
        fileSize: "1.5 MB",
        fileType: "xlsx",
        taskId: task6.id,
      },
    ],
  });

  console.log("💬 Creating comments...");

  await prisma.comment.createMany({
    data: [
      {
        content:
          "The remediation plan submitted is noted. However, it does not adequately address the assessment_completion_rate deviation of 2.50σ. Please resubmit with specific interventions targeting completion rates.",
        taskId: task1.id,
        userId: saraADEK.id,
      },
      {
        content:
          "We have submitted our initial response. A full remediation plan including the assessment completion interventions will follow by end of week.",
        taskId: task1.id,
        userId: ahmedADPU.id,
      },
      {
        content:
          "The trend analysis does not include a breakdown by student cohort. Please revise to include first-year vs returning student performance split and resubmit.",
        taskId: task3.id,
        userId: saraADEK.id,
      },
      {
        content:
          "Late submission dashboard report received. The data clearly shows the pattern is concentrated in evening cohorts. Good documentation — moving to review.",
        taskId: task6.id,
        userId: saraADEK.id,
      },
    ],
  });

  console.log("🤖 Creating chat session...");

  await prisma.chatSession.create({
    data: {
      userId: ahmedADPU.id,
      step: 3,
      messages: JSON.stringify([
        {
          role: "assistant",
          content:
            "👋 Hello Ahmed! I'm your ADEK Risk AI Copilot. I can help you review flagged anomalies for HEI_ADPU, understand the risk drivers, and prepare your institutional response. What would you like to discuss?",
          timestamp: "2026-04-01T09:00:00Z",
        },
        {
          role: "user",
          content:
            "We received notification that HEI_ADPU was flagged with a critical anomaly score of 1.0 for AY2013 Semester B. Can you help me understand what this means and what we need to do?",
          timestamp: "2026-04-01T09:05:00Z",
        },
        {
          role: "assistant",
          content:
            "The ensemble score of 1.0 is the highest possible anomaly rating — all three detection models (Isolation Forest, LOF, and COPOD) flagged your submission simultaneously. The three key drivers are: (1) Pass rate at 2.82 standard deviations from sector norm — your 67.4% pass rate is unusually high compared to peer institutions, which ADEK needs to investigate. (2) Assessment completion rate at 2.50σ below benchmark — only 85.2% of assessments were completed, below sector average. (3) Fail rate at 1.95σ above norm. I've pre-structured two risks for your review. Would you like to submit them to ADEK?",
          timestamp: "2026-04-01T09:06:00Z",
        },
      ]),
      draftRisks: JSON.stringify([
        {
          id: "draft-1",
          title: "Critical Academic Performance Anomaly — HEI_ADPU (AY2013 Sem B)",
          category: "STRATEGIC",
          description:
            "Ensemble score 1.0 flagged across all models. Pass rate 2.82σ deviation, assessment completion 2.50σ below benchmark, fail rate 1.95σ above norm.",
          selected: true,
          aiSuggested: true,
        },
        {
          id: "draft-2",
          title: "Assessment Support & Completion Gap",
          category: "OPERATIONAL",
          description:
            "Systemic gap in assessment completion rates suggesting inadequate student support structures or assessment design issues.",
          selected: false,
          aiSuggested: true,
        },
      ]),
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log(`   - 7 users (3 HEI Reps, 1 ADEK Analyst, 1 ADEK Sr. Manager, 1 ADEK Executive, 1 Admin)`);
  console.log(`   - 6 risks (1 CRITICAL, 2 HIGH, 2 MEDIUM, 1 LOW)`);
  console.log(`   - 8 controls`);
  console.log(`   - 7 tasks`);
  console.log(`   - 4 evidence files`);
  console.log(`   - 4 comments`);
  console.log(`   - 1 chat session`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
