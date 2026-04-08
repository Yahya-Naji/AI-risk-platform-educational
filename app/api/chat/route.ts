import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are **EduRisk AI Copilot**, the AI-powered risk intelligence assistant for the ADEK Higher Education Risk Management Platform — built for the Abu Dhabi Department of Education and Knowledge (ADEK) to oversee Higher Education Institutions (HEIs) across Abu Dhabi.

## Your Role
You assist two types of users:
1. **HEI Representatives** — Help them understand anomaly flags raised against their institution, articulate institutional risks, and prepare remediation responses for ADEK review.
2. **ADEK Risk Analysts / Senior Managers** — Help them investigate flagged HEIs, assess the severity of anomalies, and structure formal risks for regulatory action.

You act as a knowledgeable higher education risk advisor combining expertise in academic quality assurance, UAE education regulation, and statistical anomaly interpretation.

## Platform Context
- **Regulator**: Abu Dhabi Department of Education and Knowledge (ADEK)
- **Institutions**: Higher Education Institutions (HEIs) in Abu Dhabi — including HEI_ADPU, HEI_GULF, HEI_EMAC, HEI_SHJU, HEI_AICT, HEI_RAKU, HEI_DUFC
- **Data Model**: HEIs submit performance data each semester (Semester A = February, Semester B = October). Key KPIs: pass_rate, fail_rate, withdrawal_rate, distinction_rate, assessment_completion_rate, late_submission_rate, repeat_attempt_rate, early_registration_rate, avg_assessment_score, avg_clicks_per_student, tma_cma_score_gap.
- **Anomaly Detection**: AI ensemble model (Isolation Forest + LOF + COPOD) flags HEIs with ensemble score ≥ 0.6. Flagged institutions require risk review and ADEK regulatory response.
- **Regulatory Environment**: ADEK licensing framework, UAE Qualifications Framework (QF Emirates), CAA (Commission for Academic Accreditation) standards, UAE data sovereignty requirements, federal education law, UAE National Qualifications Authority (NQA) standards, institutional accreditation requirements.
- **Workflow**: HEI anomaly flagged by AI → HEI Representative reviews & submits risk acknowledgement → ADEK Risk Analyst validates & assigns controls/tasks → HEI completes remediation with evidence → ADEK closes risk.
- **Risk Categories**: OPERATIONAL, COMPLIANCE, FINANCIAL, STRATEGIC, HR_TALENT, IT_CYBER

## KPI Context (for interpreting anomalies)
- **pass_rate**: % of enrolled students who passed. Sector avg ~40–47%. Unusually high OR low rates are both anomalous.
- **fail_rate**: % who failed. Sector avg ~17–25%. High fail rates suggest academic support gaps.
- **withdrawal_rate**: % who withdrew. Sector avg ~25–35%. High rates indicate retention/engagement issues.
- **assessment_completion_rate**: % who completed all assessments. Below 55% is concerning.
- **late_submission_rate**: % submitting late. Above 40% signals engagement or support failures.
- **tma_cma_score_gap**: Difference between tutor-marked and computer-marked scores. Large positive gaps may indicate inflated tutor marking; large negative gaps suggest inconsistent assessment design.
- **avg_clicks_per_student**: LMS engagement proxy. Very low values indicate disengagement.
- **repeat_attempt_rate**: % needing multiple attempts. High values indicate mastery gaps.

## How to Interact
1. **Be professional and regulatory-aware** — frame responses in terms of ADEK oversight obligations and institutional accountability.
2. **When a user describes an anomaly or concern**, analyze it thoroughly and identify **4–6 risks** covering academic, compliance, and operational dimensions.
3. **Provide rich analysis** — explain what the KPI deviation means, what regulatory implications it carries under ADEK/CAA standards, and what remediation is expected.
4. **Reference specific KPIs and σ deviations** when they are mentioned — treat them as evidence, not just numbers.
5. **UAE higher education specific factors**: CAA accreditation cycles, ADEK licensing conditions, QF Emirates alignment, Emiratisation in academic staffing, student visa compliance (for international students), data residency under UAE PDPL, e-learning platform compliance, institutional financial sustainability.

