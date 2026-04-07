/* ============================================================
   RE Back Office — Leaderboard Page
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('leaderboard');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var pageBody = document.getElementById('pageBody');
  var currentRange = 'year';

  // Dual rep counts as 2 deals, volume counts once
  function countDeals(arr) {
    return arr.reduce(function (sum, t) { return sum + (t.type === 'Dual' ? 2 : 1); }, 0);
  }

  // ---- Filter transactions by date range ----
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

  // ---- Build agent stats ----
  function getAgentStats() {
    var allTxns = Data.getTransactions();
    var rangedTxns = filterByRange(allTxns);
    var listings = Data.getListings();

    var agentNames = {};
    allTxns.forEach(function (t) { if (t.agent) agentNames[t.agent] = true; });
    listings.forEach(function (l) { if (l.agent) agentNames[l.agent] = true; });

    var agents = Object.keys(agentNames).map(function (name) {
      var agentTxns = rangedTxns.filter(function (t) { return t.agent === name; });
      var closed = agentTxns.filter(function (t) { return t.status === 'closed'; });
      var active = agentTxns.filter(function (t) { return t.status === 'active'; });
      var pending = agentTxns.filter(function (t) { return t.status === 'pending'; });
      var volume = closed.reduce(function (sum, t) { return sum + (parseFloat(t.price) || 0); }, 0);
      var agentListings = listings.filter(function (l) { return l.agent === name && l.status === 'active'; });

      var closedCount = countDeals(closed);
      return {
        name: name,
        closedCount: closedCount,
        volume: volume,
        avgDeal: closedCount > 0 ? volume / closedCount : 0,
        activeCount: active.length,
        pendingCount: pending.length,
        listingsCount: agentListings.length,
        totalDeals: agentTxns.length
      };
    });

    agents.sort(function (a, b) {
      if (b.volume !== a.volume) return b.volume - a.volume;
      return b.closedCount - a.closedCount;
    });

    return agents;
  }

  // ---- Render ----
  function render() {
    var agents = getAgentStats();
    var filteredAgents = agents;

    var maxVolume = filteredAgents.length > 0 ? Math.max.apply(null, filteredAgents.map(function (a) { return a.volume; })) : 1;
    var maxClosed = filteredAgents.length > 0 ? Math.max.apply(null, filteredAgents.map(function (a) { return a.closedCount; })) : 1;

    var html = '';

    // Time Filter
    html += '<div class="lb-time-filter">';
    ['all', 'year', 'quarter', 'month'].forEach(function (range) {
      var labels = { all: 'All Time', year: 'This Year', quarter: 'This Quarter', month: 'This Month' };
      html += '<button class="lb-filter-btn' + (currentRange === range ? ' active' : '') + '" data-range="' + range + '">' + labels[range] + '</button>';
    });
    html += '</div>';

    if (agents.length === 0) {
      html += '<div style="text-align:center;padding:60px 20px;color:var(--gray-400);">';
      html += '<div style="font-size:2rem;margin-bottom:12px">📊</div>';
      html += '<div style="font-weight:600;margin-bottom:4px">No agent data available yet</div>';
      html += '</div>';
      pageBody.innerHTML = html;
      attachFilterListeners();
      return;
    }

    // Top 3 Performers
    if (agents.length >= 1) {
      var profiles = {};
      try { profiles = JSON.parse(localStorage.getItem('reb_profiles') || '{}'); } catch(e) {}
      var users = [];
      try { users = JSON.parse(localStorage.getItem('reb_users') || '[]'); } catch(e) {}

      var top3 = agents.slice().sort(function (a, b) {
        if (b.closedCount !== a.closedCount) return b.closedCount - a.closedCount;
        return b.volume - a.volume;
      }).slice(0, 3);

      html += '<div style="display:flex;justify-content:center;gap:20px;margin-bottom:20px;flex-wrap:wrap" class="top3-podium">';

      top3.forEach(function (a, i) {
        var cls = agentClass(a.name);
        var trophy = i === 0 ? '🏆' : (i === 1 ? '🥈' : '🥉');
        var ringColor = i === 0 ? '#EAB308' : (i === 1 ? '#CBD5E1' : '#D97706');

        var user = users.find(function(u) { return u.displayName === a.name; });
        var profile = user ? (profiles[user.username] || {}) : {};
        var hasPhoto = profile && profile.photo;

        html += '<div class="top3-circle" style="border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 20px rgba(0,0,0,.06);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border:2px solid ' + ringColor + '">';

        // Trophy
        html += '<div style="font-size:1.8rem;margin-bottom:6px">' + trophy + '</div>';

        // Headshot / avatar
        if (hasPhoto) {
          html += '<div style="width:60px;height:60px;border-radius:50%;overflow:hidden;margin-bottom:8px;border:2px solid ' + ringColor + '"><img src="' + profile.photo + '" style="width:100%;height:100%;object-fit:cover"></div>';
        } else {
          html += '<div class="agent-avatar ' + cls + '" style="display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;font-size:1rem;font-weight:700;color:#fff;margin-bottom:8px;border:2px solid ' + ringColor + '">' + getInitials(a.name) + '</div>';
        }

        // Name
        html += '<div style="font-size:.88rem;font-weight:700;color:var(--gray-900);line-height:1.2;padding:0 20px">' + a.name + '</div>';
        // Closed count — primary stat
        html += '<div style="font-size:1rem;font-weight:800;color:var(--gray-900);margin-top:4px">' + a.closedCount + ' closed</div>';
        // Volume — secondary stat
        html += '<div style="font-size:.72rem;color:var(--gray-400);margin-top:2px">' + Data.formatCurrency(a.volume) + '</div>';

        html += '</div>';
      });

      html += '</div>';
    }

    // Two-column leaderboard grid
    html += '<div class="lb-grid">';

    // Left: Closed Transactions
    html += '<div class="lb-card">';
    html += '<div class="lb-card-header">';
    html += '<div><div class="lb-card-title">Closed Transactions</div><div class="lb-card-sub">Ranked by deals closed</div></div>';
    html += '<span class="lb-badge">All Time</span>';
    html += '</div>';
    var byClosedSorted = filteredAgents.slice().sort(function (a, b) { return b.closedCount - a.closedCount; });
    byClosedSorted.forEach(function (a, i) {
      var pct = maxClosed > 0 ? (a.closedCount / maxClosed) * 100 : 0;
      html += lbRow(a, i, a.closedCount + ' closed', pct, a.pendingCount + ' pending / ' + a.activeCount + ' active');
    });
    html += '</div>';

    // Right: Sales Volume
    html += '<div class="lb-card">';
    html += '<div class="lb-card-header">';
    html += '<div><div class="lb-card-title">Sales Volume</div><div class="lb-card-sub">Ranked by total closed volume</div></div>';
    html += '<span class="lb-badge">All Time</span>';
    html += '</div>';
    filteredAgents.forEach(function (a, i) {
      var pct = maxVolume > 0 ? (a.volume / maxVolume) * 100 : 0;
      html += lbRow(a, i, Data.formatCurrency(a.volume), pct, a.closedCount + ' closed / ' + a.listingsCount + ' listings');
    });
    html += '</div>';

    html += '</div>'; // lb-grid

    // Full Performance Table
    html += '<div class="lb-card" style="margin-top:20px">';
    html += '<div class="lb-card-header"><div><div class="lb-card-title">Full Performance Breakdown</div><div class="lb-card-sub">Complete agent rankings</div></div></div>';
    html += '<div class="table-wrapper"><table>';
    html += '<thead><tr>';
    html += '<th>Rank</th><th>Agent</th><th>Closed</th><th>Pending</th><th>Active</th><th>Listings</th><th>Volume (Closed)</th><th>Avg. Deal Size</th>';
    html += '</tr></thead><tbody>';

    filteredAgents.forEach(function (a, i) {
      var cls = agentClass(a.name);
      var rankClass = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : ''));
      html += '<tr>';
      html += '<td><div class="lb-rank-badge ' + rankClass + '">' + (i + 1) + '</div></td>';
      html += '<td><div class="lb-agent-cell"><div class="agent-avatar ' + cls + '" style="width:34px;height:34px;font-size:.7rem">' + getInitials(a.name) + '</div><div class="lb-agent-name">' + a.name + '</div></div></td>';
      html += '<td style="font-weight:700;color:var(--emerald)">' + a.closedCount + '</td>';
      html += '<td style="color:var(--amber)">' + a.pendingCount + '</td>';
      html += '<td style="color:#3B82F6">' + a.activeCount + '</td>';
      html += '<td>' + a.listingsCount + '</td>';
      html += '<td style="font-weight:700">' + Data.formatCurrency(a.volume) + '</td>';
      html += '<td style="color:var(--gray-400)">' + (a.closedCount > 0 ? Data.formatCurrency(a.avgDeal) : '—') + '</td>';
      html += '</tr>';
    });

    if (filteredAgents.length === 0) {
      html += '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--gray-400);font-size:.88rem">No agents match &ldquo;' + agentSearch + '&rdquo;</td></tr>';
    }
    html += '</tbody></table></div>';
    html += '</div>';

    // Deal Sources Breakdown
    var allTxns = Data.getTransactions();
    var sourceCounts = {};
    var sourceVolume = {};

    allTxns.forEach(function (t) {
      var src = t.source || 'Unknown';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      if (t.status === 'closed') {
        sourceVolume[src] = (sourceVolume[src] || 0) + (parseFloat(t.price) || 0);
      }
    });

    var sourceKeys = Object.keys(sourceCounts).sort(function (a, b) { return sourceCounts[b] - sourceCounts[a]; });
    var totalSourceDeals = sourceKeys.reduce(function (s, k) { return s + sourceCounts[k]; }, 0);

    if (sourceKeys.length > 0 && !(sourceKeys.length === 1 && sourceKeys[0] === 'Unknown')) {
      html += '<div class="lb-card" style="margin-top:20px">';
      html += '<div class="lb-card-header"><div><div class="lb-card-title">Where Our Deals Come From</div><div class="lb-card-sub">Lead source breakdown across all transactions and listings</div></div></div>';

      sourceKeys.forEach(function (src) {
        var count = sourceCounts[src];
        var vol = sourceVolume[src] || 0;
        var pct = totalSourceDeals > 0 ? Math.round((count / totalSourceDeals) * 100) : 0;
        html += '<div class="lb-row">';
        html += '<div style="width:32px;height:32px;border-radius:50%;background:var(--deal-source-circle-bg, var(--indigo-light));color:var(--deal-source-circle-text, var(--indigo));display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.7rem;font-weight:700">' + pct + '%</div>';
        html += '<div class="lb-row-info">';
        html += '<div class="lb-row-name">' + src + '</div>';
        html += '<div class="lb-row-sub">' + count + ' deal' + (count !== 1 ? 's' : '') + (vol > 0 ? ' &middot; ' + Data.formatCurrency(vol) + ' closed volume' : '') + '</div>';
        html += '<div class="lb-progress-wrap"><div class="lb-progress-fill" style="width:' + Math.max(pct, 3) + '%;background:linear-gradient(90deg, var(--deal-source-bar-start, #35BA9C), var(--deal-source-bar-end, #3484D0))"></div></div>';
        html += '</div>';
        html += '<div class="lb-row-value"><div class="lb-row-value-num">' + count + '</div></div>';
        html += '</div>';
      });

      html += '</div>';
    }

    pageBody.innerHTML = html;
    attachFilterListeners();
  }

  function lbStatCard(label, value, color, svgPath) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + color + '"><svg viewBox="0 0 24 24">' + svgPath + '</svg></div>' +
      '<div><div class="stat-value">' + value + '</div><div class="stat-label">' + label + '</div></div>' +
    '</div>';
  }

  function lbRow(agent, rank, valueText, barPct, subText) {
    var cls = agentClass(agent.name);
    var rankClass = rank === 0 ? 'gold' : (rank === 1 ? 'silver' : (rank === 2 ? 'bronze' : ''));
    return '<div class="lb-row">' +
      '<div class="lb-rank-badge ' + rankClass + '">' + (rank + 1) + '</div>' +
      '<div class="agent-avatar ' + cls + '" style="width:38px;height:38px;font-size:.75rem">' + getInitials(agent.name) + '</div>' +
      '<div class="lb-row-info">' +
        '<div class="lb-row-name">' + agent.name + '</div>' +
        '<div class="lb-row-sub">' + subText + '</div>' +
        '<div class="lb-progress-wrap"><div class="lb-progress-fill" style="width:' + Math.max(barPct, 4) + '%"></div></div>' +
      '</div>' +
      '<div class="lb-row-value">' +
        '<div class="lb-row-value-num">' + valueText + '</div>' +
      '</div>' +
    '</div>';
  }

  function attachFilterListeners() {
    pageBody.querySelectorAll('.lb-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentRange = this.getAttribute('data-range');
        render();
      });
    });
  }

  // ---- Init ----
  render();

})();
