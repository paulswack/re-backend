/* ============================================================
   RE Back Office — Dashboard (Portal-Quality)
   With drag-and-drop widget reordering
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('dashboard');
  document.getElementById('logoutBtn').addEventListener('click', function () { Auth.logout(); });

  var session = Auth.getSession();
  var txns = Data.getTransactions();
  var listings = Data.getListings();
  var users = JSON.parse(localStorage.getItem('reb_users') || '[]');
  var closedTxns = txns.filter(function (t) { return t.status === 'closed'; });
  var activeTxns = txns.filter(function (t) { return t.status === 'active'; });
  var pendingTxns = txns.filter(function (t) { return t.status === 'pending'; });
  var activeListings = listings.filter(function (l) { return l.status === 'active'; });
  var escrowCount = activeTxns.length + pendingTxns.length;
  var stats = Data.getStats();
  var isLead = Auth.isPrivileged();
  var closeRate = txns.length > 0 ? Math.round((closedTxns.length / txns.length) * 100) : 0;

  var hour = new Date().getHours();
  var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  var dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Tax (personal)
  var taxEntries = []; try { taxEntries = JSON.parse(localStorage.getItem('reb_tax_entries') || '[]'); } catch(e) {}
  var myTaxEntries = isLead ? taxEntries : taxEntries.filter(function (e) { return e.username === session.username || (!e.username && session.username === 'admin'); });
  var myClosedTxnsForTax = isLead ? closedTxns : closedTxns.filter(function (t) { return t.agent === session.displayName; });
  var expenses = myTaxEntries.filter(function (e) { return e.type === 'expense'; });
  var totalExpenses = expenses.reduce(function (s, e) { return s + (e.amount || 0); }, 0);
  var _dashCommRate = getAdminSetting('general.defaultCommissionRate', 0.03);
  var _dashTaxRate = getAdminSetting('general.estimatedTaxRate', 0.25);
  var commissionIncome = myClosedTxnsForTax.reduce(function (s, t) { return s + ((t.price || 0) * _dashCommRate); }, 0);

  // Goals
  var allAgentGoals = JSON.parse(localStorage.getItem('reb_agent_goals') || '{}');
  if (Object.keys(allAgentGoals).length === 0) {
    users.forEach(function (u) { allAgentGoals[u.username] = { closings: 8, volume: 2000000 }; });
    localStorage.setItem('reb_agent_goals', JSON.stringify(allAgentGoals));
  }
  var myGoals = allAgentGoals[session.username] || { closings: 8, volume: 2000000 };
  var teamGoals = { closings: 0, volume: 0 };
  Object.values(allAgentGoals).forEach(function (g) { teamGoals.closings += (g.closings || 0); teamGoals.volume += (g.volume || 0); });
  var myClosings = closedTxns.filter(function (t) { return t.agent === session.displayName; }).length;
  var myVolume = closedTxns.filter(function (t) { return t.agent === session.displayName; }).reduce(function (s, t) { return s + (t.price || 0); }, 0);

  // Leaderboard
  var agentStats = users.filter(function(u) { return u.role !== 'Assistant'; }).map(function (u) {
    var closed = closedTxns.filter(function (t) { return t.agent === u.displayName; });
    var vol = closed.reduce(function (s, t) { return s + (t.price || 0); }, 0);
    var active = txns.filter(function (t) { return t.agent === u.displayName && t.status !== 'closed'; });
    return { name: u.displayName, role: u.role, closings: closed.length, volume: vol, active: active.length };
  }).sort(function (a, b) { return b.volume - a.volume; });

  // Announcements
  var announcements = JSON.parse(localStorage.getItem('reb_announcements') || '[]');
  if (announcements.length === 0) {
    announcements = [{ id: 'a1', text: 'Welcome to RE Back Office!', author: 'System', timestamp: new Date().toISOString() }];
    localStorage.setItem('reb_announcements', JSON.stringify(announcements));
  }

  // ============================================================
  // DRAG HANDLE SVG (6-dot grip icon)
  // ============================================================
  var DRAG_HANDLE_SVG = '<svg viewBox="0 0 16 16"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>';

  // ============================================================
  // WIDGET REGISTRY — each widget has an ID and render function
  // ============================================================
  var WIDGETS = {};

  WIDGETS.goals = function () {
    var s = '';
    s += widgetOpen('goals', 'Goals', 'var(--indigo)', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>', '<button class="btn btn-outline btn-sm" data-action="edit-goals" style="font-size:.7rem;padding:3px 8px">Edit</button>');
    s += '<div class="dash-widget-body" style="padding:18px 20px">';
    s += goal('Team Closings', closedTxns.length, teamGoals.closings, 'var(--indigo)');
    s += goal('Team Volume', Data.formatCurrency(stats.totalVolume), Data.formatCurrency(teamGoals.volume), 'var(--emerald)');
    s += '<div style="height:1px;background:var(--gray-100);margin:12px 0"></div>';
    s += '<div style="font-size:.68rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">' + session.displayName.split(' ')[0] + '\'s Goal</div>';
    s += goal('My Closings', myClosings, myGoals.closings, 'var(--indigo)');
    s += goal('My Volume', Data.formatCurrency(myVolume), Data.formatCurrency(myGoals.volume), 'var(--emerald)');
    s += '</div></div>';
    return s;
  };

  WIDGETS.recentClosed = function () {
    var s = '';
    s += widgetOpen('recentClosed', 'Recent Closed', 'var(--emerald)', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>', '<a href="closed.html" class="btn btn-outline btn-sm" style="font-size:.7rem;padding:3px 8px">View All</a>');
    if (closedTxns.length === 0) { s += '<div style="padding:32px;text-align:center;color:var(--gray-400);font-size:.85rem">No closed deals yet.</div>'; }
    else { closedTxns.slice(0, 4).forEach(function (t) { s += agentRow(t); }); }
    s += '</div>';
    return s;
  };

  WIDGETS.currentEscrows = function () {
    var s = '';
    s += widgetOpen('currentEscrows', 'Current Escrows (' + escrowCount + ')', 'var(--indigo)', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>', '<a href="transactions.html" class="btn btn-outline btn-sm" style="font-size:.7rem;padding:3px 8px">View All</a>');
    if (escrowCount === 0) { s += '<div style="padding:32px;text-align:center;color:var(--gray-400);font-size:.85rem">No active escrows.</div>'; }
    else { activeTxns.concat(pendingTxns).slice(0, 4).forEach(function (t) {
      s += '<a href="transactions.html" class="list-row" style="text-decoration:none;padding:10px 20px">' +
        '<div style="flex:1;min-width:0"><div style="font-size:.85rem;font-weight:600;color:var(--gray-800)">' + t.address.split(',')[0] + '</div>' +
        '<div style="font-size:.7rem;color:var(--gray-400)">' + t.agent + '</div></div>' +
        '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:.85rem;font-weight:700">' + Data.formatCurrency(t.price) + '</span>' + Data.statusBadge(t.status) + '</div></a>';
    }); }
    s += '</div>';
    return s;
  };

  WIDGETS.top5 = function () {
    var s = '';
    s += widgetOpen('top5', 'Top 5 Agents', 'var(--amber)', '<path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>', '<a href="leaderboard.html" class="btn btn-outline btn-sm" style="font-size:.7rem;padding:3px 8px">Full Rankings</a>');
    s += '<div class="dash-widget-body" style="padding:16px 20px">';
    var maxVol = agentStats.length > 0 ? agentStats[0].volume : 1;
    var medals = ['&#127942;', '&#129352;', '&#129353;'];
    var barColors = ['var(--amber)', 'var(--gray-400)', '#CD7F32', 'var(--indigo)', 'var(--violet)'];
    agentStats.slice(0, 5).forEach(function (a, i) {
      var pct = maxVol > 0 ? Math.round((a.volume / maxVol) * 100) : 0;
      s += '<div style="margin-bottom:14px">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">' +
          '<div class="agent-avatar ' + agentClass(a.name) + '" style="width:32px;height:32px;font-size:.7rem;">' + getInitials(a.name) + '</div>' +
          '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px"><span style="font-size:.85rem;font-weight:700;color:var(--gray-900)">' + a.name + '</span>' + (i < 3 ? '<span style="font-size:.85rem">' + medals[i] + '</span>' : '') + '</div>' +
          '<div style="font-size:.7rem;color:var(--gray-400)">' + a.closings + ' closed · ' + a.active + ' in escrow</div></div>' +
          '<div style="text-align:right"><div style="font-size:.95rem;font-weight:800;color:var(--gray-900)">' + Data.formatCurrency(a.volume) + '</div></div></div>' +
        '<div class="dash-goal-bar"><div class="dash-goal-fill" style="width:' + pct + '%;background:' + (barColors[i] || 'var(--gray-300)') + '"></div></div></div>';
    });
    s += '</div></div>';
    return s;
  };

  WIDGETS.activeListings = function () {
    var s = '';
    s += widgetOpen('activeListings', 'Active Listings', 'var(--amber)', '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>', '<a href="listings.html" class="btn btn-outline btn-sm" style="font-size:.7rem;padding:3px 8px">View All</a>');
    if (activeListings.length === 0) { s += '<div style="padding:32px;text-align:center;color:var(--gray-400);font-size:.85rem">No active listings.</div>'; }
    else { activeListings.slice(0, 4).forEach(function (l) {
      s += '<div class="list-row" style="padding:10px 20px">' +
        '<div style="width:44px;height:32px;border-radius:6px;background:var(--gray-100);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gray-300)"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>' +
        '<div style="flex:1;min-width:0"><div style="font-size:.85rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + l.address.split(',')[0] + '</div>' +
        '<div style="font-size:.7rem;color:var(--gray-400)">' + (l.beds||'—') + ' bd · ' + (l.baths||'—') + ' ba · ' + (l.sqft ? l.sqft.toLocaleString()+' sqft' : '') + '</div></div>' +
        '<span style="font-size:.88rem;font-weight:700">' + Data.formatCurrency(l.price) + '</span></div>';
    }); }
    s += '</div>';
    return s;
  };

  WIDGETS.announcements = function () {
    var s = '';
    s += widgetOpen('announcements', 'Announcements', 'var(--rose)', '<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>', null);
    s += '<div class="dash-widget-body" style="padding:14px 20px">';
    if (isLead) {
      s += '<div style="display:flex;gap:8px;margin-bottom:14px"><input type="text" id="announcementInput" placeholder="Post an announcement..." style="flex:1;padding:9px 14px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem;font-family:inherit"><button class="btn btn-primary btn-sm" data-action="post-announcement">Post</button></div>';
    }
    announcements.slice(0, 5).forEach(function (a) {
      s += '<div style="padding:10px 0;border-bottom:1px solid var(--gray-50)">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:.82rem;font-weight:700;color:var(--gray-700)">' + a.author + '</span><span style="font-size:.68rem;color:var(--gray-400)">' + timeAgo(a.timestamp) + '</span></div>' +
        '<div style="font-size:.85rem;color:var(--gray-600);line-height:1.5">' + a.text + '</div></div>';
    });
    s += '</div></div>';
    return s;
  };

  WIDGETS.volumeSummary = function () {
    var s = '';
    s += '<div class="dash-widget" data-widget-id="volumeSummary" draggable="true">' +
      '<div class="dash-widget-header"><div class="dash-widget-header-left">' +
        '<div class="dash-widget-drag">' + DRAG_HANDLE_SVG + '</div>' +
        '<h3 class="dash-widget-title">Volume Summary</h3></div></div>' +
      '<div class="dash-widget-body" style="padding:14px 20px">' +
        sumRow('Closed Volume', Data.formatCurrencyFull(stats.totalVolume), 'var(--emerald)') +
        sumRow('Escrow Volume', Data.formatCurrencyFull(activeTxns.concat(pendingTxns).reduce(function(s,t){return s+(t.price||0)},0)), 'var(--indigo)') +
        sumRow('Listing Value', Data.formatCurrencyFull(activeListings.reduce(function(s,l){return s+(l.price||0)},0)), 'var(--amber)') +
        sumRow('Avg Deal Size', Data.formatCurrencyFull(stats.avgDeal), 'var(--violet)') +
      '</div></div>';
    return s;
  };

  // ============================================================
  // DEFAULT LAYOUT & LAYOUT PERSISTENCE
  // ============================================================
  var DEFAULT_LAYOUT = {
    col1: ['goals', 'recentClosed', 'currentEscrows'],
    col2: ['top5', 'activeListings'],
    col3: ['announcements', 'volumeSummary']
  };

  function loadLayout() {
    try {
      var saved = JSON.parse(localStorage.getItem('reb_dash_layout'));
      if (saved && saved.col1 && saved.col2 && saved.col3) {
        // Validate all widget IDs exist
        var allIds = saved.col1.concat(saved.col2).concat(saved.col3);
        var validIds = Object.keys(WIDGETS);
        var allValid = allIds.every(function (id) { return validIds.indexOf(id) !== -1; });
        // Make sure all widgets are accounted for
        var allPresent = validIds.every(function (id) { return allIds.indexOf(id) !== -1; });
        if (allValid && allPresent && allIds.length === validIds.length) {
          return saved;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  }

  function saveLayout(layout) {
    localStorage.setItem('reb_dash_layout', JSON.stringify(layout));
  }

  // ============================================================
  // RENDER DASHBOARD
  // ============================================================
  function renderDashboard() {
    var layout = loadLayout();
    var body = document.querySelector('.page-body');
    var h = '';

    // WELCOME
    h += '<div class="dash-welcome">' +
      '<div class="dash-welcome-text">' +
        '<div class="dash-welcome-date">' + dateStr + '</div>' +
        '<h2>' + greeting + ', ' + (session ? session.displayName.split(' ')[0] : 'Agent') + '</h2>' +
        '<p>Here\'s what\'s happening across your team today</p>' +
      '</div>' +
    '</div>';

    // CUSTOMIZE BUTTON (Team Lead only) — right after welcome banner
    if (isLead) {
      h += '<div style="display:flex;justify-content:flex-end;margin-bottom:12px">' +
        '<button class="btn btn-outline btn-sm" data-action="toggle-edit-mode" style="font-size:.78rem;color:var(--gold);border-color:var(--gold)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:4px"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>Customize</button>' +
      '</div>';
    }

    // STAT CARDS
    h += '<div class="stats-grid" style="margin-bottom:28px">';
    h += dashStat('Total Closed', closedTxns.length, '#ECFDF5', 'var(--emerald)', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>', closeRate + '% close rate', 'up');
    h += dashStat('Current Escrows', escrowCount, '#EEF2FF', 'var(--indigo)', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>', activeTxns.length + ' active · ' + pendingTxns.length + ' pending', 'neutral');
    h += dashStat('Active Listings', activeListings.length, '#FFFBEB', 'var(--amber)', '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>', Data.formatCurrency(activeListings.reduce(function(s,l){return s+(l.price||0)},0)) + ' total value', 'up');
    h += '</div>';

    // TAX STRIP (agents only)
    if (!isLead) {
      h += '<div class="dash-tax-strip">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-shrink:0">' +
          '<div style="width:36px;height:36px;border-radius:10px;background:var(--indigo);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>' +
          '<div><div style="font-size:.85rem;font-weight:700;color:var(--gray-900)">Tax Snapshot</div><div style="font-size:.68rem;color:var(--gray-400)">YTD</div></div></div>' +
        '<div class="dash-tax-values">' +
          taxCell(Data.formatCurrencyFull(commissionIncome), 'Income', 'var(--emerald)') +
          taxCell(Data.formatCurrencyFull(totalExpenses), 'Expenses', 'var(--rose)') +
          taxCell(Data.formatCurrencyFull(commissionIncome - totalExpenses), 'Net', commissionIncome - totalExpenses >= 0 ? 'var(--indigo)' : 'var(--rose)') +
          taxCell(Data.formatCurrencyFull(Math.max(0, (commissionIncome - totalExpenses) * _dashTaxRate)), 'Est. Tax', 'var(--amber)') +
        '</div>' +
        '<a href="tax-center.html" class="btn btn-outline btn-sm" style="font-size:.75rem;flex-shrink:0;border-color:var(--indigo);color:var(--indigo)">Details</a>' +
      '</div>';
    }

    h += '<div class="dash-grid" id="dashGrid">';

    // Render columns based on layout
    var colKeys = ['col1', 'col2', 'col3'];
    colKeys.forEach(function (colKey, colIdx) {
      h += '<div class="dash-col" data-col="' + colIdx + '">';
      layout[colKey].forEach(function (widgetId) {
        if (WIDGETS[widgetId]) {
          h += WIDGETS[widgetId]();
        }
      });
      h += '</div>';
    });

    h += '</div>'; // grid

    body.innerHTML = h;

    // Initialize drag and drop after rendering
    initDashDragDrop();
  }

  // ============================================================
  // widgetOpen — like the old widget() but adds data-widget-id, draggable, and drag handle
  // ============================================================
  function widgetOpen(id, title, color, path, rightEl) {
    return '<div class="dash-widget" data-widget-id="' + id + '" draggable="true"><div class="dash-widget-header"><div class="dash-widget-header-left">' +
      '<div class="dash-widget-drag">' + DRAG_HANDLE_SVG + '</div>' +
      '<h3 class="dash-widget-title">' + title + '</h3></div>' + (rightEl || '') + '</div>';
  }

  // ============================================================
  // DRAG AND DROP
  // ============================================================
  function initDashDragDrop() {
    var grid = document.getElementById('dashGrid');
    if (!grid) return;

    var dragWidget = null;
    var dragSourceCol = null;

    var widgets = grid.querySelectorAll('.dash-widget[draggable="true"]');

    widgets.forEach(function (w) {
      // Only allow drag to start from the drag handle
      var handle = w.querySelector('.dash-widget-drag');
      if (handle) {
        handle.addEventListener('mousedown', function () {
          w.setAttribute('data-drag-ready', 'true');
        });
      }

      w.addEventListener('dragstart', function (e) {
        if (w.getAttribute('data-drag-ready') !== 'true') {
          e.preventDefault();
          return;
        }
        dragWidget = w;
        dragSourceCol = w.closest('.dash-col');
        w.classList.add('dw-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', w.getAttribute('data-widget-id'));
      });

      w.addEventListener('dragend', function () {
        w.classList.remove('dw-dragging');
        w.removeAttribute('data-drag-ready');
        dragWidget = null;
        dragSourceCol = null;
        // Clean up all drag-over classes
        grid.querySelectorAll('.dw-drag-over').forEach(function (el) { el.classList.remove('dw-drag-over'); });
        grid.querySelectorAll('.dw-col-over').forEach(function (el) { el.classList.remove('dw-col-over'); });
      });

      w.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (w !== dragWidget) {
          w.classList.add('dw-drag-over');
        }
      });

      w.addEventListener('dragleave', function () {
        w.classList.remove('dw-drag-over');
      });

      w.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        w.classList.remove('dw-drag-over');
        if (!dragWidget || w === dragWidget) return;

        // Get the target column and position
        var targetCol = w.closest('.dash-col');
        targetCol.insertBefore(dragWidget, w);

        // Save new layout from current DOM order
        saveDOMLayout();
      });
    });

    // Allow dropping on empty columns
    var cols = grid.querySelectorAll('.dash-col');
    cols.forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Only show col-over if no widget children have drag-over
        var hasChildOver = col.querySelector('.dw-drag-over');
        if (!hasChildOver && dragWidget && !col.contains(dragWidget)) {
          col.classList.add('dw-col-over');
        }
      });

      col.addEventListener('dragleave', function (e) {
        // Only remove if actually leaving the column
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('dw-col-over');
        }
      });

      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('dw-col-over');
        if (!dragWidget) return;

        // If dropped on the column itself (not on a widget), append to end
        if (e.target === col || e.target.classList.contains('dash-col')) {
          col.appendChild(dragWidget);
          saveDOMLayout();
        }
      });
    });
  }

  // Read current layout from DOM and persist
  function saveDOMLayout() {
    var grid = document.getElementById('dashGrid');
    if (!grid) return;
    var cols = grid.querySelectorAll('.dash-col');
    var layout = { col1: [], col2: [], col3: [] };
    var colKeys = ['col1', 'col2', 'col3'];
    cols.forEach(function (col, idx) {
      var key = colKeys[idx];
      if (!key) return;
      col.querySelectorAll('.dash-widget[data-widget-id]').forEach(function (w) {
        layout[key].push(w.getAttribute('data-widget-id'));
      });
    });
    saveLayout(layout);
  }

  // ============================================================
  // INITIAL RENDER
  // ============================================================
  renderDashboard();

  // ============================================================
  // EVENTS
  // ============================================================
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'post-announcement') {
      var input = document.getElementById('announcementInput');
      if (!input || !input.value.trim()) { showToast('Type something first.', 'error'); return; }
      var anns = JSON.parse(localStorage.getItem('reb_announcements') || '[]');
      anns.unshift({ id: Date.now().toString(36), text: input.value.trim(), author: session.displayName, timestamp: new Date().toISOString() });
      localStorage.setItem('reb_announcements', JSON.stringify(anns));
      showToast('Posted!'); location.reload();
    }

    if (action === 'toggle-edit-mode') {
      var gridEl = document.getElementById('dashGrid');
      if (gridEl) {
        gridEl.classList.toggle('dash-edit-mode');
        btn.classList.toggle('active');
        var isActive = btn.classList.contains('active');
        btn.innerHTML = isActive
          ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Done'
          : '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Customize';
      }
    }

    if (action === 'edit-goals') {
      var mg = allAgentGoals[session.username] || { closings: 8, volume: 2000000 };
      var ov = document.createElement('div'); ov.className = 'modal-overlay open'; ov.id = 'goalsModal';
      ov.innerHTML = '<div class="modal" style="max-width:480px"><div class="modal-header"><h3>Set Your Annual Goals</h3><button class="modal-close" data-action="close-goals">&times;</button></div>' +
        '<div class="modal-body"><div style="background:var(--indigo-light);border-radius:12px;padding:14px;margin-bottom:18px;display:flex;align-items:center;gap:10px"><div class="stat-icon indigo" style="width:32px;height:32px;border-radius:8px"><svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg></div><div><div style="font-size:.85rem;font-weight:700;color:var(--indigo)">Your Annual Targets</div><div style="font-size:.7rem;color:var(--gray-500)">Combined with team for total goal.</div></div></div>' +
        '<div class="form-group"><label>Closings Goal</label><input type="number" id="goalClosings" value="' + (mg.closings||8) + '" min="0" style="font-size:1.05rem;font-weight:700;padding:12px 16px"></div>' +
        '<div class="form-group"><label>Volume Goal</label><input type="number" id="goalVolume" value="' + (mg.volume||2000000) + '" min="0" step="50000" style="font-size:1.05rem;font-weight:700;padding:12px 16px" placeholder="e.g. 2000000"><div id="goalVolumePreview" style="font-size:.85rem;font-weight:700;color:var(--indigo);margin-top:6px">' + Data.formatCurrency(mg.volume||2000000) + '</div></div></div>' +
        '<div class="modal-footer"><button class="btn btn-outline" data-action="close-goals">Cancel</button><button class="btn btn-primary" data-action="save-goals">Save</button></div></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function(ev) { if (ev.target === ov) ov.remove(); });
      document.getElementById('goalVolume').addEventListener('input', function() {
        document.getElementById('goalVolumePreview').textContent = Data.formatCurrency(parseInt(this.value) || 0);
      });
    }
    if (action === 'close-goals') { var m = document.getElementById('goalsModal'); if (m) m.remove(); }
    if (action === 'save-goals') {
      var ag = JSON.parse(localStorage.getItem('reb_agent_goals') || '{}');
      ag[session.username] = { closings: parseInt(document.getElementById('goalClosings').value)||0, volume: parseInt(document.getElementById('goalVolume').value)||0 };
      localStorage.setItem('reb_agent_goals', JSON.stringify(ag));
      showToast('Goals saved!');
      var m = document.getElementById('goalsModal'); if (m) m.remove(); location.reload();
    }
  });

  // HELPERS
  function dashStat(label, value, bg, color, path, delta, deltaType) {
    return '<div class="dash-stat"><div class="dash-stat-icon" style="background:' + bg + ';color:' + color + '"><svg viewBox="0 0 24 24">' + path + '</svg></div>' +
      '<div><div class="dash-stat-value">' + value + '</div><div class="dash-stat-label">' + label + '</div>' +
      '<div class="dash-stat-delta ' + deltaType + '">&#8593; ' + delta + '</div></div></div>';
  }

  function goal(label, current, target, color) {
    var pct = 0;
    if (typeof target === 'number' && target > 0) pct = Math.min(100, Math.round((typeof current === 'number' ? current : 0) / target * 100));
    return '<div class="dash-goal"><div class="dash-goal-header"><span class="dash-goal-label">' + label + '</span><span class="dash-goal-values">' + current + ' / ' + target + '</span></div>' +
      '<div class="dash-goal-bar"><div class="dash-goal-fill" style="width:' + pct + '%;background:' + color + '"></div></div></div>';
  }

  function taxCell(val, label, color) {
    return '<div class="dash-tax-cell"><div class="dash-tax-cell-value" style="color:' + color + '">' + val + '</div><div class="dash-tax-cell-label">' + label + '</div></div>';
  }

  function agentRow(t) {
    return '<div class="list-row" style="padding:10px 20px">' +
      '<div class="agent-avatar ' + agentClass(t.agent) + '" style="width:30px;height:30px;font-size:.65rem;">' + getInitials(t.agent) + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-size:.85rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + t.address.split(',')[0] + '</div>' +
      '<div style="font-size:.7rem;color:var(--gray-400)">' + t.agent + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:.88rem;font-weight:700;color:var(--gray-900)">' + Data.formatCurrencyFull(t.price) + '</div>' +
      '<div style="font-size:.68rem;color:var(--gray-400)">' + Data.formatDate(t.closeDate) + '</div></div></div>';
  }

  function sumRow(label, val, color) {
    return '<div class="dash-summary-row"><span class="dash-summary-label">' + label + '</span><span class="dash-summary-value" style="color:' + color + '">' + val + '</span></div>';
  }

  function timeAgo(ts) {
    if (!ts) return '';
    var d = Math.round((Date.now() - new Date(ts).getTime()) / 86400000);
    if (d === 0) return 'Today'; if (d === 1) return 'Yesterday'; if (d < 7) return d + 'd ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

})();