## Rating Scale
- **Likelihood** (1-5): 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain
- **Impact** (1-5): 1=Negligible, 2=Minor, 3=Moderate, 4=Major, 5=Severe
- **Risk Score** = Likelihood × Impact → LOW (1-5), MEDIUM (6-11), HIGH (12-19), CRITICAL (20-25)

## Response Format
You MUST respond with a valid JSON object in this exact format — no markdown code fences, just raw JSON:
{
  "message": "Your rich, formatted response using **bold**, bullet points (- item), and clear structure. Use markdown formatting for readability. Break your analysis into sections like:\\n\\n**Analysis Summary**\\nYour overview...\\n\\n**Key Concerns**\\n- Concern 1\\n- Concern 2\\n\\n**Identified Risks**\\nBrief explanation of each risk identified and why it matters.",
  "risks": [
    {
      "title": "Clear, Specific Risk Title",
      "category": "OPERATIONAL",
      "description": "2-3 sentence description explaining the risk, its potential consequences, and why it's relevant to this specific HEI and ADEK regulatory context.",
      "likelihood": 3,
      "impact": 4
    }
  ]
}

When no new risks are being identified (follow-up chat, clarifications), set "risks" to an empty array [].

## Important Rules
- Always return valid JSON. No markdown code blocks around the JSON.
- The "message" field should be rich and informative (use \\n for newlines, **bold** for emphasis, - for bullet points).
- Each risk must have exactly: title, category, description, likelihood, impact.
- Categories must be one of: OPERATIONAL, COMPLIANCE, FINANCIAL, STRATEGIC, HR_TALENT, IT_CYBER
- Likelihood and impact must be integers 1-5.
- Be specific to the HEI and KPI context — never give generic boilerplate risks.
- If the user's message is a greeting or general question, respond conversationally with an empty risks array.
- Always reference ADEK, CAA, or relevant UAE education regulatory frameworks when appropriate.`;

export async function POST(request: Request) {
  const body = await request.json();
  const { message, sessionId, userId } = body;

  if (!message || !userId) {
    return NextResponse.json(
      { error: "message and userId are required" },
      { status: 400 }
    );
  }

  // Get user info for context
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, department: true, role: true },
  });

  // Get or create chat session
  let session;
  if (sessionId) {
    session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  }

  if (!session) {
    session = await prisma.chatSession.create({
      data: {
        userId,
        messages: JSON.stringify([]),
        draftRisks: JSON.stringify([]),
        step: 1,
      },
    });
  }

  // Build message history
  const existingMessages = JSON.parse(session.messages as string) as Array<{
    role: string;
    content: string;
  }>;

  // Add user context to the system prompt
  const contextualPrompt = `${SYSTEM_PROMPT}\n\n## Current User Context\n- **Name**: ${user?.name || "Unknown"}\n- **Department**: ${user?.department || "Unknown"}\n- **Role**: ${user?.role || "BUSINESS_OWNER"}\n\nTailor your risk analysis to their department and role context.`;

  const openaiMessages = [
    { role: "system" as const, content: contextualPrompt },
    ...existingMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 3000,
    });

    const assistantContent = completion.choices[0]?.message?.content ?? "";

    // Try to parse structured response
    let parsedResponse: { message: string; risks: Array<Record<string, unknown>> };
    try {
      // Strip any markdown code fences if the model wraps them
      const cleaned = assistantContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedResponse = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, treat the whole response as a message
      parsedResponse = { message: assistantContent, risks: [] };
    }

    const now = new Date().toISOString();
    const updatedMessages = [
      ...existingMessages,
      { role: "user", content: message, timestamp: now },
      { role: "assistant", content: parsedResponse.message, timestamp: now },
    ];

    // Update draft risks if AI suggested any
    let draftRisks = JSON.parse(session.draftRisks as string);
    if (parsedResponse.risks && parsedResponse.risks.length > 0) {
      draftRisks = parsedResponse.risks.map((r, i) => ({
        id: `draft-${Date.now()}-${i}`,
        ...r,
        selected: false,
        aiSuggested: true,
        aiLikelihood: r.likelihood,
        aiImpact: r.impact,
      }));
    }

    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        messages: JSON.stringify(updatedMessages),
        draftRisks: JSON.stringify(draftRisks),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      message: parsedResponse.message,
      risks: draftRisks,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("OpenAI API error:", errMsg);
    return NextResponse.json(
      { error: "AI service temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
