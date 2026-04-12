// Revenue Report Dashboard
(function () {
  'use strict';

  let charts = {};

  const colors = {
    primary: '#c9a84c',
    palette: ['#c9a84c', '#e8c87a', '#a07830', '#f0d898', '#806020',
              '#d4a84c', '#b89040', '#9a7835', '#c0a060', '#e0c070']
  };

  // ── Helpers ──────────────────────────────────────

  function fmt(n) {
    return Number(n).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function setDefaultDateRange() {
    const to   = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    document.getElementById('rr-from-date').valueAsDate = from;
    document.getElementById('rr-to-date').valueAsDate   = to;
  }

  function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent    = msg;
    toast.dataset.state  = isError ? 'error' : 'success';
    toast.hidden         = false;
    setTimeout(() => { toast.hidden = true; }, 4000);
  }

  // ── Data fetch ───────────────────────────────────

  async function fetchReport() {
    const from = document.getElementById('rr-from-date').value;
    const to   = document.getElementById('rr-to-date').value;
    const qs   = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to',   to);

    try {
      const res = await fetch(`/.netlify/functions/service-requests?${qs}`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      return await res.json();
    } catch (err) {
      console.error('Revenue report fetch error:', err);
      showToast('Error loading report: ' + err.message, true);
      return null;
    }
  }

  // ── Render ───────────────────────────────────────

  function renderStatCards(data) {
    const totalCost   = data.services.reduce((s, g) => s + g.cost,    0);
    const totalProfit = data.services.reduce((s, g) => s + g.markup,  0);
    const totalCount  = data.services.reduce((s, g) => s + g.count,   0);

    document.getElementById('rr-stat-revenue').textContent = fmt(data.totalRevenue) + ' AED';
    document.getElementById('rr-stat-cost').textContent    = fmt(totalCost)         + ' AED';
    document.getElementById('rr-stat-profit').textContent  = fmt(totalProfit)       + ' AED';
    document.getElementById('rr-stat-count').textContent   = totalCount;
  }

  function renderTable(data) {
    const tbody  = document.getElementById('rr-tbody');
    const tfoot  = document.getElementById('rr-tfoot');
    const empty  = document.getElementById('rr-empty');
    const table  = document.getElementById('rr-table');

    if (!data.services.length) {
      table.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    table.style.display = '';
    empty.style.display = 'none';

    tbody.innerHTML = data.services.map(g => `
      <tr>
        <td>${g.service_name}</td>
        <td class="rr-num">${g.count}</td>
        <td class="rr-num">${fmt(g.revenue)}</td>
        <td class="rr-num">${fmt(g.cost)}</td>
        <td class="rr-num">${fmt(g.markup)}</td>
        <td class="rr-num">${g.pct}%</td>
      </tr>
    `).join('');

    // Totals row in tfoot
    const totals = {
      count:   data.services.reduce((s, g) => s + g.count,   0),
      revenue: data.totalRevenue,
      cost:    data.services.reduce((s, g) => s + g.cost,    0),
      markup:  data.services.reduce((s, g) => s + g.markup,  0),
    };
    tfoot.innerHTML = `
      <tr class="rr-totals">
        <td>Total</td>
        <td class="rr-num">${totals.count}</td>
        <td class="rr-num">${fmt(totals.revenue)}</td>
        <td class="rr-num">${fmt(totals.cost)}</td>
        <td class="rr-num">${fmt(totals.markup)}</td>
        <td class="rr-num">100%</td>
      </tr>
    `;
  }

  function renderCharts(data) {
    const labels   = data.services.map(g => g.service_name);
    const revenues = data.services.map(g => g.revenue);
    const bgColors = labels.map((_, i) => colors.palette[i % colors.palette.length]);

    // Bar chart
    const barCtx = document.getElementById('rr-chart-bar');
    if (barCtx) {
      if (charts.bar) charts.bar.destroy();
      charts.bar = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Revenue (AED)',
            data: revenues,
            backgroundColor: bgColors,
            borderColor: '#1a1a1a',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } },
            y: {
              beginAtZero: true,
              ticks: { color: '#aaa' },
              grid: { color: 'rgba(255,255,255,0.1)' }
            }
          }
        }
      });
    }

    // Pie chart
    const pieCtx = document.getElementById('rr-chart-pie');
    if (pieCtx) {
      if (charts.pie) charts.pie.destroy();
      charts.pie = new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data: revenues,
            backgroundColor: bgColors,
            borderColor: '#1a1a1a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#aaa', padding: 20 } }
          }
        }
      });
    }
  }

  // ── PDF Export ───────────────────────────────────

  function exportPDF(data) {
    const jsPDFLib = window.jsPDF || window.jspdf;
    if (!jsPDFLib) {
      showToast('PDF library not loaded. Please refresh and try again.', true);
      return;
    }

    const from = document.getElementById('rr-from-date').value || 'all';
    const to   = document.getElementById('rr-to-date').value   || 'all';
    const doc  = new jsPDFLib.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // Title
    doc.setFontSize(24);
    doc.setTextColor(201, 168, 76);
    doc.text('Revenue Report', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Date range
    doc.setFontSize(11);
    doc.setTextColor(150, 150, 150);
    doc.text(`Period: ${from} to ${to}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Summary stats
    const totalCost   = data.services.reduce((s, g) => s + g.cost,    0);
    const totalProfit = data.services.reduce((s, g) => s + g.markup,  0);
    const totalCount  = data.services.reduce((s, g) => s + g.count,   0);

    doc.setFontSize(12);
    doc.setTextColor(201, 168, 76);
    doc.text('Summary', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Total Revenue: ${fmt(data.totalRevenue)} AED`, 20, y);
    y += 6;
    doc.text(`Total Cost: ${fmt(totalCost)} AED`, 20, y);
    y += 6;
    doc.text(`Total Profit: ${fmt(totalProfit)} AED`, 20, y);
    y += 6;
    doc.text(`Total Requests: ${totalCount}`, 20, y);
    y += 10;

    // Table
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(12);
    doc.setTextColor(201, 168, 76);
    doc.text('Per-Service Breakdown', 20, y);
    y += 8;

    // Table header
    doc.setFontSize(9);
    doc.setTextColor(201, 168, 76);
    const headers = ['Service', 'Requests', 'Revenue', 'Cost', 'Profit', '%'];
    const colWidths = [60, 20, 25, 25, 25, 15];
    let x = 20;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    y += 6;

    // Table rows
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    data.services.forEach(g => {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15;
      }
      x = 20;
      doc.text(g.service_name.substring(0, 20), x, y);
      x += colWidths[0];
      doc.text(g.count.toString(), x, y);
      x += colWidths[1];
      doc.text(fmt(g.revenue), x, y);
      x += colWidths[2];
      doc.text(fmt(g.cost), x, y);
      x += colWidths[3];
      doc.text(fmt(g.markup), x, y);
      x += colWidths[4];
      doc.text(g.pct + '%', x, y);
      y += 5;
    });

    // Totals
    y += 3;
    doc.setTextColor(201, 168, 76);
    x = 20;
    doc.text('TOTAL', x, y);
    x += colWidths[0];
    doc.text(totalCount.toString(), x, y);
    x += colWidths[1];
    doc.text(fmt(data.totalRevenue), x, y);
    x += colWidths[2];
    doc.text(fmt(totalCost), x, y);
    x += colWidths[3];
    doc.text(fmt(totalProfit), x, y);
    x += colWidths[4];
    doc.text('100%', x, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const today = new Date().toLocaleDateString('en-AE');
    doc.text(`Generated on ${today}`, 20, pageHeight - 10);

    doc.save(`revenue-report-${from}-to-${to}.pdf`);
    showToast('PDF exported successfully!');
  }

  // ── CSV Export ───────────────────────────────────

  function exportCSV(data) {
    const from = document.getElementById('rr-from-date').value || 'all';
    const to   = document.getElementById('rr-to-date').value   || 'all';

    const rows = [
      ['Service', 'Requests', 'Revenue (AED)', 'Base Cost (AED)', 'Profit (AED)', '% of Total'],
      ...data.services.map(g => [
        g.service_name, g.count, g.revenue.toFixed(0),
        g.cost.toFixed(0), g.markup.toFixed(0), g.pct + '%'
      ]),
      ['Total',
        data.services.reduce((s, g) => s + g.count, 0),
        data.totalRevenue.toFixed(0),
        data.services.reduce((s, g) => s + g.cost, 0).toFixed(0),
        data.services.reduce((s, g) => s + g.markup, 0).toFixed(0),
        '100%'
      ]
    ];

    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `revenue-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Init ─────────────────────────────────────────

  let lastData = null;

  async function initReport() {
    const data = await fetchReport();
    if (data) {
      lastData = data;
      renderStatCards(data);
      renderTable(data);
      renderCharts(data);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setDefaultDateRange();

    document.getElementById('rr-filter-btn')?.addEventListener('click',  initReport);
    document.getElementById('rr-refresh-btn')?.addEventListener('click', initReport);
    document.getElementById('rr-export-csv-btn')?.addEventListener('click',  () => {
      if (lastData) exportCSV(lastData);
      else showToast('No data to export', true);
    });
    document.getElementById('rr-export-pdf-btn')?.addEventListener('click',  () => {
      if (lastData) exportPDF(lastData);
      else showToast('No data to export', true);
    });

    // Load when tab is clicked
    document.querySelectorAll('[data-tab="revenue"]').forEach(btn => {
      btn.addEventListener('click', initReport);
    });
  });

})();
