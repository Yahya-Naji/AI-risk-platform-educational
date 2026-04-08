# RiskAI — Complete Feature Analysis

**Product:** AI-powered enterprise risk management platform
**Client:** National Holding Group / Bloom Holding (UAE)
**Framework:** Next.js 15 App Router, PostgreSQL (Neon), OpenAI GPT-4o, Prisma ORM

---

## MODULE 1 — AI Risk Copilot (Business Owner)

**Files:** `app/api/chat/route.ts` | `app/business-owner/report-risk/page.tsx`

### Feature 1.1 — Natural Language Risk Identification
- **What it does:** Business owners describe a situation in plain English; GPT-4o extracts and structures 4–6 distinct risks from the description.
- **Inputs:** Free-text message, sessionId (optional), userId
- **Outputs:** Structured JSON with an array of risk objects — each containing `title`, `description`, `category`, `likelihood` (1–5), `impact` (1–5), `riskLevel`, `fraudRisk` flag, `strategicObjective`
- **Problem solved:** Non-technical employees don't know how to categorize or score risks. The AI translates business language into a formal risk register format.

### Feature 1.2 — Multi-Step Guided Risk Submission (3-Step Wizard)
- **What it does:** Guides the user through a 3-step flow: (1) chat with AI, (2) review and select proposed risks, (3) submit to database.
- **Inputs:** User conversation turns; checkbox selections on proposed risks
- **Outputs:** Persisted risk records in DB with status `SUBMITTED`, sequential IDs (`RSK-001`, `RSK-002`, etc.), auto-assigned to a Risk Manager
- **Problem solved:** Removes the blank-form problem — users can't miss fields or submit incomplete risks because the AI pre-fills everything.

### Feature 1.3 — Conversation Session Persistence
- **What it does:** Stores the entire AI conversation history, including draft risks, in a `ChatSession` record linked to the user.
- **Inputs:** userId, message history, draft risks array
- **Outputs:** Persisted `ChatSession` with `messages` (JSON), `draftRisks` (JSON), current `step` integer
- **Problem solved:** Users can leave and return to an in-progress risk identification session without losing context.

### Feature 1.4 — Rendered Markdown Responses
- **What it does:** Parses and renders AI responses with markdown formatting — bold text (`**...**`), bullet lists, numbered lists — inline in the chat UI.
- **Inputs:** Raw AI message string
- **Outputs:** Styled HTML rendered in chat bubbles
- **Problem solved:** AI responses are readable and scannable rather than raw text blobs.

---

## MODULE 2 — Voice Assistant (OpenAI Realtime API)

**Files:** `app/api/realtime/route.ts` | `app/business-owner/assistant/page.tsx` | `app/risk-manager/assistant/page.tsx`

### Feature 2.1 — Voice-to-Voice Risk Assistant
- **What it does:** Opens a real-time bidirectional audio session with OpenAI's Realtime API. Users speak; the assistant responds in voice.
- **Inputs:** Microphone audio stream (WebRTC); server provides an ephemeral session token
- **Outputs:** Audio response streamed back via WebRTC data channel; text transcription logged in the event log
- **Problem solved:** Hands-free risk reporting and querying — useful in mobile or field contexts where typing is impractical.

### Feature 2.2 — Ephemeral Token Generation
- **What it does:** Server-side endpoint creates a short-lived OpenAI Realtime session token so the API key is never exposed to the browser.
- **Inputs:** `GET /api/realtime` (no params required)
- **Outputs:** `{ client_secret: { value: "..." } }` — ephemeral token valid for one session
- **Problem solved:** Security — keeps the `OPENAI_API_KEY` server-side only.

### Feature 2.3 — Connection State Management & Mic Toggle
- **What it does:** Tracks connection state (disconnected / connecting / connected), allows muting/unmuting the microphone, and maintains a real-time event log.
- **Inputs:** UI button interactions
- **Outputs:** Visual state indicators; timestamped event log entries
- **Problem solved:** Gives users control and transparency over an active live AI session.

### Feature 2.4 — Quick Prompt Shortcuts
- **What it does:** Pre-built prompt buttons (e.g., "Summarize my open tasks", "What are my high priority risks?") that fire typed queries without the user speaking.
- **Inputs:** Button click
- **Outputs:** Query sent to voice assistant; response played back
- **Problem solved:** Lowers friction for common queries — no need to formulate a full spoken sentence.

---

## MODULE 3 — Risk Manager AI Advisor

**Files:** `app/api/risk-manager/chat/route.ts` | `app/risk-manager/assistant/page.tsx`

