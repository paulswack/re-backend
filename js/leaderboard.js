/* ============================================================
   RE Back Office — Leaderboard Page
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

  var pageBody = document.getElementById('pageBody');
  var currentRange = 'all';

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

      if (currentRange === 'year') {
        return d.getFullYear() === year;
      } else if (currentRange === 'quarter') {
        return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === quarter;
      } else if (currentRange === 'month') {
        return d.getFullYear() === year && d.getMonth() === month;
      }
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

      return {
        name: name,
        closedCount: closed.length,
        volume: volume,
        avgDeal: closed.length ? volume / closed.length : 0,
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

    var totalClosed = agents.reduce(function (s, a) { return s + a.closedCount; }, 0);
    var totalVolume = agents.reduce(function (s, a) { return s + a.volume; }, 0);
    var totalActive = agents.reduce(function (s, a) { return s + a.activeCount + a.pendingCount; }, 0);
    var topAgent = agents.length > 0 ? agents[0].name : '—';
    var maxVolume = agents.length > 0 ? agents[0].volume : 1;
    var maxClosed = agents.length > 0 ? Math.max.apply(null, agents.map(function (a) { return a.closedCount; })) : 1;

    var html = '';

    // Time Filter
    html += '<div class="lb-time-filter">';
    ['all', 'year', 'quarter', 'month'].forEach(function (range) {
      var labels = { all: 'All Time', year: 'This Year', quarter: 'This Quarter', month: 'This Month' };
      html += '<button class="lb-filter-btn' + (currentRange === range ? ' active' : '') + '" data-range="' + range + '">' + labels[range] + '</button>';
    });
    html += '</div>';

    // Stats
    html += '<div class="lb-stats-grid">';
    html += lbStatCard('Active Agents', agents.length, 'green', '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>');
    html += lbStatCard('Total Closed', totalClosed, 'navy', '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>');
    html += lbStatCard('Total Volume', Data.formatCurrency(totalVolume), 'gold', '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>');
    html += lbStatCard('Active / Pending', totalActive, 'blue', '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>');
    html += '</div>';

    if (agents.length === 0) {
      html += '<div class="card" style="padding:60px 24px;text-align:center">';
      html += '<svg viewBox="0 0 24 24" width="48" height="48" fill="var(--gray-200)" style="margin-bottom:16px"><path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z"/></svg>';
      html += '<h3 style="color:var(--gray-700);margin-bottom:4px">No rankings yet</h3>';
      html += '<p style="color:var(--gray-400);font-size:.88rem">Close some deals to populate the leaderboard.</p>';
      html += '</div>';
      pageBody.innerHTML = html;
      attachFilterListeners();
      return;
    }

    // Two-column leaderboard grid
    html += '<div class="lb-grid">';

    // Left: Closed Transactions
    html += '<div class="lb-card">';
    html += '<div class="lb-card-header">';
    html += '<div><div class="lb-card-title">Closed Transactions</div><div class="lb-card-sub">Ranked by deals closed</div></div>';
    html += '<span class="lb-badge">All Time</span>';
    html += '</div>';
    var byClosedSorted = agents.slice().sort(function (a, b) { return b.closedCount - a.closedCount; });
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
    agents.forEach(function (a, i) {
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

    agents.forEach(function (a, i) {
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

    html += '</tbody></table></div>';
    html += '</div>';

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
    var btns = pageBody.querySelectorAll('.lb-filter-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentRange = this.getAttribute('data-range');
        render();
      });
    });
  }

  // ---- Init ----
  render();

})();
