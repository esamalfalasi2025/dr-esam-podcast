// Subscribers Management
(function() {
  'use strict';

  let allSubscribers = [];

  // Fetch subscribers from API
  async function fetchSubscribers() {
    try {
      const response = await fetch('/api/subscriber-list');
      if (!response.ok) throw new Error('Failed to fetch subscribers');
      return await response.json();
    } catch (err) {
      console.error('Fetch subscribers error:', err);
      showToast('Error loading subscribers: ' + err.message, true);
      return [];
    }
  }

  // Format date with local time
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date} ${time}`;
  }

  // Get last subscriber date
  function getLastSubscriberDate(subscribers) {
    if (!subscribers || !subscribers.length) return '—';
    const dates = subscribers
      .map(s => new Date(s.subscribed_at))
      .filter(d => !isNaN(d))
      .sort((a, b) => b - a);
    if (!dates.length) return '—';
    return dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Render subscribers table
  function renderSubscribers(subscribers = allSubscribers) {
    const tbody = document.getElementById('subscribers-tbody');
    const table = document.getElementById('subscribers-table');
    const empty = document.getElementById('subscribers-empty');
    const loading = document.getElementById('subscribers-loading');

    if (!subscribers || !subscribers.length) {
      table.style.display = 'none';
      loading.style.display = 'none';
      empty.innerHTML = 'No subscribers found. Start by sharing your newsletter signup link on your website.';
      empty.style.display = 'block';
      return;
    }

    tbody.innerHTML = '';
    subscribers.forEach((sub, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${idx + 1}</td>
        <td>${escapeHtml(sub.email)}</td>
        <td>${sub.name ? escapeHtml(sub.name) : '—'}</td>
        <td>${formatDate(sub.subscribed_at)}</td>
        <td>
          <button class="subscribers-copy-btn" onclick="copyToClipboard('${sub.email}', this)" title="Copy email">📋 Copy</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    loading.style.display = 'none';
    empty.style.display = 'none';
    table.style.display = 'table';

    // Update stats
    document.getElementById('total-subscribers').textContent = subscribers.length;
    document.getElementById('last-subscriber-date').textContent = getLastSubscriberDate(subscribers);
  }

  // Handle search/filter by email, name, or year
  function handleSearch(query) {
    const filtered = allSubscribers.filter(sub => {
      const email = sub.email.toLowerCase();
      const name = (sub.name || '').toLowerCase();
      const q = query.toLowerCase();

      // Extract year from subscription date
      const subDate = new Date(sub.subscribed_at);
      const year = subDate.getFullYear().toString();

      return email.includes(q) || name.includes(q) || year.includes(q);
    });

    // Update empty message based on search
    const empty = document.getElementById('subscribers-empty');
    if (filtered.length === 0 && query.trim() !== '') {
      empty.innerHTML = `<span style="color:#e07070;">❌ No subscribers found matching "<strong>${escapeHtml(query)}</strong>"</span>`;
    } else if (filtered.length === 0) {
      empty.innerHTML = 'No subscribers found. Start by sharing your newsletter signup link on your website.';
    }

    renderSubscribers(filtered);
  }

  // Copy to clipboard
  window.copyToClipboard = function(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.textContent = original;
      }, 2000);
    });
  };

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Export as CSV
  function exportCSV() {
    if (!allSubscribers || !allSubscribers.length) {
      showToast('No subscribers to export', true);
      return;
    }

    let csv = 'Email,Name,Subscribed Date\n';
    allSubscribers.forEach(sub => {
      const email = `"${sub.email.replace(/"/g, '""')}"`;
      const name = sub.name ? `"${sub.name.replace(/"/g, '""')}"` : '""';
      const date = formatDate(sub.subscribed_at);
      csv += `${email},${name},${date}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('CSV exported successfully!');
  }

  // Export as JSON
  function exportJSON() {
    if (!allSubscribers || !allSubscribers.length) {
      showToast('No subscribers to export', true);
      return;
    }

    const data = allSubscribers.map(sub => ({
      email: sub.email,
      name: sub.name || null,
      subscribed_at: sub.subscribed_at
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `subscribers_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('JSON exported successfully!');
  }

  // Initialize when tab is activated
  async function initSubscribers() {
    const loading = document.getElementById('subscribers-loading');
    const tbody = document.getElementById('subscribers-tbody');

    // Show loading state
    loading.style.display = 'block';
    tbody.innerHTML = '';

    // Fetch subscribers
    allSubscribers = await fetchSubscribers();

    // Sort by subscribed_at descending (most recent first)
    allSubscribers.sort((a, b) => new Date(b.subscribed_at) - new Date(a.subscribed_at));

    // Clear search input
    const searchInput = document.getElementById('subscribers-search');
    if (searchInput) searchInput.value = '';

    // Render
    renderSubscribers();
  }

  // Update recipient count
  function updateRecipientCount() {
    const previewSelect = document.getElementById('email-preview-subscriber');
    const selectedEmail = previewSelect.value;
    const count = selectedEmail ? 1 : allSubscribers.length;
    document.getElementById('email-recipient-count').textContent = count;

    // Show/hide "email not selected" message
    const msgEl = document.getElementById('email-not-selected-msg');
    if (msgEl) {
      msgEl.style.display = selectedEmail ? 'none' : 'block';
    }
  }

  // Update preview subscriber dropdown
  function updatePreviewDropdown() {
    const previewSelect = document.getElementById('email-preview-subscriber');
    if (!previewSelect) return;

    const currentValue = previewSelect.value;
    previewSelect.innerHTML = '<option value="">— All Subscribers —</option>';

    allSubscribers.forEach(sub => {
      const option = document.createElement('option');
      option.value = sub.email;
      option.textContent = `${sub.email}${sub.name ? ' (' + sub.name + ')' : ''}`;
      previewSelect.appendChild(option);
    });

    previewSelect.value = currentValue;
    updateRecipientCount();
  }

  // Send bulk email
  async function sendBulkEmail() {
    const subject = document.getElementById('email-subject').value.trim();
    const html = document.getElementById('email-html').value.trim();
    const filterEmail = document.getElementById('email-preview-subscriber').value || null;
    const sendBtn = document.getElementById('send-email-btn');
    const statusDiv = document.getElementById('email-status');
    const statusContent = document.getElementById('email-status-content');

    if (!subject) {
      showStatus(statusContent, '⚠️ Please enter an email subject', 'error');
      return;
    }
    if (!html) {
      showStatus(statusContent, '⚠️ Please enter email content', 'error');
      return;
    }

    const recipientCount = filterEmail ? 1 : allSubscribers.length;
    if (!recipientCount) {
      showStatus(statusContent, '⚠️ No subscribers to send to', 'error');
      return;
    }

    // Confirm
    const message = `Send to ${recipientCount} subscriber${recipientCount === 1 ? '' : 's'}?`;
    if (!confirm(message)) return;

    sendBtn.disabled = true;
    statusDiv.style.display = 'block';
    showStatus(statusContent, '📤 Sending emails...', 'info');

    try {
      const response = await fetch('/api/send-bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html, filterEmail })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus(
          statusContent,
          `✅ Success! Sent to ${data.sent}/${data.total} subscribers.${data.failed ? ` (${data.failed} failed)` : ''}`,
          'success'
        );
        // Clear form
        document.getElementById('email-subject').value = '';
        document.getElementById('email-html').value = '';
        document.getElementById('email-preview-subscriber').value = '';
        updateRecipientCount();
      } else {
        showStatus(statusContent, `❌ Error: ${data.error || 'Failed to send emails'}`, 'error');
      }
    } catch (err) {
      showStatus(statusContent, `❌ Error: ${err.message}`, 'error');
    } finally {
      sendBtn.disabled = false;
    }
  }

  // Show status message
  function showStatus(el, message, type) {
    el.innerHTML = message;
    const statusDiv = el.parentElement;
    statusDiv.style.display = 'block';

    if (type === 'success') {
      statusDiv.style.background = 'rgba(100,200,100,0.1)';
      statusDiv.style.border = '1px solid rgba(100,200,100,0.3)';
      statusDiv.style.color = '#64c864';
    } else if (type === 'error') {
      statusDiv.style.background = 'rgba(224,112,112,0.1)';
      statusDiv.style.border = '1px solid rgba(224,112,112,0.3)';
      statusDiv.style.color = '#e07070';
    } else {
      statusDiv.style.background = 'rgba(201,168,76,0.1)';
      statusDiv.style.border = '1px solid rgba(201,168,76,0.3)';
      statusDiv.style.color = 'var(--gold)';
    }

    setTimeout(() => {
      if (type === 'success') {
        statusDiv.style.display = 'none';
      }
    }, 5000);
  }

  // Wire up events
  document.addEventListener('DOMContentLoaded', () => {
    // Load subscribers when tab is opened
    const subscribersTab = document.getElementById('tab-subscribers');
    if (subscribersTab) {
      // Initial load
      initSubscribers();

      // Refresh button
      const refreshBtn = document.getElementById('refresh-subscribers-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          initSubscribers();
          updatePreviewDropdown();
        });
      }

      // Search input
      const searchInput = document.getElementById('subscribers-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          handleSearch(e.target.value);
        });
      }

      // Export buttons
      const csvBtn = document.getElementById('export-csv-btn');
      if (csvBtn) {
        csvBtn.addEventListener('click', exportCSV);
      }

      const jsonBtn = document.getElementById('export-json-btn');
      if (jsonBtn) {
        jsonBtn.addEventListener('click', exportJSON);
      }

      // Email composer
      const sendEmailBtn = document.getElementById('send-email-btn');
      if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', sendBulkEmail);
      }

      const clearEmailBtn = document.getElementById('clear-email-btn');
      if (clearEmailBtn) {
        clearEmailBtn.addEventListener('click', () => {
          document.getElementById('email-subject').value = '';
          document.getElementById('email-html').value = '';
          document.getElementById('email-preview-subscriber').value = '';
          document.getElementById('email-status').style.display = 'none';
          updateRecipientCount();
        });
      }

      const previewSelect = document.getElementById('email-preview-subscriber');
      if (previewSelect) {
        previewSelect.addEventListener('change', updateRecipientCount);
      }
    }

    // Also reload when tab is clicked
    document.querySelectorAll('[data-tab="subscribers"]').forEach(btn => {
      btn.addEventListener('click', () => {
        initSubscribers();
        updatePreviewDropdown();
      });
    });
  });

})();
