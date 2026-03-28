/* ============================================================
   RE Back Office — Closed Deals Page
   Trophy case for all closed transactions
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  // ---- State ----
  var viewMode = 'list'; // 'list' or 'detail'
  var selectedTxnId = null;
  var COMMISSION_RATE = 0.03;

  // ---- DOM refs ----
  var pageBody = document.getElementById('pageBody');

  // ---- Helpers ----
  var PREFIX = 'reb_';

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'users') || '[]'); } catch (e) { return []; }
  }

  function getParties() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_parties') || '{}'); } catch (e) { return {}; }
  }

  function getNotes() {
    try { return JSON.parse(localStorage.getItem(PREFIX + 'txn_notes') || '{}'); } catch (e) { return {}; }
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function relativeTime(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    var now = new Date();
    var diffMs = now - d;
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    var diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return diffDay + 'd ago';
    return Data.formatDate(isoStr);
  }

  function formatCommission(price) {
    var c = (parseFloat(price) || 0) * COMMISSION_RATE;
    return Data.formatCurrencyFull(c);
  }

  // ---- Main Render Dispatcher ----
  function render() {
    if (viewMode === 'detail' && selectedTxnId) {
      renderDetail();
    } else {
      renderList();
    }
  }

  // ============================================================
  //  LIST VIEW
  // ============================================================
  function renderList() {
    var allTxns = Data.getTransactions();
    var closedTxns = allTxns.filter(function (t) { return t.status === 'closed'; });

    // Agent-level access control: non-privileged users only see their own closed deals
    var session = Auth.getSession();
    var isLead = Auth.isPrivileged() || (typeof getDataAgentName === "function" && getDataAgentName() === null);
    if (!isLead) {
      closedTxns = closedTxns.filter(function (t) { return t.agent === (typeof getDataAgentName === 'function' && getDataAgentName() ? getDataAgentName() : session.displayName); });
    }

    // Stats
    var totalClosed = closedTxns.length;
    var totalVolume = closedTxns.reduce(function (sum, t) { return sum + (parseFloat(t.price) || 0); }, 0);
    var avgDeal = totalClosed > 0 ? totalVolume / totalClosed : 0;
    var totalCommission = totalVolume * COMMISSION_RATE;

    // Unique agents for filter (only for Team Lead)
    var agentSet = {};
    closedTxns.forEach(function (t) { if (t.agent) agentSet[t.agent] = true; });
    var agents = Object.keys(agentSet).sort();

    var html = '';

    // Page Header
    html += '<div class="page-header">' +
      '<div><h2>Closed Deals</h2></div>' +
    '</div>';

    // Stat Cards — emerald trophy case theme
    html += '<div class="closed-stats-grid">';
    html += closedStatCard('Total Closed', totalClosed, '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>');
    html += closedStatCard('Total Volume', Data.formatCurrency(totalVolume), '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>');
    html += closedStatCard('Avg Deal Size', Data.formatCurrency(avgDeal), '<path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>');
    html += closedStatCard('Commission (3%)', Data.formatCurrency(totalCommission), '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>');
    html += '</div>';

    // Filter Bar
    html += '<div class="filter-bar">' +
      '<input type="text" id="searchInput" placeholder="Search by address' + (isLead ? ' or agent' : '') + '...">' +
      (isLead ? '<select id="agentFilter">' +
        '<option value="">All Agents</option>' +
        agents.map(function (a) { return '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>'; }).join('') +
      '</select>' : '') +
      '<input type="date" id="dateFrom" title="From date">' +
      '<input type="date" id="dateTo" title="To date">' +
    '</div>';

    // List rows
    html += '<div class="card" id="cldListCard">';
    html += '<div class="list-header">' +
      '<div class="cld-row-address">Address</div>' +
      '<div class="cld-row-agent">Agent</div>' +
      '<div class="cld-row-price">Price</div>' +
      '<div class="cld-row-date">Close Date</div>' +
      '<div class="cld-row-commission">Commission</div>' +
    '</div>';
    html += '<div id="cldListBody"></div>';
    html += '<div id="cldEmpty" class="empty-state" style="display:none;">' +
      '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' +
      '<h3>No closed deals yet</h3>' +
      '<p>Close your first deal and it will appear here.</p>' +
    '</div>';
    html += '</div>';

    pageBody.innerHTML = html;

    // Render filtered list rows
    renderListRows();

    // Attach filter listeners
    document.getElementById('searchInput').addEventListener('input', renderListRows);
    if (document.getElementById('agentFilter')) {
      document.getElementById('agentFilter').addEventListener('change', renderListRows);
    }
    document.getElementById('dateFrom').addEventListener('change', renderListRows);
    document.getElementById('dateTo').addEventListener('change', renderListRows);
  }

  function closedStatCard(label, value, svgPath) {
    return '<div class="closed-stat-card">' +
      '<div class="closed-stat-icon"><svg viewBox="0 0 24 24">' + svgPath + '</svg></div>' +
      '<div><div class="closed-stat-value">' + value + '</div><div class="closed-stat-label">' + label + '</div></div>' +
    '</div>';
  }

  function renderListRows() {
    var allTxns = Data.getTransactions();
    var closedTxns = allTxns.filter(function (t) { return t.status === 'closed'; });

    // Agent-level access control: non-privileged users only see their own closed deals
    var session = Auth.getSession();
    var isLead = Auth.isPrivileged() || (typeof getDataAgentName === "function" && getDataAgentName() === null);
    if (!isLead) {
      closedTxns = closedTxns.filter(function (t) { return t.agent === (typeof getDataAgentName === 'function' && getDataAgentName() ? getDataAgentName() : session.displayName); });
    }

    var searchEl = document.getElementById('searchInput');
    var agentEl = document.getElementById('agentFilter');
    var dateFromEl = document.getElementById('dateFrom');
    var dateToEl = document.getElementById('dateTo');
    var listBody = document.getElementById('cldListBody');
    var emptyEl = document.getElementById('cldEmpty');

    if (!listBody) return;

    var query = searchEl ? searchEl.value.toLowerCase() : '';
    var agentVal = agentEl ? agentEl.value : '';
    var dateFrom = dateFromEl ? dateFromEl.value : '';
    var dateTo = dateToEl ? dateToEl.value : '';

    var filtered = closedTxns.filter(function (t) {
      var matchSearch = !query ||
        (t.address && t.address.toLowerCase().indexOf(query) > -1) ||
        (t.agent && t.agent.toLowerCase().indexOf(query) > -1);
      var matchAgent = !agentVal || t.agent === agentVal;
      var matchDateFrom = !dateFrom || (t.closeDate && t.closeDate >= dateFrom);
      var matchDateTo = !dateTo || (t.closeDate && t.closeDate <= dateTo);
      return matchSearch && matchAgent && matchDateFrom && matchDateTo;
    });

    // Sort by close date desc (most recent first)
    filtered.sort(function (a, b) {
      var da = a.closeDate || '';
      var db = b.closeDate || '';
      if (da > db) return -1;
      if (da < db) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filtered.length === 0) {
      listBody.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';

    listBody.innerHTML = filtered.map(function (t) {
      var cls = agentClass(t.agent);
      return '<div class="list-row" data-action="open-detail" data-id="' + t.id + '">' +
        '<div class="cld-row-address">' +
          '<div class="cld-row-address-text">' + escapeHtml(t.address) + '</div>' +
        '</div>' +
        '<div class="cld-row-agent">' +
          '<div class="agent-avatar ' + cls + '" style="width:28px;height:28px;font-size:.62rem;">' + getInitials(t.agent) + '</div>' +
          '<div class="cld-row-agent-name">' + escapeHtml(t.agent || '—') + '</div>' +
        '</div>' +
        '<div class="cld-row-price">' + Data.formatCurrencyFull(t.price) + '</div>' +
        '<div class="cld-row-date">' + Data.formatDate(t.closeDate) + '</div>' +
        '<div class="cld-row-commission">' + formatCommission(t.price) + '</div>' +
      '</div>';
    }).join('');
  }

  // ============================================================
  //  DETAIL VIEW
  // ============================================================
  function renderDetail() {
    var txns = Data.getTransactions();
    var t = txns.find(function (x) { return x.id === selectedTxnId; });
    if (!t) {
      viewMode = 'list';
      renderList();
      return;
    }

    var parties = getParties();
    var txnParties = parties[selectedTxnId] || { buyer: {}, seller: {} };
    var buyer = txnParties.buyer || {};
    var seller = txnParties.seller || {};

    var allNotes = getNotes();
    var txnNotes = allNotes[selectedTxnId] || [];
    txnNotes.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

    var commission = (parseFloat(t.price) || 0) * COMMISSION_RATE;

    var html = '';

    // Back button
    html += '<button class="detail-back-btn" data-action="back-to-list">' +
      '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' +
      'Back to Closed Deals' +
    '</button>';

    // Commission highlight banner
    html += '<div class="commission-highlight">' +
      '<div class="commission-highlight-icon"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg></div>' +
      '<div>' +
        '<div class="commission-highlight-label">Commission Earned (3%)</div>' +
        '<div class="commission-highlight-value">' + Data.formatCurrencyFull(commission) + '</div>' +
      '</div>' +
    '</div>';

    // Header Card
    html += '<div class="detail-header-card">';
    html += '<div class="detail-header-accent"></div>';
    html += '<div class="detail-header-body">';

    html += '<div class="detail-header-top">';
    html += '<div style="flex:1;min-width:0">' +
      '<div style="font-size:1.35rem;font-weight:800;color:var(--gray-900);letter-spacing:-.3px">' + escapeHtml(t.address) + '</div>' +
      '<div style="font-size:1.1rem;font-weight:700;color:#10B981;margin-top:2px">' + Data.formatCurrencyFull(t.price) + '</div>' +
    '</div>';
    html += '<div style="display:flex;align-items:center;gap:8px">' +
      '<span class="badge" style="background:#ECFDF5;color:#065F46;font-weight:700;padding:6px 14px;font-size:.82rem;">Closed</span>' +
    '</div>';
    html += '</div>';

    // Detail blocks row
    html += '<div class="detail-blocks-row">';

    // Agent (with avatar)
    var cls = agentClass(t.agent);
    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Closed By</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:2px">' +
        '<div class="agent-avatar ' + cls + '" style="width:28px;height:28px;font-size:.62rem;">' + getInitials(t.agent) + '</div>' +
        '<div class="detail-block-value">' + escapeHtml(t.agent || '—') + '</div>' +
      '</div>' +
    '</div>';

    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Close Date</div>' +
      '<div class="detail-block-value">' + Data.formatDate(t.closeDate) + '</div>' +
    '</div>';

    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Sale Price</div>' +
      '<div class="detail-block-value">' + Data.formatCurrencyFull(t.price) + '</div>' +
    '</div>';

    html += '<div class="detail-block">' +
      '<div class="detail-block-label">Commission (3%)</div>' +
      '<div class="detail-block-value" style="color:#10B981;font-weight:700">' + Data.formatCurrencyFull(commission) + '</div>' +
    '</div>';

    html += '</div>'; // detail-blocks-row
    html += '</div>'; // detail-header-body
    html += '</div>'; // detail-header-card

    // Notes (if any)
    if (t.notes) {
      html += '<div class="notes-card" style="margin-bottom:24px">';
      html += '<div class="notes-card-header">Deal Notes</div>';
      html += '<div style="padding:16px 20px;font-size:.88rem;color:var(--gray-600);line-height:1.6">' + escapeHtml(t.notes) + '</div>';
      html += '</div>';
    }

    // Buyer / Seller Info Card
    var hasBuyer = buyer.name || buyer.phone || buyer.email;
    var hasSeller = seller.name || seller.phone || seller.email;

    if (hasBuyer || hasSeller) {
      html += '<div class="parties-card">';
      html += '<div class="parties-card-header">Buyer &amp; Seller Information</div>';
      html += '<div class="parties-grid">';

      // Buyer
      html += '<div class="party-section">';
      html += '<div class="party-label" style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:var(--indigo)"></span>Buyer</div>';
      if (hasBuyer) {
        if (buyer.name) html += '<div style="font-size:.92rem;font-weight:700;color:var(--gray-900);margin-bottom:4px">' + escapeHtml(buyer.name) + '</div>';
        if (buyer.phone) html += '<div style="font-size:.82rem;color:var(--gray-500)">' + escapeHtml(buyer.phone) + '</div>';
        if (buyer.email) html += '<div style="font-size:.82rem;color:var(--gray-500)">' + escapeHtml(buyer.email) + '</div>';
      } else {
        html += '<div style="font-size:.85rem;color:var(--gray-400);font-style:italic">No buyer info</div>';
      }
      html += '</div>';

      // Seller
      html += '<div class="party-section">';
      html += '<div class="party-label" style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:#EC4899"></span>Seller</div>';
      if (hasSeller) {
        if (seller.name) html += '<div style="font-size:.92rem;font-weight:700;color:var(--gray-900);margin-bottom:4px">' + escapeHtml(seller.name) + '</div>';
        if (seller.phone) html += '<div style="font-size:.82rem;color:var(--gray-500)">' + escapeHtml(seller.phone) + '</div>';
        if (seller.email) html += '<div style="font-size:.82rem;color:var(--gray-500)">' + escapeHtml(seller.email) + '</div>';
      } else {
        html += '<div style="font-size:.85rem;color:var(--gray-400);font-style:italic">No seller info</div>';
      }
      html += '</div>';

      html += '</div>'; // parties-grid
      html += '</div>'; // parties-card
    }

    // Activity / Notes timeline
    if (txnNotes.length > 0) {
      html += '<div class="notes-card">';
      html += '<div class="notes-card-header">Activity &amp; Notes</div>';
      txnNotes.forEach(function (note) {
        html += '<div class="note-item">' +
          '<div class="note-meta">' +
            '<span class="note-author">' + escapeHtml(note.author) + '</span>' +
            '<span class="note-time">' + relativeTime(note.timestamp) + '</span>' +
          '</div>' +
          '<div class="note-text">' + escapeHtml(note.text) + '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    pageBody.innerHTML = html;
  }

  // ============================================================
  //  EVENT DELEGATION
  // ============================================================
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.getAttribute('data-action');

    switch (action) {
      case 'open-detail':
        selectedTxnId = target.getAttribute('data-id');
        viewMode = 'detail';
        render();
        break;

      case 'back-to-list':
        viewMode = 'list';
        selectedTxnId = null;
        render();
        break;
    }
  });

  // ---- Init ----
  render();

})();
