import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  primary: [74, 176, 222] as [number, number, number],
  purple: [139, 92, 246] as [number, number, number],
  dark: [10, 10, 26] as [number, number, number],
  text: [220, 220, 240] as [number, number, number],
  muted: [140, 140, 170] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  yellow: [245, 158, 11] as [number, number, number],
};

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RiskAI Platform', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 22);

  if (subtitle) {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(9);
    doc.text(subtitle, doc.internal.pageSize.getWidth() - 14, 22, { align: 'right' });
  }

  // Date
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    doc.internal.pageSize.getWidth() - 14,
    12,
    { align: 'right' }
  );
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Page ${i} of ${pageCount} | RiskAI Platform | Confidential`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }
}

// Export Risk Registry to PDF
export function exportRegistryPDF(risks: Array<{
  riskId: string;
  title: string;
  category: string;
  department: string;
  inherentScore: number;
  riskLevel: string;
  status: string;
  reportedBy?: { name: string } | null;
  _count?: { controls: number; tasks: number };
}>) {
  const doc = new jsPDF({ orientation: 'landscape' });
  addHeader(doc, 'Risk Registry Report', `${risks.length} risks`);

  const CATEGORY_LABELS: Record<string, string> = {
    OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial',
    STRATEGIC: 'Strategic', HR_TALENT: 'HR/Talent', IT_CYBER: 'IT/Cyber',
  };
  const STATUS_LABELS: Record<string, string> = {
    SUBMITTED: 'Pending', IN_REVIEW: 'In Review', VALIDATED: 'Validated',
    ACCEPTED: 'Accepted', REJECTED: 'Rejected', MITIGATED: 'Mitigated',
  };

  autoTable(doc, {
    startY: 34,
    head: [['Risk ID', 'Title', 'Category', 'Department', 'Score', 'Level', 'Status', 'Controls', 'Owner']],
    body: risks.map((r) => [
      r.riskId,
      r.title.length > 40 ? r.title.slice(0, 40) + '...' : r.title,
      CATEGORY_LABELS[r.category] || r.category,
      r.department,
      r.inherentScore,
      r.riskLevel,
      STATUS_LABELS[r.status] || r.status,
      r._count?.controls || 0,
      r.reportedBy?.name || 'Unassigned',
    ]),
    styles: { fontSize: 8, cellPadding: 3, textColor: [60, 60, 80] },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: {
      0: { cellWidth: 22 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const level = String(data.cell.raw);
        if (level === 'CRITICAL') data.cell.styles.textColor = COLORS.red;
        else if (level === 'HIGH') data.cell.styles.textColor = COLORS.yellow;
        else if (level === 'MEDIUM') data.cell.styles.textColor = COLORS.primary;
        else data.cell.styles.textColor = COLORS.green;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addFooter(doc);
  doc.save(`RiskAI_Registry_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Export Dashboard Report to PDF
