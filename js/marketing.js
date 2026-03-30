/* ============================================================
   RE Back Office — Marketing Activity Tracker
   Donut rings, category groups, team cards
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('marketing');

  document.getElementById('logoutBtn').addEventListener('click', function () { Auth.logout(); });

  var MKT_KEY = 'reb_marketing';
  var USERS_KEY = 'reb_users';
  var pageBody = document.getElementById('pageBody');
  var session = Auth.getSession();
  var privileged = Auth.isPrivileged();
  var currentTab = 'weekly';

  // ---- Activity Definitions ----
  var WEEKLY = [
    { id: 'w_instagram',   label: 'Post on Instagram',                 detail: 'Listing photo, market tip, or personal brand content',    cat: 'Social Media', color: '#3B82F6' },
    { id: 'w_facebook',    label: 'Post on Facebook',                  detail: 'Page post, story, or share in a community group',         cat: 'Social Media', color: '#3B82F6' },
    { id: 'w_linkedin',    label: 'Post on LinkedIn',                  detail: 'Professional insight, deal close, or market update',      cat: 'Social Media', color: '#3B82F6' },
    { id: 'w_calls',       label: 'Make 10+ prospecting calls',        detail: 'Call leads, past clients, or sphere of influence',         cat: 'Outreach',     color: '#10B981' },
    { id: 'w_followup',    label: 'Send 5+ follow-up texts or emails', detail: 'Personalized outreach to active or warm leads',           cat: 'Outreach',     color: '#10B981' },
    { id: 'w_openhouse',   label: 'Host or attend an open house',      detail: 'Your listing or a colleague\'s open house',               cat: 'In-Person',    color: '#F59E0B' },
    { id: 'w_doorknock',   label: 'Door knock or geo-farm your area',  detail: 'At least one session in your target neighborhood',        cat: 'In-Person',    color: '#F59E0B' },
    { id: 'w_handwritten', label: 'Send handwritten notes or cards',   detail: 'Thank-you, congratulations, or just-thinking-of-you',     cat: 'Outreach',     color: '#10B981' },
    { id: 'w_engage',      label: 'Engage sphere on social media',     detail: 'Like, comment, and DM at least 20 connections',           cat: 'Social Media', color: '#3B82F6' },
    { id: 'w_marketupdate',label: 'Share a market update online',      detail: 'Post or story with local data or buying/selling advice',  cat: 'Content',      color: '#8B5CF6' }
  ];

  var MONTHLY = [
    { id: 'm_newsletter',  label: 'Send email newsletter',             detail: 'Monthly market update to your full database',             cat: 'Digital',          color: '#3B82F6' },
    { id: 'm_postcards',   label: 'Mail postcards or flyers',          detail: 'Farm area direct mail campaign',                          cat: 'Direct Mail',      color: '#F59E0B' },
    { id: 'm_reviews',     label: 'Request reviews from past clients', detail: 'Ask for Google, Zillow, or Realtor.com reviews',          cat: 'Digital',          color: '#3B82F6' },
    { id: 'm_paidads',     label: 'Run a paid social media ad',        detail: 'Facebook, Instagram, or Google Ads campaign',             cat: 'Digital',          color: '#3B82F6' },
    { id: 'm_event',       label: 'Host or plan a client event',       detail: 'Pop-by, appreciation event, or community activity',       cat: 'Events',           color: '#F59E0B' },
    { id: 'm_google',      label: 'Update Google Business Profile',    detail: 'Add photos, posts, or respond to reviews',               cat: 'Digital',          color: '#3B82F6' },
    { id: 'm_video',       label: 'Record and publish a video',        detail: 'Market update, neighborhood spotlight, or tips video',    cat: 'Content Creation', color: '#8B5CF6' },
    { id: 'm_networking',  label: 'Attend a networking event',         detail: 'BNI, chamber of commerce, or real estate meetup',         cat: 'Networking',       color: '#10B981' },
    { id: 'm_marketreport',label: 'Create and share a market report',  detail: 'Monthly stats for your farm area or niche',              cat: 'Content Creation', color: '#8B5CF6' },
    { id: 'm_reconnect',   label: 'Reconnect with 10+ past clients',   detail: 'Personal call, text, or email just to check in',         cat: 'Networking',       color: '#10B981' }
  ];

  // ---- Inject Styles ----
  var mktCSS = document.createElement('style');
  mktCSS.textContent = [
    '.mkt-rings-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }',
    '@media(max-width:640px){ .mkt-rings-row{grid-template-columns:1fr;} }',
    '.mkt-ring-card { background:var(--white); border-radius:var(--radius-lg); padding:28px 24px; text-align:center; box-shadow:var(--shadow-sm); border:1px solid var(--gray-200); }',
    '.mkt-ring-wrap { position:relative; width:140px; height:140px; margin:0 auto 14px; }',
    '.mkt-ring-svg { width:140px; height:140px; transform:rotate(-90deg); }',
    '.mkt-ring-track { fill:none; stroke:var(--gray-100); stroke-width:10; }',
    '.mkt-ring-fill { fill:none; stroke-width:10; stroke-linecap:round; transition:stroke-dashoffset .8s ease; }',
    '.mkt-ring-pct { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:2rem; font-weight:800; color:var(--gray-900); line-height:1; }',
    '.mkt-ring-pct small { font-size:.8rem; font-weight:600; color:var(--gray-400); }',
    '.mkt-ring-title { font-size:1rem; font-weight:700; color:var(--gray-900); margin-bottom:2px; }',
    '.mkt-ring-sub { font-size:.8rem; color:var(--gray-400); }',
    '.mkt-cat-heading { display:flex; align-items:center; gap:8px; padding:12px 20px 6px; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--gray-400); }',
    '.mkt-cat-heading::after { content:""; flex:1; height:1px; background:var(--gray-100); }',
    '.mkt-item { display:flex; align-items:center; gap:14px; padding:12px 20px; border-bottom:1px solid var(--gray-50); transition:background .15s; cursor:pointer; }',
    '.mkt-item:hover { background:var(--gray-50); }',
    '.mkt-item:last-child { border-bottom:none; }',
    '.mkt-item-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }',
    '.mkt-item-info { flex:1; min-width:0; }',
    '.mkt-item-label { font-size:.88rem; font-weight:600; color:var(--gray-800); }',
    '.mkt-item-detail { font-size:.75rem; color:var(--gray-400); margin-top:1px; }',
    '.mkt-item.checked .mkt-item-label { text-decoration:line-through; color:var(--gray-400); }',
    '.mkt-item.checked .mkt-item-detail { text-decoration:line-through; }',
    '.mkt-team-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; margin-top:24px; }',
    '.mkt-agent-card { background:var(--white); border-radius:var(--radius-lg); padding:20px; border:1px solid var(--gray-200); box-shadow:var(--shadow-sm); }',
    '.mkt-mini-ring { position:relative; width:56px; height:56px; }',
    '.mkt-mini-ring svg { width:56px; height:56px; transform:rotate(-90deg); }',
    '.mkt-mini-ring .ring-track { fill:none; stroke:var(--gray-100); stroke-width:5; }',
    '.mkt-mini-ring .ring-fill { fill:none; stroke-width:5; stroke-linecap:round; }',
    '.mkt-mini-pct { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:.7rem; font-weight:700; color:var(--gray-900); }',
    '.mkt-status-tag { font-size:.68rem; font-weight:700; padding:3px 10px; border-radius:99px; text-transform:uppercase; letter-spacing:.04em; }',
    '.mkt-status-tag.on-fire { background:#ECFDF5; color:#065F46; }',
    '.mkt-status-tag.doing-well { background:#FEF3C7; color:#92400E; }',
    '.mkt-status-tag.needs-attn { background:#FEE2E2; color:#991B1B; }'
  ].join('\n');
  document.head.appendChild(mktCSS);

  // ---- Helpers ----
  function getWeekKey() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var jan1 = new Date(d.getFullYear(), 0, 1);
    var days = Math.floor((d - jan1) / 86400000);
    var week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + (week < 10 ? '0' : '') + week;
  }

  function getMonthKey() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  function allData() {
    try { return JSON.parse(localStorage.getItem(MKT_KEY) || '{}'); } catch (e) { return {}; }
  }

  function userData(username) {
    return allData()[username] || { weekly: {}, monthly: {} };
  }

  function saveUser(username, data) {
    var all = allData();
    all[username] = data;
    localStorage.setItem(MKT_KEY, JSON.stringify(all));
  }

  function getChecked(username, type, key) {
    return userData(username)[type][key] || {};
  }

  function countDone(map, list) {
    return list.filter(function (a) { return map[a.id]; }).length;
  }

  function ringColor(pct) {
    if (pct >= 80) return '#10B981';
    if (pct >= 50) return '#F59E0B';
    return '#EF4444';
  }

  function donutSVG(pct, size, sw, cls) {
    var r = (size - sw) / 2;
    var circ = 2 * Math.PI * r;
    var offset = circ * (1 - pct / 100);
    var color = ringColor(pct);
    return '<svg class="' + (cls || 'mkt-ring-svg') + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle class="' + (cls ? 'ring-track' : 'mkt-ring-track') + '" cx="' + (size/2) + '" cy="' + (size/2) + '" r="' + r + '"/>' +
      '<circle class="' + (cls ? 'ring-fill' : 'mkt-ring-fill') + '" cx="' + (size/2) + '" cy="' + (size/2) + '" r="' + r + '" stroke="' + color + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"/>' +
    '</svg>';
  }

  function calcStreak(username) {
    var ud = userData(username);
    var weeks = ud.weekly || {};
    var streak = 0;
    var d = new Date();
    for (var i = 0; i < 52; i++) {
      var temp = new Date(d);
      temp.setDate(temp.getDate() - i * 7);
      temp.setHours(0,0,0,0);
      var jan1 = new Date(temp.getFullYear(), 0, 1);
      var days = Math.floor((temp - jan1) / 86400000);
      var wk = temp.getFullYear() + '-W' + (function(w){ return (w<10?'0':'')+w; })(Math.ceil((days + jan1.getDay() + 1) / 7));
      var checked = weeks[wk] || {};
      var done = WEEKLY.filter(function (a) { return checked[a.id]; }).length;
      if (done >= 7) { streak++; }
      else { if (i === 0) continue; break; }
    }
    return streak;
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch(e) { return []; }
  }

  function teamAvgWeekly() {
    var users = getUsers();
    if (!users.length) return 0;
    var wk = getWeekKey();
    var total = 0;
    users.forEach(function (u) {
      var wd = getChecked(u.username, 'weekly', wk);
      total += countDone(wd, WEEKLY);
    });
    return Math.round((total / users.length / WEEKLY.length) * 100);
  }

  // ---- Render ----
  function render() {
    var wk = getWeekKey();
    var mk = getMonthKey();
    var wChecked = getChecked(session.username, 'weekly', wk);
    var mChecked = getChecked(session.username, 'monthly', mk);
    var wDone = countDone(wChecked, WEEKLY);
    var mDone = countDone(mChecked, MONTHLY);
    var wPct = Math.round(wDone / WEEKLY.length * 100);
    var mPct = Math.round(mDone / MONTHLY.length * 100);
    var streak = calcStreak(session.username);
    var activities = currentTab === 'weekly' ? WEEKLY : MONTHLY;
    var checked = currentTab === 'weekly' ? wChecked : mChecked;
    var periodKey = currentTab === 'weekly' ? wk : mk;

    var html = '';

    // Header
    html += '<div class="page-header"><div><h2>Marketing Activities</h2></div></div>';

    // Donut Rings Row
    html += '<div class="mkt-rings-row">';
    html += '<div class="mkt-ring-card"><div class="mkt-ring-wrap">' + donutSVG(wPct, 140, 10) + '<div class="mkt-ring-pct">' + wPct + '<small>%</small></div></div>';
    html += '<div class="mkt-ring-title">Weekly Progress</div><div class="mkt-ring-sub">' + wDone + '/' + WEEKLY.length + ' activities</div></div>';
    html += '<div class="mkt-ring-card"><div class="mkt-ring-wrap">' + donutSVG(mPct, 140, 10) + '<div class="mkt-ring-pct">' + mPct + '<small>%</small></div></div>';
    html += '<div class="mkt-ring-title">Monthly Progress</div><div class="mkt-ring-sub">' + mDone + '/' + MONTHLY.length + ' activities</div></div>';
    html += '</div>';

    // Stats
    html += '<div class="stats-grid" style="margin-bottom:24px">';
    html += '<div class="stat-card"><div class="stat-icon green"><svg viewBox="0 0 24 24"><path d="M12 22c4-4 8-7.58 8-12a8 8 0 10-16 0c0 4.42 4 8 8 12z"/></svg></div><div><div class="stat-value">' + streak + '</div><div class="stat-label">Week Streak ' + (streak > 0 ? '🔥' : '') + '</div></div></div>';
    if (privileged) {
      html += '<div class="stat-card"><div class="stat-icon blue"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div><div><div class="stat-value">' + teamAvgWeekly() + '%</div><div class="stat-label">Team Avg Weekly</div></div></div>';
    }
    html += '</div>';

    // Tab toggle
    html += '<div style="display:flex;gap:8px;margin-bottom:20px">';
    html += '<button class="lb-filter-btn' + (currentTab === 'weekly' ? ' active' : '') + '" data-action="switch-tab" data-tab="weekly">Weekly</button>';
    html += '<button class="lb-filter-btn' + (currentTab === 'monthly' ? ' active' : '') + '" data-action="switch-tab" data-tab="monthly">Monthly</button>';
    html += '</div>';

    // Activity List grouped by category
    html += '<div class="lb-card">';

    // Progress bar at top of card
    var thisPct = currentTab === 'weekly' ? wPct : mPct;
    var thisDone = currentTab === 'weekly' ? wDone : mDone;
    var thisTotal = currentTab === 'weekly' ? WEEKLY.length : MONTHLY.length;
    html += '<div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;justify-content:space-between">';
    html += '<div style="font-size:.9rem;font-weight:700;color:var(--gray-800)">' + (currentTab === 'weekly' ? 'This Week' : 'This Month') + '</div>';
    html += '<span style="font-size:.82rem;font-weight:600;color:' + ringColor(thisPct) + '">' + thisDone + '/' + thisTotal + ' complete</span>';
    html += '</div>';
    html += '<div style="height:3px;background:var(--gray-100)"><div style="height:100%;width:' + thisPct + '%;background:' + ringColor(thisPct) + ';transition:width .3s"></div></div>';

    // Group by category
    var catOrder = [];
    var catMap = {};
    activities.forEach(function (a) {
      if (!catMap[a.cat]) { catMap[a.cat] = []; catOrder.push(a.cat); }
      catMap[a.cat].push(a);
    });

    catOrder.forEach(function (cat) {
      html += '<div class="mkt-cat-heading">' + cat + '</div>';
      catMap[cat].forEach(function (a) {
        var isDone = !!checked[a.id];
        html += '<div class="mkt-item' + (isDone ? ' checked' : '') + '" data-action="toggle-activity" data-id="' + a.id + '" data-type="' + currentTab + '" data-period="' + periodKey + '">';
        html += '<input type="checkbox"' + (isDone ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:var(--emerald);cursor:pointer;flex-shrink:0">';
        html += '<div class="mkt-item-dot" style="background:' + a.color + '"></div>';
        html += '<div class="mkt-item-info">';
        html += '<div class="mkt-item-label">' + a.label + '</div>';
        html += '<div class="mkt-item-detail">' + a.detail + '</div>';
        html += '</div></div>';
      });
    });

    html += '</div>';

    // Team section (privileged only)
    if (privileged) {
      var users = getUsers().filter(function (u) { return u.role !== 'Team Lead'; });
      if (users.length > 0) {
        html += '<h3 style="font-size:1rem;font-weight:700;color:var(--gray-900);margin-top:28px;margin-bottom:4px">Team Activity</h3>';
        html += '<p style="font-size:.82rem;color:var(--gray-400);margin-bottom:16px">Weekly progress by agent</p>';
        html += '<div class="mkt-team-grid">';

        users.forEach(function (u) {
          var uWk = getChecked(u.username, 'weekly', wk);
          var uMk = getChecked(u.username, 'monthly', mk);
          var uWDone = countDone(uWk, WEEKLY);
          var uMDone = countDone(uMk, MONTHLY);
          var uWPct = Math.round(uWDone / WEEKLY.length * 100);
          var uMPct = Math.round(uMDone / MONTHLY.length * 100);
          var uStreak = calcStreak(u.username);
          var cls = agentClass(u.displayName);
          var statusTag = uWPct >= 80 ? '<span class="mkt-status-tag on-fire">On Fire</span>' :
                          uWPct >= 50 ? '<span class="mkt-status-tag doing-well">Doing Well</span>' :
                                        '<span class="mkt-status-tag needs-attn">Needs Attention</span>';

          html += '<div class="mkt-agent-card">';
          html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">';
          html += '<div class="agent-avatar ' + cls + '" style="width:38px;height:38px;font-size:.75rem">' + getInitials(u.displayName) + '</div>';
          html += '<div style="flex:1"><div style="font-size:.9rem;font-weight:700;color:var(--gray-900)">' + u.displayName + '</div>';
          html += '<div style="font-size:.75rem;color:var(--gray-400)">' + u.role + '</div></div>';
          html += statusTag;
          html += '</div>';

          // Mini donut rings
          html += '<div style="display:flex;gap:16px;justify-content:center;margin-bottom:14px">';
          html += '<div><div class="mkt-mini-ring">' + donutSVG(uWPct, 56, 5, 'mkt-mini-svg') + '<div class="mkt-mini-pct">' + uWPct + '%</div></div><div style="font-size:.6rem;text-align:center;color:var(--gray-400);font-weight:600;text-transform:uppercase;margin-top:2px">WEEKLY</div></div>';
          html += '<div><div class="mkt-mini-ring">' + donutSVG(uMPct, 56, 5, 'mkt-mini-svg') + '<div class="mkt-mini-pct">' + uMPct + '%</div></div><div style="font-size:.6rem;text-align:center;color:var(--gray-400);font-weight:600;text-transform:uppercase;margin-top:2px">MONTHLY</div></div>';
          html += '</div>';

          // Footer
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--gray-100)">';
          html += '<span style="font-size:.75rem;font-weight:700;color:var(--amber)">' + (uStreak > 0 ? '🔥 ' + uStreak + ' week streak' : 'No streak') + '</span>';
          html += '<span style="font-size:.75rem;color:var(--gray-400)">' + uWDone + '/' + WEEKLY.length + ' this week</span>';
          html += '</div>';
          html += '</div>';
        });

        html += '</div>';
      }
    }

    pageBody.innerHTML = html;
  }

  // ---- Events ----
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'switch-tab') {
      currentTab = target.getAttribute('data-tab');
      render();
    }

    if (action === 'toggle-activity') {
      var id = target.getAttribute('data-id');
      var type = target.getAttribute('data-type');
      var period = target.getAttribute('data-period');
      var ud = userData(session.username);
      if (!ud[type]) ud[type] = {};
      if (!ud[type][period]) ud[type][period] = {};
      ud[type][period][id] = !ud[type][period][id];
      saveUser(session.username, ud);
      render();
    }
  });

  render();
})();
