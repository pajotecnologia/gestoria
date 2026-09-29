/**
 * Utilitário de Exportação e Impressão de Relatórios Executivos em PDF
 */
export interface ReportData {
  title: string;
  subtitle?: string;
  agencyName?: string;
  clientName?: string;
  date?: string;
  kpis?: Array<{ label: string; value: string; hint?: string }>;
  sections: Array<{
    title: string;
    content: string;
    badge?: string;
  }>;
}

export const exportReportToPdf = (report: ReportData) => {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    window.alert('Por favor, permita pop-ups para gerar a visualização do relatório em PDF.');
    return;
  }

  const currentDate = report.date || new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const kpisHtml = report.kpis && report.kpis.length > 0
    ? `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 20px 0;">
        ${report.kpis.map(k => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
            <div style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">${k.label}</div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px;">${k.value}</div>
            ${k.hint ? `<div style="font-size: 10px; color: #6366f1; margin-top: 2px;">${k.hint}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `
    : '';

  const sectionsHtml = report.sections
    .map(
      (sec) => `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 6px; margin-bottom: 12px;">
            <h2 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0;">${sec.title}</h2>
            ${sec.badge ? `<span style="background: #e0e7ff; color: #4338ca; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 9999px;">${sec.badge}</span>` : ''}
          </div>
          <div style="font-size: 12px; line-height: 1.65; color: #334155; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; border: 1px solid #f1f5f9; border-radius: 8px; padding: 14px;">${sec.content}</div>
        </div>
      `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>${report.title} - ${report.clientName || 'Gestor IA'}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 20px;
          background: #ffffff;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .brand {
          font-size: 20px;
          font-weight: 800;
          color: #4f46e5;
          letter-spacing: -0.5px;
        }
        .btn-print {
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-print:hover {
          background: #4338ca;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
        <button class="btn-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
      </div>

      <div class="header">
        <div>
          <div class="brand">🤖 Gestor IA &bull; ${report.agencyName || 'Agência de Marketing'}</div>
          <h1 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 6px 0 2px 0;">${report.title}</h1>
          ${report.subtitle ? `<p style="font-size: 12px; color: #64748b; margin: 0;">${report.subtitle}</p>` : ''}
        </div>
        <div style="text-align: right; font-size: 11px; color: #64748b;">
          ${report.clientName ? `<div><b>Cliente:</b> ${report.clientName}</div>` : ''}
          <div><b>Data:</b> ${currentDate}</div>
          <div style="color: #10b981; font-weight: 600; margin-top: 2px;">● Relatório Executivo</div>
        </div>
      </div>

      ${kpisHtml}
      ${sectionsHtml}

      <div class="footer">
        <div>Gestor IA SaaS &bull; Plataforma de Inteligência de Marketing & Performance de Anúncios</div>
        <div>Página 1 de 1</div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
