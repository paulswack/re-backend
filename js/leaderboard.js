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

  var timeFilter = document.getElementById('timeFilter');
  var currentRange = 'all';

  // ---- Time filter buttons ----
  timeFilter.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    currentRange = btn.getAttribute('data-range');
    timeFilter.querySelectorAll('button').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    render();
  });

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

    // Get unique agents from ALL transactions
    var agentNames = {};
    allTxns.forEach(function (t) {
      if (t.agent) agentNames[t.agent] = true;
    });

    var agents = Object.keys(agentNames).map(function (name) {
      var agentTxns = rangedTxns.filter(function (t) { return t.agent === name; });
      var closed = agentTxns.filter(function (t) { return t.status === 'closed'; });
      var active = agentTxns.filter(function (t) { return t.status === 'active'; });
      var pending = agentTxns.filter(function (t) { return t.status === 'pending'; });
      var volume = closed.reduce(function (sum, t) { return sum + (parseFloat(t.price) || 0); }, 0);

      return {
        name: name,
        closedCount: closed.length,
        volume: volume,
        avgDeal: closed.length ? volume / closed.length : 0,
        activeCount: active.length,
        pendingCount: pending.length,
        totalDeals: agentTxns.length
      };
    });

    // Sort by volume desc, then by closed count
    agents.sort(function (a, b) {
      if (b.volume !== a.volume) return b.volume - a.volume;
      return b.closedCount - a.closedCount;
    });

    return agents;
  }

  // ---- Render ----
  function render() {
    var agents = getAgentStats();

    // Stats
    var totalClosed = agents.reduce(function (s, a) { return s + a.closedCount; }, 0);
    var totalVolume = agents.reduce(function (s, a) { return s + a.volume; }, 0);
    var topAgent = agents.length > 0 ? agents[0].name : '—';

    var statsEl = document.getElementById('lbStats');
    statsEl.innerHTML =
      '<div class="stat-card">' +
        '<div class="stat-icon indigo"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div>' +
        '<div><div class="stat-value">' + agents.length + '</div><div class="stat-label">Agents</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon emerald"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg></div>' +
        '<div><div class="stat-value">' + totalClosed + '</div><div class="stat-label">Total Closings</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon amber"><svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></div>' +
        '<div><div class="stat-value">' + Data.formatCurrency(totalVolume) + '</div><div class="stat-label">Total Volume</div></div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-icon violet"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>' +
        '<div><div class="stat-value" style="font-size:1.1rem;">' + topAgent + '</div><div class="stat-label">Top Producer</div></div>' +
      '</div>';

    // Podium
    var podiumEl = document.getElementById('podiumSection');
    if (agents.length < 1) {
      podiumEl.innerHTML = '<div class="empty-state"><h3>No rankings yet</h3><p>Close some deals to populate the leaderboard.</p></div>';
    } else {
      var top3 = agents.slice(0, 3);
      // Reorder for podium: [2nd, 1st, 3rd]
      var podiumOrder = [];
      if (top3[1]) podiumOrder.push({ agent: top3[1], rank: 2, barClass: 'second', rankClass: 'silver' });
      podiumOrder.push({ agent: top3[0], rank: 1, barClass: 'first', rankClass: 'gold' });
      if (top3[2]) podiumOrder.push({ agent: top3[2], rank: 3, barClass: 'third', rankClass: 'bronze' });

      podiumEl.innerHTML = '<div class="podium">' +
        podiumOrder.map(function (p) {
          var cls = agentClass(p.agent.name);
          return '<div class="podium-item">' +
            '<div class="podium-avatar ' + (p.rank === 1 ? 'first ' : '') + cls + '">' +
              getInitials(p.agent.name) +
              '<div class="podium-rank ' + p.rankClass + '">' + p.rank + '</div>' +
            '</div>' +
            '<div class="podium-name">' + p.agent.name + '</div>' +
            '<div class="podium-stat">' + p.agent.closedCount + ' closings &middot; ' + Data.formatCurrency(p.agent.volume) + '</div>' +
            '<div class="podium-bar ' + p.barClass + '"></div>' +
          '</div>';
        }).join('') +
      '</div>';
    }

    // Rankings Table
    var tableBody = document.getElementById('rankTableBody');
    var emptyEl = document.getElementById('rankEmpty');

    if (agents.length === 0) {
      tableBody.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }

    emptyEl.style.display = 'none';
    tableBody.innerHTML = agents.map(function (a, i) {
      var cls = agentClass(a.name);
      var rankBg = i === 0 ? 'background:#FEF3C7;color:#92400E;' :
                   i === 1 ? 'background:var(--gray-100);color:var(--gray-600);' :
                   i === 2 ? 'background:#FED7AA;color:#9A3412;' : '';
      return '<tr>' +
        '<td><div class="rank-number" style="' + rankBg + '">' + (i + 1) + '</div></td>' +
        '<td>' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div class="agent-avatar ' + cls + '" style="width:32px;height:32px;font-size:.68rem;">' + getInitials(a.name) + '</div>' +
            '<div style="font-weight:600;color:var(--gray-800);">' + a.name + '</div>' +
          '</div>' +
        '</td>' +
        '<td style="font-weight:700;">' + a.closedCount + '</td>' +
        '<td style="font-weight:600;">' + Data.formatCurrencyFull(a.volume) + '</td>' +
        '<td>' + Data.formatCurrency(a.avgDeal) + '</td>' +
        '<td><span class="badge badge-active">' + a.activeCount + '</span></td>' +
        '<td><span class="badge badge-pending">' + a.pendingCount + '</span></td>' +
      '</tr>';
    }).join('');
  }

  // ---- Init ----
  render();

})();
