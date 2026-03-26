/* ============================================================
   RE Back Office — Dashboard Page
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

  // ---- Stat Cards ----
  var stats = Data.getStats();
  var statsGrid = document.getElementById('statsGrid');

  var cards = [
    {
      icon: '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>',
      color: 'indigo',
      value: stats.totalTxns,
      label: 'Total Transactions'
    },
    {
      icon: '<svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>',
      color: 'emerald',
      value: Data.formatCurrency(stats.totalVolume),
      label: 'Closed Volume'
    },
    {
      icon: '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
      color: 'amber',
      value: stats.activeListings,
      label: 'Active Listings'
    },
    {
      icon: '<svg viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>',
      color: 'violet',
      value: Data.formatCurrency(stats.avgDeal),
      label: 'Avg Deal Size'
    }
  ];

  statsGrid.innerHTML = cards.map(function (c) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + c.color + '">' + c.icon + '</div>' +
      '<div><div class="stat-value">' + c.value + '</div>' +
      '<div class="stat-label">' + c.label + '</div></div>' +
      '</div>';
  }).join('');

  // ---- Recent Transactions ----
  var recentEl = document.getElementById('recentTransactions');
  var txns = Data.getTransactions();

  // Sort by createdAt descending
  txns.sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  var recent = txns.slice(0, 5);

  if (recent.length === 0) {
    recentEl.innerHTML = '<div class="empty-state"><h3>No transactions yet</h3><p>Add your first transaction to get started.</p></div>';
  } else {
    recentEl.innerHTML = recent.map(function (t) {
      var cls = agentClass(t.agent);
      return '<a href="transactions.html" class="list-row">' +
        '<div class="agent-avatar ' + cls + '">' + getInitials(t.agent) + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:.88rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + t.address + '</div>' +
          '<div style="font-size:.75rem;color:var(--gray-400);">' + t.agent + ' &middot; ' + Data.formatDate(t.closeDate) + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:.88rem;font-weight:700;color:var(--gray-900);">' + Data.formatCurrencyFull(t.price) + '</div>' +
          Data.statusBadge(t.status) +
        '</div>' +
      '</a>';
    }).join('');
  }

  // ---- Upcoming Tasks ----
  var tasksEl = document.getElementById('upcomingTasks');
  var allTasks = Data.getTasks();

  var openTasks = allTasks.filter(function (t) {
    return t.status !== 'done';
  });

  openTasks.sort(function (a, b) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  var upcoming = openTasks.slice(0, 4);

  if (upcoming.length === 0) {
    tasksEl.innerHTML = '<div class="empty-state" style="padding:30px 20px;"><h3>All caught up!</h3><p>No pending tasks.</p></div>';
  } else {
    tasksEl.innerHTML = upcoming.map(function (t) {
      var overdue = t.dueDate && new Date(t.dueDate) < new Date();
      return '<div class="list-row">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:.85rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + t.title + '</div>' +
          '<div style="font-size:.75rem;color:' + (overdue ? 'var(--rose)' : 'var(--gray-400)') + ';">' +
            (t.dueDate ? 'Due ' + Data.formatDate(t.dueDate) : 'No due date') +
            (overdue ? ' (overdue)' : '') +
          '</div>' +
        '</div>' +
        Data.priorityBadge(t.priority) +
      '</div>';
    }).join('');
  }

})();