### Feature 3.1 — Live Platform-Aware Risk Analysis
- **What it does:** A text chat interface for Risk Managers that queries GPT-4o with live data from the database — current risk counts, levels, fraud flags, control status, pending tasks — injected into the system prompt.
- **Inputs:** User message, conversation history
- **Outputs:** AI text response with risk pattern analysis, prioritization suggestions, remediation recommendations
- **Problem solved:** Risk managers get strategic AI guidance grounded in actual platform data, not generic advice.

---

## MODULE 4 — Risk Registry & Lifecycle Management

**Files:** `app/api/risks/route.ts` | `app/risk-manager/registry/page.tsx` | `app/business-owner/submitted-risks/page.tsx`

### Feature 4.1 — Risk CRUD (Create/Read)
- **What it does:** Creates new risk records (from AI copilot submission) and retrieves risks by various filters.
- **Inputs (GET):** `riskId`, `userId`, `department`, `status` query params
- **Outputs:** Full risk object with related `reportedBy` user, `assignedTo` user, `controls` array, `tasks` array
- **Problem solved:** Central risk register accessible by all roles with appropriate filtering.

### Feature 4.2 — Risk Status Lifecycle Tracking
- **What it does:** Risks flow through a defined state machine: `DRAFT → SUBMITTED → IN_REVIEW → VALIDATED → ACCEPTED / REJECTED / MITIGATED` (or `CHANGES_REQUESTED`).
- **Inputs:** Risk Manager validation action (`validate`, `accept`, `reject`, `request_changes`)
- **Outputs:** Updated `status` field on the risk record
- **Problem solved:** Provides auditability and clear ownership at each stage of the risk lifecycle.

### Feature 4.3 — Risk Registry Search & Filter
- **What it does:** Full-featured search and filter UI over all risks in the system.
- **Inputs:** Search query (matches title, riskId, department); filter dropdowns for Department, Status, Risk Level, Category; sort by Risk ID / Title / Score
- **Outputs:** Filtered, sorted risk table
- **Problem solved:** Risk managers can quickly locate specific risks in a large registry without scrolling.

### Feature 4.4 — 5×5 Risk Scoring Matrix
- **What it does:** Computes `inherentScore = likelihood × impact` (1–25) and maps it to `riskLevel`: LOW (1–4), MEDIUM (5–9), HIGH (10–14), CRITICAL (15–25).
- **Inputs:** `likelihood` (1–5), `impact` (1–5) values set by Risk Manager during validation
- **Outputs:** Numeric score and labeled risk level stored on the risk record
- **Problem solved:** Standardizes risk quantification using the industry-standard 5×5 heat map methodology.

### Feature 4.5 — Fraud Risk Flag
- **What it does:** Boolean flag (`fraudRisk`) on each risk; AI copilot automatically sets it when the described scenario has fraud characteristics.
- **Inputs:** AI-detected fraud indicators in the risk description; or manual toggle
- **Outputs:** Fraud badge on risk cards; separate fraud risk count in dashboards
- **Problem solved:** Fraud risks require special regulatory treatment — flagging them separately ensures they're escalated appropriately.

### Feature 4.6 — Strategic Objective Linkage
- **What it does:** Each risk is tagged to one of the company's strategic objectives (e.g., "Financial Performance", "Operational Excellence", "Digital Transformation").
- **Inputs:** AI-assigned or manually selected objective
- **Outputs:** Objective field on risk record; breakdown chart in Risk Manager dashboard
- **Problem solved:** Connects risk management to business strategy — shows which objectives are most exposed.

---

## MODULE 5 — Risk Validation & Control Definition

**Files:** `app/api/risk-manager/validate/route.ts` | `app/risk-manager/validate/[id]/page.tsx` | `app/risk-manager/review/[id]/controls/page.tsx`

### Feature 5.1 — Risk Validation Workflow
- **What it does:** Risk Manager reviews a submitted risk, adjusts likelihood/impact scores, then takes one of four actions: Validate, Accept, Reject, or Request Changes.
- **Inputs:** `riskId`, `action` (`validate`/`accept`/`reject`/`request_changes`), adjusted scores, controls array, `assigneeId`
- **Outputs:** Updated risk status; created controls (CTL-xxx) and tasks (TSK-xxx); HTTP 200 confirmation
- **Problem solved:** Enforces human review of AI-generated risk assessments before they enter the formal register.

