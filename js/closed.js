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
  applyPageColor('closed');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  // ---- State ----
  var viewMode = 'list'; // 'list' or 'detail'
  var selectedTxnId = null;
  var currentRange = 'year';
  var COMMISSION_RATE = getAdminSetting('general.defaultCommissionRate', 0.03);

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

  // ---- Filter by time range ----
  function filterByRange(txns) {
    if (currentRange === 'all') return txns;
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var quarter = Math.floor(month / 3);

    return txns.filter(function (t) {
      if (!t.closeDate) return false;
      var d = new Date(t.closeDate);
      if (isNaN(d.getTime())) return false;
      if (currentRange === 'year') return d.getFullYear() === year;
      if (currentRange === 'quarter') return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === quarter;
      if (currentRange === 'month') return d.getFullYear() === year && d.getMonth() === month;
      return true;
    });
  }

  // ============================================================
  //  LIST VIEW
  // ============================================================
  function renderList() {
    var allTxns = Data.getTransactions();
    var closedTxns = filterByRange(allTxns.filter(function (t) { return t.status === 'closed'; }));
    // Ensure consistent descending sort by close date across all groups
    closedTxns.sort(function (a, b) { return (b.closeDate || '').localeCompare(a.closeDate || ''); });

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

    // Time Filter
    html += '<div class="lb-time-filter">';
    ['all', 'year', 'quarter', 'month'].forEach(function (range) {
      var labels = { all: 'All Time', year: 'This Year', quarter: 'This Quarter', month: 'This Month' };
      html += '<button class="lb-filter-btn' + (currentRange === range ? ' active' : '') + '" data-action="time-filter" data-range="' + range + '">' + labels[range] + '</button>';
    });
    html += '</div>';

    // Stat Cards — emerald trophy case theme
    html += '<div class="closed-stats-grid">';
    html += closedStatCard('Total Closed', totalClosed, '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>');
    html += closedStatCard('Total Volume', Data.formatCurrency(totalVolume), '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>');
    html += closedStatCard('Avg Deal Size', Data.formatCurrency(avgDeal), '<path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>');
    html += '</div>';

    // Group by agent
    var agentGroups = {};
    closedTxns.forEach(function (t) {
      var name = t.agent || 'Unassigned';
      if (!agentGroups[name]) agentGroups[name] = [];
      agentGroups[name].push(t);
    });

    // Sort agents by deal count desc, then volume as tiebreaker
    var sortedAgents = Object.keys(agentGroups).sort(function (a, b) {
      if (agentGroups[b].length !== agentGroups[a].length) return agentGroups[b].length - agentGroups[a].length;
      var volA = agentGroups[a].reduce(function (s, t) { return s + (parseFloat(t.price) || 0); }, 0);
      var volB = agentGroups[b].reduce(function (s, t) { return s + (parseFloat(t.price) || 0); }, 0);
      return volB - volA;
    });

    if (sortedAgents.length === 0) {
      html += '<div style="text-align:center;padding:60px 20px;color:var(--gray-400);">';
      html += '<div style="font-size:2rem;margin-bottom:12px">🏆</div>';
      html += '<div style="font-weight:600;margin-bottom:4px">No closed deals yet</div>';
      html += '</div>';
    } else {
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">';

      sortedAgents.forEach(function (agentName) {
        var deals = agentGroups[agentName];
        var agentVolume = deals.reduce(function (s, t) { return s + (parseFloat(t.price) || 0); }, 0);
        var cls = agentClass(agentName);

        deals.sort(function (a, b) { return (b.closeDate || '').localeCompare(a.closeDate || ''); });

        html += '<div class="lb-card" style="margin-bottom:0">';

        // Agent header
        html += '<div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:12px">';
        html += '<div class="agent-avatar ' + cls + '" style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;font-size:.78rem;color:#fff;flex-shrink:0">' + getInitials(agentName) + '</div>';
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="font-size:.9rem;font-weight:700;color:var(--gray-900)">' + escapeHtml(agentName) + '</div>';
        html += '<div style="font-size:.72rem;color:var(--gray-400)">' + deals.length + ' closed · ' + Data.formatCurrency(agentVolume) + '</div>';
        html += '</div></div>';

        // Deal list
        deals.forEach(function (t) {
          html += '<div class="list-row" data-action="open-detail" data-id="' + t.id + '" style="padding:10px 20px;cursor:pointer">';
          html += '<div style="flex:1;min-width:0">';
          var cAddrSub = [t.city, t.state, t.zip].filter(Boolean).join(', ');
          html += '<div style="font-size:.82rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(t.address || '—') + '</div>';
          html += '<div style="font-size:.68rem;color:var(--gray-400)">' + (cAddrSub ? escapeHtml(cAddrSub) + ' &middot; ' : '') + Data.formatDate(t.closeDate) + '</div>';
          html += '</div>';
          html += '<div style="font-size:.82rem;font-weight:700;color:var(--gray-900);flex-shrink:0">' + Data.formatCurrency(t.price) + '</div>';
          html += '</div>';
        });

        html += '</div>';
      });

      html += '</div>';
    }

    pageBody.innerHTML = html;
  }

  function closedStatCard(label, value, svgPath) {
    return '<div class="closed-stat-card">' +
      '<div class="closed-stat-icon"><svg viewBox="0 0 24 24">' + svgPath + '</svg></div>' +
      '<div><div class="closed-stat-value">' + value + '</div><div class="closed-stat-label">' + label + '</div></div>' +
    '</div>';
  }

  // ============================================================
  //  DETAIL VIEW
  // ============================================================
  function renderDetail() {
    window.scrollTo(0, 0);
    var txns = Data.getTransactions();
    var t = txns.find(function (x) { return x.id === selectedTxnId; });
    if (!t) { viewMode = 'list'; renderList(); return; }

    var parties = getParties();
    var txnParties = parties[selectedTxnId] || {};
    var buyers = Array.isArray(txnParties.buyers) ? txnParties.buyers : (txnParties.buyer && txnParties.buyer.name ? [txnParties.buyer] : []);
    var sellers = Array.isArray(txnParties.sellers) ? txnParties.sellers : (txnParties.seller && txnParties.seller.name ? [txnParties.seller] : []);

    var users = JSON.parse(localStorage.getItem('reb_users') || '[]');
    var leadSources = getAdminSetting('leadSources', ['Zillow', 'Realtor.com', 'Referral', 'Cold Call', 'Door Knock', 'Social Media', 'Open House', 'Other']);

    var iStyle = 'width:100%;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.88rem;color:var(--gray-800);background:#fff;transition:border-color .15s';
    var lStyle = 'display:block;font-size:.72rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px';

    var html = '';

    // Back button
    html += '<button class="detail-back-btn" data-action="back-to-list">' +
      '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' +
      'Back to Closed Deals</button>';

    // ---- Hero banner ----
    html += '<div style="background:linear-gradient(135deg,#064E3B,#065F46);border-radius:16px;padding:28px 32px;margin-bottom:20px;position:relative;overflow:hidden">';
    html += '<div style="position:absolute;top:-30px;right:-30px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.04)"></div>';
    html += '<div style="position:absolute;bottom:-20px;right:60px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.04)"></div>';
    // Status badge
    html += '<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border-radius:20px;padding:4px 12px;margin-bottom:14px">';
    html += '<span style="width:7px;height:7px;border-radius:50%;background:#6EE7B7;display:inline-block"></span>';
    html += '<span style="font-size:.75rem;font-weight:700;color:#fff;letter-spacing:.5px;text-transform:uppercase">Closed</span></div>';
    // Address
    html += '<div style="font-size:1.5rem;font-weight:800;color:#fff;margin-bottom:16px;letter-spacing:-.3px;line-height:1.25">' + escapeHtml(t.address || '—') + '</div>';
    // Key metrics row
    html += '<div style="display:flex;gap:24px;flex-wrap:wrap">';
    html += '<div><div style="font-size:.7rem;font-weight:600;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Sale Price</div>' +
      '<div style="font-size:1.3rem;font-weight:800;color:#fff">' + Data.formatCurrencyFull(t.price) + '</div></div>';
    html += '<div><div style="font-size:.7rem;font-weight:600;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Close Date</div>' +
      '<div style="font-size:1rem;font-weight:700;color:#fff">' + (t.closeDate ? Data.formatDate(t.closeDate) : '—') + '</div></div>';
    html += '<div><div style="font-size:.7rem;font-weight:600;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Agent</div>' +
      '<div style="font-size:1rem;font-weight:700;color:#fff">' + escapeHtml(t.agent || '—') + '</div></div>';
    html += '<div><div style="font-size:.7rem;font-weight:600;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Type</div>' +
      '<div style="font-size:1rem;font-weight:700;color:#fff">' + escapeHtml(t.type || '—') + '</div></div>';
    html += '</div>';
    html += '</div>'; // hero banner

    // ---- Edit card ----
    html += '<div class="card" style="margin-bottom:16px">';
    html += '<div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);font-size:.92rem;font-weight:700;color:var(--gray-800)">Edit Details</div>';
    html += '<div style="padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">';

    // Address
    html += '<div style="grid-column:1/-1"><label style="' + lStyle + '">Address</label>' +
      '<input type="text" class="closed-edit-field" data-field="address" value="' + escapeHtml(t.address || '') + '" placeholder="123 Main St" style="' + iStyle + '"></div>';

    // City / State / Zip
    html += '<div><label style="' + lStyle + '">City</label>' +
      '<input type="text" class="closed-edit-field" data-field="city" value="' + escapeHtml(t.city || '') + '" placeholder="Santa Barbara" style="' + iStyle + '"></div>';
    html += '<div><label style="' + lStyle + '">State</label>' +
      '<input type="text" class="closed-edit-field" data-field="state" value="' + escapeHtml(t.state || '') + '" placeholder="CA" maxlength="2" style="' + iStyle + '"></div>';
    html += '<div><label style="' + lStyle + '">Zip</label>' +
      '<input type="text" class="closed-edit-field" data-field="zip" value="' + escapeHtml(t.zip || '') + '" placeholder="93101" maxlength="10" style="' + iStyle + '"></div>';

    // Agent
    html += '<div><label style="' + lStyle + '">Agent</label>' +
      '<select class="closed-edit-field" data-field="agent" style="' + iStyle + '">';
    users.forEach(function (u) {
      var name = u.displayName || u.username;
      html += '<option value="' + escapeHtml(name) + '"' + (name === t.agent ? ' selected' : '') + '>' + escapeHtml(name) + '</option>';
    });
    html += '</select></div>';

    // Close Date
    html += '<div><label style="' + lStyle + '">Close Date</label>' +
      '<input type="date" class="closed-edit-field" data-field="closeDate" value="' + (t.closeDate || '') + '" style="' + iStyle + '"></div>';

    // Sale Price
    var priceDisplay = t.price ? '$' + parseInt(t.price, 10).toLocaleString('en-US') : '';
    html += '<div><label style="' + lStyle + '">Sale Price</label>' +
      '<input type="text" class="closed-edit-field" data-field="price" value="' + priceDisplay + '" placeholder="$0" style="' + iStyle + '" oninput="var r=this.value.replace(/[^0-9]/g,\'\');this.value=r?\'$\'+parseInt(r,10).toLocaleString(\'en-US\'):\'\'"></div>';

    // Source — dropdown
    html += '<div><label style="' + lStyle + '">Lead Source</label>' +
      '<select class="closed-edit-field" data-field="source" style="' + iStyle + '">' +
      '<option value="">Select source...</option>';
    leadSources.forEach(function (s) {
      html += '<option value="' + escapeHtml(s) + '"' + (s === t.source ? ' selected' : '') + '>' + escapeHtml(s) + '</option>';
    });
    html += '</select></div>';

    // Type
    html += '<div><label style="' + lStyle + '">Transaction Type</label>' +
      '<select class="closed-edit-field" data-field="type" style="' + iStyle + '">' +
        '<option value="Buyer"' + (t.type === 'Buyer' ? ' selected' : '') + '>Buyer</option>' +
        '<option value="Seller"' + (t.type === 'Seller' ? ' selected' : '') + '>Seller</option>' +
        '<option value="Dual"' + (t.type === 'Dual' ? ' selected' : '') + '>Dual</option>' +
      '</select></div>';

    html += '</div>'; // grid

    html += '<div style="padding:0 20px 20px;display:flex;gap:8px;flex-wrap:wrap">';
    html += '<button class="btn btn-primary btn-sm" data-action="save-closed-edit" data-id="' + t.id + '">Save Changes</button>';
    html += '<button class="btn btn-outline btn-sm" data-action="reopen-txn" data-id="' + t.id + '" style="color:var(--indigo);border-color:var(--indigo)">Move to Pending</button>';
    html += '<button class="btn btn-outline btn-sm" data-action="delete-txn" data-id="' + t.id + '" style="color:var(--rose);border-color:var(--gray-200)">Delete</button>';
    html += '</div>';
    html += '</div>'; // edit card

    // ---- Buyer / Seller ----
    var hasBuyers = buyers.some(function (b) { return b.name || b.phone || b.email; });
    var hasSellers = sellers.some(function (s) { return s.name || s.phone || s.email; });

    if (hasBuyers || hasSellers) {
      html += '<div class="card" style="margin-bottom:16px">';
      html += '<div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);font-size:.92rem;font-weight:700;color:var(--gray-800)">Parties</div>';
      html += '<div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px">';

      function partyBlock(label, color, people) {
        var s = '<div><div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:' + color + '"></span>' +
          '<span style="font-size:.78rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px">' + label + '</span></div>';
        var filled = people.filter(function (p) { return p.name || p.phone || p.email; });
        if (filled.length === 0) {
          s += '<div style="font-size:.85rem;color:var(--gray-400);font-style:italic">No info on file</div>';
        } else {
          filled.forEach(function (p) {
            s += '<div style="margin-bottom:10px">';
            if (p.name) s += '<div style="font-size:.9rem;font-weight:700;color:var(--gray-900)">' + escapeHtml(p.name) + '</div>';
            if (p.phone) s += '<div style="font-size:.8rem;color:var(--gray-500)">' + escapeHtml(p.phone) + '</div>';
            if (p.email) s += '<div style="font-size:.8rem;color:var(--gray-500)">' + escapeHtml(p.email) + '</div>';
            s += '</div>';
          });
        }
        return s + '</div>';
      }

      html += partyBlock('Buyer', 'var(--indigo)', buyers);
      html += partyBlock('Seller', '#EC4899', sellers);
      html += '</div></div>';
    }

    pageBody.innerHTML = html;

    // Auto-save each field on change/blur — users were editing fields and
    // walking away without clicking "Save Changes", losing their edits.
    var autoSaveTxnId = t.id;
    function autoSaveField(input) {
      var field = input.getAttribute('data-field');
      if (!field) return;
      var val = input.value;
      if (field === 'price') val = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
      var update = {};
      update[field] = val;
      Data.updateTransaction(autoSaveTxnId, update);
      showToast('Saved');
    }
    pageBody.querySelectorAll('.closed-edit-field').forEach(function (inp) {
      var evt = inp.tagName === 'SELECT' || inp.type === 'date' ? 'change' : 'blur';
      inp.addEventListener(evt, function () { autoSaveField(inp); });
    });
  }

  // ============================================================
  //  EVENT DELEGATION
  // ============================================================
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.getAttribute('data-action');

    switch (action) {
      case 'time-filter':
        currentRange = target.getAttribute('data-range');
        render();
        break;

      case 'open-detail':
        selectedTxnId = target.getAttribute('data-id');
        viewMode = 'detail';
        window.scrollTo(0, 0);
        render();
        break;

      case 'back-to-list':
        viewMode = 'list';
        selectedTxnId = null;
        render();
        break;

      case 'save-closed-edit':
        var editId = target.getAttribute('data-id');
        var fields = document.querySelectorAll('.closed-edit-field');
        var updates = {};
        fields.forEach(function (f) {
          var field = f.getAttribute('data-field');
          var val = f.value;
          if (field === 'price') val = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
          updates[field] = val;
        });
        Data.updateTransaction(editId, updates);
        showToast('Changes saved!');
        renderDetail();
        break;

      case 'reopen-txn':
        var reopenId = target.getAttribute('data-id');
        Data.updateTransaction(reopenId, { status: 'pending', closeDate: '' });
        showToast('Moved back to pending — check Current Escrows.');
        viewMode = 'list';
        selectedTxnId = null;
        render();
        break;

      case 'delete-txn': {
        var deleteId = target.getAttribute('data-id');
        var deleteTxn = Data.getTransactions().find(function (t) { return t.id === deleteId; });
        var deleteAddr = deleteTxn ? deleteTxn.address : 'this transaction';
        var dcOverlay = document.createElement('div');
        dcOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
        dcOverlay.innerHTML =
          '<div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);text-align:center">' +
            '<div style="width:48px;height:48px;background:#FEE2E2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">' +
              '<svg viewBox="0 0 24 24" width="24" height="24" fill="#EF4444"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
            '</div>' +
            '<div style="font-size:1.1rem;font-weight:700;color:var(--gray-900);margin-bottom:8px">Delete Closed Deal?</div>' +
            '<div style="font-size:.88rem;color:var(--gray-500);margin-bottom:24px">' + escapeHtml(deleteAddr) + ' will be permanently deleted and cannot be recovered.</div>' +
            '<div style="display:flex;gap:10px;justify-content:center">' +
              '<button data-action="dc-cancel" style="flex:1;padding:10px;border:1.5px solid var(--gray-200);background:#fff;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;color:var(--gray-700)">Cancel</button>' +
              '<button data-action="dc-confirm" style="flex:1;padding:10px;background:#EF4444;border:none;border-radius:8px;font-size:.9rem;font-weight:600;cursor:pointer;color:#fff">Delete</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(dcOverlay);
        dcOverlay.addEventListener('click', function (ev) {
          var act = ev.target.closest('[data-action]');
          if (!act) return;
          if (act.getAttribute('data-action') === 'dc-confirm') {
            Data.deleteTransaction(deleteId);
            showToast('Transaction deleted.');
            viewMode = 'list';
            selectedTxnId = null;
            render();
          }
          document.body.removeChild(dcOverlay);
        });
        break;
      }
    }
  });

  // ---- Init ----
  render();

  // Re-render after bridge loads so closed deals from server are visible
  document.addEventListener('apiBridgeReady', function () {
    render();
  });

})();
