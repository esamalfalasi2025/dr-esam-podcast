// Analytics Dashboard
(function() {
  'use strict';

  let charts = {};
  let fullAnalyticsData = null;

  const colors = {
    primary: '#c9a84c',
    palette: ['#c9a84c', '#e8c87a', '#a07830', '#f0d898', '#806020']
  };

  // Set default date range (last 30 days)
  function setDefaultDateRange() {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    document.getElementById('analytics-from-date').valueAsDate = fromDate;
    document.getElementById('analytics-to-date').valueAsDate = toDate;
  }

  async function fetchAnalytics() {
    try {
      const response = await fetch('/.netlify/functions/analytics-summary');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return await response.json();
    } catch (err) {
      console.error('Fetch analytics error:', err);
      showToast('Error loading analytics: ' + err.message, true);
      return null;
    }
  }


  function updateStatCards(data) {
    if (!data) return;

    const totalVisits = data.totalPageviews || 0;
    const totalSubs = data.totalSubscribers || 0;
    const countriesReached = data.countriesReached || 0;

    const visitsEl = document.getElementById('stat-total-visits');
    const subsEl = document.getElementById('stat-total-subscribers');
    const countriesEl = document.getElementById('stat-countries-reached');

    if (visitsEl) visitsEl.textContent = totalVisits.toLocaleString();
    if (subsEl) subsEl.textContent = totalSubs.toLocaleString();
    if (countriesEl) countriesEl.textContent = countriesReached;
  }

  function renderCharts(data) {
    if (!data) return;

    // Chart 1: Episode Plays (Horizontal Bar)
    renderEpisodePlaysChart(data.episodeClicks || []);

    // Chart 2: Subscribers by Country (Donut)
    renderCountriesDountChart(data.subscribersByCountry || []);

    // Chart 3: Page Views Timeline (real data from API)
    renderPageviewsTimelineChart(data.pageviewsByDate || {});
  }

  function renderEpisodePlaysChart(episodes) {
    const ctx = document.getElementById('chart-episode-plays');
    if (!ctx) return;

    // Destroy old chart
    if (charts.episodePlays) charts.episodePlays.destroy();

    const topEpisodes = episodes.slice(0, 10);
    const labels = topEpisodes.map((e, idx) => `Episode ${idx + 1}: ${e.title || 'Untitled'}`);
    const data = topEpisodes.map(e => e.view_count || 0);

    charts.episodePlays = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Plays',
          data,
          backgroundColor: colors.primary,
          borderColor: colors.palette[0],
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: '#aaa',
              stepSize: 1
            },
            grid: { color: 'rgba(255,255,255,0.1)' },
            suggestedMax: Math.max(...data, 5)
          },
          y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } }
        }
      }
    });
  }

  function renderCountriesDountChart(countries) {
    const ctx = document.getElementById('chart-countries-donut');
    if (!ctx) return;

    // Destroy old chart
    if (charts.countries) charts.countries.destroy();

    const labels = countries.map(c => c.country || 'Unknown').slice(0, 8);
    const data = countries.map(c => c.count || 0).slice(0, 8);

    // Generate colors with padding
    const bgColors = labels.map((_, i) => colors.palette[i % colors.palette.length]);

    charts.countries = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors,
          borderColor: '#1a1a1a',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#aaa', padding: 20 }
          }
        }
      }
    });
  }

  function renderPageviewsTimelineChart(pvByDate) {
    const ctx = document.getElementById('chart-pageviews-timeline');
    if (!ctx) return;

    // Destroy old chart
    if (charts.pageviews) charts.pageviews.destroy();

    const labels = [];
    const data = [];

    // Check if dates are filtered
    const fromDateInput = document.getElementById('analytics-from-date').value;
    const toDateInput = document.getElementById('analytics-to-date').value;

    if (fromDateInput && toDateInput && pvByDate && Object.keys(pvByDate).length > 0) {
      // Use filtered date range
      const fromDate = new Date(fromDateInput);
      const toDate = new Date(toDateInput);
      toDate.setDate(toDate.getDate() + 1); // Include the end date

      const currentDate = new Date(fromDate);
      while (currentDate < toDate) {
        const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push(dateStr);
        data.push((pvByDate[dateStr]) ? pvByDate[dateStr] : 0);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Default: show last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push(dateStr);
        data.push((pvByDate && pvByDate[dateStr]) ? pvByDate[dateStr] : 0);
      }
    }

    charts.pageviews = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Pageviews',
          data,
          borderColor: colors.primary,
          backgroundColor: 'rgba(201,168,76,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: colors.primary,
          pointBorderColor: '#1a1a1a',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: '#aaa' } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#aaa' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.1)' } }
        }
      }
    });
  }

  async function initAnalytics() {
    const data = await fetchAnalytics();
    if (data) {
      fullAnalyticsData = data;
      updateStatCards(data);
      renderCharts(data);
      setDefaultDateRange();
    }
  }

  function filterAnalyticsByDate() {
    if (!fullAnalyticsData) {
      showToast('No data to filter', true);
      return;
    }

    const fromDateInput = document.getElementById('analytics-from-date').value;
    const toDateInput = document.getElementById('analytics-to-date').value;

    if (!fromDateInput || !toDateInput) {
      showToast('Please select both from and to dates', true);
      return;
    }

    const fromDate = fromDateInput; // YYYY-MM-DD
    const toDate = toDateInput;     // YYYY-MM-DD

    if (fromDate > toDate) {
      showToast('From date must be before to date', true);
      return;
    }

    // Filter pageviews by ISO date
    const filteredPageviewsISO = {};
    const filteredPageviews = {};

    Object.keys(fullAnalyticsData.pageviewsByDateISO || {}).forEach(dateISO => {
      if (dateISO >= fromDate && dateISO <= toDate) {
        filteredPageviewsISO[dateISO] = fullAnalyticsData.pageviewsByDateISO[dateISO];
      }
    });

    // Convert back to display format
    Object.keys(fullAnalyticsData.pageviewsByDate || {}).forEach(dateStr => {
      const dateISO = Object.keys(fullAnalyticsData.pageviewsByDateISO || {}).find(iso => {
        const date = new Date(iso);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr;
      });
      if (dateISO && filteredPageviewsISO[dateISO]) {
        filteredPageviews[dateStr] = fullAnalyticsData.pageviewsByDate[dateStr];
      }
    });

    // Create filtered data object (preserve all episode and subscriber data)
    const filteredData = {
      ...fullAnalyticsData,
      pageviewsByDate: filteredPageviews,
      pageviewsByDateISO: filteredPageviewsISO,
      totalPageviews: Object.values(filteredPageviewsISO).reduce((a, b) => a + b, 0),
      episodeClicks: fullAnalyticsData.episodeClicks || [],
      subscribersByCountry: fullAnalyticsData.subscribersByCountry || [],
      totalSubscribers: fullAnalyticsData.totalSubscribers || 0,
      countriesReached: fullAnalyticsData.countriesReached || 0
    };

    updateStatCards(filteredData);
    renderCharts(filteredData);
    showToast('Analytics filtered successfully');
  }

  async function exportToPDF() {
    if (!fullAnalyticsData) {
      showToast('No data to export', true);
      return;
    }

    // jsPDF might be available as window.jspdf or window.jsPDF
    const jsPDFLib = window.jsPDF || window.jspdf;
    if (!jsPDFLib) {
      showToast('PDF library not loaded. Please refresh and try again.', true);
      return;
    }

    const doc = new jsPDFLib.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 10;

    // Try to load and add logo in top-left
    const logoSize = 35;
    try {
      const logoPath = window.location.origin + '/assets/logo-main.png';
      const logoResponse = await fetch(logoPath);
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoUrl = URL.createObjectURL(logoBlob);
        doc.addImage(logoUrl, 'PNG', 15, y, logoSize, logoSize);
        URL.revokeObjectURL(logoUrl);
      }
    } catch (e) {
      console.error('Error loading logo:', e);
    }

    // Title with branding (centered, same line as logo)
    const titleY = y + 8;
    doc.setFontSize(24);
    doc.setTextColor(201, 168, 76);
    doc.text('Dr Esam Podcast', pageWidth / 2, titleY, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('Website Analytics Report', pageWidth / 2, titleY + 8, { align: 'center' });

    y += 40;

    // Date range
    const fromDate = document.getElementById('analytics-from-date').value || 'All time';
    const toDate = document.getElementById('analytics-to-date').value || 'All time';
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Report Period: ${fromDate} to ${toDate}`, 20, y);
    y += 10;

    // Stats section
    doc.setFontSize(14);
    doc.setTextColor(201, 168, 76);
    doc.text('Key Metrics', 20, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    const totalVisits = fullAnalyticsData.totalPageviews || 0;
    const totalSubscribers = fullAnalyticsData.totalSubscribers || 0;
    const countriesReached = fullAnalyticsData.countriesReached || 0;

    doc.text(`Total Visits: ${totalVisits}`, 20, y);
    y += 7;
    doc.text(`Total Subscribers: ${totalSubscribers}`, 20, y);
    y += 7;
    doc.text(`Countries Reached: ${countriesReached}`, 20, y);
    y += 10;

    // Episode Plays Chart (moved before charts section for proper placement)
    doc.setFontSize(14);
    doc.setTextColor(201, 168, 76);
    doc.text('Episode Plays', 20, y);
    y += 10;

    const episodeChartCanvas = document.getElementById('chart-episode-plays');
    if (episodeChartCanvas) {
      try {
        const episodeImg = episodeChartCanvas.toDataURL('image/png');
        if (episodeImg && episodeImg.length > 100) {
          const chartHeight = 80;
          doc.addImage(episodeImg, 'PNG', 15, y, pageWidth - 30, chartHeight);
          y += chartHeight + 10;
        }
      } catch (e) {
        console.error('Error capturing episode chart:', e);
      }
    }

    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }

    y += 5;

    // Charts section
    doc.setFontSize(14);
    doc.setTextColor(201, 168, 76);
    doc.text('Charts', 20, y);
    y += 15;

    // Capture Countries chart
    const countriesChartCanvas = document.getElementById('chart-countries-donut');
    if (countriesChartCanvas && countriesChartCanvas.getContext) {
      try {
        const countriesImg = countriesChartCanvas.toDataURL('image/png');
        const chartHeight = 60;
        doc.addImage(countriesImg, 'PNG', 15, y, pageWidth - 30, chartHeight);
        y += chartHeight + 10;
      } catch (e) {
        console.error('Error adding countries chart:', e);
      }
    }

    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }

    // Capture Pageviews chart
    const pageviewsChartCanvas = document.getElementById('chart-pageviews-timeline');
    if (pageviewsChartCanvas && pageviewsChartCanvas.getContext) {
      try {
        const pageviewsImg = pageviewsChartCanvas.toDataURL('image/png');
        const chartHeight = 60;
        doc.addImage(pageviewsImg, 'PNG', 15, y, pageWidth - 30, chartHeight);
        y += chartHeight + 10;
      } catch (e) {
        console.error('Error adding pageviews chart:', e);
      }
    }

    y += 10;

    // Subscribers by country (text list)
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(201, 168, 76);
    doc.text('Subscribers by Country', 20, y);
    y += 8;

    const countries = (fullAnalyticsData.subscribersByCountry || []).slice(0, 20);

    if (countries.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(170, 170, 170);
      doc.text('No subscriber data available', 20, y);
      y += 10;
    } else {
      // Table header
      doc.setFontSize(9);
      doc.setTextColor(201, 168, 76);
      doc.text('Country', 20, y);
      doc.text('Count', 120, y);
      y += 5;

      // Table rows
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);

      countries.forEach(c => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = 20;
        }

        doc.text(c.country, 20, y);
        doc.text(`${c.count}`, 120, y);
        y += 5;
      });
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    doc.text(`Generated on ${today}`, 20, pageHeight - 10);

    // Save
    doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF exported successfully!');
  }

  function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = msg;
      toast.dataset.state = isError ? 'error' : 'success';
      toast.hidden = false;
      setTimeout(() => { toast.hidden = true; }, 4000);
    }
  }

  // Wire up events
  document.addEventListener('DOMContentLoaded', () => {
    const analyticsTab = document.getElementById('tab-analytics');
    if (analyticsTab) {
      const refreshBtn = document.getElementById('refresh-analytics-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', initAnalytics);
      }

      const filterBtn = document.getElementById('filter-analytics-btn');
      if (filterBtn) {
        filterBtn.addEventListener('click', filterAnalyticsByDate);
      }

      const exportBtn = document.getElementById('export-pdf-btn');
      if (exportBtn) {
        exportBtn.addEventListener('click', exportToPDF);
      }
    }

    // Load analytics when tab is clicked
    document.querySelectorAll('[data-tab="analytics"]').forEach(btn => {
      btn.addEventListener('click', initAnalytics);
    });
  });

})();
