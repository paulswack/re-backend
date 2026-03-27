/* ============================================================
   RE Back Office — Dashboard (Rich Widget Layout)
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

  var session = Auth.getSession();
  var stats = Data.getStats();
  var txns = Data.getTransactions();
  var listings = Data.getListings();
  var tasks = Data.getTasks();
  var users = JSON.parse(localStorage.getItem('reb_users') || '[]');
  var closedTxns = txns.filter(function (t) { return t.status === 'closed'; });
  var activeTxns = txns.filter(function (t) { return t.status === 'active'; });
  var pendingTxns = txns.filter(function (t) { return t.status === 'pending'; });
  var activeListings = listings.filter(function (l) { return l.status === 'active'; });

  // Greeting
  var hour = new Date().getHours();
  var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  var dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Tasks
  var openTasks = tasks.filter(function (t) { return t.status !== 'done'; });
  var overdueTasks = openTasks.filter(function (t) { return t.dueDate && new Date(t.dueDate) < new Date(); });

  // Tax
  var taxEntries = []; try { taxEntries = JSON.parse(localStorage.getItem('reb_tax_entries') || '[]'); } catch(e) {}
  var expenses = taxEntries.filter(function (e) { return e.type === 'expense'; });
  var totalExpenses = expenses.reduce(function (s, e) { return s + (e.amount || 0); }, 0);
  var commissionIncome = closedTxns.reduce(function (s, t) { return s + ((t.price || 0) * 0.03); }, 0);

  // Agent Goals (per-agent, team = sum of all)
  var allAgentGoals = JSON.parse(localStorage.getItem('reb_agent_goals') || '{}');
  // Seed defaults if empty
  if (Object.keys(allAgentGoals).length === 0) {
    users.forEach(function (u) {
      allAgentGoals[u.username] = { closings: 8, volume: 2000000, listings: 4 };
    });
    localStorage.setItem('reb_agent_goals', JSON.stringify(allAgentGoals));
  }
  var myGoals = allAgentGoals[session.username] || { closings: 0, volume: 0, listings: 0 };
  var teamGoals = { closings: 0, volume: 0, listings: 0 };
  Object.values(allAgentGoals).forEach(function (g) {
    teamGoals.closings += (g.closings || 0);
    teamGoals.volume += (g.volume || 0);
    teamGoals.listings += (g.listings || 0);
  });

  // My stats
  var myClosings = closedTxns.filter(function (t) { return t.agent === session.displayName; }).length;
  var myVolume = closedTxns.filter(function (t) { return t.agent === session.displayName; }).reduce(function (s, t) { return s + (t.price || 0); }, 0);
  var myListings = activeListings.filter(function (l) { return l.agent === session.displayName; }).length;

  var teamClosingsPct = teamGoals.closings ? Math.min(100, Math.round((closedTxns.length / teamGoals.closings) * 100)) : 0;
  var teamVolumePct = teamGoals.volume ? Math.min(100, Math.round((stats.totalVolume / teamGoals.volume) * 100)) : 0;
  var myClosingsPct = myGoals.closings ? Math.min(100, Math.round((myClosings / myGoals.closings) * 100)) : 0;
  var myVolumePct = myGoals.volume ? Math.min(100, Math.round((myVolume / myGoals.volume) * 100)) : 0;
  var myListingsPct = myGoals.listings ? Math.min(100, Math.round((myListings / myGoals.listings) * 100)) : 0;

  // Announcements
  var announcements = JSON.parse(localStorage.getItem('reb_announcements') || '[]');
  if (announcements.length === 0) {
    announcements = [
      { id: 'a1', text: 'Welcome to RE Back Office! Set your goals and start tracking.', author: 'System', timestamp: new Date().toISOString() },
    ];
    localStorage.setItem('reb_announcements', JSON.stringify(announcements));
  }

  // Agent leaderboard
  var agentStats = users.map(function (u) {
    var closed = closedTxns.filter(function (t) { return t.agent === u.displayName; });
    var vol = closed.reduce(function (s, t) { return s + (t.price || 0); }, 0);
    var active = txns.filter(function (t) { return t.agent === u.displayName && t.status !== 'closed'; });
    return { name: u.displayName, role: u.role, closings: closed.length, volume: vol, active: active.length };
  }).sort(function (a, b) { return b.volume - a.volume; });

  var body = document.querySelector('.page-body');

  body.innerHTML =
    // Welcome Banner
    '<div class="card" style="padding:0;overflow:hidden;margin-bottom:24px">' +
      '<div style="background:linear-gradient(135deg,#6366F1 0%,#8B5CF6 50%,#A78BFA 100%);padding:28px 32px;color:#fff;position:relative">' +
        '<div style="position:absolute;right:24px;top:50%;transform:translateY(-50%);opacity:.08;font-size:6rem;line-height:1">&#127968;</div>' +
        '<div style="font-size:.78rem;color:rgba(255,255,255,.6);margin-bottom:4px">' + dateStr + '</div>' +
        '<h2 style="font-size:1.4rem;font-weight:800;margin:0 0 6px">' + greeting + ', ' + (session ? session.displayName.split(' ')[0] : 'Agent') + '</h2>' +
        '<p style="font-size:.88rem;color:rgba(255,255,255,.7);margin:0">' +
          (closedTxns.length > 0 ? closedTxns.length + ' closed deal' + (closedTxns.length > 1 ? 's' : '') + ' · ' + Data.formatCurrencyFull(stats.totalVolume) + ' volume · ' + activeListings.length + ' active listing' + (activeListings.length !== 1 ? 's' : '') : 'Add transactions and listings to get started.') +
          (overdueTasks.length > 0 ? ' · <span style="color:#FCD34D;font-weight:600">' + overdueTasks.length + ' overdue task' + (overdueTasks.length > 1 ? 's' : '') + '</span>' : '') +
        '</p>' +
      '</div>' +
    '</div>' +

    // Stat Cards
    '<div class="stats-grid" style="margin-bottom:24px">' +
      statCard('indigo', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>', stats.totalTxns, 'Total Transactions') +
      statCard('emerald', '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>', Data.formatCurrency(stats.totalVolume), 'Closed Volume') +
      statCard('amber', '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>', stats.activeListings, 'Active Listings') +
      statCard('violet', '<path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>', Data.formatCurrency(stats.avgDeal), 'Avg Deal Size') +
    '</div>' +

    // 3-Column Widget Layout
    '<div style="display:grid;grid-template-columns:1fr 1fr 340px;gap:20px;align-items:start">' +

      // ===== COLUMN 1 =====
      '<div style="display:flex;flex-direction:column;gap:20px">' +

        // Goals
        widget('Goals', 'indigo', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>',
          '<div style="padding:16px 20px">' +
            goalBar('Team Closings', closedTxns.length, teamGoals.closings, teamClosingsPct, 'var(--indigo)') +
            goalBar('Team Volume', Data.formatCurrency(stats.totalVolume), Data.formatCurrency(teamGoals.volume), teamVolumePct, 'var(--emerald)') +
            '<div style="height:1px;background:var(--gray-100);margin:14px 0"></div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px"><span style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--gray-400)">' + session.displayName.split(' ')[0] + '\'s Goal</span><button class="btn btn-outline btn-sm" data-action="edit-goals" style="font-size:.72rem;padding:3px 10px">Edit</button></div>' +
            goalBar('My Closings', myClosings, myGoals.closings, myClosingsPct, 'var(--indigo)') +
            goalBar('My Volume', Data.formatCurrency(myVolume), Data.formatCurrency(myGoals.volume), myVolumePct, 'var(--emerald)') +
          '</div>', 'edit-goals-section') +

        // Recent Closed
        widget('Recent Closed', 'emerald', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>',
          (closedTxns.length === 0
            ? '<div style="padding:32px;text-align:center;color:var(--gray-400);font-size:.85rem">No closed deals yet.</div>'
            : closedTxns.slice(0, 4).map(function (t) {
                return listRow(t.agent, t.address.split(',')[0], t.agent, Data.formatCurrencyFull(t.price), Data.formatDate(t.closeDate));
              }).join('')),
          null, '<a href="transactions.html" class="btn btn-outline btn-sm" style="font-size:.72rem">View All</a>') +

        // Active Deals
        widget('Active Deals (' + (activeTxns.length + pendingTxns.length) + ')', 'indigo', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>',
          (activeTxns.concat(pendingTxns).length === 0
            ? '<div style="padding:32px;text-align:center;color:var(--gray-400);font-size:.85rem">No active deals.</div>'
            : activeTxns.concat(pendingTxns).slice(0, 4).map(function (t) {
                return '<a href="transactions.html" class="list-row" style="text-decoration:none;padding:10px 20px">' +
                  '<div style="flex:1;min-width:0"><div style="font-size:.85rem;font-weight:600;color:var(--gray-800)">' + t.address.split(',')[0] + '</div>' +
                  '<div style="font-size:.72rem;color:var(--gray-400)">' + t.agent + '</div></div>' +
                  '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:.85rem;font-weight:700">' + Data.formatCurrency(t.price) + '</span>' + Data.statusBadge(t.status) + '</div></a>';
              }).join(''))) +
      '</div>' +

      // ===== COLUMN 2 =====
      '<div style="display:flex;flex-direction:column;gap:20px">' +

        // Leaderboard Widget
        widget('Top Agents', 'amber', '<path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>',
          '<div style="padding:16px 20px">' +
            (function () {
              var maxVol = agentStats.length > 0 ? agentStats[0].volume : 1;
              var medals = ['&#127942;', '&#129352;', '&#129353;'];
              return agentStats.map(function (a, i) {
                var pct = maxVol > 0 ? Math.round((a.volume / maxVol) * 100) : 0;
                var barColors = ['var(--amber)', 'var(--gray-400)', '#CD7F32', 'var(--indigo)', 'var(--violet)'];
                return '<div style="margin-bottom:16px">' +
                  '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
                    '<div class="agent-avatar ' + agentClass(a.name) + '" style="width:36px;height:36px;font-size:.75rem;border-radius:8px">' + getInitials(a.name) + '</div>' +
                    '<div style="flex:1;min-width:0">' +
                      '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:.88rem;font-weight:700;color:var(--gray-900)">' + a.name + '</span>' + (i < 3 ? '<span style="font-size:.9rem">' + medals[i] + '</span>' : '') + '</div>' +
                      '<div style="font-size:.72rem;color:var(--gray-400)">' + a.role + '</div>' +
                    '</div>' +
                    '<div style="text-align:right">' +
                      '<div style="font-size:1rem;font-weight:800;color:var(--gray-900)">' + Data.formatCurrencyFull(a.volume) + '</div>' +
                      '<div style="font-size:.72rem;color:var(--gray-400)">' + a.closings + ' closed · ' + a.active + ' active</div>' +
                    '</div>' +
                  '</div>' +
                  '<div style="height:6px;background:var(--gray-100);border-radius:99px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + (barColors[i] || 'var(--gray-300)') + ';border-radius:99px;transition:width .4s"></div></div>' +
                '</div>';
              }).join('');
            })() +
          '</div>',
          null, '<a href="leaderboard.html" class="btn btn-outline btn-sm" style="font-size:.72rem">Full Rankings</a>') +

        // Listings
        widget('Active Listings', 'amber', '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>',
          (activeListings.length === 0
            ? '<div style="padding:32px;text-align:center;color:var(--gray-400);font-size:.85rem">No active listings.</div>'
            : activeListings.slice(0, 4).map(function (l) {
                return '<div class="list-row" style="padding:10px 20px">' +
                  '<div style="width:44px;height:32px;border-radius:6px;background:var(--gray-100);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--gray-300)"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>' +
                  '<div style="flex:1;min-width:0"><div style="font-size:.82rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + l.address.split(',')[0] + '</div>' +
                  '<div style="font-size:.7rem;color:var(--gray-400)">' + (l.beds || '—') + ' bd · ' + (l.baths || '—') + ' ba</div></div>' +
                  '<span style="font-size:.85rem;font-weight:700">' + Data.formatCurrency(l.price) + '</span>' +
                '</div>';
              }).join('')),
          null, '<a href="listings.html" class="btn btn-outline btn-sm" style="font-size:.72rem">View All</a>') +

        // Tax Snapshot
        widget('Tax Snapshot', 'violet', '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>',
          '<div style="padding:16px 20px">' +
            taxRow('Commission Income', Data.formatCurrencyFull(commissionIncome), 'var(--emerald)') +
            taxRow('Total Expenses', Data.formatCurrencyFull(totalExpenses), 'var(--rose)') +
            taxRow('Net Profit', Data.formatCurrencyFull(commissionIncome - totalExpenses), commissionIncome - totalExpenses >= 0 ? 'var(--indigo)' : 'var(--rose)') +
            taxRow('Est. Tax (25%)', Data.formatCurrencyFull(Math.max(0, (commissionIncome - totalExpenses) * 0.25)), 'var(--amber)') +
          '</div>',
          null, '<a href="tax-center.html" class="btn btn-outline btn-sm" style="font-size:.72rem">Tax Center</a>') +
      '</div>' +

      // ===== COLUMN 3 =====
      '<div style="display:flex;flex-direction:column;gap:20px">' +

        // Announcements
        widget('Announcements', 'rose', '<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>',
          '<div style="padding:12px 20px">' +
            (Auth.isPrivileged() ? '<div style="display:flex;gap:8px;margin-bottom:12px"><input type="text" id="announcementInput" placeholder="Post an announcement..." style="flex:1;padding:8px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.85rem"><button class="btn btn-primary btn-sm" data-action="post-announcement">Post</button></div>' : '') +
            (announcements.length === 0
              ? '<div style="text-align:center;color:var(--gray-400);font-size:.85rem;padding:12px 0">No announcements yet.</div>'
              : announcements.slice(0, 5).map(function (a) {
                  return '<div style="padding:8px 0;border-bottom:1px solid var(--gray-50)">' +
                    '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="font-size:.78rem;font-weight:700;color:var(--gray-700)">' + a.author + '</span><span style="font-size:.68rem;color:var(--gray-400)">' + timeAgo(a.timestamp) + '</span></div>' +
                    '<div style="font-size:.84rem;color:var(--gray-600);line-height:1.5">' + a.text + '</div>' +
                  '</div>';
                }).join('')) +
          '</div>') +

      '</div>' +
    '</div>';

  // ===== EVENT HANDLERS =====
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'post-announcement') {
      var input = document.getElementById('announcementInput');
      var text = input ? input.value.trim() : '';
      if (!text) { showToast('Type an announcement first.', 'error'); return; }
      var anns = JSON.parse(localStorage.getItem('reb_announcements') || '[]');
      anns.unshift({ id: Date.now().toString(36), text: text, author: session.displayName, timestamp: new Date().toISOString() });
      localStorage.setItem('reb_announcements', JSON.stringify(anns));
      showToast('Announcement posted.');
      location.reload();
    }

    if (action === 'edit-goals') {
      var ag = JSON.parse(localStorage.getItem('reb_agent_goals') || '{}');
      var mg = ag[session.username] || { closings: 8, volume: 2000000, listings: 4 };

      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay open';
      overlay.id = 'goalsModal';
      overlay.innerHTML =
        '<div class="modal" style="max-width:480px">' +
          '<div class="modal-header">' +
            '<h3>Set Your Annual Goals</h3>' +
            '<button class="modal-close" data-action="close-goals">&times;</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div style="background:var(--indigo-light);border-radius:12px;padding:16px;margin-bottom:20px">' +
              '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
                '<div class="stat-icon indigo" style="width:36px;height:36px;border-radius:10px"><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg></div>' +
                '<div><div style="font-size:.92rem;font-weight:700;color:var(--indigo)">Your Annual Targets</div>' +
                '<div style="font-size:.75rem;color:var(--gray-500)">These combine with other agents to form the team goal.</div></div>' +
              '</div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label style="display:flex;align-items:center;gap:8px"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--indigo)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>Closings Goal</label>' +
              '<input type="number" id="goalClosings" value="' + (mg.closings || 8) + '" min="0" style="font-size:1.1rem;font-weight:700;padding:12px 16px">' +
              '<div style="font-size:.72rem;color:var(--gray-400);margin-top:4px">Number of transactions you plan to close this year</div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label style="display:flex;align-items:center;gap:8px"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--emerald)"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>Volume Goal ($)</label>' +
              '<input type="number" id="goalVolume" value="' + (mg.volume || 2000000) + '" min="0" step="100000" style="font-size:1.1rem;font-weight:700;padding:12px 16px">' +
              '<div style="font-size:.72rem;color:var(--gray-400);margin-top:4px">Total dollar volume target for the year</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-outline" data-action="close-goals">Cancel</button>' +
            '<button class="btn btn-primary" data-action="save-goals">Save Goals</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
    }

    if (action === 'close-goals') {
      var modal = document.getElementById('goalsModal');
      if (modal) modal.remove();
    }

    if (action === 'save-goals') {
      var ag2 = JSON.parse(localStorage.getItem('reb_agent_goals') || '{}');
      ag2[session.username] = {
        closings: parseInt(document.getElementById('goalClosings').value) || 0,
        volume: parseInt(document.getElementById('goalVolume').value) || 0,
        listings: parseInt(document.getElementById('goalListings').value) || 0
      };
      localStorage.setItem('reb_agent_goals', JSON.stringify(ag2));
      showToast('Goals saved!');
      var modal = document.getElementById('goalsModal');
      if (modal) modal.remove();
      location.reload();
    }
  });

  // ===== HELPER FUNCTIONS =====
  function statCard(color, path, value, label) {
    return '<div class="stat-card"><div class="stat-icon ' + color + '"><svg viewBox="0 0 24 24">' + path + '</svg></div><div><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div></div>';
  }

  function widget(title, color, iconPath, content, id, rightEl) {
    return '<div class="card" style="padding:0"' + (id ? ' id="' + id + '"' : '') + '>' +
      '<div style="padding:14px 20px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;justify-content:space-between">' +
        '<div style="display:flex;align-items:center;gap:10px"><div class="stat-icon ' + color + '" style="width:32px;height:32px;border-radius:8px"><svg viewBox="0 0 24 24" style="width:16px;height:16px">' + iconPath + '</svg></div>' +
        '<h3 style="font-size:.92rem;font-weight:700;color:var(--gray-900);margin:0">' + title + '</h3></div>' +
        (rightEl || '') +
      '</div>' +
      content +
    '</div>';
  }

  function listRow(agent, title, subtitle, value, sub2) {
    return '<div class="list-row" style="padding:10px 20px">' +
      '<div class="agent-avatar ' + agentClass(agent) + '" style="width:32px;height:32px;font-size:.68rem;border-radius:6px">' + getInitials(agent) + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-size:.85rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + title + '</div>' +
      '<div style="font-size:.72rem;color:var(--gray-400)">' + subtitle + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:.88rem;font-weight:700;color:var(--gray-900)">' + value + '</div>' +
      '<div style="font-size:.68rem;color:var(--gray-400)">' + sub2 + '</div></div></div>';
  }

  function goalBar(label, current, target, pct, color) {
    return '<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:.82rem;font-weight:600;color:var(--gray-700)">' + label + '</span><span style="font-size:.78rem;color:var(--gray-400)">' + current + ' / ' + target + '</span></div>' +
      '<div style="height:8px;background:var(--gray-100);border-radius:99px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:99px;transition:width .4s"></div></div></div>';
  }

  function taxRow(label, value, color) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-50)">' +
      '<span style="font-size:.85rem;color:var(--gray-500)">' + label + '</span>' +
      '<span style="font-size:.88rem;font-weight:700;color:' + color + '">' + value + '</span></div>';
  }

  function podium(agent, rank, height, color) {
    return '<div style="text-align:center;flex:1">' +
      '<div class="agent-avatar ' + agentClass(agent.name) + '" style="width:40px;height:40px;font-size:.78rem;border-radius:10px;margin:0 auto 6px">' + getInitials(agent.name) + '</div>' +
      '<div style="font-size:.78rem;font-weight:700;color:var(--gray-800)">' + agent.name.split(' ')[0] + '</div>' +
      '<div style="font-size:.68rem;color:var(--gray-400)">' + Data.formatCurrency(agent.volume) + '</div>' +
      '<div style="height:' + height + ';background:linear-gradient(180deg,' + color + '22,' + color + '08);border-radius:8px 8px 0 0;margin-top:8px;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:' + color + '">' + rank + '</div>' +
    '</div>';
  }

  function quickAction(href, color, label) {
    return '<a href="' + href + '" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:var(--' + color + '-light);text-decoration:none">' +
      '<div class="stat-icon ' + color + '" style="width:32px;height:32px;border-radius:8px"><svg viewBox="0 0 24 24" style="width:15px;height:15px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></div>' +
      '<span style="font-size:.85rem;font-weight:600;color:var(--' + color + ')">' + label + '</span></a>';
  }

  function timeAgo(ts) {
    if (!ts) return '';
    var d = Math.round((Date.now() - new Date(ts).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 7) return d + 'd ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

})();