### Feature 5.2 — Control Definition & Assignment
- **What it does:** Risk Manager defines one or more controls per risk — each with description, type (PREVENTIVE / DETECTIVE / CORRECTIVE), design rating, effectiveness rating.
- **Inputs:** Control description, `controlType`, `designRating`, `effectivenessRating`, assignee (user), due date
- **Outputs:** `Control` records (CTL-001, CTL-002, …) linked to the risk; `Task` records (TSK-001, TSK-002, …) assigned to the Business Owner
- **Problem solved:** Closes the loop — every validated risk has defined actions with owners and deadlines.

### Feature 5.3 — Auto-Generated Sequential IDs
- **What it does:** When controls and tasks are created, the system queries the current max ID and increments it (e.g., if last control is `CTL-007`, next is `CTL-008`).
- **Inputs:** Existing records in DB
- **Outputs:** Formatted string IDs (`CTL-xxx`, `TSK-xxx`, `RSK-xxx`)
- **Problem solved:** Human-readable, auditable identifiers that are stable and never reused.

---

## MODULE 6 — Task Management & Evidence

**Files:** `app/api/business-owner/tasks/route.ts` | `app/business-owner/tasks/page.tsx` | `app/business-owner/tasks/[id]/page.tsx`

### Feature 6.1 — Task List with Status Filtering
- **What it does:** Business Owners see all tasks assigned to them; filterable by status tab (All, Overdue, Changes Requested, In Progress, Completed).
- **Inputs:** `userId` query param; filter tab selection
- **Outputs:** Filtered task cards showing task title, linked risk, control type, status badge, due date, evidence count
- **Problem solved:** Employees know exactly what remediation actions are expected of them at any time.

### Feature 6.2 — Task Detail View
- **What it does:** Full detail page for a single task — shows the parent risk, control definition, evidence files, comment thread, and a status update form.
- **Inputs:** `taskId` route param
- **Outputs:** Complete task context page including risk category, scores, control type/ratings, file list, comments
- **Problem solved:** Gives task owners full context (why this task exists, what control it satisfies) without navigating away.

### Feature 6.3 — Task Status Updates
- **What it does:** Business Owners update task status through its lifecycle: `PENDING → IN_PROGRESS → SUBMITTED → COMPLETED`; Risk Managers can set `CHANGES_REQUESTED` or `OVERDUE`.
- **Inputs:** `taskId`, `status`, optional `effectiveness` assessment, `gaps` noted, `recommendations` text
- **Outputs:** Updated task record; changes visible to all parties
- **Problem solved:** Real-time visibility into remediation progress for both task owners and risk oversight teams.

### Feature 6.4 — Evidence Tracking
- **What it does:** Stores metadata for evidence files attached to tasks — file name, size, type, URL.
- **Inputs:** `fileName`, `fileSize`, `fileType`, `url`, `taskId`
- **Outputs:** Evidence records linked to task; displayed in task detail view
- **Problem solved:** Provides an audit trail proving that controls were actually implemented, not just marked complete.

---

## MODULE 7 — Collaboration (Comments)

**File:** `app/api/comments/route.ts`

### Feature 7.1 — Task Comment Thread
- **What it does:** Users can post comments on tasks; comments are displayed in chronological order with the author's name, role, avatar, and timestamp.
- **Inputs:** `taskId`, `userId`, `content` (free text)
- **Outputs:** `Comment` record; response includes user name, role, avatar, createdAt
- **Problem solved:** Enables asynchronous collaboration between Business Owners and Risk Managers on specific remediation tasks — eliminates the need for external email threads.

---

## MODULE 8 — Dashboards & Analytics

### Feature 8.1 — Business Owner Personal Dashboard
**Files:** `app/api/business-owner/dashboard/route.ts` | `app/business-owner/dashboard/page.tsx`

- **What it does:** Personalized dashboard showing the logged-in BO's task workload and their department's high-priority risks.
- **Inputs:** `userId`
- **Outputs:** User profile, task counts broken down by status (Total, Overdue, Changes Requested, In Progress, Completed, Submitted, Pending), list of HIGH/CRITICAL risks in their department
- **Problem solved:** Single pane of glass — employees see their obligations without navigating the full risk register.

### Feature 8.2 — Risk Manager Analytics Dashboard
**Files:** `app/api/risk-manager/dashboard/route.ts` | `app/risk-manager/dashboard/page.tsx`

- **What it does:** Comprehensive risk analytics for the Risk Manager role.
- **Inputs:** No params (platform-wide data)
- **Outputs:**
  - 5 KPI cards: Total Risks, High Residual, Inadequate Controls, Pending Review, Mitigated
  - 5×5 heat map (risks plotted by likelihood × impact)
  - Control adequacy breakdown (Effective / Partial / Ineffective / Not Assessed)
  - Risks grouped by department
  - Risks grouped by category
  - Risks grouped by strategic objective
  - Recent high-priority risks table
  - Task status stats
