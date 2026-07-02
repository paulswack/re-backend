/* ============================================================
   RE Back Office — Wins (Closed Deals, gamified)
   Trophy room for closed transactions: personal hero, GCI goal,
   producer tiers, podium, leaderboard, badges, records, wins feed,
   plus a confetti celebration when a new deal closes.
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
  var viewMode = 'list';        // 'list' or 'detail'
  var selectedTxnId = null;
  var currentRange = 'year';    // all | year | quarter | month
  var winsLimit = 12;           // how many wins-feed cards to show
  var goalEditMode = false;
  var celebrationDone = false;
  var COMMISSION_RATE = 0.0225; // GCI projected at 2.25% of sale volume

  var SESSION = (Auth.getSession && Auth.getSession()) || {};
  var MY_NAME = SESSION.displayName || '';

  var pageBody = document.getElementById('pageBody');

  // ---- Producer tiers (by YTD closed volume) ----
  var TIERS = [
    { name: 'Rookie',       min: 0,        color: '#94A3B8', icon: '🌱' },
    { name: 'Producer',     min: 1000000,  color: '#3484D0', icon: '⭐' },
    { name: 'Top Producer', min: 5000000,  color: '#1A7F4B', icon: '🚀' },
    { name: 'Elite',        min: 15000000, color: '#B86B00', icon: '💎' },
    { name: 'Legend',       min: 30000000, color: '#D4AF37', icon: '👑' }
  ];

  // ============================================================
  //  SMALL HELPERS
  // ============================================================
  function escapeHtml(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function gci(price) { return (parseFloat(price) || 0) * COMMISSION_RATE; }

  // Compact money like $1.2M / $845K for tight spaces
  function compactMoney(n) {
    n = parseFloat(n) || 0;
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
    return '$' + Math.round(n);
  }

  function monthKey(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' + d.getMonth();
  }

  function monthLabel(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return m[d.getMonth()] + ' ' + d.getFullYear();
  }

  // Dual rep counts as 2 deals (matches leaderboard convention)
  function dealWeight(t) { return t.type === 'Dual' ? 2 : 1; }

  function getUsersList() {
    try { return JSON.parse(localStorage.getItem('reb_users') || '[]'); } catch (e) { return []; }
  }

  // Map agent displayName -> profile photo (photos are keyed by username)
  var PHOTOS = {};
  function refreshPhotos() {
    var profiles = {};
    try { profiles = JSON.parse(localStorage.getItem('reb_profiles') || '{}'); } catch (e) {}
    var map = {};
    getUsersList().forEach(function (u) {
      var p = profiles[u.username];
      if (u.displayName && p && p.photo) map[u.displayName] = p.photo;
    });
    PHOTOS = map;
  }
  // Avatar with team photo when available, initials otherwise
  function avatarMarkup(name, extraClass) {
    var photo = PHOTOS[name];
    var inner = photo
      ? '<img src="' + photo + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">'
      : getInitials(name || '?');
    return '<span class="agent-avatar ' + agentClass(name) + ' ' + extraClass + '">' + inner + '</span>';
  }

  function getAllClosed() {
    return Data.getTransactions().filter(function (t) { return t.status === 'closed'; });
  }

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

  function thisYearClosed(name) {
    var year = new Date().getFullYear();
    return getAllClosed().filter(function (t) {
      if (name && t.agent !== name) return false;
      var d = new Date(t.closeDate);
      return !isNaN(d.getTime()) && d.getFullYear() === year;
    });
  }

  // ---- Goals (annual GCI target per agent), stored locally ----
  function getGoals() {
    try { return JSON.parse(localStorage.getItem('reb_agent_goals') || '{}'); } catch (e) { return {}; }
  }
  function setGoal(name, amount) {
    var goals = getGoals();
    if (amount > 0) goals[name] = amount; else delete goals[name];
    localStorage.setItem('reb_agent_goals', JSON.stringify(goals));
  }

  // ============================================================
  //  AGENT STATS (for podium + leaderboard, respects time range)
  // ============================================================
  function buildAgentStats() {
    var rangedClosed = filterByRange(getAllClosed());

    var names = {};
    getUsersList().forEach(function (u) {
      if (u.displayName && u.role !== 'Assistant') names[u.displayName] = true;
    });
    getAllClosed().forEach(function (t) { if (t.agent) names[t.agent] = true; });

    var agents = Object.keys(names).map(function (name) {
      var mine = rangedClosed.filter(function (t) { return t.agent === name; });
      var volume = mine.reduce(function (s, t) { return s + (parseFloat(t.price) || 0); }, 0);
      var deals = mine.reduce(function (s, t) { return s + dealWeight(t); }, 0);
      return {
        name: name,
        volume: volume,
        gci: volume * COMMISSION_RATE,
        deals: deals,
        rawCount: mine.length
      };
    });

    agents.sort(function (a, b) {
      if (b.deals !== a.deals) return b.deals - a.deals; // rank by number of sales
      return b.volume - a.volume;                        // volume breaks ties
    });
    agents.forEach(function (a, i) { a.rank = i + 1; });
    return agents;
  }

  // ============================================================
  //  PERSONAL PROFILE (career records + badges for one agent)
  // ============================================================
  function tierFor(volume) {
    var cur = TIERS[0], next = null;
    for (var i = 0; i < TIERS.length; i++) {
      if (volume >= TIERS[i].min) cur = TIERS[i];
    }
    var idx = TIERS.indexOf(cur);
    next = TIERS[idx + 1] || null;
    var progress = 1;
    if (next) {
      var span = next.min - cur.min;
      progress = span > 0 ? Math.max(0, Math.min(1, (volume - cur.min) / span)) : 1;
    }
    return { current: cur, next: next, progress: progress };
  }

  // Consecutive months (ending at the most recent close month) with >=1 close
  function currentStreak(closedList) {
    if (!closedList.length) return 0;
    var monthsSet = {};
    var latest = null;
    closedList.forEach(function (t) {
      var d = new Date(t.closeDate);
      if (isNaN(d.getTime())) return;
      monthsSet[d.getFullYear() + '-' + d.getMonth()] = true;
      if (!latest || d > latest) latest = d;
    });
    if (!latest) return 0;
    var streak = 0;
    var y = latest.getFullYear(), m = latest.getMonth();
    while (monthsSet[y + '-' + m]) {
      streak++;
      m--; if (m < 0) { m = 11; y--; }
    }
    return streak;
  }

  function buildProfile(name, allAgents) {
    var career = getAllClosed().filter(function (t) { return t.agent === name; });
    var ytd = thisYearClosed(name);

    var careerVolume = career.reduce(function (s, t) { return s + (parseFloat(t.price) || 0); }, 0);
    var ytdVolume = ytd.reduce(function (s, t) { return s + (parseFloat(t.price) || 0); }, 0);

    // biggest single deal
    var biggest = career.reduce(function (mx, t) {
      return (parseFloat(t.price) || 0) > (parseFloat(mx && mx.price) || 0) ? t : mx;
    }, null);

    // best month by count
    var monthCounts = {};
    career.forEach(function (t) {
      var k = monthKey(t.closeDate);
      if (k) monthCounts[k] = (monthCounts[k] || 0) + 1;
    });
    var bestMonthKey = null, bestMonthCount = 0;
    Object.keys(monthCounts).forEach(function (k) {
      if (monthCounts[k] > bestMonthCount) { bestMonthCount = monthCounts[k]; bestMonthKey = k; }
    });
    var bestMonthLabel = '';
    if (bestMonthKey) {
      var parts = bestMonthKey.split('-');
      bestMonthLabel = monthLabel(new Date(parts[0], parts[1], 1).toISOString());
    }

    // fastest close (createdAt -> closeDate, in days)
    var fastest = null;
    career.forEach(function (t) {
      if (!t.createdAt || !t.closeDate) return;
      var c = new Date(t.createdAt), cl = new Date(t.closeDate);
      if (isNaN(c.getTime()) || isNaN(cl.getTime())) return;
      var days = Math.round((cl - c) / 86400000);
      if (days >= 0 && (fastest === null || days < fastest)) fastest = days;
    });

    // ---- Year-only metrics (badges reset each calendar year) ----
    var yCount = ytd.length;
    var yVolume = ytdVolume;
    var yMaxDeal = ytd.reduce(function (mx, t) { var p = parseFloat(t.price) || 0; return p > mx ? p : mx; }, 0);
    var yHasDual = ytd.some(function (t) { return t.type === 'Dual'; });
    var yStreak = currentStreak(ytd);

    var yMonthCounts = {};
    ytd.forEach(function (t) { var k = monthKey(t.closeDate); if (k) yMonthCounts[k] = (yMonthCounts[k] || 0) + 1; });
    var yBestMonth = 0;
    Object.keys(yMonthCounts).forEach(function (k) { if (yMonthCounts[k] > yBestMonth) yBestMonth = yMonthCounts[k]; });

    var yFastest = null;
    ytd.forEach(function (t) {
      if (!t.createdAt || !t.closeDate) return;
      var c = new Date(t.createdAt), cl = new Date(t.closeDate);
      if (isNaN(c.getTime()) || isNaN(cl.getTime())) return;
      var d = Math.round((cl - c) / 86400000);
      if (d >= 0 && (yFastest === null || d < yFastest)) yFastest = d;
    });

    // fun / quirky triggers (this year)
    var yJan = ytd.some(function (t) { var d = new Date(t.closeDate); return !isNaN(d.getTime()) && d.getMonth() === 0; });
    var yDec = ytd.some(function (t) { var d = new Date(t.closeDate); return !isNaN(d.getTime()) && d.getMonth() === 11; });
    function ySrc(kw) { return ytd.some(function (t) { return (t.source || '').toLowerCase().indexOf(kw) !== -1; }); }
    var yReferral = ySrc('referral');
    var yOpenHouse = ySrc('open house');
    var yFirstTime = ytd.some(function (t) { return (t.source || '').toLowerCase().indexOf('first') !== -1; });

    var myRank = null;
    if (allAgents) {
      var found = allAgents.find(function (a) { return a.name === name; });
      myRank = found ? found.rank : null;
    }

    // Badges — measured within the current year, ordered easiest → hardest, each with a prize
    var badges = [
      { icon: '🎯', name: 'First Close',    earned: yCount >= 1, desc: 'Close your first deal this year', prize: 'Team shout-out + $25 gift card', cur: yCount, goal: 1 },
      { icon: '🌅', name: 'Fast Start',     earned: yJan, desc: 'Close a deal in January', prize: 'Coffee on the house' },
      { icon: '⚡', name: 'Fast Closer',    earned: yFastest !== null && yFastest <= 30, desc: 'Close in 30 days or less', prize: '$25 coffee card' },
      { icon: '🤝', name: 'Referral Pro',   earned: yReferral, desc: 'Close a referral-sourced deal', prize: '$25 gift card' },
      { icon: '📸', name: 'Open House Ace', earned: yOpenHouse, desc: 'Close an open-house lead', prize: '$25 gift card' },
      { icon: '🔑', name: 'New Beginnings', earned: yFirstTime, desc: 'Close a first-time buyer', prize: '$25 gift card' },
      { icon: '🎪', name: 'Double-Ender',   earned: yHasDual, desc: 'Represent both sides of a deal', prize: '$50 gift card' },
      { icon: '✋', name: 'High Five',      earned: yCount >= 5, desc: '5 sales this year', prize: '$100 gift card', cur: yCount, goal: 5 },
      { icon: '💨', name: 'Speed Demon',    earned: yFastest !== null && yFastest <= 14, desc: 'Close in 14 days or less', prize: '$50 gift card' },
      { icon: '💎', name: '$1M Club',       earned: yVolume >= 1000000, desc: '$1M in volume this year', prize: '$100 bonus', cur: yVolume, goal: 1000000, money: true },
      { icon: '🐋', name: 'Big Fish',       earned: yMaxDeal >= 1000000, desc: 'Close a deal over $1M', prize: '$150 bonus' },
      { icon: '🎩', name: 'Hat Trick',      earned: yBestMonth >= 3, desc: '3 closings in one month', prize: 'Team lunch on us' },
      { icon: '🔥', name: 'On Fire',        earned: yStreak >= 3, desc: '3 months in a row', prize: '$100 bonus', cur: yStreak, goal: 3 },
      { icon: '🎄', name: 'Holiday Closer', earned: yDec, desc: 'Close a deal in December', prize: '$50 gift card' },
      { icon: '🏅', name: '10-Sale Club',   earned: yCount >= 10, desc: '10 sales this year', prize: '$250 bonus', cur: yCount, goal: 10 },
      { icon: '💠', name: '$5M Club',       earned: yVolume >= 5000000, desc: '$5M in volume this year', prize: '$250 bonus', cur: yVolume, goal: 5000000, money: true },
      { icon: '⚾', name: 'Grand Slam',     earned: yBestMonth >= 5, desc: '5 closings in one month', prize: '$250 bonus' },
      { icon: '🐳', name: 'Whale',          earned: yMaxDeal >= 2000000, desc: 'Close a deal over $2M', prize: '$500 bonus' },
      { icon: '🌋', name: 'Unstoppable',    earned: yStreak >= 6, desc: '6 months in a row', prize: '$300 bonus', cur: yStreak, goal: 6 },
      { icon: '🎖️', name: '25-Sale Club',   earned: yCount >= 25, desc: '25 sales this year', prize: '$750 bonus', cur: yCount, goal: 25 },
      { icon: '🏆', name: '$10M Club',      earned: yVolume >= 10000000, desc: '$10M in volume this year', prize: '$1,000 bonus', cur: yVolume, goal: 10000000, money: true },
      { icon: '👑', name: 'Chart Topper',   earned: myRank === 1, desc: 'Rank #1 on the board', prize: 'Reserved parking + trophy' },
      { icon: '🔗', name: 'Perfect Year',   earned: yStreak >= 12, desc: 'Close every month of the year', prize: '$1,000 bonus', cur: yStreak, goal: 12 },
      { icon: '🏵️', name: 'Half-Century',   earned: yCount >= 50, desc: '50 sales this year', prize: '$2,500 bonus', cur: yCount, goal: 50 },
      { icon: '🌟', name: '$25M Club',      earned: yVolume >= 25000000, desc: '$25M in volume this year', prize: '$2,500 bonus', cur: yVolume, goal: 25000000, money: true },
      { icon: '🚀', name: '$50M Club',      earned: yVolume >= 50000000, desc: '$50M in volume this year', prize: '$5,000 bonus', cur: yVolume, goal: 50000000, money: true },
      { icon: '💯', name: 'Century Club',   earned: yCount >= 100, desc: '100 sales this year', prize: '$5,000 + engraved plaque', cur: yCount, goal: 100 },
      { icon: '🌈', name: '$100M Club',     earned: yVolume >= 100000000, desc: '$100M in volume this year', prize: 'All-expenses weekend getaway', cur: yVolume, goal: 100000000, money: true }
    ];

    // Prizes are overridable in Admin Settings → Badge Prizes (keyed by badge name)
    var prizeOverrides = getAdminSetting('badgePrizes', {}) || {};
    badges.forEach(function (b) {
      if (Object.prototype.hasOwnProperty.call(prizeOverrides, b.name)) {
        b.prize = prizeOverrides[b.name];
      }
    });

    return {
      name: name,
      career: career,
      careerVolume: careerVolume,
      ytdVolume: ytdVolume,
      ytdGci: ytdVolume * COMMISSION_RATE,
      careerCount: career.length,
      biggest: biggest,
      bestMonthLabel: bestMonthLabel,
      bestMonthCount: bestMonthCount,
      fastest: fastest,
      streak: yStreak,
      rank: myRank,
      teamSize: allAgents ? allAgents.length : 0,
      badges: badges,
      tier: tierFor(ytdVolume)
    };
  }

  // ============================================================
  //  RENDER — LIST (the Wins dashboard)
  // ============================================================
  function renderList() {
    refreshPhotos();
    var agents = buildAgentStats();
    var profile = buildProfile(MY_NAME, agents);
    var rangedClosed = filterByRange(getAllClosed())
      .slice()
      .sort(function (a, b) { return (b.closeDate || '').localeCompare(a.closeDate || ''); });

    var html = '';
    html += heroBlock(profile);
    html += badgesBlock(profile);
    html += podiumBlock(agents);
    html += leaderboardBlock(agents);
    html += recordsBlock(profile);
    html += winsFeedBlock(rangedClosed);

    pageBody.innerHTML = html;
  }

  // ---- Hero: slim "Your Year" bar + producer tier ----
  function heroBlock(p) {
    var t = p.tier;
    var pct = Math.round(t.progress * 100);
    var year = new Date().getFullYear();
    var closedCount = thisYearClosed(MY_NAME).length;

    var s = '<div class="wins-hero">';
    s += '<div class="wins-hero-glow"></div>';

    // top line: full name + year Results, tier chip + streak
    s += '<div class="wins-hero-row">';
    s += '<div class="wins-hero-greet">' + (MY_NAME ? escapeHtml(MY_NAME) : 'Your') + ' ' + year + ' Results</div>';
    s += '<div class="wins-hero-chips">';
    s += '<span class="wins-tier-chip" style="color:' + t.current.color + '">' + t.current.icon + ' ' + t.current.name + '</span>';
    if (p.streak > 0) s += '<span class="wins-hero-streak" title="Consecutive months with a closing">🔥 ' + p.streak + ' mo</span>';
    s += '</div></div>';

    // inline stat trio
    s += '<div class="wins-hero-stats">';
    s += heroStat(compactMoney(p.ytdVolume), 'volume');
    s += heroStat(Data.formatCurrency(p.ytdGci), 'GCI');
    s += heroStat(String(closedCount), closedCount === 1 ? 'deal' : 'deals');
    s += '</div>';

    // team ranking
    s += '<div class="wins-hero-rankline">';
    if (p.rank) {
      s += '<span class="wins-rank-badge">🏅 Ranked #' + p.rank + ' of ' + p.teamSize + ' on the team</span>';
    } else {
      s += '<span class="wins-rank-badge muted">Not ranked yet — close a deal to get on the board</span>';
    }
    s += '</div>';

    // thin tier progress bar
    if (t.next) {
      s += '<div class="wins-tier-bar-wrap">';
      s += '<div class="wins-tier-bar"><div class="wins-tier-fill" style="width:' + pct + '%"></div></div>';
      s += '<div class="wins-tier-bar-meta">' + pct + '% to ' + t.next.icon + ' ' + t.next.name + '</div>';
      s += '</div>';
    } else {
      s += '<div class="wins-tier-bar-meta" style="margin-top:10px">👑 Top tier reached — you\'re a Legend</div>';
    }
    s += '</div>';
    return s;
  }

  function heroStat(value, label) {
    return '<span class="wins-hero-stat"><span class="wins-hero-stat-val">' + value + '</span>' +
           '<span class="wins-hero-stat-lbl">' + label + '</span></span>';
  }

  // ---- GCI goal thermometer ----
  function goalBlock(p) {
    var goals = getGoals();
    var goal = parseFloat(goals[MY_NAME]) || 0;
    var earned = p.ytdGci;

    var s = '<div class="wins-card wins-goal">';
    s += '<div class="wins-goal-head">';
    s += '<div class="wins-goal-title">🎯 ' + new Date().getFullYear() + ' Commission Goal</div>';
    if (!goalEditMode && goal > 0) {
      s += '<button class="wins-link-btn" data-action="edit-goal">Edit goal</button>';
    }
    s += '</div>';

    if (goalEditMode || goal <= 0) {
      s += '<div class="wins-goal-edit">';
      s += '<span class="wins-goal-dollar">$</span>';
      s += '<input id="goalInput" class="wins-goal-input" type="text" inputmode="numeric" ' +
           'placeholder="150,000" value="' + (goal > 0 ? goal.toLocaleString('en-US') : '') + '" ' +
           'oninput="var r=this.value.replace(/[^0-9]/g,\'\');this.value=r?parseInt(r,10).toLocaleString(\'en-US\'):\'\'">';
      s += '<button class="btn btn-primary btn-sm" data-action="save-goal">Set goal</button>';
      if (goal > 0) s += '<button class="wins-link-btn" data-action="cancel-goal">Cancel</button>';
      s += '</div>';
      s += '<div class="wins-goal-hint">Set your annual commission target and watch the bar fill with every close.</div>';
    } else {
      var pct = goal > 0 ? Math.min(100, (earned / goal) * 100) : 0;
      var remaining = Math.max(0, goal - earned);
      var hit = earned >= goal;
      s += '<div class="wins-thermo">';
      s += '<div class="wins-thermo-fill' + (hit ? ' hit' : '') + '" style="width:' + pct.toFixed(1) + '%"></div>';
      s += '<div class="wins-thermo-label">' + Data.formatCurrency(earned) + ' of ' + Data.formatCurrency(goal) + '</div>';
      s += '</div>';
      s += '<div class="wins-goal-foot">';
      if (hit) {
        s += '<span class="wins-goal-hit">🎉 Goal smashed! You\'re ' + Data.formatCurrency(earned - goal) + ' over target.</span>';
      } else {
        s += '<span>' + Math.round(pct) + '% there</span>';
        s += '<span>' + Data.formatCurrency(remaining) + ' to go</span>';
      }
      s += '</div>';
    }
    s += '</div>';
    return s;
  }

  // ---- Champion spotlight (top 3) ----
  function podiumBlock(agents) {
    var top = agents.filter(function (a) { return a.deals > 0; }).slice(0, 3);
    if (top.length === 0) return '';

    var rangeLabels = { all: 'All-Time', year: 'This Year', quarter: 'This Quarter', month: 'This Month' };
    var s = '<div class="wins-section-head"><h3>🏆 ' + rangeLabels[currentRange] + ' Leaders</h3>' + rangeFilter() + '</div>';

    // DOM order = 2nd (left) · champion (center) · 3rd (right)
    var champDeals = top[0].deals;
    s += '<div class="wins-spotlight">';
    s += '<div class="wins-spotlight-rays"></div>';
    if (top[1]) s += runnerCol(top[1], 2, champDeals - top[1].deals);
    s += champCol(top[0]);
    if (top[2]) s += runnerCol(top[2], 3, champDeals - top[2].deals);
    s += '</div>';
    return s;
  }

  function salesLabel(n) { return n + ' sale' + (n === 1 ? '' : 's'); }

  function champCol(a) {
    var me = a.name === MY_NAME;
    return '<div class="wins-champ' + (me ? ' me' : '') + '">' +
      '<div class="wins-champ-crown">👑</div>' +
      '<div class="wins-champ-ring">' + avatarMarkup(a.name, 'wins-champ-avatar') + '</div>' +
      '<div class="wins-champ-tag">🏆 Team Leader</div>' +
      '<div class="wins-champ-name">' + escapeHtml(a.name) + (me ? ' <span class="wins-you">YOU</span>' : '') + '</div>' +
      '<div class="wins-champ-vol">' + salesLabel(a.deals) + '</div>' +
      '<div class="wins-champ-sub">' + compactMoney(a.volume) + ' volume · ' + compactMoney(a.gci) + ' GCI</div>' +
    '</div>';
  }

  function runnerCol(a, place, behind) {
    var me = a.name === MY_NAME;
    var medal = place === 2 ? '🥈' : '🥉';
    return '<div class="wins-runner' + (me ? ' me' : '') + '">' +
      '<div class="wins-runner-medal">' + medal + '</div>' +
      avatarMarkup(a.name, 'wins-runner-avatar') +
      '<div class="wins-runner-name">' + escapeHtml(a.name.split(/\s+/)[0]) + (me ? ' <span class="wins-you">YOU</span>' : '') + '</div>' +
      '<div class="wins-runner-vol">' + salesLabel(a.deals) + '</div>' +
      '<div class="wins-runner-sub">' + compactMoney(a.volume) +
        (behind > 0 ? ' · ' + behind + ' behind' : '') + '</div>' +
    '</div>';
  }

  // ---- Full leaderboard ----
  function leaderboardBlock(agents) {
    var ranked = agents.filter(function (a) { return a.deals > 0 || a.name === MY_NAME; });
    if (ranked.length === 0) return '';

    var s = '<div class="wins-card wins-lb">';
    s += '<div class="wins-lb-head"><span style="flex:0 0 44px">#</span><span style="flex:1">Agent</span>' +
         '<span class="wins-lb-c">Sales</span><span class="wins-lb-c wins-lb-vol">Volume</span><span class="wins-lb-c wins-lb-gci">GCI</span></div>';

    ranked.forEach(function (a) {
      var me = a.name === MY_NAME;
      // gap to the agent directly above (in sales)
      var gap = '';
      if (a.rank > 1) {
        var above = agents[a.rank - 2];
        if (above && above.deals > a.deals) {
          gap = (above.deals - a.deals) + ' sale' + (above.deals - a.deals === 1 ? '' : 's') + ' behind ' + above.name.split(/\s+/)[0];
        }
      }
      s += '<div class="wins-lb-row' + (me ? ' me' : '') + '">';
      s += '<span class="wins-lb-rank" style="flex:0 0 44px">' + (a.deals > 0 ? a.rank : '—') + '</span>';
      s += '<span class="wins-lb-agent" style="flex:1">';
      s += avatarMarkup(a.name, 'wins-lb-avatar');
      s += '<span class="wins-lb-agent-txt"><span class="wins-lb-name">' + escapeHtml(a.name) +
           (me ? ' <span class="wins-you">YOU</span>' : '') + '</span>' +
           (gap ? '<span class="wins-lb-gap">' + escapeHtml(gap) + '</span>' : '') + '</span>';
      s += '</span>';
      s += '<span class="wins-lb-c">' + a.deals + '</span>';
      s += '<span class="wins-lb-c wins-lb-vol">' + Data.formatCurrency(a.volume) + '</span>';
      s += '<span class="wins-lb-c wins-lb-gci">' + compactMoney(a.gci) + '</span>';
      s += '</div>';
    });
    s += '</div>';
    return s;
  }

  // ---- Achievement badges (current user) ----
  function badgesBlock(p) {
    var earnedCount = p.badges.filter(function (b) { return b.earned; }).length;
    var s = '<div class="wins-section-head"><h3>🎖️ ' + new Date().getFullYear() + ' Badges <span class="wins-count-pill">' +
            earnedCount + '/' + p.badges.length + '</span></h3></div>';
    s += '<div class="wins-badges">';
    p.badges.forEach(function (b) {
      s += '<div class="wins-badge' + (b.earned ? ' earned' : ' locked') + '">';
      s += '<div class="wins-badge-icon">' + b.icon + '</div>';
      s += '<div class="wins-badge-name">' + escapeHtml(b.name) + '</div>';
      // every badge always explains what it means
      s += '<div class="wins-badge-desc">' + escapeHtml(b.desc) + '</div>';
      // progress toward the goal for locked, numeric badges
      if (!b.earned && b.goal) {
        var cur = b.money ? compactMoney(b.cur) : b.cur;
        var goal = b.money ? compactMoney(b.goal) : b.goal;
        var pctW = Math.max(0, Math.min(100, (b.cur / b.goal) * 100));
        s += '<div class="wins-badge-track"><div class="wins-badge-track-fill" style="width:' + pctW + '%"></div></div>';
        s += '<div class="wins-badge-prog">' + cur + ' / ' + goal + '</div>';
      }
      // prize
      if (b.prize) {
        s += b.earned
          ? '<div class="wins-badge-prize won">🏆 Won: ' + escapeHtml(b.prize) + '</div>'
          : '<div class="wins-badge-prize">🎁 ' + escapeHtml(b.prize) + '</div>';
      }
      s += '</div>';
    });
    s += '</div>';
    return s;
  }

  // ---- Personal record book ----
  function recordsBlock(p) {
    if (p.careerCount === 0) return '';
    var s = '<div class="wins-section-head"><h3>📖 Your Record Book</h3></div>';
    s += '<div class="wins-records">';
    s += recordCard('🐋', 'Biggest Deal', p.biggest ? Data.formatCurrency(p.biggest.price) : '—',
        p.biggest ? (p.biggest.address || '') : '');
    s += recordCard('🗓️', 'Best Month', p.bestMonthCount ? p.bestMonthCount + ' deals' : '—', p.bestMonthLabel);
    s += recordCard('💰', 'Career GCI', Data.formatCurrency(p.careerVolume * COMMISSION_RATE), p.careerCount + ' closings');
    s += recordCard('⚡', 'Fastest Close', p.fastest !== null ? p.fastest + ' days' : '—', 'Contract to close');
    s += '</div>';
    return s;
  }

  function recordCard(icon, label, value, sub) {
    return '<div class="wins-record">' +
      '<div class="wins-record-icon">' + icon + '</div>' +
      '<div class="wins-record-body">' +
        '<div class="wins-record-label">' + label + '</div>' +
        '<div class="wins-record-value">' + escapeHtml(value) + '</div>' +
        (sub ? '<div class="wins-record-sub">' + escapeHtml(sub) + '</div>' : '') +
      '</div></div>';
  }

  // ---- Wins feed (recent closings as celebratory cards) ----
  function winsFeedBlock(closed) {
    var s = '<div class="wins-section-head"><h3>🎉 Recent Wins</h3></div>';
    if (closed.length === 0) {
      s += '<div class="wins-empty"><div class="wins-empty-icon">🏆</div>' +
           '<div class="wins-empty-title">No wins in this window yet</div>' +
           '<div class="wins-empty-sub">Close a deal and it lands here with a celebration.</div></div>';
      return s;
    }
    var shown = closed.slice(0, winsLimit);
    s += '<div class="wins-feed">';
    shown.forEach(function (t) {
      var me = t.agent === MY_NAME;
      s += '<div class="wins-feed-card' + (me ? ' me' : '') + '" data-action="open-detail" data-id="' + t.id + '">';
      s += '<div class="wins-feed-accent"></div>';
      s += '<div class="wins-feed-top">';
      s += avatarMarkup(t.agent, 'wins-feed-avatar');
      s += '<div class="wins-feed-who"><div class="wins-feed-agent">' + escapeHtml(t.agent || 'Unassigned') + '</div>' +
           '<div class="wins-feed-date">' + Data.formatDate(t.closeDate) + '</div></div>';
      if (t.type) s += '<span class="wins-feed-type">' + escapeHtml(t.type) + '</span>';
      s += '</div>';
      s += '<div class="wins-feed-addr">' + escapeHtml(t.address || '—') + '</div>';
      s += '<div class="wins-feed-nums">';
      s += '<div class="wins-feed-price">' + Data.formatCurrency(t.price) + '</div>';
      s += '<div class="wins-feed-gci">+' + Data.formatCurrency(gci(t.price)) + ' GCI</div>';
      s += '</div>';
      s += '</div>';
    });
    s += '</div>';
    if (closed.length > winsLimit) {
      s += '<div class="wins-more"><button class="btn btn-outline btn-sm" data-action="more-wins">Show more wins (' +
           (closed.length - winsLimit) + ' more)</button></div>';
    }
    return s;
  }

  function rangeFilter() {
    var labels = { all: 'All Time', year: 'Year', quarter: 'Quarter', month: 'Month' };
    var s = '<div class="lb-time-filter wins-filter">';
    ['all', 'year', 'quarter', 'month'].forEach(function (r) {
      s += '<button class="lb-filter-btn' + (currentRange === r ? ' active' : '') +
           '" data-action="time-filter" data-range="' + r + '">' + labels[r] + '</button>';
    });
    s += '</div>';
    return s;
  }

  // ============================================================
  //  CELEBRATION (confetti + modal on a newly closed deal)
  // ============================================================
  function confetti() {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10050';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = canvas.width = window.innerWidth;
    var H = canvas.height = window.innerHeight;
    var colors = ['#D4AF37', '#1A7F4B', '#3484D0', '#B91C1C', '#F59E0B', '#ffffff'];
    var pieces = [];
    for (var i = 0; i < 140; i++) {
      pieces.push({
        x: Math.random() * W,
        y: -20 - Math.random() * H * 0.5,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 8,
        c: colors[Math.floor(Math.random() * colors.length)],
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4
      });
    }
    var start = null;
    function frame(ts) {
      if (!start) start = ts;
      var elapsed = ts - start;
      ctx.clearRect(0, 0, W, H);
      pieces.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = elapsed > 2200 ? Math.max(0, 1 - (elapsed - 2200) / 800) : 1;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (elapsed < 3000) {
        requestAnimationFrame(frame);
      } else if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
    requestAnimationFrame(frame);
  }

  function celebrate(txn) {
    var mine = txn.agent === MY_NAME;
    confetti();
    var overlay = document.createElement('div');
    overlay.className = 'wins-celebrate-overlay';
    overlay.innerHTML =
      '<div class="wins-celebrate-card">' +
        '<div class="wins-celebrate-emoji">🎉</div>' +
        '<div class="wins-celebrate-title">' + (mine ? 'Congratulations!' : escapeHtml((txn.agent || 'A teammate').split(/\s+/)[0]) + ' just closed!') + '</div>' +
        '<div class="wins-celebrate-addr">' + escapeHtml(txn.address || 'A new deal') + '</div>' +
        '<div class="wins-celebrate-price">' + Data.formatCurrency(txn.price) + '</div>' +
        '<div class="wins-celebrate-gci">+' + Data.formatCurrency(gci(txn.price)) + ' commission</div>' +
        '<button class="btn btn-primary" data-action="close-celebrate" style="margin-top:18px">' +
          (mine ? 'Let\'s go! 🚀' : 'Nice! 👏') + '</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-action="close-celebrate"]')) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    });
  }

  // Detect deals that closed since the user's last visit and celebrate one.
  function checkCelebrations() {
    if (celebrationDone) return;
    var closed = getAllClosed();
    if (!closed.length) return;              // wait for data before setting a baseline
    celebrationDone = true;

    var ids = closed.map(function (t) { return t.id; });
    var hadBaseline = localStorage.getItem('reb_closed_seen') !== null;
    var seen = [];
    try { seen = JSON.parse(localStorage.getItem('reb_closed_seen') || '[]'); } catch (e) {}

    var fresh = closed.filter(function (t) { return seen.indexOf(t.id) === -1; });
    localStorage.setItem('reb_closed_seen', JSON.stringify(ids));

    if (!hadBaseline) return;                // first visit — no celebration, just baseline
    if (fresh.length === 0 || fresh.length > 3) return; // 0 = nothing new; >3 = bulk sync, not a live close

    fresh.sort(function (a, b) { return (b.closeDate || '').localeCompare(a.closeDate || ''); });
    celebrate(fresh[0]);
  }

  // ============================================================
  //  DETAIL VIEW (edit a closed deal) — preserved
  // ============================================================
  function renderDetail() {
    window.scrollTo(0, 0);
    var txns = Data.getTransactions();
    var t = txns.find(function (x) { return x.id === selectedTxnId; });
    if (!t) { viewMode = 'list'; renderList(); return; }

    var parties = {};
    try { parties = JSON.parse(localStorage.getItem('reb_txn_parties') || '{}'); } catch (e) {}
    var txnParties = parties[selectedTxnId] || {};
    var buyers = Array.isArray(txnParties.buyers) ? txnParties.buyers : (txnParties.buyer && txnParties.buyer.name ? [txnParties.buyer] : []);
    var sellers = Array.isArray(txnParties.sellers) ? txnParties.sellers : (txnParties.seller && txnParties.seller.name ? [txnParties.seller] : []);

    var users = getUsersList();
    var leadSources = getAdminSetting('leadSources', ['Zillow', 'Realtor.com', 'Referral', 'Cold Call', 'Door Knock', 'Social Media', 'Open House', 'Other']);

    var iStyle = 'width:100%;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.88rem;color:var(--gray-800);background:#fff;transition:border-color .15s';
    var lStyle = 'display:block;font-size:.72rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px';

    var html = '';
    html += '<button class="detail-back-btn" data-action="back-to-list">' +
      '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>' +
      'Back to Wins</button>';

    // Hero banner
    html += '<div style="background:linear-gradient(135deg,#064E3B,#065F46);border-radius:16px;padding:28px 32px;margin-bottom:20px;position:relative;overflow:hidden">';
    html += '<div style="position:absolute;top:-30px;right:-30px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.04)"></div>';
    html += '<div style="position:absolute;bottom:-20px;right:60px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.04)"></div>';
    html += '<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border-radius:20px;padding:4px 12px;margin-bottom:14px">';
    html += '<span style="width:7px;height:7px;border-radius:50%;background:#6EE7B7;display:inline-block"></span>';
    html += '<span style="font-size:.75rem;font-weight:700;color:#fff;letter-spacing:.5px;text-transform:uppercase">Closed</span></div>';
    html += '<div style="font-size:1.5rem;font-weight:800;color:#fff;margin-bottom:16px;letter-spacing:-.3px;line-height:1.25">' + escapeHtml(t.address || '—') + '</div>';
    html += '<div style="display:flex;gap:24px;flex-wrap:wrap">';
    html += heroPair('Sale Price', Data.formatCurrencyFull(t.price));
    html += heroPair('Commission', Data.formatCurrencyFull(gci(t.price)));
    html += heroPair('Close Date', t.closeDate ? Data.formatDate(t.closeDate) : '—');
    html += heroPair('Agent', t.agent || '—');
    html += '</div></div>';

    // Edit card
    html += '<div class="card" style="margin-bottom:16px">';
    html += '<div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);font-size:.92rem;font-weight:700;color:var(--gray-800)">Edit Details</div>';
    html += '<div style="padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">';
    html += '<div style="grid-column:1/-1"><label style="' + lStyle + '">Address</label>' +
      '<input type="text" class="closed-edit-field" data-field="address" value="' + escapeHtml(t.address || '') + '" placeholder="123 Main St" style="' + iStyle + '"></div>';
    html += '<div><label style="' + lStyle + '">City</label><input type="text" class="closed-edit-field" data-field="city" value="' + escapeHtml(t.city || '') + '" placeholder="Austin" style="' + iStyle + '"></div>';
    html += '<div><label style="' + lStyle + '">State</label><input type="text" class="closed-edit-field" data-field="state" value="' + escapeHtml(t.state || '') + '" placeholder="TX" maxlength="2" style="' + iStyle + '"></div>';
    html += '<div><label style="' + lStyle + '">Zip</label><input type="text" class="closed-edit-field" data-field="zip" value="' + escapeHtml(t.zip || '') + '" placeholder="78701" maxlength="10" style="' + iStyle + '"></div>';
    html += '<div><label style="' + lStyle + '">Agent</label><select class="closed-edit-field" data-field="agent" style="' + iStyle + '">';
    users.forEach(function (u) {
      var name = u.displayName || u.username;
      html += '<option value="' + escapeHtml(name) + '"' + (name === t.agent ? ' selected' : '') + '>' + escapeHtml(name) + '</option>';
    });
    html += '</select></div>';
    html += '<div><label style="' + lStyle + '">Close Date</label><input type="date" class="closed-edit-field" data-field="closeDate" value="' + (t.closeDate || '') + '" style="' + iStyle + '"></div>';
    var priceDisplay = t.price ? '$' + parseInt(t.price, 10).toLocaleString('en-US') : '';
    html += '<div><label style="' + lStyle + '">Sale Price</label><input type="text" class="closed-edit-field" data-field="price" value="' + priceDisplay + '" placeholder="$0" style="' + iStyle + '" oninput="var r=this.value.replace(/[^0-9]/g,\'\');this.value=r?\'$\'+parseInt(r,10).toLocaleString(\'en-US\'):\'\'"></div>';
    html += '<div><label style="' + lStyle + '">Lead Source</label><select class="closed-edit-field" data-field="source" style="' + iStyle + '"><option value="">Select source...</option>';
    leadSources.forEach(function (src) {
      html += '<option value="' + escapeHtml(src) + '"' + (src === t.source ? ' selected' : '') + '>' + escapeHtml(src) + '</option>';
    });
    html += '</select></div>';
    html += '<div><label style="' + lStyle + '">Transaction Type</label><select class="closed-edit-field" data-field="type" style="' + iStyle + '">' +
      '<option value="Buyer"' + (t.type === 'Buyer' ? ' selected' : '') + '>Buyer</option>' +
      '<option value="Seller"' + (t.type === 'Seller' ? ' selected' : '') + '>Seller</option>' +
      '<option value="Dual"' + (t.type === 'Dual' ? ' selected' : '') + '>Dual</option></select></div>';
    html += '</div>';
    html += '<div style="padding:0 20px 20px;display:flex;gap:8px;flex-wrap:wrap">';
    html += '<button class="btn btn-primary btn-sm" data-action="save-closed-edit" data-id="' + t.id + '">Save Changes</button>';
    html += '<button class="btn btn-outline btn-sm" data-action="reopen-txn" data-id="' + t.id + '" style="color:var(--indigo);border-color:var(--indigo)">Move to Pending</button>';
    html += '<button class="btn btn-outline btn-sm" data-action="delete-txn" data-id="' + t.id + '" style="color:var(--rose);border-color:var(--gray-200)">Delete</button>';
    html += '</div></div>';

    // Parties
    var hasBuyers = buyers.some(function (b) { return b.name || b.phone || b.email; });
    var hasSellers = sellers.some(function (sl) { return sl.name || sl.phone || sl.email; });
    if (hasBuyers || hasSellers) {
      html += '<div class="card" style="margin-bottom:16px">';
      html += '<div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);font-size:.92rem;font-weight:700;color:var(--gray-800)">Parties</div>';
      html += '<div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px">';
      html += partyBlock('Buyer', 'var(--indigo)', buyers);
      html += partyBlock('Seller', '#EC4899', sellers);
      html += '</div></div>';
    }

    pageBody.innerHTML = html;

    // Auto-save fields on change/blur
    var autoSaveTxnId = t.id;
    pageBody.querySelectorAll('.closed-edit-field').forEach(function (inp) {
      var evt = inp.tagName === 'SELECT' || inp.type === 'date' ? 'change' : 'blur';
      inp.addEventListener(evt, function () {
        var field = inp.getAttribute('data-field');
        if (!field) return;
        var val = inp.value;
        if (field === 'price') val = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
        var update = {}; update[field] = val;
        Data.updateTransaction(autoSaveTxnId, update);
        showToast('Saved');
      });
    });
  }

  function heroPair(label, value) {
    return '<div><div style="font-size:.7rem;font-weight:600;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">' + label + '</div>' +
      '<div style="font-size:1.15rem;font-weight:800;color:#fff">' + escapeHtml(value) + '</div></div>';
  }

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

  // ============================================================
  //  RENDER DISPATCHER
  // ============================================================
  function render() {
    if (viewMode === 'detail' && selectedTxnId) renderDetail();
    else renderList();
  }

  // ============================================================
  //  EVENTS
  // ============================================================
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    switch (action) {
      case 'time-filter':
        currentRange = target.getAttribute('data-range');
        winsLimit = 12;
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

      case 'more-wins':
        winsLimit += 12;
        renderList();
        break;

      case 'edit-goal':
        goalEditMode = true;
        renderList();
        var gi = document.getElementById('goalInput');
        if (gi) gi.focus();
        break;

      case 'cancel-goal':
        goalEditMode = false;
        renderList();
        break;

      case 'save-goal': {
        var input = document.getElementById('goalInput');
        var amount = input ? parseFloat(input.value.replace(/[^0-9.]/g, '')) || 0 : 0;
        setGoal(MY_NAME, amount);
        goalEditMode = false;
        renderList();
        if (amount > 0) showToast('Goal set — go get it! 🎯');
        break;
      }

      case 'close-celebrate':
        // handled inside celebrate() overlay listener
        break;

      case 'save-closed-edit': {
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
      }

      case 'reopen-txn': {
        var reopenId = target.getAttribute('data-id');
        Data.updateTransaction(reopenId, { status: 'pending', closeDate: '' });
        showToast('Moved back to pending — check Current Escrows.');
        viewMode = 'list';
        selectedTxnId = null;
        render();
        break;
      }

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
          if (dcOverlay.parentNode) document.body.removeChild(dcOverlay);
        });
        break;
      }
    }
  });

  // ---- Init ----
  render();
  setTimeout(checkCelebrations, 800); // fallback for non-server mode

  document.addEventListener('apiBridgeReady', function () {
    if (viewMode === 'list') render();
    checkCelebrations();
  });

})();