export function exportDashboardPDF(data: {
  stats: Record<string, number>;
  byCategory: Record<string, number>;
  byDepartment: Record<string, { inherent: number; gross: number; residual: number; count: number }>;
  controlAdequacy: { effective: number; partiallyEffective: number; ineffective: number; notAssessed: number; total: number };
  recentHighPriority: Array<{
    riskId: string; title: string; category: string; inherentScore: number;
    residualScore: number; riskLevel: string; status: string; controlAdequacy: string;
  }>;
}) {
  const doc = new jsPDF();
  addHeader(doc, 'Risk Intelligence Dashboard Report');

  let y = 38;
  const CATEGORY_LABELS: Record<string, string> = {
    OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial',
    STRATEGIC: 'Strategic', HR_TALENT: 'HR/Talent', IT_CYBER: 'IT/Cyber',
  };

  // Stats Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 80);
  doc.text('Executive Summary', 14, y);
  y += 8;

  const statEntries = [
    ['Total Risks', data.stats.totalRisks],
    ['High Residual', data.stats.highResidual],
    ['Inadequate Controls', data.stats.inadequateControls],
    ['Pending Review', data.stats.pendingReview],
    ['Mitigated', data.stats.mitigated],
  ];

  autoTable(doc, {
    startY: y,
    head: [statEntries.map(([k]) => k)],
    body: [statEntries.map(([, v]) => v)],
    styles: { fontSize: 10, halign: 'center', cellPadding: 6 },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 14;

  // Risks by Category
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 80);
  doc.text('Risks by Category', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Count']],
    body: Object.entries(data.byCategory).map(([cat, count]) => [CATEGORY_LABELS[cat] || cat, count]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: COLORS.purple, textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'center' } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 14;

  // Department breakdown
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Risk by Department', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Department', 'Count', 'Avg Inherent', 'Avg Gross', 'Avg Residual']],
    body: Object.entries(data.byDepartment).map(([dept, v]) => [
      dept,
      v.count,
      v.count > 0 ? Math.round(v.inherent / v.count) : 0,
      v.count > 0 ? Math.round(v.gross / v.count) : 0,
      v.count > 0 ? Math.round(v.residual / v.count) : 0,
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
  });

  // High Priority table on new page if needed
  if (data.recentHighPriority.length > 0) {
    doc.addPage();
    addHeader(doc, 'High-Priority Risks Detail');

    autoTable(doc, {
      startY: 34,
      head: [['Risk ID', 'Title', 'Category', 'Inherent', 'Residual', 'Level', 'Controls', 'Status']],
      body: data.recentHighPriority.map((r) => [
        r.riskId, r.title.length > 35 ? r.title.slice(0, 35) + '...' : r.title,
        CATEGORY_LABELS[r.category] || r.category,
        r.inherentScore, r.residualScore, r.riskLevel, r.controlAdequacy,
        r.status === 'SUBMITTED' ? 'Pending' : r.status,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: COLORS.red, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'center' }, 4: { halign: 'center' } },
    });
  }

  addFooter(doc);
  doc.save(`RiskAI_Dashboard_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Export Admin Overview to PDF
export function exportAdminOverviewPDF(data: {
  stats: Record<string, number>;
  usersByRole: Record<string, number>;
  risksByLevel: Record<string, number>;
  risksByCategory: Record<string, number>;
  risksByDept: Record<string, number>;
  tasksByStatus: Record<string, number>;
  businessOwnerActivity: Array<{ name: string; department: string; risksReported: number; tasksAssigned: number }>;
  recentRisks: Array<{
    riskId: string; title: string; category: string; department: string;
    inherentScore: number; riskLevel: string; status: string; reportedBy: string;
  }>;
}) {
  const doc = new jsPDF();
  addHeader(doc, 'Admin Overview Report');

  const CATEGORY_LABELS: Record<string, string> = {
    OPERATIONAL: 'Operational', COMPLIANCE: 'Compliance', FINANCIAL: 'Financial',
    STRATEGIC: 'Strategic', HR_TALENT: 'HR/Talent', IT_CYBER: 'IT/Cyber',
  };

  let y = 38;

  // Platform Stats
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 80);
  doc.text('Platform Statistics', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Users', 'Risks', 'Controls', 'Tasks', 'Overdue', 'Pending Review', 'Mitigated', 'Fraud']],
    body: [[
      data.stats.totalUsers, data.stats.totalRisks, data.stats.totalControls,
      data.stats.totalTasks, data.stats.overdueTasks, data.stats.pendingReview,
      data.stats.mitigated, data.stats.fraudCount,
    ]],
    styles: { fontSize: 9, halign: 'center', cellPadding: 5 },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  // Risks by Level
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Risks by Severity', 14, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Level', 'Count']],
    body: Object.entries(data.risksByLevel).map(([l, c]) => [l, c]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: COLORS.yellow, textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'center' } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  // Risks by Category
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Risks by Category', 14, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Category', 'Count']],
    body: Object.entries(data.risksByCategory).map(([c, n]) => [CATEGORY_LABELS[c] || c, n]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: COLORS.purple, textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: 'center' } },
  });

  // Business Owner Activity on new page
  if (data.businessOwnerActivity.length > 0) {
    doc.addPage();
    addHeader(doc, 'Business Owner Activity');
    autoTable(doc, {
      startY: 34,
      head: [['Name', 'Department', 'Risks Reported', 'Tasks Assigned']],
      body: data.businessOwnerActivity.map((bo) => [bo.name, bo.department, bo.risksReported, bo.tasksAssigned]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255] },
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' } },
    });
  }

  // Recent Risks
  if (data.recentRisks.length > 0) {
    doc.addPage();
    addHeader(doc, 'Recent Risk Registry');
    autoTable(doc, {
      startY: 34,
      head: [['Risk ID', 'Title', 'Category', 'Department', 'Score', 'Level', 'Status', 'Reported By']],
      body: data.recentRisks.map((r) => [
        r.riskId, r.title.length > 35 ? r.title.slice(0, 35) + '...' : r.title,
        CATEGORY_LABELS[r.category] || r.category, r.department,
        r.inherentScore, r.riskLevel, r.status, r.reportedBy,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 4: { halign: 'center' }, 0: { cellWidth: 20 } },
    });
  }

  addFooter(doc);
  doc.save(`RiskAI_Admin_Overview_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Export Users List to PDF
export function exportUsersPDF(users: Array<{
  name: string; email: string; role: string; department: string;
  company: string; createdAt: string;
  _count: { reportedRisks: number; assignedRisks: number; tasks: number; comments: number };
}>) {
  const doc = new jsPDF({ orientation: 'landscape' });
  addHeader(doc, 'User Management Report', `${users.length} users`);

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Administrator', RISK_MANAGER: 'Risk Manager', BUSINESS_OWNER: 'Business Owner',
  };

  autoTable(doc, {
    startY: 34,
    head: [['Name', 'Email', 'Role', 'Department', 'Company', 'Risks', 'Tasks', 'Joined']],
    body: users.map((u) => [
      u.name, u.email, ROLE_LABELS[u.role] || u.role, u.department, u.company,
      u._count.reportedRisks, u._count.tasks,
      new Date(u.createdAt).toLocaleDateString(),
    ]),
    styles: { fontSize: 8, cellPadding: 3, textColor: [60, 60, 80] },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: { 5: { halign: 'center' }, 6: { halign: 'center' } },
  });

  addFooter(doc);
  doc.save(`RiskAI_Users_${new Date().toISOString().slice(0, 10)}.pdf`);
}