- **Problem solved:** Gives Risk Managers a real-time situational picture of the organization's risk posture without manual reporting.

### Feature 8.3 — Admin Platform Overview Dashboard
**Files:** `app/api/admin/overview/route.ts` | `app/admin/overview/page.tsx`

- **What it does:** Executive/admin view of the entire platform's activity.
- **Inputs:** None
- **Outputs:**
  - 8 KPI cards: Total Users, Risks, Controls, Tasks, Overdue Tasks, Fraud Risks, Pending Validation, Mitigated
  - Users by role & department
  - Risks by level & category
  - Control adequacy & type distribution
  - Task status breakdown
  - Business owner leaderboard (most active users)
  - Full recent risks registry
  - 5×5 heat map
- **Problem solved:** Governance oversight — admins can see adoption, bottlenecks, and risk concentration across the entire platform.

---

## MODULE 9 — PDF Export

**File:** `lib/export-pdf.ts`

### Feature 9.1 — Risk Registry PDF Export
- **What it does:** Exports the current filtered risk registry table to a formatted PDF.
- **Inputs:** Array of risk objects (current view)
- **Outputs:** Downloaded PDF with columns: Risk ID, Title, Category, Department, Score, Level, Status, Controls count, Owner
- **Problem solved:** Regulators and auditors require printable, signed-off risk registers.

### Feature 9.2 — Risk Manager Dashboard PDF Export
- **What it does:** Exports the RM dashboard snapshot — stats, category breakdown, department breakdown, high-priority risks.
- **Inputs:** Dashboard data object
- **Outputs:** Multi-section PDF with summary tables
- **Problem solved:** Board reporting — printable dashboard for risk committee meetings.

### Feature 9.3 — Admin Overview PDF Export
- **What it does:** Exports the full admin platform stats snapshot.
- **Inputs:** Overview data object
- **Outputs:** PDF with user stats, risk distribution, control adequacy, task status, business owner activity
- **Problem solved:** Executive reporting and governance audits.

### Feature 9.4 — User List PDF Export
- **What it does:** Exports the user directory with roles, departments, and activity counts.
- **Inputs:** Array of user objects
- **Outputs:** PDF table: Name, Email, Role, Department, Company, Activity count
- **Problem solved:** HR and compliance audits requiring a record of who has access to the platform.

---

## MODULE 10 — User Management (Admin)

**Files:** `app/api/admin/users/route.ts` | `app/admin/users/page.tsx`

### Feature 10.1 — User Directory with Search & Filter
- **What it does:** Lists all platform users; searchable by name/email; filterable by department.
- **Inputs:** Search string, department filter
- **Outputs:** Filtered user table with role badge, department, company, activity count
- **Problem solved:** Admins can quickly find and manage specific users in a growing organization.

### Feature 10.2 — Create User
- **What it does:** Modal form to add a new user to the platform.
- **Inputs:** Name, email, role (BUSINESS_OWNER / RISK_MANAGER / ADMIN), department, company, group
- **Outputs:** New `User` record; appears in user list
- **Problem solved:** Onboarding new employees without requiring database access.

### Feature 10.3 — Edit User
- **What it does:** Pre-filled edit form to update any user's details.
- **Inputs:** `userId`, updated name/email/role/department
- **Outputs:** Updated `User` record
- **Problem solved:** Role changes (e.g., promoting someone to Risk Manager) without re-creating the account.

### Feature 10.4 — Delete User
- **What it does:** Deletes a user record with a confirmation step.
- **Inputs:** `userId`
- **Outputs:** Removed user record; HTTP 200
- **Problem solved:** Offboarding — removes access when employees leave the organization.

### Feature 10.5 — User Activity Counts
- **What it does:** Each user in the admin list shows how many risks they've reported and tasks they're assigned to.
- **Inputs:** Aggregated from `Risk` and `Task` relations
- **Outputs:** Activity counts displayed per user
- **Problem solved:** Admins can see who is actively engaged vs. inactive — useful for governance reviews.

---

## MODULE 11 — Role-Based Navigation (Sidebar)

**File:** `components/Sidebar.tsx`

### Feature 11.1 — Role-Scoped Navigation Menu
- **What it does:** Renders a different navigation sidebar based on the user's role.
- **Inputs:** `role` prop, `userId` prop, current pathname
- **Outputs:**
  - **Business Owner:** Dashboard, My Tasks, Report New Risk, Submitted Risks, AI Assistant, Guidelines
  - **Risk Manager:** Dashboard, Risk Registry, Pending Review, Controls, AI Assistant
  - **Admin:** Overview, User Management, All Risks
