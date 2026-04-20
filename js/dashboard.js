/* ============================================================
   RE Back Office — Dashboard (Portal-Quality)
   With drag-and-drop widget reordering
   Includes full team leaderboard, upcoming closings, deal sources
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('dashboard');
  document.getElementById('logoutBtn').addEventListener('click', function () { Auth.logout(); });

  var session, txns, listings, users, closedTxns, activeTxns, pendingTxns, activeListings;
  var escrowCount, stats, isLead, closeRate;
  var greeting, dateStr;
  var taxEntries, myTaxEntries, expenses, totalExpenses;
  var _dashTaxRate, manualIncome;
  var allAgentGoals, myGoals, teamGoals, myClosings, myVolume;
  var agentStats;
  var _lbRange = 'year'; // leaderboard time filter

  // Dual rep counts as 2 deals, volume counts once
  function countDeals(arr) {
    return arr.reduce(function (sum, t) { return sum + (t.type === 'Dual' ? 2 : 1); }, 0);
  }

  // Filter transactions by date range for leaderboard
  function filterByRange(arr) {
    if (_lbRange === 'all') return arr;
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var quarter = Math.floor(month / 3);
    return arr.filter(function (t) {
      if (!t.closeDate) return false;
      var d = new Date(t.closeDate);
      if (isNaN(d.getTime())) return false;
      if (_lbRange === 'year') return d.getFullYear() === year;
      if (_lbRange === 'quarter') return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === quarter;
      if (_lbRange === 'month') return d.getFullYear() === year && d.getMonth() === month;
      return true;
    });
  }

  function reloadData() {
    var _apiUser = (typeof API !== 'undefined' && API.isLoggedIn()) ? API.getUser() : null;
    session = _apiUser
      ? { username: _apiUser.username, displayName: _apiUser.displayName, role: _apiUser.role }
      : Auth.getSession();
    isLead = _apiUser ? (_apiUser.role === 'Team Lead') : Auth.isPrivileged();
    txns = Data.getTransactions();
    listings = Data.getListings();
    users = JSON.parse(localStorage.getItem('reb_users') || '[]');
    closedTxns = txns.filter(function (t) { return t.status === 'closed'; });
    activeTxns = txns.filter(function (t) { return t.status === 'active'; });
    pendingTxns = txns.filter(function (t) { return t.status === 'pending'; });
    activeListings = listings.filter(function (l) { return l.status === 'active'; });
    escrowCount = activeTxns.length + pendingTxns.length;
    stats = Data.getStats();
    closeRate = txns.length > 0 ? Math.round((closedTxns.length / txns.length) * 100) : 0;

    var hour = new Date().getHours();
    greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    taxEntries = []; try { taxEntries = JSON.parse(localStorage.getItem('reb_tax_entries') || '[]'); } catch(e) {}
    myTaxEntries = isLead ? taxEntries : taxEntries.filter(function (e) { return session && (e.username === session.username || (!e.username && session.username === 'admin')); });
    expenses = myTaxEntries.filter(function (e) { return e.type === 'expense'; });
    totalExpenses = expenses.reduce(function (s, e) { return s + (e.amount || 0); }, 0);
    _dashTaxRate = getAdminSetting('general.estimatedTaxRate', 0.25);
    manualIncome = myTaxEntries.filter(function (e) { return e.type === 'income'; }).reduce(function (s, e) { return s + (e.amount || 0); }, 0);

    allAgentGoals = JSON.parse(localStorage.getItem('reb_agent_goals') || '{}');
    if (Object.keys(allAgentGoals).length === 0) {
      users.forEach(function (u) { allAgentGoals[u.username] = { closings: 8, volume: 2000000 }; });
      localStorage.setItem('reb_agent_goals', JSON.stringify(allAgentGoals));
    }
    myGoals = session ? (allAgentGoals[session.username] || { closings: 8, volume: 2000000 }) : { closings: 8, volume: 2000000 };
    teamGoals = { closings: 0, volume: 0 };
    Object.values(allAgentGoals).forEach(function (g) { teamGoals.closings += (g.closings || 0); teamGoals.volume += (g.volume || 0); });
    myClosings = countDeals(closedTxns.filter(function (t) { return session && t.agent === session.displayName; }));
    myVolume = closedTxns.filter(function (t) { return session && t.agent === session.displayName; }).reduce(function (s, t) { return s + (t.price || 0); }, 0);

    // Build full agent stats (used by leaderboard widgets)
    var rangedClosed = filterByRange(txns).filter(function (t) { return t.status === 'closed'; });
    var agentNames = {};
    users.forEach(function (u) { if (u.displayName && u.role !== 'Assistant') agentNames[u.displayName] = true; });
    txns.forEach(function (t) { if (t.agent) agentNames[t.agent] = true; });
    listings.forEach(function (l) { if (l.agent) agentNames[l.agent] = true; });

    agentStats = Object.keys(agentNames).map(function (name) {
      var closed = rangedClosed.filter(function (t) { return t.agent === name; });
      var vol = closed.reduce(function (s, t) { return s + (t.price || 0); }, 0);
      var active = txns.filter(function (t) { return t.agent === name && t.status === 'active'; });
      var pending = txns.filter(function (t) { return t.agent === name && t.status === 'pending'; });
      var agentListings = listings.filter(function (l) { return l.agent === name && l.status === 'active'; });
      var closedCount = countDeals(closed);
      return {
        name: name, closings: closedCount, volume: vol,
        avgDeal: closedCount > 0 ? vol / closedCount : 0,
        active: active.length, pending: pending.length,
        listings: agentListings.length
      };
    }).sort(function (a, b) {
      if (b.closings !== a.closings) return b.closings - a.closings;
      return b.volume - a.volume;
    });
  }

  reloadData();

  // Clear stale layout so server layout wins when apiBridgeReady fires
  localStorage.removeItem('reb_dash_layout');

  document.addEventListener('apiBridgeReady', function () {
    reloadData();
    renderDashboard();
  });

  var DRAG_HANDLE_SVG = '<svg viewBox="0 0 16 16"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>';

  // ============================================================
  // WIDGET REGISTRY
  // ============================================================
  var WIDGETS = {};

  // ---- Goals ----
  WIDGETS.goals = function () {
    var s = widgetOpen('goals', 'Goals', 'var(--indigo)', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>', '<button class="btn btn-outline btn-sm" data-action="edit-goals" style="font-size:.7rem;padding:3px 8px">Edit</button>');
    s += '<div class="dash-widget-body" style="padding:18px 20px">';
    s += goal('Team Closings', countDeals(closedTxns), teamGoals.closings, 'var(--indigo)');
    s += goal('Team Volume', Data.formatCurrency(stats.totalVolume), Data.formatCurrency(teamGoals.volume), 'var(--emerald)');
    s += '<div style="height:1px;background:var(--gray-100);margin:12px 0"></div>';
    s += '<div style="font-size:.68rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">' + session.displayName.split(' ')[0] + '\'s Goal</div>';
    s += goal('My Closings', myClosings, myGoals.closings, 'var(--indigo)');
    s += goal('My Volume', Data.formatCurrency(myVolume), Data.formatCurrency(myGoals.volume), 'var(--emerald)');
    s += '</div></div>';
    return s;
  };

  // ---- Team Rankings (replaces old top5 + full leaderboard) ----
  WIDGETS.teamRankings = function () {
    var s = widgetOpen('teamRankings', 'Team Rankings', 'var(--amber)', '<path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/>', null);
    s += '<div class="dash-widget-body" style="padding:0">';

    // Time filter
    s += '<div class="lb-time-filter" style="padding:14px 20px 0;margin-bottom:0">';
    ['all', 'year', 'quarter', 'month'].forEach(function (range) {
      var labels = { all: 'All Time', year: 'This Year', quarter: 'This Quarter', month: 'This Month' };
      s += '<button class="lb-filter-btn' + (_lbRange === range ? ' active' : '') + '" data-lb-range="' + range + '">' + labels[range] + '</button>';
    });
    s += '</div>';

    // Top 3 podium
    if (agentStats.length >= 1) {
      var profiles = {};
      try { profiles = JSON.parse(localStorage.getItem('reb_profiles') || '{}'); } catch(e) {}

      var top3 = agentStats.slice(0, 3);
      var rankNames = ['first', 'second', 'third'];
      s += '<div class="top3-podium" style="padding:20px 20px 16px">';
      top3.forEach(function (a, i) {
        var cls = agentClass(a.name);
        var trophy = i === 0 ? '&#127942;' : (i === 1 ? '&#129352;' : '&#129353;');
        var ringColor = i === 0 ? '#EAB308' : (i === 1 ? '#CBD5E1' : '#D97706');
        var user = users.find(function(u) { return u.displayName === a.name; });
        var profile = user ? (profiles[user.username] || {}) : {};
        var hasPhoto = profile && profile.photo;

        s += '<div class="top3-circle top3-' + rankNames[i] + '" style="border-color:' + ringColor + '">';
        s += '<div class="top3-trophy">' + trophy + '</div>';
        if (hasPhoto) {
          s += '<div class="top3-avatar-wrap" style="border-color:' + ringColor + '"><img src="' + profile.photo + '" style="width:100%;height:100%;object-fit:cover"></div>';
        } else {
          s += '<div class="agent-avatar top3-avatar-wrap ' + cls + '" style="border-color:' + ringColor + '">' + getInitials(a.name) + '</div>';
        }
        s += '<div class="top3-name">' + a.name + '</div>';
        s += '<div class="top3-stat-primary">' + a.closings + ' closed</div>';
        s += '<div class="top3-stat-secondary">' + Data.formatCurrency(a.volume) + '</div>';
        s += '</div>';
      });
      s += '</div>';
    }

    // Performance table
    if (agentStats.length > 0) {
      s += '<div style="padding:0 20px 16px">';
      s += '<div class="table-wrapper"><table style="font-size:.82rem">';
      s += '<thead><tr><th>#</th><th>Agent</th><th>Closed</th><th>Pending</th><th>Active</th><th>Listings</th><th>Volume</th><th>Avg Deal</th></tr></thead><tbody>';
      agentStats.forEach(function (a, i) {
        var cls = agentClass(a.name);
        var rankClass = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : ''));
        var isMe = session && a.name === session.displayName;
        s += '<tr' + (isMe ? ' style="background:#FFFBEB"' : '') + '>';
        s += '<td><div class="lb-rank-badge ' + rankClass + '" style="width:22px;height:22px;font-size:.68rem">' + (i + 1) + '</div></td>';
        s += '<td><div style="display:flex;align-items:center;gap:6px"><div class="agent-avatar ' + cls + '" style="width:26px;height:26px;font-size:.58rem">' + getInitials(a.name) + '</div><span style="font-weight:600;white-space:nowrap">' + a.name + (isMe ? ' <span style="font-size:.6rem;color:var(--amber);font-weight:700">(You)</span>' : '') + '</span></div></td>';
        s += '<td style="font-weight:700;color:var(--emerald)">' + a.closings + '</td>';
        s += '<td style="color:var(--amber)">' + a.pending + '</td>';
        s += '<td style="color:#3B82F6">' + a.active + '</td>';
        s += '<td>' + a.listings + '</td>';
        s += '<td style="font-weight:700">' + Data.formatCurrency(a.volume) + '</td>';
        s += '<td style="color:var(--gray-400)">' + (a.closings > 0 ? Data.formatCurrency(a.avgDeal) : '—') + '</td>';
        s += '</tr>';
      });
      s += '</tbody></table></div>';
      s += '</div>';
    } else {
      s += '<div style="padding:30px;text-align:center;color:var(--gray-400);font-size:.85rem">No agent data yet</div>';
    }

    s += '</div></div>';
    return s;
  };

  // ---- Upcoming Closings ----
  WIDGETS.upcomingClosings = function () {
    var s = widgetOpen('upcomingClosings', 'Upcoming Closings', 'var(--rose)', '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>', '<a href="deal-room.html" class="btn btn-outline btn-sm" style="font-size:.7rem;padding:3px 8px">Deal Room</a>');
    s += '<div class="dash-widget-body" style="padding:14px 20px">';

    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var upcoming = txns.filter(function (t) {
      if (t.status === 'closed' || !t.closeDate) return false;
      var d = new Date(t.closeDate + 'T00:00:00');
      var diff = Math.round((d - now) / 86400000);
      return diff >= 0 && diff <= 30;
    }).sort(function (a, b) {
      return new Date(a.closeDate) - new Date(b.closeDate);
    }).slice(0, 8);

    if (upcoming.length === 0) {
      s += '<div style="text-align:center;padding:16px;color:var(--gray-400);font-size:.85rem">No closings in the next 30 days</div>';
    } else {
      upcoming.forEach(function (t) {
        var d = new Date(t.closeDate + 'T00:00:00');
        var diff = Math.round((d - now) / 86400000);
        var urgClass = diff <= 3 ? 'dr-urgency--hot' : (diff <= 10 ? 'dr-urgency--warn' : 'dr-urgency--ok');
        var urgText = diff === 0 ? 'Today!' : (diff === 1 ? 'Tomorrow' : diff + 'd');
        var isMine = session && t.agent === session.displayName;
        var canOpen = isLead || isMine;
        var rowTag = canOpen ? 'a' : 'div';
        var rowHref = canOpen ? ' href="deal-detail-txn.html#' + t.id + '"' : '';
        var rowStyle = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-50);text-decoration:none;color:inherit;transition:background .12s;border-radius:6px;padding-left:4px;padding-right:4px;' + (canOpen ? 'cursor:pointer' : 'cursor:default;opacity:.85');
        s += '<' + rowTag + rowHref + ' style="' + rowStyle + '"' + (canOpen ? ' onmouseover="this.style.background=\'var(--gray-50)\'" onmouseout="this.style.background=\'transparent\'"' : '') + '>';
        s += '<span class="dr-urgency ' + urgClass + '" style="min-width:42px;text-align:center">' + urgText + '</span>';
        s += '<div style="flex:1;min-width:0">';
        s += '<div style="font-size:.85rem;font-weight:600;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (t.address || '—').split(',')[0] + '</div>';
        s += '<div style="font-size:.7rem;color:var(--gray-400)">' + (t.agent || '—') + '</div>';
        s += '</div>';
        s += '<div style="text-align:right"><div style="font-size:.85rem;font-weight:700;color:var(--gray-900)">' + Data.formatCurrencyFull(t.price) + '</div></div>';
        s += '</' + rowTag + '>';
      });
    }

    s += '</div></div>';
    return s;
  };

  // ---- Deal Sources ----
  WIDGETS.dealSources = function () {
    var s = widgetOpen('dealSources', 'Deal Sources', 'var(--emerald)', '<path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>', null);
    s += '<div class="dash-widget-body" style="padding:14px 20px">';

    var sourceCounts = {};
    var sourceVolume = {};
    txns.forEach(function (t) {
      var src = t.source || 'Unknown';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      if (t.status === 'closed') sourceVolume[src] = (sourceVolume[src] || 0) + (parseFloat(t.price) || 0);
    });
    var sourceKeys = Object.keys(sourceCounts).sort(function (a, b) { return sourceCounts[b] - sourceCounts[a]; });
    var totalDeals = sourceKeys.reduce(function (sum, k) { return sum + sourceCounts[k]; }, 0);

    if (sourceKeys.length === 0 || (sourceKeys.length === 1 && sourceKeys[0] === 'Unknown')) {
      s += '<div style="text-align:center;padding:16px;color:var(--gray-400);font-size:.85rem">No deal source data yet</div>';
    } else {
      sourceKeys.slice(0, 8).forEach(function (src) {
        var count = sourceCounts[src];
        var vol = sourceVolume[src] || 0;
        var pct = totalDeals > 0 ? Math.round((count / totalDeals) * 100) : 0;
        s += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">';
        s += '<div style="width:30px;height:30px;border-radius:50%;background:var(--indigo-light);color:var(--indigo);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.65rem;font-weight:700">' + pct + '%</div>';
        s += '<div style="flex:1;min-width:0">';
        s += '<div style="display:flex;justify-content:space-between"><span style="font-size:.8rem;font-weight:600;color:var(--gray-800)">' + src + '</span><span style="font-size:.8rem;font-weight:700;color:var(--gray-900)">' + count + '</span></div>';
        s += '<div style="height:4px;background:var(--gray-100);border-radius:99px;overflow:hidden;margin-top:4px"><div style="height:100%;width:' + Math.max(pct, 3) + '%;background:linear-gradient(90deg,#35BA9C,#3484D0);border-radius:99px"></div></div>';
        if (vol > 0) s += '<div style="font-size:.68rem;color:var(--gray-400);margin-top:2px">' + Data.formatCurrency(vol) + ' closed volume</div>';
        s += '</div></div>';
      });
    }

    s += '</div></div>';
    return s;
  };

  // Volume Summary removed — volumes now shown in stat cards at top

  // ---- Review Tracker ----
  WIDGETS.reviews = function () {
    var s = widgetOpen('reviews', 'Review Tracker', 'var(--amber)', '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>', '<a href="reviews.html" class="btn btn-outline btn-sm" style="font-size:.7rem;padding:3px 8px">Manage</a>');

    var username = session.username;
    var scorecard = {};
    var rGoals = {};
    var requests = [];
    var lastCheck = null;
    try { var sc = JSON.parse(localStorage.getItem('reb_review_scorecard') || '{}'); scorecard = sc[username] || {}; } catch(e) {}
    try { var gl = JSON.parse(localStorage.getItem('reb_review_goals') || '{}'); rGoals = gl[username] || {}; } catch(e) {}
    try { requests = JSON.parse(localStorage.getItem('reb_review_requests') || '[]').filter(function(r) { return r.agent === username; }); } catch(e) {}
    try { var lc = JSON.parse(localStorage.getItem('reb_review_last_check') || '{}'); lastCheck = lc[username] || null; } catch(e) {}

    var pending = requests.filter(function(r) { return r.status === 'pending'; }).length;
    var sent = requests.filter(function(r) { return r.status === 'sent'; }).length;
    var overdue = requests.filter(function(r) { return r.status === 'sent' && r.sentDate && (Math.floor((new Date() - new Date(r.sentDate)) / 86400000) > 14); }).length;

    var SOURCES_DATA = { 'Google': { icon: '&#128269;', bg: '#E8F5E9', text: '#1B5E20' }, 'Zillow': { icon: '&#127968;', bg: '#E3F2FD', text: '#0D47A1' }, 'Realtor.com': { icon: '&#127969;', bg: '#FBE9E7', text: '#BF360C' }, 'Yelp': { icon: '&#11088;', bg: '#FCE4EC', text: '#880E4F' }, 'Facebook': { icon: '&#128077;', bg: '#E8EAF6', text: '#283593' } };
    var totalReviews = 0;
    var platformsWithReviews = [];
    Object.keys(SOURCES_DATA).forEach(function(src) {
      var count = scorecard[src] || 0;
      totalReviews += count;
      if (count > 0) platformsWithReviews.push({ name: src, count: count, goal: rGoals[src] || 0, data: SOURCES_DATA[src] });
    });
    try {
      var links = JSON.parse(localStorage.getItem('reb_review_links') || '{}');
      var myLinks = links[username] || {};
      Object.keys(myLinks).forEach(function(k) {
        if (k !== '_default' && !SOURCES_DATA[k] && myLinks[k]) {
          var count = scorecard[k] || 0;
          totalReviews += count;
          if (count > 0) platformsWithReviews.push({ name: k, count: count, goal: rGoals[k] || 0, data: { icon: '&#128279;', bg: '#F5F5F5', text: '#424242' } });
        }
      });
    } catch(e) {}

    s += '<div class="dash-widget-body" style="padding:14px 20px">';

    var daysSinceCheck = lastCheck ? Math.floor((new Date() - new Date(lastCheck)) / 86400000) : null;
    if (daysSinceCheck === null || daysSinceCheck >= 7) {
      s += '<div style="background:#EFF6FF;border-radius:8px;padding:10px 12px;margin-bottom:12px;display:flex;align-items:center;gap:8px;font-size:.78rem">';
      s += '<span>&#128276;</span><span style="color:#1D4ED8;font-weight:600">Time to check your reviews!</span>';
      s += '<a href="reviews.html" style="margin-left:auto;color:#1D4ED8;font-weight:600;text-decoration:none;font-size:.72rem">Go &#8594;</a>';
      s += '</div>';
    }

    s += '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">';
    s += '<div style="flex:1;min-width:60px;text-align:center;padding:8px;background:var(--gray-50);border-radius:8px"><div style="font-size:1.1rem;font-weight:800;color:var(--gray-900)">' + totalReviews + '</div><div style="font-size:.6rem;color:var(--gray-400);font-weight:600">TOTAL</div></div>';
    s += '<div style="flex:1;min-width:60px;text-align:center;padding:8px;background:#FEF3C7;border-radius:8px"><div style="font-size:1.1rem;font-weight:800;color:#92400E">' + pending + '</div><div style="font-size:.6rem;color:#92400E;font-weight:600">PENDING</div></div>';
    s += '<div style="flex:1;min-width:60px;text-align:center;padding:8px;background:#DBEAFE;border-radius:8px"><div style="font-size:1.1rem;font-weight:800;color:#1D4ED8">' + sent + '</div><div style="font-size:.6rem;color:#1D4ED8;font-weight:600">SENT</div></div>';
    if (overdue > 0) {
      s += '<div style="flex:1;min-width:60px;text-align:center;padding:8px;background:#FEE2E2;border-radius:8px"><div style="font-size:1.1rem;font-weight:800;color:#991B1B">' + overdue + '</div><div style="font-size:.6rem;color:#991B1B;font-weight:600">OVERDUE</div></div>';
    }
    s += '</div>';

    if (platformsWithReviews.length) {
      platformsWithReviews.forEach(function(p) {
        var pct = p.goal > 0 ? Math.min(Math.round(p.count / p.goal * 100), 100) : 0;
        s += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
        s += '<span style="font-size:.9rem">' + p.data.icon + '</span>';
        s += '<div style="flex:1;min-width:0">';
        s += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:.78rem;font-weight:600;color:var(--gray-800)">' + p.name + '</span><span style="font-size:.78rem;font-weight:700;color:' + p.data.text + '">' + p.count + (p.goal ? '/' + p.goal : '') + '</span></div>';
        if (p.goal > 0) {
          s += '<div style="height:4px;background:var(--gray-100);border-radius:99px;overflow:hidden;margin-top:3px"><div style="height:100%;width:' + pct + '%;background:' + p.data.text + ';border-radius:99px"></div></div>';
        }
        s += '</div></div>';
      });
    } else {
      s += '<div style="text-align:center;padding:12px;color:var(--gray-400);font-size:.82rem">No reviews logged yet. <a href="reviews.html" style="color:var(--indigo);text-decoration:none;font-weight:600">Get started &#8594;</a></div>';
    }

    var actionNeeded = requests.filter(function(r) { return r.status === 'pending' || (r.status === 'sent' && r.sentDate && Math.floor((new Date() - new Date(r.sentDate)) / 86400000) > 14); }).slice(0, 3);
    if (actionNeeded.length) {
      s += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--gray-100)">';
      s += '<div style="font-size:.72rem;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Needs Action</div>';
      actionNeeded.forEach(function(r) {
        var isOD = r.status === 'sent';
        s += '<a href="reviews.html" style="display:flex;align-items:center;gap:8px;padding:6px 0;text-decoration:none;font-size:.78rem">';
        s += '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + (isOD ? '#EF4444' : '#F59E0B') + ';flex-shrink:0"></span>';
        s += '<span style="color:var(--gray-800);font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (r.clientName || 'Client') + '</span>';
        s += '<span style="font-size:.68rem;color:' + (isOD ? '#991B1B' : '#92400E') + ';font-weight:600">' + (isOD ? 'Follow up' : 'Send email') + '</span>';
        s += '</a>';
      });
      s += '</div>';
    }

    s += '</div></div>';
    return s;
  };

  // ============================================================
  // LAYOUT
  // ============================================================
  var DEFAULT_LAYOUT = {
    col1: ['goals', 'upcomingClosings'],
    col2: ['teamRankings'],
    col3: ['dealSources', 'reviews']
  };

  function loadLayout() {
    // Always use the default layout for consistency across all computers
    return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  }

  function saveLayout(layout) {
    localStorage.setItem('reb_dash_layout', JSON.stringify(layout));
  }

  // ============================================================
  // RENDER
  // ============================================================
  function renderDashboard() {
    var layout = loadLayout();
    var body = document.querySelector('.page-body');
    var h = '';

    h += '<div class="dash-welcome">' +
      '<div class="dash-welcome-text">' +
        '<div class="dash-welcome-date">' + dateStr + '</div>' +
        '<h2>' + greeting + ', ' + (session ? session.displayName.split(' ')[0] : 'Agent') + '</h2>' +
        '<p>Here\'s what\'s happening across your team today</p>' +
      '</div>' +
    '</div>';

    if (isLead) {
      h += '<div style="display:flex;justify-content:flex-end;margin-bottom:12px">' +
        '<button class="btn btn-outline btn-sm" data-action="toggle-edit-mode" style="font-size:.78rem;color:var(--gold);border-color:var(--gold)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:4px"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>Customize</button>' +
      '</div>';
    }

    h += '<div class="stats-grid dash-stats-row" style="margin-bottom:28px">';
    var closedVol = closedTxns.reduce(function(s,t){return s+(t.price||0)},0);
    var escrowVol = activeTxns.concat(pendingTxns).reduce(function(s,t){return s+(t.price||0)},0);
    var listingVol = activeListings.reduce(function(s,l){return s+(l.price||0)},0);
    h += dashStat('Total Closed', closedTxns.length, '#ECFDF5', 'var(--emerald)', '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>', null, null, Data.formatCurrencyFull(closedVol));
    h += dashStat('In Escrow', escrowCount, '#EEF2FF', 'var(--indigo)', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.89 2-2V5c0-1.1-.89-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>', null, null, Data.formatCurrencyFull(escrowVol));
    h += dashStat('Active Listings', activeListings.length, '#FFF8EE', 'var(--amber)', '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>', null, null, Data.formatCurrencyFull(listingVol));
    h += '</div>';

    if (!isLead) {
      h += '<div class="dash-tax-strip">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-shrink:0">' +
          '<div style="width:36px;height:36px;border-radius:10px;background:var(--indigo);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>' +
          '<div><div style="font-size:.85rem;font-weight:700;color:var(--gray-900)">Tax Snapshot</div><div style="font-size:.68rem;color:var(--gray-400)">YTD</div></div></div>' +
        '<div class="dash-tax-values">' +
          taxCell(Data.formatCurrencyFull(manualIncome), 'Income', 'var(--emerald)') +
          taxCell(Data.formatCurrencyFull(totalExpenses), 'Expenses', 'var(--rose)') +
          taxCell(Data.formatCurrencyFull(manualIncome - totalExpenses), 'Net', manualIncome - totalExpenses >= 0 ? 'var(--indigo)' : 'var(--rose)') +
          taxCell(Data.formatCurrencyFull(Math.max(0, (manualIncome - totalExpenses) * _dashTaxRate)), 'Est. Tax', 'var(--amber)') +
        '</div>' +
        '<a href="tax-center.html" class="btn btn-outline btn-sm" style="font-size:.75rem;flex-shrink:0;border-color:var(--indigo);color:var(--indigo)">Details</a>' +
      '</div>';
    }

    h += '<div class="dash-grid" id="dashGrid">';
    var isMobile = window.innerWidth <= 768;

    if (isMobile) {
      var allWidgetIds = layout.col1.concat(layout.col2).concat(layout.col3);
      var mobileFirst = ['teamRankings', 'goals', 'upcomingClosings'];
      var mobileRest = allWidgetIds.filter(function(id) { return mobileFirst.indexOf(id) === -1; });
      var mobileOrder = mobileFirst.concat(mobileRest);
      h += '<div class="dash-col" data-col="0">';
      mobileOrder.forEach(function(widgetId) {
        if (WIDGETS[widgetId]) h += WIDGETS[widgetId]();
      });
      h += '</div>';
    } else {
      var colKeys = ['col1', 'col2', 'col3'];
      colKeys.forEach(function (colKey, colIdx) {
        h += '<div class="dash-col" data-col="' + colIdx + '">';
        layout[colKey].forEach(function (widgetId) {
          if (WIDGETS[widgetId]) h += WIDGETS[widgetId]();
        });
        h += '</div>';
      });
    }

    h += '</div>';
    body.innerHTML = h;
    initDashDragDrop();
  }

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
    var widgets = grid.querySelectorAll('.dash-widget[draggable="true"]');

    widgets.forEach(function (w) {
      var handle = w.querySelector('.dash-widget-drag');
      if (handle) {
        handle.addEventListener('mousedown', function () { w.setAttribute('data-drag-ready', 'true'); });
      }
      w.addEventListener('dragstart', function (e) {
        if (w.getAttribute('data-drag-ready') !== 'true') { e.preventDefault(); return; }
        dragWidget = w;
        w.classList.add('dw-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', w.getAttribute('data-widget-id'));
      });
      w.addEventListener('dragend', function () {
        w.classList.remove('dw-dragging');
        w.removeAttribute('data-drag-ready');
        dragWidget = null;
        grid.querySelectorAll('.dw-drag-over').forEach(function (el) { el.classList.remove('dw-drag-over'); });
        grid.querySelectorAll('.dw-col-over').forEach(function (el) { el.classList.remove('dw-col-over'); });
      });
      w.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (w !== dragWidget) w.classList.add('dw-drag-over');
      });
      w.addEventListener('dragleave', function () { w.classList.remove('dw-drag-over'); });
      w.addEventListener('drop', function (e) {
        e.preventDefault(); e.stopPropagation();
        w.classList.remove('dw-drag-over');
        if (!dragWidget || w === dragWidget) return;
        var targetCol = w.closest('.dash-col');
        targetCol.insertBefore(dragWidget, w);
        saveDOMLayout();
      });
    });

    var cols = grid.querySelectorAll('.dash-col');
    cols.forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var hasChildOver = col.querySelector('.dw-drag-over');
        if (!hasChildOver && dragWidget && !col.contains(dragWidget)) col.classList.add('dw-col-over');
      });
      col.addEventListener('dragleave', function (e) {
        if (!col.contains(e.relatedTarget)) col.classList.remove('dw-col-over');
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('dw-col-over');
        if (!dragWidget) return;
        if (e.target === col || e.target.classList.contains('dash-col')) {
          col.appendChild(dragWidget);
          saveDOMLayout();
        }
      });
    });
  }

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
  // INIT & EVENTS
  // ============================================================
  renderDashboard();

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

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
        '<div class="modal-body"><div style="background:var(--indigo-light);border-radius:12px;padding:14px;margin-bottom:18px;display:flex;align-items:center;gap:10px"><div class="stat-icon indigo" style="width:32px;height:32px;border-radius:8px"><svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.89 2-2V5c0-1.1-.89-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg></div><div><div style="font-size:.85rem;font-weight:700;color:var(--indigo)">Your Annual Targets</div><div style="font-size:.7rem;color:var(--gray-500)">Combined with team for total goal.</div></div></div>' +
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
      if (Array.isArray(ag)) ag = {};
      ag[session.username] = { closings: parseInt(document.getElementById('goalClosings').value)||0, volume: parseInt(document.getElementById('goalVolume').value)||0 };
      localStorage.setItem('reb_agent_goals', JSON.stringify(ag));
      var gm = document.getElementById('goalsModal'); if (gm) gm.remove();
      reloadData();
      renderDashboard();
      showToast('Goals saved!');
    }
  });

  // Leaderboard time filter (delegated)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lb-range]');
    if (!btn) return;
    _lbRange = btn.getAttribute('data-lb-range');
    reloadData();
    renderDashboard();
  });

  // HELPERS
  function dashStat(label, value, bg, color, path, delta, deltaType, volume) {
    return '<div class="dash-stat"><div class="dash-stat-icon" style="background:' + bg + ';color:' + color + '"><svg viewBox="0 0 24 24">' + path + '</svg></div>' +
      '<div><div class="dash-stat-value">' + value + '</div><div class="dash-stat-label">' + label + '</div>' +
      (volume ? '<div style="font-size:.82rem;font-weight:700;color:' + color + ';margin-top:2px">' + volume + '</div>' : '') +
      (delta ? '<div class="dash-stat-delta ' + deltaType + '">&#8593; ' + delta + '</div>' : '') +
      '</div></div>';
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

  function timeAgo(ts) {
    if (!ts) return '';
    var d = Math.round((Date.now() - new Date(ts).getTime()) / 86400000);
    if (d === 0) return 'Today'; if (d === 1) return 'Yesterday'; if (d < 7) return d + 'd ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

})();
