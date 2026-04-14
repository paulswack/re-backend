/* ============================================================
   RE Back Office — Deal Room
   Two-column view: Listings (left) | Current Escrows (right)
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('dealRoom');

  document.getElementById('logoutBtn').addEventListener('click', function () { Auth.logout(); });

  var PREFIX = 'reb_';
  var pageBody = document.getElementById('pageBody');

  var _lstSearch = '';
  var _txnSearch = '';

  // ---- Helpers ----
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getInitials(name) {
    if (!name) return '?';
    var p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  // Same agent-color logic as listings.js / transactions.js
  var _agentColorMap = {};
  var _agentColorIdx = 0;
  var AGENT_COLORS = ['indigo','emerald','amber','violet','blue','rose'];
  function agentClass(name) {
    if (!name) return 'indigo';
    if (!_agentColorMap[name]) _agentColorMap[name] = AGENT_COLORS[(_agentColorIdx++) % AGENT_COLORS.length];
    return _agentColorMap[name];
  }

  function avatarHtml(name, size) {
    size = size || 26;
    var cls = agentClass(name);
    return '<div class="agent-avatar ' + cls + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.38) + 'px;flex-shrink:0">' + escapeHtml(getInitials(name)) + '</div>';
  }

  function formatDate(d) {
    if (!d) return '—';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return d; }
  }

  function daysUntil(d) {
    if (!d) return null;
    try {
      var dt = new Date(d + 'T00:00:00'), now = new Date();
      now.setHours(0,0,0,0);
      return Math.round((dt - now) / 86400000);
    } catch(e) { return null; }
  }

  // ---- Stats ----
  function statTile(label, value, iconPath, color) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + color + '"><svg viewBox="0 0 24 24"><path d="' + iconPath + '"/></svg></div>' +
      '<div><div class="stat-value">' + escapeHtml(String(value)) + '</div><div class="stat-label">' + escapeHtml(label) + '</div></div>' +
    '</div>';
  }

  var SEARCH_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="var(--gray-400)" style="flex-shrink:0"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';

  function sectionHd(key, label, count) {
    return '<div class="dr-section-hd dr-section-hd--' + key + '">' +
      '<div class="dr-section-hd-label">' + escapeHtml(label) + '<span class="dr-section-hd-count">' + count + '</span></div>' +
      '<div class="dr-section-hd-col">Agent</div>' +
      '<div class="dr-section-hd-col dr-section-hd-col--price">Price</div>' +
    '</div>';
  }

  function listingRow(l) {
    var addrSub = [l.city, l.state].filter(Boolean).join(', ');
    var specs = [];
    if (l.beds)  specs.push(l.beds + ' bd');
    if (l.baths) specs.push(l.baths + ' ba');
    var subParts = [addrSub, specs.join(' · ')].filter(Boolean);
    var subHtml = subParts.map(function (p, i) {
      return (i > 0 ? '<span class="dr-dot">·</span>' : '') + escapeHtml(p);
    }).join('');
    var statusKey = l.status || 'active';
    return '<div class="dr-row dr-row--' + statusKey + '" data-goto="listings.html?id=' + encodeURIComponent(l.id) + '">' +
      '<div class="dr-row-main">' +
        '<div class="dr-row-address">' + escapeHtml(l.address || '—') + '</div>' +
        (subHtml ? '<div class="dr-row-sub">' + subHtml + '</div>' : '') +
      '</div>' +
      '<div class="dr-row-agent-col">' +
        avatarHtml(l.agent, 22) +
        '<span class="dr-row-agent-name">' + escapeHtml((l.agent || '—').split(' ')[0]) + '</span>' +
      '</div>' +
      '<div class="dr-row-price-col">' +
        '<div class="dr-row-price">' + Data.formatCurrencyFull(l.price) + '</div>' +
        (l.listingDate ? '<div class="dr-row-date">' + escapeHtml(formatDate(l.listingDate)) + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  function escrowRow(t) {
    var addrSub = [t.city, t.state].filter(Boolean).join(', ');
    var matchLst = (window._drAllListings || []).find(function (l) { return l.address === t.address; });
    var beds  = t.beds  || (matchLst ? matchLst.beds  : null);
    var baths = t.baths || (matchLst ? matchLst.baths : null);
    var specs = [];
    if (beds)  specs.push(beds + ' bd');
    if (baths) specs.push(baths + ' ba');
    var subParts = [addrSub, specs.join(' · ')].filter(Boolean);
    var subHtml = subParts.map(function (p, i) {
      return (i > 0 ? '<span class="dr-dot">·</span>' : '') + escapeHtml(p);
    }).join('');

    var days = daysUntil(t.closeDate);
    var urgency = '', urgencyClass = '';
    if (days !== null) {
      if (days < 0)        { urgency = Math.abs(days) + 'd ago'; urgencyClass = 'dr-urgency--ok'; }
      else if (days === 0) { urgency = 'Today!';  urgencyClass = 'dr-urgency--hot'; }
      else if (days <= 7)  { urgency = days + 'd left'; urgencyClass = 'dr-urgency--hot'; }
      else if (days <= 21) { urgency = days + 'd left'; urgencyClass = 'dr-urgency--warn'; }
      else                 { urgency = days + 'd left'; urgencyClass = 'dr-urgency--ok'; }
    }

    var statusKey = t.status || 'active';
    return '<div class="dr-row dr-row--' + statusKey + '" data-goto="transactions.html?id=' + encodeURIComponent(t.id) + '">' +
      '<div class="dr-row-main">' +
        '<div class="dr-row-address">' + escapeHtml(t.address || '—') + '</div>' +
        (subHtml ? '<div class="dr-row-sub">' + subHtml + '</div>' : '') +
      '</div>' +
      '<div class="dr-row-agent-col">' +
        avatarHtml(t.agent, 22) +
        '<span class="dr-row-agent-name">' + escapeHtml((t.agent || '—').split(' ')[0]) + '</span>' +
        (t.type ? '<span class="dr-rep-badge dr-rep-badge--' + t.type.toLowerCase() + '">' + escapeHtml(t.type) + '</span>' : '') +
      '</div>' +
      '<div class="dr-row-price-col">' +
        '<div class="dr-row-price">' + Data.formatCurrencyFull(t.price) + '</div>' +
        (t.closeDate ? '<div class="dr-row-date">' + escapeHtml(formatDate(t.closeDate)) + '</div>' : '') +
        (urgency ? '<span class="dr-urgency ' + urgencyClass + '">' + escapeHtml(urgency) + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  // ---- Listing panel ----
  function renderListingsPanel(listings) {
    var all = listings.filter(function (l) { return l.status !== 'sold'; });
    var q = _lstSearch.toLowerCase();
    var filtered = q ? all.filter(function (l) {
      return (l.address + ' ' + (l.city||'') + ' ' + (l.agent||'')).toLowerCase().indexOf(q) !== -1;
    }) : all;
    filtered.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    var sections = [
      { key: 'coming_soon', label: 'Coming Soon' },
      { key: 'active',      label: 'Active' },
      { key: 'pending',     label: 'Pending' }
    ];

    var rowsHtml = '';
    var totalShown = 0;
    sections.forEach(function (sec) {
      var items = filtered.filter(function (l) { return l.status === sec.key; });
      if (!items.length) return;
      totalShown += items.length;
      rowsHtml += sectionHd(sec.key, sec.label, items.length);
      items.forEach(function (l) { rowsHtml += listingRow(l); });
    });

    if (!totalShown) {
      rowsHtml = '<div class="dr-empty">' +
        '<svg viewBox="0 0 24 24" width="38" height="38"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>' +
        '<div class="dr-empty-title">' + (q ? 'No listings match' : 'No active listings') + '</div>' +
        '<div>' + (q ? 'Try a different search' : 'Add listings to see them here') + '</div>' +
      '</div>';
    }

    return '<div class="dr-panel dr-panel--listings">' +
      '<div class="dr-panel-accent"></div>' +
      '<div class="dr-panel-header">' +
        '<div class="dr-panel-title">' +
          '<div class="dr-panel-icon"><svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>' +
          'Listings' +
          '<span class="dr-panel-count">' + all.length + '</span>' +
        '</div>' +
        '<div class="dr-panel-search">' + SEARCH_ICON +
          '<input type="text" id="lstSearch" placeholder="Search…" value="' + escapeHtml(_lstSearch) + '">' +
        '</div>' +
      '</div>' +
      rowsHtml +
    '</div>';
  }

  // ---- Escrow panel ----
  function renderEscrowsPanel(txns) {
    var all = txns.filter(function (t) { return t.status !== 'closed'; });
    var q = _txnSearch.toLowerCase();
    var filtered = q ? all.filter(function (t) {
      return (t.address + ' ' + (t.city||'') + ' ' + (t.agent||'')).toLowerCase().indexOf(q) !== -1;
    }) : all;
    filtered.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    var sections = [
      { key: 'active',  label: 'Active' },
      { key: 'pending', label: 'Pending' }
    ];

    var rowsHtml = '';
    var totalShown = 0;
    sections.forEach(function (sec) {
      var items = filtered.filter(function (t) { return t.status === sec.key; });
      if (!items.length) return;
      totalShown += items.length;
      rowsHtml += sectionHd(sec.key, sec.label, items.length);
      items.forEach(function (t) { rowsHtml += escrowRow(t); });
    });

    if (!totalShown) {
      rowsHtml = '<div class="dr-empty">' +
        '<svg viewBox="0 0 24 24" width="38" height="38"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>' +
        '<div class="dr-empty-title">' + (q ? 'No escrows match' : 'No active escrows') + '</div>' +
        '<div>' + (q ? 'Try a different search' : 'Add escrows to see them here') + '</div>' +
      '</div>';
    }

    return '<div class="dr-panel dr-panel--escrows">' +
      '<div class="dr-panel-accent"></div>' +
      '<div class="dr-panel-header">' +
        '<div class="dr-panel-title">' +
          '<div class="dr-panel-icon"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg></div>' +
          'Current Escrows' +
          '<span class="dr-panel-count">' + all.length + '</span>' +
        '</div>' +
        '<div class="dr-panel-search">' + SEARCH_ICON +
          '<input type="text" id="txnSearch" placeholder="Search…" value="' + escapeHtml(_txnSearch) + '">' +
        '</div>' +
      '</div>' +
      rowsHtml +
    '</div>';
  }

  // ---- Main Render ----
  function render() {
    var listings = Data.getListings();
    var txns     = Data.getTransactions();

    var activeLst = listings.filter(function (l) { return l.status !== 'sold'; });
    var activeTxn = txns.filter(function (t) { return t.status !== 'closed'; });

    var totalVol = activeLst.concat(activeTxn).reduce(function (s, d) { return s + (parseFloat(d.price) || 0); }, 0);
    var closingSoon = activeTxn.filter(function (t) {
      var n = daysUntil(t.closeDate);
      return n !== null && n >= 0 && n <= 30;
    }).length;

    var html = '';

    // Stats strip
    html += '<div class="dr-stats-strip">';
    html += statTile('Pipeline Volume', '$' + Math.round(totalVol).toLocaleString(),
      'M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z', 'indigo');
    html += statTile('Active Listings', activeLst.length,
      'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z', 'blue');
    html += statTile('Active Escrows', activeTxn.length,
      'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z', 'emerald');
    html += statTile('Closing in 30 Days', closingSoon,
      'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z', 'amber');
    html += '</div>';

    // Two columns
    window._drAllListings = listings; // shared for escrow spec lookup
    html += '<div class="dr-columns">';
    html += renderListingsPanel(listings);
    html += renderEscrowsPanel(txns);
    html += '</div>';

    pageBody.innerHTML = html;

    // Search listeners
    var lstSearch = document.getElementById('lstSearch');
    if (lstSearch) {
      lstSearch.addEventListener('input', function () { _lstSearch = this.value; render(); });
      if (_lstSearch) lstSearch.setSelectionRange(_lstSearch.length, _lstSearch.length);
    }

    var txnSearch = document.getElementById('txnSearch');
    if (txnSearch) {
      txnSearch.addEventListener('input', function () { _txnSearch = this.value; render(); });
      if (_txnSearch) txnSearch.setSelectionRange(_txnSearch.length, _txnSearch.length);
    }

    // Row click → navigate to detail
    pageBody.querySelectorAll('.dr-row[data-goto]').forEach(function (row) {
      row.addEventListener('click', function () {
        window.location.href = this.getAttribute('data-goto');
      });
    });
  }

  // ---- Init ----
  render();
  document.addEventListener('apiBridgeReady', function () { render(); });

})();