- **Problem solved:** Users only see functionality relevant to their role — reduces confusion and prevents unauthorized navigation.

### Feature 11.2 — Dynamic Task Count Badge
- **What it does:** Fetches the Business Owner's pending task count and displays it as a notification badge on the sidebar "My Tasks" link.
- **Inputs:** `userId` (calls `/api/business-owner/dashboard`)
- **Outputs:** Numeric badge on nav item
- **Problem solved:** Passive awareness — BO users know immediately if they have outstanding tasks without visiting the page.

### Feature 11.3 — Active Route Highlighting
- **What it does:** Highlights the current active page in the sidebar using `usePathname()`.
- **Inputs:** Current URL path
- **Outputs:** Visual active state on the matching nav item
- **Problem solved:** Orientation — users always know which section they're in.

---

## MODULE 12 — Landing Page & Marketing

**File:** `app/page.tsx`

### Feature 12.1 — Animated Hero Section
- **What it does:** Full-viewport hero with animated background image carousel (cycling between risk-themed stock images), headline, subheadline, and CTA buttons.
- **Inputs:** None (static content)
- **Outputs:** Animated landing experience with Framer Motion entrance animations
- **Problem solved:** First impression for new users and stakeholders evaluating the platform.

### Feature 12.2 — Feature Showcase Sections
- **What it does:** Four distinct feature sections explaining: AI Copilot, Three Lines of Defence Framework, Governance & Compliance, and Analytics & Reporting.
- **Inputs:** None
- **Outputs:** Scroll-triggered sections with icons, descriptions, and role-tagged benefits
- **Problem solved:** Communicates platform value proposition before users log in.

### Feature 12.3 — "How It Works" Flow
- **What it does:** Step-by-step visual guide explaining the Three Lines of Defence model as implemented in the platform (Business Owner → Risk Manager → Admin).
- **Inputs:** None
- **Outputs:** Numbered step cards with role icons
- **Problem solved:** Onboarding orientation — explains the workflow to new users unfamiliar with risk management frameworks.

---

## MODULE 13 — Database & Infrastructure

**Files:** `prisma/schema.prisma` | `lib/db.ts` | `prisma/seed.ts`

### Feature 13.1 — Serverless PostgreSQL with Neon Adapter
- **What it does:** Configures Prisma with the `@prisma/adapter-neon` adapter for HTTP-based, connection-pool-free database access compatible with serverless/edge environments.
- **Inputs:** `DATABASE_URL` environment variable
- **Outputs:** Singleton Prisma client available platform-wide
- **Problem solved:** Vercel deployment requires serverless-compatible DB connections — traditional TCP connections fail in cold-start environments.

### Feature 13.2 — Database Seed Script
- **What it does:** Populates the database with 4 demo users (2 Business Owners, 1 Risk Manager, 1 Admin) and 3 sample risks with controls and tasks.
- **Inputs:** `npx prisma db seed`
- **Outputs:** Seeded records across User, Risk, Control, Task tables
- **Problem solved:** Enables immediate demo/testing without manual data entry.

---

## CROSS-CUTTING CONCERNS

### Validation & Scoring Logic
- Risk score = `likelihood × impact` (computed at creation/validation time, stored as `inherentScore`)
- Risk level thresholds: ≤4 = LOW, 5–9 = MEDIUM, 10–14 = HIGH, ≥15 = CRITICAL
- Control adequacy: inferred from `effectivenessRating` or explicit `adequacy` field

### Security Notes
- No authentication middleware is implemented — role and identity are passed as query params or props
- OpenAI API key is server-side only (never sent to browser); realtime sessions use ephemeral tokens
- No input sanitization layer is present beyond Prisma parameterized queries

### Design System
- Tailwind CSS 4.0 with CSS custom properties for theming
- Dark theme: `#0a0a1a` primary background, `#4ab0de` cyan accent
- Typography: Sora (headers), DM Sans (body)
- Component library: shadcn-style with `cva` variants via `components/ui/button.tsx`

---

## Summary

| Dimension | Count |
|-----------|-------|
| Database models | 7 |
| API route files | 14 |
| Page components | 15 |
| PDF export functions | 4 |
| AI integrations | 2 (GPT-4o chat + Realtime voice) |
| User roles | 3 (Business Owner, Risk Manager, Admin) |
| Risk lifecycle states | 7 |
| Control types | 3 (Preventive, Detective, Corrective) |
| Task lifecycle states | 6 |
